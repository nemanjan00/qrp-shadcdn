import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { effect, state } from "@nemanjan00/qrp";
import { confirmDialog, promptDialog } from "../index.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const key = (name) => document.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
const buttonNamed = (root, text) => [...root.querySelectorAll("button")].find((b) => b.textContent.trim() === text);
const submit = (form) => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));

const typeInto = (input, value) => {
	input.value = value;
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

test("confirmDialog: confirm resolves true, nodes leave, focus returns", async () => {
	const before = document.createElement("button");

	document.body.append(before);
	before.focus();

	const answer = confirmDialog({ title: "Delete tab?", description: "Its panes move.", confirmText: "Delete", destructive: true });
	const content = document.querySelector("[data-slot=alert-dialog-content]");

	assert.ok(content);
	assert.equal(content.getAttribute("role"), "alertdialog");
	assert.equal(document.getElementById(content.getAttribute("aria-labelledby")).textContent, "Delete tab?");
	assert.ok(buttonNamed(content, "Delete").className.includes("bg-destructive"));
	assert.ok(before.hasAttribute("inert"), "background is inert while open");

	buttonNamed(content, "Delete").click();

	assert.equal(await answer, true);
	await tick();
	assert.equal(document.querySelector("[data-slot=alert-dialog-content]"), null);
	assert.equal(document.querySelector("[data-slot=alert-dialog-overlay]"), null);
	assert.ok(!before.hasAttribute("inert"));
	assert.ok(document.activeElement === before, "focus returns to the opener");
	document.body.replaceChildren();
});

test("confirmDialog: cancel and Escape resolve false", async () => {
	const cancelled = confirmDialog({ cancelText: "Nope" });

	buttonNamed(document.querySelector("[data-slot=alert-dialog-content]"), "Nope").click();
	assert.equal(await cancelled, false);
	await tick();

	const escaped = confirmDialog();

	assert.equal(document.querySelector("[data-slot=alert-dialog-title]").textContent, "Are you sure?");
	key("Escape");
	assert.equal(await escaped, false);
	await tick();
	assert.equal(document.querySelector("[data-slot=alert-dialog-content]"), null);
	document.body.replaceChildren();
});

test("confirmDialog: opening inside an effect survives the effect re-running", async () => {
	const s = state({ n: 0 });
	let pending = null;

	effect(() => {
		if(s.n === 1 && !pending) {
			pending = confirmDialog({ title: "From an effect" });
		}
	});

	s.n = 1;
	s.n = 2;
	assert.ok(document.querySelector("[data-slot=alert-dialog-content]"), "detached from the effect's scope");
	key("Escape");
	assert.equal(await pending, false);
	await tick();
	document.body.replaceChildren();
});

test("promptDialog: fields render with defaults; submit resolves the values", async () => {
	const result = promptDialog({
		title: "Rename tab",
		fields: { name: { label: "Name", default: "main" }, pinned: { type: "checkbox", label: "Pinned" } },
		values: { name: "scope" }
	});
	const content = document.querySelector("[data-slot=dialog-content]");
	const input = content.querySelector("input[type=text], input:not([type])");

	assert.equal(document.getElementById(content.getAttribute("aria-labelledby")).textContent, "Rename tab");
	assert.equal(input.value, "scope", "values override the field default");

	typeInto(input, "bench");
	submit(content.querySelector("form"));

	assert.deepEqual(await result, { name: "bench", pinned: false });
	await tick();
	assert.equal(document.querySelector("[data-slot=dialog-content]"), null);
	document.body.replaceChildren();
});

test("promptDialog: a rejected onSubmit keeps it open with the message; a retry resolves onSubmit's result", async () => {
	let calls = 0;
	let release = null;
	const result = promptDialog({
		fields: { name: { label: "Name" } },
		onSubmit: (values) => {
			calls += 1;

			if(calls === 1) {
				return Promise.reject(new Error("name taken"));
			}

			return new Promise((resolve) => {
				release = () => resolve({ saved: values.name });
			});
		}
	});
	const content = document.querySelector("[data-slot=dialog-content]");
	const form = content.querySelector("form");
	const error = content.querySelector("[data-slot=prompt-error]");
	const button = content.querySelector("[data-slot=prompt-submit]");

	assert.ok(error.hidden);
	typeInto(content.querySelector("input"), "main");
	submit(form);
	await tick();

	assert.ok(document.querySelector("[data-slot=dialog-content]") === content, "still open");
	assert.equal(error.hidden, false);
	assert.equal(error.textContent, "name taken");

	submit(form);
	await tick();
	assert.equal(button.disabled, true, "busy while onSubmit is pending");
	assert.ok(button.querySelector("[data-slot=spinner]"));
	assert.equal(error.textContent, "", "a new attempt clears the old error");

	release();
	assert.deepEqual(await result, { saved: "main" });
	document.body.replaceChildren();
});

test("promptDialog: schema errors block submit; cancel and Escape resolve null", async () => {
	let submitted = false;
	const first = promptDialog({
		fields: { name: { label: "Name" } },
		schema: { name: { required: true, message: "Name is required." } },
		onSubmit: () => {
			submitted = true;
		}
	});
	const content = document.querySelector("[data-slot=dialog-content]");

	submit(content.querySelector("form"));
	await tick();
	assert.equal(submitted, false);
	assert.ok(content.textContent.includes("Name is required."));

	buttonNamed(content, "Cancel").click();
	assert.equal(await first, null);
	await tick();

	const second = promptDialog({ fields: { name: {} } });

	key("Escape");
	assert.equal(await second, null);
	await tick();
	assert.equal(document.querySelector("[data-slot=dialog-content]"), null);
	document.body.replaceChildren();
});

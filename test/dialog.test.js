import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, mount } from "@nemanjan00/qrp";
import {
	Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
	DialogFooter, DialogClose, Sheet, SheetTrigger, SheetContent, SheetTitle,
	AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogAction, AlertDialogCancel,
	Drawer, DrawerTrigger, DrawerContent
} from "../index.js";

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
const key = (name) => document.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
const pointer = (target) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }));

const buildDialog = (props = {}) => Dialog(props,
	DialogTrigger(Button("Open")),
	DialogContent(
		DialogHeader(DialogTitle("Edit profile"), DialogDescription("Make changes.")),
		DialogFooter(DialogClose(Button({ variant: "outline" }, "Cancel")))
	)
);

test("Dialog: trigger opens, content portals with aria wiring, close button closes", async () => {
	const host = document.createElement("div");

	document.body.append(host);
	host.append(buildDialog());

	const trigger = host.querySelector("button");

	assert.equal(trigger.textContent, "Open");
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
	assert.equal(document.querySelector("[data-slot=dialog-content]"), null, "content is detached while closed");

	trigger.click();

	const content = document.querySelector("[data-slot=dialog-content]");

	assert.ok(content);
	assert.equal(content.dataset.state, "open");
	assert.equal(content.getAttribute("role"), "dialog");
	assert.equal(document.getElementById(content.getAttribute("aria-labelledby")).textContent, "Edit profile");
	assert.equal(trigger.getAttribute("aria-expanded"), "true");
	assert.ok(document.querySelector("[data-slot=dialog-overlay]"));
	assert.equal(document.body.style.overflow, "hidden");

	[...content.querySelectorAll("button")].find((b) => b.textContent === "Cancel").click();
	await tick();

	assert.equal(document.querySelector("[data-slot=dialog-content]"), null);
	assert.equal(document.querySelector("[data-slot=dialog-overlay]"), null);
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
	assert.equal(document.body.style.overflow, "");
	host.remove();
});

test("Dialog: Escape and outside click dismiss; [state, key] binds two-way", async () => {
	const s = state({ open: false });

	document.body.append(buildDialog({ open: [s, "open"] }));

	s.open = true;
	assert.ok(document.querySelector("[data-slot=dialog-content]"));
	key("Escape");
	assert.equal(s.open, false);
	await tick();
	assert.equal(document.querySelector("[data-slot=dialog-content]"), null);

	s.open = true;
	await tick();
	pointer(document.querySelector("[data-slot=dialog-overlay]"));
	assert.equal(s.open, false, "overlay click is outside the content");
	await tick();
	document.body.replaceChildren();
});

test("Dialog: clicking inside does not dismiss; X button closes", async () => {
	const s = state({ open: true });

	document.body.append(buildDialog({ open: [s, "open"] }));
	await tick();

	const content = document.querySelector("[data-slot=dialog-content]");

	pointer(content.querySelector("[data-slot=dialog-title]"));
	assert.equal(s.open, true);
	content.querySelector("[data-slot=dialog-close]").click();
	assert.equal(s.open, false);
	await tick();
	document.body.replaceChildren();
});

test("Dialog: disposing the owner closes an open dialog", async () => {
	const s = state({ open: true });
	const host = document.createElement("div");

	document.body.append(host);

	const mounted = mount(host, () => buildDialog({ open: [s, "open"] }));

	assert.ok(document.querySelector("[data-slot=dialog-content]"));
	mounted.dispose();
	await tick();
	assert.equal(document.querySelector("[data-slot=dialog-content]"), null);
	document.body.replaceChildren();
});

test("Sheet: side classes and open/close", async () => {
	document.body.append(Sheet(SheetTrigger(Button("Open")), SheetContent({ side: "left" }, SheetTitle("Menu"))));
	document.querySelector("button").click();

	const content = document.querySelector("[data-slot=sheet-content]");

	assert.equal(content.dataset.side, "left");
	assert.ok(content.className.includes("slide-in-from-left"));
	key("Escape");
	await tick();
	assert.equal(document.querySelector("[data-slot=sheet-content]"), null);
	document.body.replaceChildren();
});

test("AlertDialog: role alertdialog, ignores outside click, action runs then closes", async () => {
	let confirmed = 0;

	document.body.append(AlertDialog(
		AlertDialogTrigger(Button("Delete")),
		AlertDialogContent(AlertDialogTitle("Sure?"), AlertDialogCancel("Cancel"), AlertDialogAction({ onclick: () => { confirmed += 1; } }, "Continue"))
	));
	document.querySelector("button").click();
	await tick();

	const content = document.querySelector("[data-slot=alert-dialog-content]");

	assert.equal(content.getAttribute("role"), "alertdialog");
	pointer(document.querySelector("[data-slot=alert-dialog-overlay]"));
	assert.ok(content.isConnected, "outside click is ignored");
	content.querySelector("[data-slot=alert-dialog-action]").click();
	assert.equal(confirmed, 1);
	await tick();
	assert.equal(content.isConnected, false);
	document.body.replaceChildren();
});

test("Drawer: direction attribute and dismiss event", async () => {
	document.body.append(Drawer({ direction: "right" }, DrawerTrigger(Button("Open")), DrawerContent("Body")));
	document.querySelector("button").click();

	const content = document.querySelector("[data-slot=drawer-content]");

	assert.equal(content.dataset.vaulDrawerDirection, "right");
	content.dispatchEvent(new CustomEvent("qs-dismiss"));
	await tick();
	assert.equal(content.isConnected, false);
	document.body.replaceChildren();
});

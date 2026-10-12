import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, mount } from "@nemanjan00/qrp";

import { form as qrpForm, getInput } from "@nemanjan00/qrp/forms";
import { dataGrid } from "@nemanjan00/qrp/datagrid";
import { createToasts } from "@nemanjan00/qrp/toasts";
import { emitter } from "@nemanjan00/qrp/events";
import { toastLayer, toastApi } from "../utils/toaster.js";
import {
	Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
	Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis, PaginationFor,
	Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
	Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup, ItemSeparator,
	ButtonGroup, ButtonGroupText, ButtonGroupSeparator, Button,
	InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea,
	Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend, FieldSeparator, FieldContent, FieldTitle, Input,
	useForm, Form, FormField, FormFields, FormItem, FormLabel, FormControl, FormDescription, FormMessage, registerShadcnInputs,
	Toaster, sonner, notify, LegacyToaster, useToast, legacyToast, ToastAction, useIsMobile
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const slots = (root, name) => [...root.querySelectorAll(`[data-slot=${name}]`)];

test("Breadcrumb: nav landmark, current page, default chevron separator, ellipsis", () => {
	const nav = Breadcrumb(BreadcrumbList(
		BreadcrumbItem(BreadcrumbLink({ href: "/" }, "Home")),
		BreadcrumbSeparator(),
		BreadcrumbItem(BreadcrumbEllipsis()),
		BreadcrumbSeparator("/"),
		BreadcrumbItem(BreadcrumbPage("Breadcrumb"))
	));

	assert.equal(nav.tagName, "NAV");
	assert.equal(nav.getAttribute("aria-label"), "breadcrumb");
	assert.equal(nav.querySelector("[data-slot=breadcrumb-page]").getAttribute("aria-current"), "page");

	const [chevron, slash] = slots(nav, "breadcrumb-separator");

	assert.ok(chevron.querySelector("svg.lucide-chevron-right"));
	assert.equal(slash.textContent, "/");
	assert.equal(nav.querySelector("[data-slot=breadcrumb-ellipsis] .sr-only").textContent, "More");
});

test("Pagination: active link is outline + aria-current, reactive; prev/next labelled", () => {
	const page = state({ n: 1 });
	const one = PaginationLink({ href: "#", isActive: () => page.n === 1 }, "1");
	const nav = Pagination(PaginationContent(
		PaginationItem(PaginationPrevious({ href: "#" })),
		PaginationItem(one),
		PaginationItem(PaginationEllipsis()),
		PaginationItem(PaginationNext({ href: "#" }))
	));

	assert.equal(nav.getAttribute("aria-label"), "pagination");
	assert.equal(one.getAttribute("aria-current"), "page");
	assert.equal(one.dataset.active, "true");
	assert.ok(one.className.includes("border bg-background"));
	page.n = 2;
	assert.equal(one.hasAttribute("aria-current"), false);
	assert.ok(one.className.includes("hover:bg-accent"));

	const previous = nav.querySelector("[aria-label='Go to previous page']");

	assert.ok(previous.className.includes("px-2.5"));
	assert.equal(previous.className.split(" ").includes("gap-2"), false, "gap-2 dropped in favour of gap-1");
});

test("PaginationFor: renders a qrp datagrid's page window and drives it", () => {
	const rows = Array.from({ length: 95 }, (_, i) => ({ id: i }));
	const grid = dataGrid(() => rows, { pageSizes: [10] });
	const nav = PaginationFor(grid, { span: 3 });
	const labels = () => slots(nav, "pagination-link").map((a) => a.textContent).filter((t) => /^\d+$/.test(t));

	assert.deepEqual(labels(), ["1", "2", "3"]);
	assert.equal(slots(nav, "pagination-ellipsis").length, 1, "gap after the window only");

	nav.querySelector("[aria-label='Go to next page']").click();
	nav.querySelector("[aria-label='Go to next page']").click();
	nav.querySelector("[aria-label='Go to next page']").click();
	assert.equal(grid.page.index, 3);
	assert.deepEqual(labels(), ["3", "4", "5"]);
	assert.equal(slots(nav, "pagination-ellipsis").length, 2);

	slots(nav, "pagination-link").find((a) => a.textContent === "5").click();
	assert.equal(grid.page.index, 4);
	assert.equal(nav.querySelector("[aria-current=page]").textContent, "5");
});

test("Empty and Item parts carry slots and variants", () => {
	const empty = Empty(EmptyHeader(EmptyMedia({ variant: "icon" }, "◎"), EmptyTitle("No Projects"), EmptyDescription("None yet.")), EmptyContent(Button("Create")));

	assert.equal(empty.querySelector("[data-slot=empty-icon]").dataset.variant, "icon");

	const group = ItemGroup(
		Item({ variant: "outline", size: "sm" }, ItemMedia({ variant: "icon" }, "★"), ItemContent(ItemTitle("Title"), ItemDescription("Desc")), ItemActions(Button("Go"))),
		ItemSeparator()
	);
	const item = group.querySelector("[data-slot=item]");

	assert.equal(group.getAttribute("role"), "list");
	assert.equal(item.dataset.variant, "outline");
	assert.ok(item.className.includes("border-border") && item.className.includes("py-3"));
	assert.ok(group.querySelector("[data-slot=item-separator]"));
	assert.equal(Item({ as: "a", href: "/x" }, "link").tagName, "A");
});

test("ButtonGroup: role group, orientation, merged separator classes", () => {
	const group = ButtonGroup({ orientation: "vertical" }, Button("A"), ButtonGroupSeparator(), ButtonGroupText("t"));
	const separator = group.querySelector("[data-slot=button-group-separator]");

	assert.equal(group.getAttribute("role"), "group");
	assert.equal(group.dataset.orientation, "vertical");
	assert.ok(group.className.includes("flex-col"));
	assert.ok(separator.className.includes("bg-input"));
	assert.equal(separator.className.includes("bg-border"), false);
	assert.equal(separator.className.includes("h-full"), false);
});

test("InputGroup: addon click focuses the input; control slot; button sizes", () => {
	const s = state({ q: "" });
	const input = InputGroupInput({ placeholder: "Search…", bind: [s, "q"] });
	const addon = InputGroupAddon({ align: "inline-end" }, InputGroupText("12 results"), InputGroupButton({ size: "icon-xs" }, "×"));
	const group = InputGroup(input, addon);

	document.body.append(group);
	addon.querySelector("[data-slot=input-group-text]").click();
	assert.equal(document.activeElement, input);
	assert.equal(input.dataset.slot, "input-group-control");
	assert.equal(addon.dataset.align, "inline-end");

	const button = addon.querySelector("button");

	assert.equal(button.dataset.size, "icon-xs");
	assert.ok(button.className.includes("size-6"));
	assert.equal(InputGroupTextarea().dataset.slot, "input-group-control");
	group.remove();
});

test("Field: orientation, label merge, reactive deduped errors", () => {
	const errors = state({ list: [] });
	const error = FieldError({ errors: () => errors.list });
	const label = FieldLabel({ for: "e" }, "Email");
	const field = Field({ orientation: "horizontal" }, label, Input({ id: "e" }), FieldDescription("hint"), error);

	assert.equal(field.getAttribute("role"), "group");
	assert.equal(field.dataset.orientation, "horizontal");
	assert.equal(label.dataset.slot, "field-label");
	assert.ok(label.className.includes("leading-snug"));
	assert.equal(label.className.split(" ").includes("leading-none"), false);
	assert.equal(error.hidden, true);

	errors.list = [{ message: "Required" }, { message: "Required" }];
	assert.equal(error.hidden, false);
	assert.equal(error.textContent, "Required");
	errors.list = ["Too short", "Not an email"];
	assert.equal(error.querySelectorAll("li").length, 2);

	const set = FieldSet(FieldLegend({ variant: "label" }, "Plan"), FieldGroup(Field(FieldContent(FieldTitle("t")))), FieldSeparator("Or"));

	assert.equal(set.tagName, "FIELDSET");
	assert.equal(set.querySelector("[data-slot=field-legend]").dataset.variant, "label");
	assert.equal(set.querySelector("[data-slot=field-separator]").dataset.content, "true");
});

test("Form: qrp validate schema, aria wiring, submit only when valid, live revalidation", async () => {
	const submitted = [];
	const form = useForm({
		values: { username: "", age: "" },
		schema: {
			username: { required: true, min: 2, message: "Username must be at least 2 characters." },
			age: { type: "number", min: 18 }
		}
	});
	const node = Form({ form, onSubmit: (values) => submitted.push(values) },
		FormField({ form, name: "username", render: (field) => FormItem(
			FormLabel("Username"),
			FormControl(Input(Object.assign({ placeholder: "shadcn" }, field))),
			FormDescription("Public name."),
			FormMessage()
		) }),
		FormField({ form, name: "age", type: "number", label: "Age" }),
		Button({ type: "submit" }, "Submit")
	);

	document.body.append(node);

	const input = node.querySelector("input[placeholder=shadcn]");
	const label = node.querySelector("[data-slot=form-label]");
	const message = node.querySelector("[data-slot=form-message]");

	assert.equal(label.getAttribute("for"), input.id);
	assert.equal(input.getAttribute("aria-invalid"), "false");
	assert.equal(message.hidden, true);

	node.dispatchEvent(new Event("submit", { cancelable: true }));
	await tick();
	assert.equal(submitted.length, 0);
	assert.equal(form.errors.username, "Username must be at least 2 characters.");
	assert.equal(input.getAttribute("aria-invalid"), "true");
	assert.ok(input.getAttribute("aria-describedby").includes(message.id));
	assert.equal(message.hidden, false);
	assert.equal(label.dataset.error, "true");

	input.value = "ada";
	input.dispatchEvent(new Event("input"));
	assert.equal(form.errors.username, undefined, "re-validates live after a submit attempt");

	const age = node.querySelectorAll("input")[1];

	age.value = "42";
	age.dispatchEvent(new Event("input"));
	node.dispatchEvent(new Event("submit", { cancelable: true }));
	await tick();
	assert.deepEqual(submitted, [{ username: "ada", age: 42 }]);
	node.remove();
});

test("FormFields + registerShadcnInputs: qrp field specs render shadcn controls, qrp form() too", () => {
	registerShadcnInputs();

	const form = useForm({ values: { email: "", plan: "pro", agree: false } });
	const node = FormFields({ form, fields: {
		email: { name: "Email", type: "email", placeholder: "m@example.com", description: "Work email." },
		plan: { name: "Plan", type: "select", options: { free: "Free", pro: "Pro" } },
		agree: { name: "I agree", type: "checkbox" }
	} });
	const email = node.querySelector("input[type=email]");

	assert.equal(email.getAttribute("data-slot"), "input", "FormControl keeps the control's own slot");
	assert.ok(email.id && email.hasAttribute("aria-describedby"), "FormControl still wires id + aria");
	assert.ok(email.className.includes("rounded-md border border-input"));
	const trigger = node.querySelector("[data-slot=select-trigger]");

	assert.ok(trigger, "select specs render the shadcn Select");
	assert.equal(trigger.querySelector("[data-slot=select-value]").textContent, "Pro");

	const agree = node.querySelector("[data-slot=checkbox]");

	assert.equal(agree.getAttribute("role"), "checkbox");
	assert.equal(agree.dataset.state, "unchecked");
	agree.click();
	assert.equal(form.values.agree, true, "the shadcn Checkbox is two-way bound to the form");

	const settings = state({ name: "R2" });
	const plain = qrpForm({ settings, fields: { name: { name: "Name", type: "text" } } });

	assert.ok(plain.querySelector("input").className.includes("border-input"), "qrp form() now renders shadcn inputs");
	assert.equal(typeof getInput("textarea"), "function");
});

test("Sonner: toast() options, notify from qrp bus, promise updates in place, exit then removal", async () => {
	const host = document.createElement("div");

	document.body.append(host);

	// A layer like the default one (global bus, so notify reaches it) but with a
	// short exit, so the test doesn't wait out the 400ms transition.
	const layer = toastLayer(createToasts({ timeout: 0, exitMs: 10 }), { duration: 4000 });
	const toast = toastApi(layer);
	const mounted = mount(host, () => Toaster({ closeButton: true, richColors: true, toaster: layer }));
	const list = () => [...host.querySelectorAll("[data-sonner-toast]")];

	const id = toast("Event has been created", { description: "Sunday", action: { label: "Undo", onClick: () => {} } });

	assert.equal(list().length, 1);

	const first = list()[0];

	assert.equal(first.querySelector("[data-title]").textContent, "Event has been created");
	assert.equal(first.querySelector("[data-description]").textContent, "Sunday");
	assert.ok(first.querySelector("[data-close-button]"));

	notify.success("Saved from qrp");
	await tick();
	assert.equal(list().length, 2);
	assert.ok(list().some((li) => li.querySelector("[data-title]").textContent === "Saved from qrp" && li.dataset.type === "success"));

	let settle;
	const pending = new Promise((resolve) => { settle = resolve; });
	const promised = toast.promise(pending, { loading: "Loading…", success: (v) => `Done ${v}` });
	const node = list().find((li) => li.dataset.type === "loading");

	assert.ok(node);
	settle(7);
	await tick();
	assert.equal(node.dataset.type, "success", "same node, updated in place");
	assert.equal(node.querySelector("[data-title]").textContent, "Done 7");

	first.querySelector("[data-action]").click();
	assert.equal(first.dataset.removed, "true", "exit phase first");
	assert.ok(first.isConnected);
	await tick(30);
	assert.equal(first.isConnected, false);

	toast.dismiss();
	await tick(30);
	assert.equal(list().length, 0);
	assert.ok(id && promised);
	assert.ok(sonner.controller.store, "the default layer sits on a qrp controller");
	mounted.dispose();
	host.remove();
});

test("Sonner: auto-dismiss honours duration and pauses while hovered", async () => {
	const host = document.createElement("div");

	document.body.append(host);

	const layer = toastLayer(createToasts({ timeout: 0, exitMs: 5, bus: emitter() }));
	const toast = toastApi(layer);
	const mounted = mount(host, () => Toaster({ toaster: layer }));

	toast("Short", { duration: 30 });

	const stack = host.querySelector("[data-sonner-toaster]");

	stack.dispatchEvent(new Event("pointerenter"));
	await tick(60);
	assert.equal(host.querySelectorAll("[data-sonner-toast]").length, 1, "paused while hovered");
	stack.dispatchEvent(new Event("pointerleave"));
	await tick(60);
	assert.equal(host.querySelectorAll("[data-sonner-toast]").length, 0);
	mounted.dispose();
	host.remove();
});

test("Sonner: untitled toasts show no title; onAutoClose / onDismiss fire; limit drops the oldest", async () => {
	const layer = toastLayer(createToasts({ timeout: 0, exitMs: 5, bus: emitter() }), { limit: 2 });
	const toast = toastApi(layer);
	const host = document.createElement("div");
	const events = [];

	document.body.append(host);

	const mounted = mount(host, () => Toaster({ toaster: layer }));

	toast.loading(undefined, { description: "Working" });
	assert.equal(host.querySelector("[data-title]").textContent, "", "no 'loading' placeholder title");

	toast("Auto", { duration: 10, onAutoClose: () => events.push("auto") });
	toast("Manual", { onDismiss: () => events.push("dismiss") });
	assert.equal(toast.getToasts().length, 2, "limit 2: the oldest left");

	await tick(30);
	toast.dismiss();
	assert.deepEqual(events, ["auto", "dismiss"]);
	await tick(20);
	assert.equal(host.querySelectorAll("[data-sonner-toast]").length, 0);
	mounted.dispose();
	host.remove();
});

test("Legacy toast: useToast(), limit 1, destructive variant, action dismisses", async () => {
	const host = document.createElement("div");

	document.body.append(host);

	const mounted = mount(host, () => LegacyToaster());
	const { toast: show } = useToast();

	show({ title: "First" });
	const handle = show({ title: "Uh oh!", description: "Problem.", variant: "destructive", action: ToastAction({ altText: "Try again" }, "Try again") });
	const node = () => host.querySelector("[data-slot=toast][data-state=open]");

	assert.equal(useToast().toasts.length, 1, "TOAST_LIMIT is 1");
	assert.ok(node().className.includes("destructive"));
	assert.equal(node().querySelector("[data-slot=toast-title]").textContent, "Uh oh!");

	node().querySelector("[data-slot=toast-action]").click();
	await tick(250);
	assert.equal(host.querySelectorAll("[data-slot=toast]").length, 0);
	assert.equal(typeof handle.dismiss, "function");
	assert.equal(typeof legacyToast, "function");
	mounted.dispose();
	host.remove();
});

test("useIsMobile reads qrp media()", () => {
	let read;
	const mounted = mount(document.createElement("div"), () => {
		read = useIsMobile();
	});

	assert.equal(typeof read(), "boolean");
	assert.equal(typeof read.media.matches, "boolean");
	mounted.dispose();
});

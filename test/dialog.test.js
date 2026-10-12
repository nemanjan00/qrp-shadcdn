import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, mount } from "@nemanjan00/qrp";
import {
	Button, Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription,
	DialogFooter, DialogClose, Sheet, SheetTrigger, SheetContent, SheetTitle,
	AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogTitle, AlertDialogAction, AlertDialogCancel,
	Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Toaster, toast,
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

test("reopening during the exit animation keeps the dialog (stale close must not remove the reused content)", async () => {
	const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
	// Pretend closed nodes run a 60ms exit animation, so animateOut really waits.
	const realStyle = globalThis.getComputedStyle;

	globalThis.getComputedStyle = (node) => {
		const style = realStyle(node);
		const closing = node.getAttribute && node.getAttribute("data-state") === "closed";

		return new Proxy(style, {
			get: (target, key) => {
				if(key === "animationName") {
					return closing ? "exit" : "none";
				}

				if(key === "animationDuration") {
					return closing ? "0.06s" : "0s";
				}

				const value = target[key];

				return typeof value === "function" ? value.bind(target) : value;
			}
		});
	};

	const content = () => document.querySelector("[data-slot=dialog-content]");
	const overlays = () => document.querySelectorAll("[data-slot=dialog-overlay]").length;

	try {
		const s = state({ open: true });

		document.body.append(buildDialog({ open: [s, "open"] }));
		await wait(5);

		s.open = false;      // exit animation starts (60ms)
		await wait(10);
		s.open = true;       // reopen before it finishes
		await wait(200);     // long past the stale close's animation + safety timer

		// Compare DOM nodes with assert.ok — a failing assert.equal diffs whole nodes.
		assert.ok(content() !== null && content().isConnected, "content is still in the document");
		assert.equal(content().dataset.state, "open");
		assert.equal(overlays(), 1, "exactly one backdrop");
		assert.equal(document.body.style.overflow, "hidden", "scroll stays locked while open");

		s.open = false;
		await wait(200);
		assert.ok(content() === null, "content leaves after the final close");
		assert.equal(overlays(), 0);
		assert.equal(document.body.style.overflow, "", "scroll unlocked after the final close");
	} finally {
		globalThis.getComputedStyle = realStyle;
		document.body.replaceChildren();
	}
});

test("a modal makes the rest of the page inert and restores it; focus returns to the trigger", async () => {
	const app = document.createElement("main");
	const already = document.createElement("aside");

	already.setAttribute("inert", "");
	document.body.append(app, already);
	app.append(buildDialog());

	const trigger = app.querySelector("button");

	trigger.focus();
	trigger.click();

	const content = document.querySelector("[data-slot=dialog-content]");

	assert.ok(app.hasAttribute("inert"), "the page behind is inert");
	assert.ok(!content.hasAttribute("inert") && !content.closest("[inert]"), "the dialog is not");
	assert.ok(!document.querySelector("[data-slot=dialog-overlay]").hasAttribute("inert"));

	key("Escape");
	await tick();
	assert.ok(!app.hasAttribute("inert"), "restored on close");
	assert.ok(already.hasAttribute("inert"), "an element that was inert before stays inert");
	assert.ok(document.activeElement === trigger, "focus went back to the trigger");
	document.body.replaceChildren();
});

test("nested modals: closing the inner one keeps the outer page inert", async () => {
	const outer = state({ open: true });
	const inner = state({ open: false });
	const app = document.createElement("main");

	document.body.append(app);
	app.append(Dialog({ open: [outer, "open"] }, DialogContent(DialogTitle("Outer"),
		AlertDialog({ open: [inner, "open"] }, AlertDialogContent(AlertDialogTitle("Inner"))))));
	await tick();
	inner.open = true;
	await tick();

	const outerContent = document.querySelector("[data-slot=dialog-content]");

	assert.ok(outerContent.hasAttribute("inert"), "the outer dialog is inert behind the inner one");
	inner.open = false;
	await tick();
	assert.ok(!outerContent.hasAttribute("inert"), "outer dialog usable again");
	assert.ok(app.hasAttribute("inert"), "page still inert behind the outer dialog");
	outer.open = false;
	await tick();
	assert.ok(!app.hasAttribute("inert"));
	document.body.replaceChildren();
});

test("modal scroll lock: scrollbar gap is padded; wheel/touch blocked outside the modal only", async () => {
	const realInner = Object.getOwnPropertyDescriptor(window, "innerWidth");

	Object.defineProperty(window, "innerWidth", { configurable: true, value: document.documentElement.clientWidth + 15 });

	try {
		const s = state({ open: true });

		document.body.append(buildDialog({ open: [s, "open"] }));
		await tick();
		assert.equal(document.body.style.paddingRight, "15px", "compensates the 15px scrollbar");

		const outside = new Event("wheel", { cancelable: true, bubbles: true });
		const inside = new Event("wheel", { cancelable: true, bubbles: true });

		document.body.dispatchEvent(outside);
		document.querySelector("[data-slot=dialog-title]").dispatchEvent(inside);
		assert.equal(outside.defaultPrevented, true, "page scroll blocked");
		assert.equal(inside.defaultPrevented, false, "the modal itself still scrolls");

		s.open = false;
		await tick();
		assert.equal(document.body.style.paddingRight, "");
		assert.equal(document.body.style.overflow, "");

		const after = new Event("wheel", { cancelable: true, bubbles: true });

		document.body.dispatchEvent(after);
		assert.equal(after.defaultPrevented, false, "guard removed");
	} finally {
		if(realInner) {
			Object.defineProperty(window, "innerWidth", realInner);
		}

		document.body.replaceChildren();
	}
});

test("a popup opened inside a modal can still scroll (wheel/touch over it isn't blocked)", async () => {
	const dialog = state({ open: true });
	const select = state({ open: false });

	document.body.append(Dialog({ open: [dialog, "open"] }, DialogContent(DialogTitle("Pick"),
		Select({ open: [select, "open"] },
			SelectTrigger(SelectValue({ placeholder: "Fruit" })),
			SelectContent(...Array.from({ length: 30 }, (_, i) => SelectItem({ value: `f${i}` }, `Fruit ${i}`)))))));
	await tick();
	select.open = true;
	await tick();

	const list = document.querySelector("[data-slot=select-content]");
	const overList = new Event("wheel", { cancelable: true, bubbles: true });
	const overPage = new Event("wheel", { cancelable: true, bubbles: true });

	assert.ok(list !== null, "select is open");
	list.querySelector("[data-slot=select-item]").dispatchEvent(overList);
	document.body.dispatchEvent(overPage);
	assert.equal(overList.defaultPrevented, false, "the select list scrolls");
	assert.equal(overPage.defaultPrevented, true, "the page behind still doesn't");
	document.body.replaceChildren();
});

test("toasts stay interactive while a modal is open", async () => {
	const app = document.createElement("main");
	const s = state({ open: false });

	document.body.append(app);
	mount(app, () => [Toaster(), buildDialog({ open: [s, "open"] })]);
	s.open = true;
	await tick();
	toast("Saved");
	await tick();

	const toaster = document.querySelector("[data-sonner-toaster]");

	assert.ok(toaster.closest("[inert]") === null, "the toast region is not inert");
	assert.ok(document.querySelector("[data-slot=dialog-content]").closest("[inert]") === null);
	assert.ok([...app.children].some((child) => child.hasAttribute("inert")), "the rest of the app is");
	s.open = false;
	await tick();
	toast.dismiss();
	document.body.replaceChildren();
});

test("clicking a toast doesn't dismiss the open dialog", async () => {
	const app = document.createElement("main");
	const s = state({ open: false });

	document.body.append(app);
	mount(app, () => [Toaster(), buildDialog({ open: [s, "open"] })]);
	s.open = true;
	await tick();
	toast("Saved");
	await tick();
	pointer(document.querySelector("[data-sonner-toast]"));
	assert.equal(s.open, true, "the dialog stays open");
	pointer(document.body);
	assert.equal(s.open, false, "a real outside click still dismisses");
	await tick();
	toast.dismiss();
	document.body.replaceChildren();
});

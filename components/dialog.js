/**
 * components/dialog.js — Dialog and its parts, plus `modalRoot`, the factory
 * Sheet / AlertDialog / Drawer are built from.
 *
 * Same composition as shadcn:
 *
 *   Dialog(
 *     DialogTrigger(Button({ variant: "outline" }, "Edit profile")),
 *     DialogContent(
 *       DialogHeader(DialogTitle("Edit profile"), DialogDescription("…")),
 *       …,
 *       DialogFooter(DialogClose(Button({ variant: "outline" }, "Cancel")), Button("Save"))
 *     )
 *   )
 *
 * The root returns its trigger(s); the content stays detached until opened.
 * Open state: `open` (bool, `[state, "key"]` two-way, or a thunk), `defaultOpen`,
 * `onOpenChange(open)`.
 * https://ui.shadcn.com/docs/components/dialog
 */

import { el, effect } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, uid, roleMarker, withRole, splitContent } from "../utils/index.js";
import { layerWhen, openState } from "../utils/layer.js";
import { XIcon } from "../icons/index.js";

const OVERLAY = "fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0";

const labelBy = (content, name) => {
	[["title", "aria-labelledby"], ["description", "aria-describedby"]].forEach(([kind, aria]) => {
		const node = content.querySelector(`[data-slot="${name}-${kind}"]`);

		if(node) {
			node.id = node.id || uid(`${name}-${kind}`);
			content.setAttribute(aria, node.id);
		}
	});
};

/**
 * Build a modal root (Dialog, Sheet, AlertDialog, Drawer).
 *
 * @param {string} name slot prefix: "dialog", "sheet", …
 * @param {object} [options]
 * @param {string} [options.role] content role (default "dialog")
 * @param {boolean} [options.outside] close on outside click (default true)
 * @param {Function} [options.prepare] (content, props) => void, before first open
 * @returns {Function} root component
 */
export const modalRoot = (name, options = {}) => (...args) => {
	const { props, children } = parseArgs(args);
	const open = openState(props);
	const { fragment, content } = splitContent(children, `${name}-content`);
	const triggers = withRole(fragment, `${name}-trigger`);

	if(content) {
		content.id = content.id || uid(name);
		content.setAttribute("role", options.role || "dialog");
		content.setAttribute("aria-modal", "true");
		content.setAttribute("tabindex", "-1");
		labelBy(content, name);

		content.addEventListener("click", (event) => {
			const close = event.target.closest(`[data-qs-role="${name}-close"]`);

			if(close && content.contains(close)) {
				open.set(false);
			}
		});

		// Programmatic dismissal from inside (e.g. the Drawer's drag gesture).
		content.addEventListener("qs-dismiss", () => open.set(false));

		if(options.prepare) {
			options.prepare(content, props);
		}
	}

	triggers.forEach((trigger) => {
		trigger.setAttribute("aria-haspopup", "dialog");

		if(content) {
			trigger.setAttribute("aria-controls", content.id);
		}

		effect(() => {
			const isOpen = Boolean(open.get());

			trigger.setAttribute("aria-expanded", String(isOpen));
			trigger.setAttribute("data-state", isOpen ? "open" : "closed");
		});

		trigger.addEventListener("click", () => open.set(true));
	});

	if(content) {
		layerWhen(open, () => ({
			content,
			extras: [el("div", { "data-slot": `${name}-overlay`, class: OVERLAY })],
			inside: triggers,
			modal: true,
			outside: options.outside !== false
		}));
	}

	return fragment;
};

export const Dialog = modalRoot("dialog");
export const DialogTrigger = roleMarker("dialog-trigger");
export const DialogClose = roleMarker("dialog-close");

/** The close "X" every modal content renders unless `showCloseButton: false`. */
export const closeX = (name, classes) => el("button", {
	type: "button",
	"data-slot": `${name}-close`,
	"data-qs-role": `${name}-close`,
	class: classes
}, XIcon(), el("span", { class: "sr-only" }, "Close"));

export const DialogContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "showCloseButton"]);
	const showClose = own.showCloseButton !== false;

	return el("div", Object.assign({ "data-slot": "dialog-content" }, rest, {
		class: cn("fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg", own.class)
	}), ...children, showClose ? closeX("dialog", "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4") : null);
};

export const DialogHeader = part("div", "dialog-header", "flex flex-col gap-2 text-center sm:text-left");

export const DialogFooter = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "showCloseButton"]);
	const close = own.showCloseButton ? el("button", {
		type: "button",
		"data-qs-role": "dialog-close",
		"data-slot": "button",
		class: "inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium whitespace-nowrap shadow-xs transition-all outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:border-input dark:bg-input/30 dark:hover:bg-input/50"
	}, "Close") : null;

	return el("div", Object.assign({ "data-slot": "dialog-footer" }, rest, {
		class: cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", own.class)
	}), ...children, close);
};

export const DialogTitle = part("h2", "dialog-title", "text-lg leading-none font-semibold");
export const DialogDescription = part("p", "dialog-description", "text-sm text-muted-foreground");

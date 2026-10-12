/**
 * components/toast.js — the legacy shadcn toast (Radix Toast look), as shipped
 * by shadcdn: Toast, ToastTitle, ToastDescription, ToastAction, ToastClose,
 * ToastViewport, ToastProvider, plus the `useToast()` hook API.
 *
 *   mount(document.body, () => LegacyToaster());     // once
 *   const { toast } = useToast();
 *   toast({ title: "Uh oh!", description: "There was a problem.", variant: "destructive",
 *     action: ToastAction({ altText: "Try again", onclick: retry }, "Try again") });
 *
 * Naming: the bundle also ships Sonner, whose `Toaster` / `toast` are shadcn's
 * current default. Two `export *` of one name cancel each other out in ES
 * modules, so this module's are `LegacyToaster` and `legacyToast` — and
 * `useToast().toast` is the legacy one, exactly as in shadcn.
 * https://ui.shadcn.com/docs/components/toast
 */

import { el, list, untracked } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, read, variants, fragmentOf } from "../utils/index.js";
import { createToasts } from "@nemanjan00/qrp/toasts";
import { emitter } from "@nemanjan00/qrp/events";
import { toastLayer } from "../utils/toaster.js";
import { XIcon } from "../icons/index.js";

const TOAST_LIMIT = 1;
const TOAST_DURATION = 5000;
// The exit animation (tw-animate's default 150ms) plus a frame of slack; the
// closed toast holds its last frame until qrp removes it.
const EXIT_MS = 200;

/**
 * The store behind `useToast()` / `legacyToast()`: a qrp toasts controller on a
 * PRIVATE emitter — `notify.*` on the global bus belongs to the Sonner stack.
 * qrp runs the countdown and the exit phase.
 */
export const legacyToaster = toastLayer(createToasts({ timeout: 0, exitMs: EXIT_MS, bus: emitter() }), {
	limit: TOAST_LIMIT,
	duration: TOAST_DURATION
});

export const ToastProvider = (...args) => fragmentOf(parseArgs(args).children);

export const ToastViewport = part("ol", "toast-viewport", "fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:top-auto sm:right-0 sm:bottom-0 sm:flex-col md:max-w-[420px]", {
	attrs: { tabindex: "-1" }
});

// v4 themes have no --destructive-foreground; white is what v4 uses on destructive.
export const toastVariants = variants("group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full", {
	variants: {
		variant: {
			default: "border bg-background text-foreground",
			destructive: "destructive group border-destructive bg-destructive text-white"
		}
	},
	defaultVariants: { variant: "default" }
});

/** `Toast({ variant: "default" | "destructive" }, …)` — one toast's box. */
export const Toast = part("li", "toast", toastVariants, {
	own: ["variant"],
	attrs: { role: "status", "aria-live": "polite", "aria-atomic": "true", tabindex: "0", "data-state": "open" }
});

/** `ToastAction({ altText, onclick }, "Undo")` — `altText` names it for screen readers. */
export const ToastAction = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "altText"]);

	return el("button", Object.assign({ type: "button", "data-slot": "toast-action", "aria-label": own.altText, "data-toast-action": "" }, rest, {
		class: cn("inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-white group-[.destructive]:focus:ring-destructive", own.class)
	}), ...children);
};

export const ToastClose = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("button", Object.assign({ type: "button", "data-slot": "toast-close", "toast-close": "", "aria-label": "Close" }, rest, {
		class: cn("absolute top-2 right-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground focus:opacity-100 focus:ring-2 focus:outline-none group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600", own.class)
	}), XIcon({ class: "h-4 w-4" }));
};

export const ToastTitle = part("div", "toast-title", "text-sm font-semibold");
export const ToastDescription = part("div", "toast-description", "text-sm opacity-90");

/**
 * Show a legacy toast.
 *
 * @param {object} props `{ title, description, action, variant: "default" | "destructive", duration }`
 * @returns {{ id: number, dismiss: Function, update: Function }}
 */
export const legacyToast = (props = {}) => {
	const id = legacyToaster.add(Object.assign({}, props, { variant: props.variant || "default" }));

	return {
		id,
		dismiss: () => legacyToaster.dismiss(id),
		update: (next) => legacyToaster.update(id, next)
	};
};

/**
 * The hook's shape: `{ toasts, toast, dismiss }`. `toasts` is a reactive getter
 * (read it inside a thunk/effect to track it).
 *
 * @returns {object}
 */
export const useToast = () => ({
	get toasts() {
		return legacyToaster.items().filter((item) => !item.removed);
	},
	toast: legacyToast,
	dismiss: (id) => legacyToaster.dismiss(id)
});

/** Renders the legacy toasts; mount once. */
export const LegacyToaster = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "toaster"]);
	const engine = own.toaster || legacyToaster;

	const renderToast = (item) => {
		const node = Toast({
			variant: untracked(() => item.variant),
			"data-state": () => (item.removed ? "closed" : "open"),
			onpointerenter: () => engine.pause(),
			onpointerleave: () => engine.resume(),
			onclick: (event) => {
				// Close and action buttons both dismiss, as in Radix Toast.
				if(event.target.closest("[toast-close], [data-toast-action]")) {
					engine.dismiss(item.id);
				}
			}
		},
		el("div", { class: "grid gap-1" },
			() => (item.title && !item.untitled ? ToastTitle(read(item.title)) : null),
			() => (item.description ? ToastDescription(read(item.description)) : null)
		),
		() => item.action || null,
		ToastClose());

		return node;
	};

	return el("div", Object.assign({ "data-slot": "toaster", role: "region", "aria-label": "Notifications" }, rest),
		ToastViewport({ class: own.class }, list(() => engine.items(), (item) => item.id, renderToast))
	);
};

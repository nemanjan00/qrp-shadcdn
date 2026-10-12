/**
 * components/alert-dialog.js — AlertDialog: a modal that demands a choice.
 * No outside-click dismissal; AlertDialogAction / AlertDialogCancel close it
 * (pass `onclick` to the action to do the work).
 * https://ui.shadcn.com/docs/components/alert-dialog
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, roleMarker } from "../utils/index.js";
import { modalRoot } from "./dialog.js";
import { buttonVariants } from "./button.js";

export const AlertDialog = modalRoot("alert-dialog", { role: "alertdialog", outside: false });
export const AlertDialogTrigger = roleMarker("alert-dialog-trigger");

export const AlertDialogContent = part("div", "alert-dialog-content", "group/alert-dialog-content fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 data-[size=sm]:max-w-xs data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[size=default]:sm:max-w-lg", {
	own: ["size"],
	data: (own) => ({ "data-size": own.size || "default" })
});

export const AlertDialogHeader = part("div", "alert-dialog-header", "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-6 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]");
export const AlertDialogFooter = part("div", "alert-dialog-footer", "flex flex-col-reverse gap-2 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end");
export const AlertDialogTitle = part("h2", "alert-dialog-title", "text-lg font-semibold sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2");
export const AlertDialogDescription = part("p", "alert-dialog-description", "text-sm text-muted-foreground");
export const AlertDialogMedia = part("div", "alert-dialog-media", "mb-2 inline-flex size-16 items-center justify-center rounded-md bg-muted sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-8");

const closingButton = (slot, defaultVariant) => (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "size"]);

	return el("button", Object.assign({ type: "button", "data-slot": slot, "data-qs-role": "alert-dialog-close" }, rest, {
		class: buttonVariants({ variant: own.variant || defaultVariant, size: own.size, class: own.class })
	}), ...children);
};

export const AlertDialogAction = closingButton("alert-dialog-action", "default");
export const AlertDialogCancel = closingButton("alert-dialog-cancel", "outline");

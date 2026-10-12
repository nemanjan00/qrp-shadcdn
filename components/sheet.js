/**
 * components/sheet.js — Sheet: a Dialog that slides in from an edge.
 * `SheetContent({ side: "top" | "right" | "bottom" | "left" })`, default right.
 * https://ui.shadcn.com/docs/components/sheet
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, roleMarker } from "../utils/index.js";
import { modalRoot, closeX } from "./dialog.js";

const SIDES = {
	right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
	left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
	top: "inset-x-0 top-0 h-auto border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
	bottom: "inset-x-0 bottom-0 h-auto border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom"
};

export const Sheet = modalRoot("sheet");
export const SheetTrigger = roleMarker("sheet-trigger");
export const SheetClose = roleMarker("sheet-close");

export const SheetContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "side", "showCloseButton"]);
	const side = own.side || "right";

	return el("div", Object.assign({ "data-slot": "sheet-content", "data-side": side }, rest, {
		class: cn("fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500", SIDES[side], own.class)
	}), ...children, own.showCloseButton === false ? null : closeX("sheet", "absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary [&_svg]:size-4"));
};

export const SheetHeader = part("div", "sheet-header", "flex flex-col gap-1.5 p-4");
export const SheetFooter = part("div", "sheet-footer", "mt-auto flex flex-col gap-2 p-4");
export const SheetTitle = part("h2", "sheet-title", "font-semibold text-foreground");
export const SheetDescription = part("p", "sheet-description", "text-sm text-muted-foreground");

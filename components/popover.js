/**
 * components/popover.js — Popover.
 *
 *   Popover(
 *     PopoverTrigger(Button({ variant: "outline" }, "Open popover")),
 *     PopoverContent({ side: "bottom", align: "start" }, …)
 *   )
 *
 * `PopoverAnchor(el)` positions against another element than the trigger.
 * `PopoverClose(child)` closes from inside. Open state as for Dialog.
 * https://ui.shadcn.com/docs/components/popover
 */

import { part, roleMarker } from "../utils/index.js";
import { popupRoot, contentPart } from "../utils/popup.js";

export const Popover = popupRoot("popover");
export const PopoverTrigger = roleMarker("popover-trigger");
export const PopoverAnchor = roleMarker("popover-anchor", "div");
export const PopoverClose = roleMarker("popover-close");

export const PopoverContent = contentPart("popover-content", "z-50 w-72 origin-(--qrp-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", { align: "center", sideOffset: 4 });

export const PopoverHeader = part("div", "popover-header", "flex flex-col gap-1 text-sm");
export const PopoverTitle = part("h2", "popover-title", "font-medium");
export const PopoverDescription = part("p", "popover-description", "text-muted-foreground");

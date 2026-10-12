/**
 * components/tooltip.js — Tooltip.
 *
 *   Tooltip(TooltipTrigger(Button({ variant: "outline" }, "Hover")), TooltipContent("Add to library"))
 *
 * Opens on hover or keyboard focus. `Tooltip({ delayDuration: 300 })` delays
 * opening (shadcn's default is 0). `TooltipProvider` is accepted for
 * copy-paste compatibility and simply renders its children.
 * https://ui.shadcn.com/docs/components/tooltip
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, roleMarker, fragmentOf } from "../utils/index.js";
import { popupRoot, contentPart } from "../utils/popup.js";

export const Tooltip = popupRoot("tooltip", { role: "tooltip", mode: "hover", focus: false, closeDelay: 0 });
export const TooltipTrigger = roleMarker("tooltip-trigger");

const arrow = () => el("span", {
	"data-slot": "tooltip-arrow",
	"aria-hidden": "true",
	class: "absolute z-50 size-2.5 rotate-45 rounded-[2px] bg-foreground group-data-[side=top]/tooltip:-bottom-1 group-data-[side=top]/tooltip:left-[calc(50%-5px)] group-data-[side=bottom]/tooltip:-top-1 group-data-[side=bottom]/tooltip:left-[calc(50%-5px)] group-data-[side=left]/tooltip:top-[calc(50%-5px)] group-data-[side=left]/tooltip:-right-1 group-data-[side=right]/tooltip:top-[calc(50%-5px)] group-data-[side=right]/tooltip:-left-1"
});

export const TooltipContent = contentPart("tooltip-content", "group/tooltip z-50 w-fit origin-(--qs-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", { side: "top", sideOffset: 6 }, arrow);

export const TooltipProvider = (...args) => fragmentOf(parseArgs(args).children);

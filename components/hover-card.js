/**
 * components/hover-card.js — HoverCard: a preview card on hover, for sighted
 * users (it stays open while the pointer is over the card).
 * `HoverCard({ openDelay = 700, closeDelay = 300 })`.
 * https://ui.shadcn.com/docs/components/hover-card
 */

import { roleMarker } from "../utils/index.js";
import { popupRoot, contentPart } from "../utils/popup.js";

export const HoverCard = popupRoot("hover-card", { role: null, mode: "hover", focus: false, openDelay: 700, closeDelay: 300, interactive: true });
export const HoverCardTrigger = roleMarker("hover-card-trigger", "a");

export const HoverCardContent = contentPart("hover-card-content", "z-50 w-64 origin-(--qs-transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95", { align: "center", sideOffset: 4 });

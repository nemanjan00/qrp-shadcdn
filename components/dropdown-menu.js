/**
 * components/dropdown-menu.js — DropdownMenu and its parts.
 *
 *   DropdownMenu(
 *     DropdownMenuTrigger(Button({ variant: "outline" }, "Open")),
 *     DropdownMenuContent({ align: "start" },
 *       DropdownMenuLabel("My Account"),
 *       DropdownMenuItem({ onSelect: () => … }, "Profile", DropdownMenuShortcut("⇧⌘P")),
 *       DropdownMenuSub(DropdownMenuSubTrigger("Invite users"), DropdownMenuSubContent(…))
 *     )
 *   )
 *
 * Open state as for Dialog (`open`, `defaultOpen`, `onOpenChange`). Items take
 * `onSelect(event)` (call `event.preventDefault()` to keep the menu open),
 * `disabled`, `inset`, `variant: "destructive"`. CheckboxItem takes `checked`
 * (bool, `[state, "key"]` or thunk) + `onCheckedChange`; RadioGroup takes
 * `value` + `onValueChange`, RadioItem a `value`.
 * https://ui.shadcn.com/docs/components/dropdown-menu
 */

import { roleMarker } from "../utils/index.js";
import { popupRoot } from "../utils/popup.js";
import { menuParts, registerRoot, triggerKeys } from "../utils/menu.js";

const ITEM = "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!";
const CHECK_ITEM = "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const parts = menuParts("dropdown-menu", {
	content: "z-50 max-h-(--qrp-available-height) min-w-[8rem] origin-(--qrp-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
	item: ITEM,
	checkboxItem: CHECK_ITEM,
	radioItem: CHECK_ITEM,
	indicator: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
	checkIcon: "size-4",
	radioIcon: "size-2 fill-current",
	label: "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
	separator: "-mx-1 my-1 h-px bg-border",
	shortcut: "ml-auto text-xs tracking-widest text-muted-foreground",
	subTrigger: "flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
	subTriggerIcon: "ml-auto size-4",
	subContent: "z-50 min-w-[8rem] origin-(--qrp-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
}, { sideOffset: 4, align: "center" });

export const DropdownMenu = popupRoot("dropdown-menu", {
	role: "menu",
	haspopup: "menu",
	setup: ({ content, triggers, open }) => {
		registerRoot(content, { close: () => open.set(false), open, trigger: triggers[0] });
		triggers.forEach((trigger) => triggerKeys(trigger, open, content));
	}
});

export const DropdownMenuTrigger = roleMarker("dropdown-menu-trigger");
export const DropdownMenuPortal = parts.Portal;
export const DropdownMenuContent = parts.Content;
export const DropdownMenuGroup = parts.Group;
export const DropdownMenuLabel = parts.Label;
export const DropdownMenuItem = parts.Item;
export const DropdownMenuCheckboxItem = parts.CheckboxItem;
export const DropdownMenuRadioGroup = parts.RadioGroup;
export const DropdownMenuRadioItem = parts.RadioItem;
export const DropdownMenuSeparator = parts.Separator;
export const DropdownMenuShortcut = parts.Shortcut;
export const DropdownMenuSub = parts.Sub;
export const DropdownMenuSubTrigger = parts.SubTrigger;
export const DropdownMenuSubContent = parts.SubContent;

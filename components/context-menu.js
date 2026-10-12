/**
 * components/context-menu.js — ContextMenu: a menu at the pointer on right
 * click (or a long press on touch).
 *
 *   ContextMenu(
 *     ContextMenuTrigger({ class: "… border-dashed …" }, "Right click here"),
 *     ContextMenuContent({ class: "w-52" }, ContextMenuItem("Back"), …)
 *   )
 *
 * Parts and item props as for DropdownMenu. `ContextMenuTrigger({ disabled })`
 * lets the native context menu through.
 * https://ui.shadcn.com/docs/components/context-menu
 */

import { effect, onDispose } from "@nemanjan00/qrp";
import { parseArgs, roleMarker, uid, withRole, splitContent } from "../utils/index.js";
import { layerWhen, openState } from "../utils/layer.js";
import { pointAt } from "../utils/floating.js";
import { menuParts, registerRoot, placementOf } from "../utils/menu.js";

const LONG_PRESS = 700;

const ITEM = "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!";
const CHECK_ITEM = "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const parts = menuParts("context-menu", {
	content: "z-50 max-h-(--qs-available-height) min-w-[8rem] origin-(--qs-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
	item: ITEM,
	checkboxItem: CHECK_ITEM,
	radioItem: CHECK_ITEM,
	indicator: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
	checkIcon: "size-4",
	radioIcon: "size-2 fill-current",
	label: "px-2 py-1.5 text-sm font-medium text-foreground data-[inset]:pl-8",
	separator: "-mx-1 my-1 h-px bg-border",
	shortcut: "ml-auto text-xs tracking-widest text-muted-foreground",
	subTrigger: "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
	subTriggerIcon: "ml-auto",
	subContent: "z-50 min-w-[8rem] origin-(--qs-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
}, { side: "right", align: "start", sideOffset: 2 });

/** Open the menu at a point; a long press counts as a right click on touch. */
const wireTrigger = (trigger, onOpenAt) => {
	let pressTimer = null;
	const cancel = () => clearTimeout(pressTimer);

	trigger.addEventListener("contextmenu", (event) => {
		if(trigger.hasAttribute("data-disabled")) {
			return;
		}

		event.preventDefault();
		onOpenAt(event.clientX, event.clientY);
	});

	trigger.addEventListener("pointerdown", (event) => {
		if(event.pointerType !== "touch" || trigger.hasAttribute("data-disabled")) {
			return;
		}

		cancel();
		pressTimer = setTimeout(() => onOpenAt(event.clientX, event.clientY), LONG_PRESS);
	});

	["pointermove", "pointerup", "pointercancel"].forEach((name) => trigger.addEventListener(name, cancel));
	onDispose(cancel);
};

/**
 * `ContextMenu({ onOpenChange, modal }, ContextMenuTrigger(…), ContextMenuContent(…))`.
 */
export const ContextMenu = (...args) => {
	const { props, children } = parseArgs(args);
	const open = openState(props);
	const { fragment, content } = splitContent(children, "context-menu-content");
	const triggers = withRole(fragment, "context-menu-trigger");

	if(!content) {
		return fragment;
	}

	let point = pointAt(0, 0);
	// A live reference, so reopening at a new point just repositions.
	const reference = { getBoundingClientRect: () => point.getBoundingClientRect() };

	content.id = content.id || uid("context-menu");
	registerRoot(content, { close: () => open.set(false), open });

	const layer = layerWhen(open, () => ({
		content,
		modal: Boolean(props.modal),
		focus: true,
		anchor: Object.assign({ reference }, placementOf(content))
	}));

	triggers.forEach((trigger) => {
		effect(() => trigger.setAttribute("data-state", open.get() ? "open" : "closed"));

		wireTrigger(trigger, (x, y) => {
			point = pointAt(x, y);

			if(open.get() && layer.current()) {
				layer.current().update();
			} else {
				open.set(true);
			}
		});
	});

	return fragment;
};

export const ContextMenuTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const disabled = Boolean(props.disabled);
	const rest = Object.assign({}, props);

	delete rest.disabled;

	const node = roleMarker("context-menu-trigger", "span")(rest, ...children);

	if(disabled) {
		node.setAttribute("data-disabled", "");
	}

	return node;
};

export const ContextMenuPortal = parts.Portal;
export const ContextMenuContent = parts.Content;
export const ContextMenuGroup = parts.Group;
export const ContextMenuLabel = parts.Label;
export const ContextMenuItem = parts.Item;
export const ContextMenuCheckboxItem = parts.CheckboxItem;
export const ContextMenuRadioGroup = parts.RadioGroup;
export const ContextMenuRadioItem = parts.RadioItem;
export const ContextMenuSeparator = parts.Separator;
export const ContextMenuShortcut = parts.Shortcut;
export const ContextMenuSub = parts.Sub;
export const ContextMenuSubTrigger = parts.SubTrigger;
export const ContextMenuSubContent = parts.SubContent;

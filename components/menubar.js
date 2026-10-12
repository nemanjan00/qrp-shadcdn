/**
 * components/menubar.js — Menubar: a row of menus, as in a desktop app.
 *
 *   Menubar(
 *     MenubarMenu(MenubarTrigger("File"), MenubarContent(MenubarItem("New Tab", MenubarShortcut("⌘T")), …)),
 *     MenubarMenu(MenubarTrigger("Edit"), MenubarContent(…))
 *   )
 *
 * Once one menu is open, hovering another trigger switches to it, and
 * ArrowLeft/ArrowRight move between menus (from the triggers or an open menu).
 * `MenubarMenu` takes the usual open props; parts and item props as for
 * DropdownMenu.
 * https://ui.shadcn.com/docs/components/menubar
 */

import { el, effect, untracked } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, roleMarker, withRole, watchTree } from "../utils/index.js";
import { popupRoot } from "../utils/popup.js";
import { menuParts, registerRoot, triggerKeys, focusEdge } from "../utils/menu.js";

const ITEM = "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[inset]:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!";
const CHECK_ITEM = "relative flex cursor-default items-center gap-2 rounded-xs py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const parts = menuParts("menubar", {
	// No exit animation on purpose (as in shadcn): switching menus is instant.
	content: "z-50 min-w-[12rem] origin-(--qrp-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
	item: ITEM,
	checkboxItem: CHECK_ITEM,
	radioItem: CHECK_ITEM,
	indicator: "pointer-events-none absolute left-2 flex size-3.5 items-center justify-center",
	checkIcon: "size-4",
	radioIcon: "size-2 fill-current",
	label: "px-2 py-1.5 text-sm font-medium data-[inset]:pl-8",
	separator: "-mx-1 my-1 h-px bg-border",
	shortcut: "ml-auto text-xs tracking-widest text-muted-foreground",
	subTrigger: "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-none select-none focus:bg-accent focus:text-accent-foreground data-[inset]:pl-8 data-[state=open]:bg-accent data-[state=open]:text-accent-foreground",
	subTriggerIcon: "ml-auto h-4 w-4",
	subContent: "z-50 min-w-[8rem] origin-(--qrp-transform-origin) overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
}, { align: "start", alignOffset: -4, sideOffset: 8 });

// trigger element → { open, content } — how the bar reaches each menu.
const menusByTrigger = new WeakMap();

export const MenubarMenu = popupRoot("menubar", {
	role: "menu",
	haspopup: "menu",
	setup: ({ content, triggers, open }) => {
		registerRoot(content, { close: () => open.set(false), open, trigger: triggers[0] });
		triggers.forEach((trigger) => {
			triggerKeys(trigger, open, content);
			menusByTrigger.set(trigger, { open, content });
		});
	}
});

export const MenubarTrigger = roleMarker("menubar-trigger", "button", "flex items-center rounded-sm px-2 py-1 text-sm font-medium outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground");

const menubarTriggers = (bar) => withRole(bar, "menubar-trigger").filter((trigger) => menusByTrigger.has(trigger));

/**
 * Wire one menu of the bar: exclusivity, hover switching, arrow navigation.
 */
const wireMenu = (bar, trigger) => {
	const menu = menusByTrigger.get(trigger);
	const others = () => menubarTriggers(bar).filter((other) => other !== trigger).map((other) => menusByTrigger.get(other));
	const anyOpen = () => menubarTriggers(bar).some((other) => menusByTrigger.get(other).open.get());

	const go = (delta, openNext) => {
		const all = menubarTriggers(bar);
		const next = all[(all.indexOf(trigger) + delta + all.length) % all.length];

		if(openNext) {
			menu.open.set(false);
			menusByTrigger.get(next).open.set(true);
			focusEdge(menusByTrigger.get(next).content);
		} else {
			next.focus();
		}
	};

	// Opening one menu closes the rest.
	effect(() => {
		if(menu.open.get()) {
			untracked(() => others().forEach((other) => other.open.set(false)));
		}
	});

	trigger.setAttribute("role", "menuitem");

	trigger.addEventListener("pointerenter", () => {
		if(!menu.open.get() && anyOpen()) {
			menu.open.set(true);
			trigger.focus();
		}
	});

	trigger.addEventListener("keydown", (event) => {
		if(event.key === "ArrowRight" || event.key === "ArrowLeft") {
			event.preventDefault();
			go(event.key === "ArrowRight" ? 1 : -1, menu.open.get());
		}
	});

	// From inside an open menu (after the menu's own keys had their turn: a
	// sub-trigger claims ArrowRight first).
	menu.content.addEventListener("keydown", (event) => {
		if(!event.defaultPrevented && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
			event.preventDefault();
			go(event.key === "ArrowRight" ? 1 : -1, true);
		}
	});
};

/**
 * `Menubar(props?, ...MenubarMenu(...))` — the bar element.
 */
export const Menubar = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const bar = el("div", Object.assign({ "data-slot": "menubar", role: "menubar" }, rest, {
		class: cn("flex h-9 items-center gap-1 rounded-md border bg-background p-1 shadow-xs", own.class)
	}), ...children);
	const wired = new WeakSet();

	// Roving tabindex: one tab stop for the whole bar.
	watchTree(bar, () => {
		menubarTriggers(bar).forEach((trigger, index) => {
			trigger.setAttribute("tabindex", index === 0 ? "0" : "-1");

			if(!wired.has(trigger)) {
				wired.add(trigger);
				wireMenu(bar, trigger);
			}
		});
	});

	return bar;
};

export const MenubarPortal = parts.Portal;
export const MenubarContent = parts.Content;
export const MenubarGroup = parts.Group;
export const MenubarLabel = parts.Label;
export const MenubarItem = parts.Item;
export const MenubarCheckboxItem = parts.CheckboxItem;
export const MenubarRadioGroup = parts.RadioGroup;
export const MenubarRadioItem = parts.RadioItem;
export const MenubarSeparator = parts.Separator;
export const MenubarShortcut = parts.Shortcut;
export const MenubarSub = parts.Sub;
export const MenubarSubTrigger = parts.SubTrigger;
export const MenubarSubContent = parts.SubContent;

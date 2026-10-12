/**
 * components/sidebar.js — Sidebar: a composable, collapsible app sidebar.
 *
 *   SidebarProvider(
 *     Sidebar({ collapsible: "icon" },
 *       SidebarHeader(…),
 *       SidebarContent(SidebarGroup(SidebarGroupLabel("Platform"), SidebarMenu(
 *         SidebarMenuItem(SidebarMenuButton({ tooltip: "Home", isActive: true }, HomeIcon(), el("span", {}, "Home")))
 *       ))),
 *       SidebarFooter(…),
 *       SidebarRail()
 *     ),
 *     SidebarInset(el("header", {}, SidebarTrigger()), …)
 *   )
 *
 * React context becomes a CONTROLLER owned by SidebarProvider (`useSidebar()`):
 * reactive `open`, `openMobile`, `isMobile`, `state` ("expanded"|"collapsed"),
 * plus `setOpen`, `setOpenMobile`, `toggleSidebar`. Every getter reads qrp state,
 * so `() => sidebar.state` in a thunk or effect tracks it.
 *
 * SidebarProvider props: `open` (bool, thunk, or `[state, "key"]`),
 * `defaultOpen` (true), `onOpenChange(open)`, `persist` (localStorage key,
 * default "sidebar_state"; false disables — the qrp take on shadcn's cookie).
 * Ctrl/⌘+B toggles. Below 768px (qrp `media()`) the Sidebar is shown in a Sheet.
 *
 * Parts find their provider through qrp `context` (SidebarContext): reads are
 * reactive, so a part built before its provider (children are built first)
 * resolves once the provider exists. The mobile Sheet's content provides the
 * same controller, so parts moved into it keep working.
 * https://ui.shadcn.com/docs/components/sidebar
 */

import { el, state, effect, untracked, scoped, onDispose } from "@nemanjan00/qrp";
import { media, persisted } from "@nemanjan00/qrp/browser";
import { createContext } from "@nemanjan00/qrp/context";
import { part, parseArgs, pick, cn, variants } from "../utils/index.js";
import { PanelLeftIcon } from "../icons/index.js";
import { Button } from "./button.js";
import { Input } from "./input.js";
import { Separator } from "./separator.js";
import { Skeleton } from "./skeleton.js";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./sheet.js";
import { Tooltip, TooltipTrigger, TooltipContent } from "./tooltip.js";

const SIDEBAR_STORAGE_KEY = "sidebar_state";
const SIDEBAR_WIDTH = "16rem";
const SIDEBAR_WIDTH_MOBILE = "18rem";
const SIDEBAR_WIDTH_ICON = "3rem";
const SIDEBAR_KEYBOARD_SHORTCUT = "b";
const MOBILE_QUERY = "(max-width: 767px)";

// --- provider lookup ----------------------------------------------------------

/** The controller of the nearest SidebarProvider (or mobile sheet). */
const SidebarContext = createContext(null);

let lastController = null;

/** The controller owning `node`, or null. Reactive (a qrp context read). */
const controllerFor = (node) => SidebarContext.read(node);

/**
 * The sidebar controller: of the provider around `node` when given, else of the
 * most recently created SidebarProvider.
 *
 * @param {Node} [node] an element inside a SidebarProvider (or its mobile sheet)
 * @returns {object} `{ open, openMobile, isMobile, state, setOpen, setOpenMobile, toggleSidebar }`
 */
export const useSidebar = (node) => {
	const controller = node ? controllerFor(node) : lastController;

	if(!controller) {
		throw new Error("useSidebar must be used within a SidebarProvider.");
	}

	return controller;
};

const toggleFrom = (node) => {
	const controller = SidebarContext.find(node).value || lastController;

	if(controller) {
		controller.toggleSidebar();
	}
};

// --- provider -----------------------------------------------------------------

const openSource = (own) => {
	if(own.open !== undefined) {
		return own.open;
	}

	const initial = own.defaultOpen === undefined ? true : Boolean(own.defaultOpen);

	if(own.persist === false) {
		return initial;
	}

	const saved = persisted(own.persist || SIDEBAR_STORAGE_KEY, { open: initial });

	return [saved, "open"];
};

const createController = (own) => {
	const source = openSource(own);
	const local = state({ open: Array.isArray(source) || typeof source === "function" ? false : Boolean(source), openMobile: false });
	const mobile = media(MOBILE_QUERY);

	const readOpen = () => {
		if(Array.isArray(source)) {
			return Boolean(source[0][source[1]]);
		}

		if(typeof source === "function") {
			return Boolean(source());
		}

		return local.open;
	};

	const setOpen = (value) => {
		const next = Boolean(typeof value === "function" ? value(readOpen()) : value);

		if(next === readOpen()) {
			return;
		}

		if(Array.isArray(source)) {
			source[0][source[1]] = next;
		} else if(typeof source !== "function") {
			local.open = next;
		}

		if(own.onOpenChange) {
			own.onOpenChange(next);
		}
	};

	const setOpenMobile = (value) => {
		local.openMobile = Boolean(typeof value === "function" ? value(local.openMobile) : value);
	};

	const controller = {
		get open() { return readOpen(); },
		set open(value) { setOpen(value); },
		get openMobile() { return local.openMobile; },
		set openMobile(value) { setOpenMobile(value); },
		get isMobile() { return mobile.matches; },
		get state() { return readOpen() ? "expanded" : "collapsed"; },
		setOpen,
		setOpenMobile,
		toggleSidebar: () => {
			if(mobile.matches) {
				setOpenMobile(!local.openMobile);
			} else {
				setOpen(!readOpen());
			}
		}
	};

	return controller;
};

/**
 * Owns the sidebar state and lays out Sidebar + SidebarInset side by side.
 *
 * @param {object} [props]
 * @param {boolean|Function|Array} [props.open] open state, thunk, or [state, key]
 * @param {boolean} [props.defaultOpen] initial open state (default true)
 * @param {Function} [props.onOpenChange] (open) => void
 * @param {string|false} [props.persist] localStorage key for the open state ("sidebar_state"); false to disable
 */
export const SidebarProvider = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "style", "open", "defaultOpen", "onOpenChange", "persist"]);
	const controller = createController(own);
	const userStyle = typeof own.style === "string" ? own.style : "";

	const wrapper = el("div", Object.assign({ "data-slot": "sidebar-wrapper" }, rest, {
		style: `--sidebar-width: ${SIDEBAR_WIDTH}; --sidebar-width-icon: ${SIDEBAR_WIDTH_ICON};${userStyle}`,
		class: cn("group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar", own.class)
	}), ...children);

	if(own.style && typeof own.style === "object") {
		Object.keys(own.style).forEach((key) => wrapper.style.setProperty(key, own.style[key]));
	}

	lastController = controller;

	const onKeyDown = (event) => {
		if(event.key === SIDEBAR_KEYBOARD_SHORTCUT && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			controller.toggleSidebar();
		}
	};

	window.addEventListener("keydown", onKeyDown);
	onDispose(() => window.removeEventListener("keydown", onKeyDown));

	return SidebarContext.provide(wrapper, controller);
};

// --- sidebar ------------------------------------------------------------------

/**
 * Put the Sidebar's content into a Sheet on mobile: the same nodes move between
 * the desktop panel and the sheet, so their bindings survive the switch.
 */
const mobileSheet = (controller, desktopInner, side) => {
	const mobileInner = el("div", { class: "flex h-full w-full flex-col" });
	const content = SheetContent({
		side,
		"data-sidebar": "sidebar",
		"data-mobile": "true",
		showCloseButton: false,
		style: `--sidebar-width: ${SIDEBAR_WIDTH_MOBILE}`,
		class: "w-(--sidebar-width) bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden"
	}, SheetHeader({ class: "sr-only" }, SheetTitle("Sidebar"), SheetDescription("Displays the mobile sidebar.")), mobileInner);

	SidebarContext.provide(content, controller);
	Sheet({ open: [controller, "openMobile"] }, content);

	effect(() => {
		const isMobile = controller.isMobile;

		untracked(() => {
			const from = isMobile ? desktopInner : mobileInner;
			const to = isMobile ? mobileInner : desktopInner;

			to.append(...from.childNodes);

			if(!isMobile) {
				controller.setOpenMobile(false);
			}
		});
	});
};

/**
 * The sidebar panel.
 *
 * @param {object} [props]
 * @param {("left"|"right")} [props.side] default left
 * @param {("sidebar"|"floating"|"inset")} [props.variant] default sidebar
 * @param {("offcanvas"|"icon"|"none")} [props.collapsible] default offcanvas
 */
export const Sidebar = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "side", "variant", "collapsible"]);
	const side = own.side || "left";
	const variant = own.variant || "sidebar";
	const collapsible = own.collapsible || "offcanvas";
	const padded = variant === "floating" || variant === "inset";

	if(collapsible === "none") {
		return el("div", Object.assign({ "data-slot": "sidebar" }, rest, {
			class: cn("flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground", own.class)
		}), ...children);
	}

	const inner = el("div", {
		"data-sidebar": "sidebar",
		"data-slot": "sidebar-inner",
		class: "flex h-full w-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm"
	}, ...children);

	const root = el("div", {
		class: "group peer hidden text-sidebar-foreground md:block",
		"data-state": "expanded",
		"data-collapsible": "",
		"data-variant": variant,
		"data-side": side,
		"data-slot": "sidebar"
	},
	el("div", {
		"data-slot": "sidebar-gap",
		class: cn(
			"relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear",
			"group-data-[collapsible=offcanvas]:w-0",
			"group-data-[side=right]:rotate-180",
			padded ? "group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]" : "group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
		)
	}),
	el("div", Object.assign({ "data-slot": "sidebar-container" }, rest, {
		class: cn(
			"fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex",
			side === "left"
				? "left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]"
				: "right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]",
			padded
				? "p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]"
				: "group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l",
			own.class
		)
	}), inner));

	// Built once the provider is known, in its own scope (so re-runs of the
	// watch below don't tear it down) that goes with this Sidebar's owner.
	// `building` is set FIRST: mobileSheet() provides the controller to the
	// sheet content, which re-runs context readers — including this watch.
	let building = false;
	let sheet = null;

	onDispose(() => {
		if(sheet) {
			sheet.dispose();
		}
	});

	SidebarContext.watch(root, (controller) => {
		if(!controller) {
			return;
		}

		const current = controller.state;

		root.setAttribute("data-state", current);
		root.setAttribute("data-collapsible", current === "collapsed" ? collapsible : "");

		if(!building) {
			building = true;
			sheet = untracked(() => scoped(() => mobileSheet(controller, inner, side)));
		}
	});

	return root;
};

// --- triggers -----------------------------------------------------------------

/** Ghost icon button that toggles the sidebar (and runs your `onclick` first). */
export const SidebarTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "onclick"]);

	return Button(Object.assign({ "data-sidebar": "trigger", "data-slot": "sidebar-trigger", variant: "ghost", size: "icon" }, rest, {
		// `!`: the Button's own size-9 would otherwise compete (no class merger).
		class: cn("size-7!", own.class),
		onclick: (event) => {
			if(own.onclick) {
				own.onclick(event);
			}

			toggleFrom(event.currentTarget);
		}
	}), ...(children.length ? children : [PanelLeftIcon()]), el("span", { class: "sr-only" }, "Toggle Sidebar"));
};

/** The thin hit area on the sidebar's edge that toggles it. */
export const SidebarRail = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("button", Object.assign({
		type: "button",
		"data-sidebar": "rail",
		"data-slot": "sidebar-rail",
		"aria-label": "Toggle Sidebar",
		tabindex: "-1",
		title: "Toggle Sidebar",
		onclick: (event) => toggleFrom(event.currentTarget)
	}, rest, {
		class: cn(
			"absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] hover:after:bg-sidebar-border sm:flex",
			"in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize",
			"[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize",
			"group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar",
			"[[data-side=left][data-collapsible=offcanvas]_&]:-right-2",
			"[[data-side=right][data-collapsible=offcanvas]_&]:-left-2",
			own.class
		)
	}));
};

// --- layout parts -------------------------------------------------------------

export const SidebarInset = part("main", "sidebar-inset", [
	"relative flex w-full flex-1 flex-col bg-background",
	"md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2"
].join(" "));

export const SidebarInput = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return Input(Object.assign({ "data-slot": "sidebar-input", "data-sidebar": "input" }, rest, {
		class: cn("h-8! w-full bg-background! shadow-none!", own.class)
	}));
};

export const SidebarHeader = part("div", "sidebar-header", "flex flex-col gap-2 p-2", { attrs: { "data-sidebar": "header" } });
export const SidebarFooter = part("div", "sidebar-footer", "flex flex-col gap-2 p-2", { attrs: { "data-sidebar": "footer" } });

export const SidebarSeparator = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return Separator(Object.assign({ "data-slot": "sidebar-separator", "data-sidebar": "separator" }, rest, {
		class: cn("mx-2 w-auto! bg-sidebar-border!", own.class)
	}));
};

export const SidebarContent = part("div", "sidebar-content", "flex min-h-0 flex-1 flex-col gap-2 overflow-auto group-data-[collapsible=icon]:overflow-hidden", { attrs: { "data-sidebar": "content" } });
export const SidebarGroup = part("div", "sidebar-group", "relative flex w-full min-w-0 flex-col p-2", { attrs: { "data-sidebar": "group" } });

export const SidebarGroupLabel = part("div", "sidebar-group-label", [
	"flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
	"group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0"
].join(" "), { attrs: { "data-sidebar": "group-label" } });

const withButtonType = (component) => (...args) => {
	const node = component(...args);

	if(node.tagName === "BUTTON" && !node.hasAttribute("type")) {
		node.setAttribute("type", "button");
	}

	return node;
};

export const SidebarGroupAction = withButtonType(part("button", "sidebar-group-action", [
	"absolute top-3.5 right-3 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
	"after:absolute after:-inset-2 md:after:hidden",
	"group-data-[collapsible=icon]:hidden"
].join(" "), { attrs: { "data-sidebar": "group-action" } }));

export const SidebarGroupContent = part("div", "sidebar-group-content", "w-full text-sm", { attrs: { "data-sidebar": "group-content" } });
export const SidebarMenu = part("ul", "sidebar-menu", "flex w-full min-w-0 flex-col gap-1", { attrs: { "data-sidebar": "menu" } });
export const SidebarMenuItem = part("li", "sidebar-menu-item", "group/menu-item relative", { attrs: { "data-sidebar": "menu-item" } });

// --- menu button --------------------------------------------------------------

export const sidebarMenuButtonVariants = variants(
	"peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
	{
		variants: {
			variant: {
				default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
				outline: "bg-background shadow-[0_0_0_1px_var(--sidebar-border)] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_var(--sidebar-accent)]"
			},
			size: {
				// p-2! lives here, not in the base: shadcn's base has it and twMerge drops
				// it for lg (p-0!); without a merger both would apply.
				default: "h-8 text-sm group-data-[collapsible=icon]:p-2!",
				sm: "h-7 text-xs group-data-[collapsible=icon]:p-2!",
				lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!"
			}
		},
		defaultVariants: {
			variant: "default",
			size: "default"
		}
	}
);

const activeAttr = (isActive) => {
	if(typeof isActive === "function") {
		return () => String(Boolean(isActive()));
	}

	return String(Boolean(isActive));
};

/** Tooltip props from `tooltip: "text"` or `tooltip: { children, side, … }`. */
const tooltipParts = (tooltip) => {
	if(tooltip && typeof tooltip === "object" && !(tooltip instanceof Node) && !Array.isArray(tooltip)) {
		const rest = Object.assign({}, tooltip);
		const content = rest.children;

		delete rest.children;

		return { props: rest, content: Array.isArray(content) ? content : [content] };
	}

	return { props: {}, content: [tooltip] };
};

/**
 * A menu row. `isActive` (bool or thunk), `variant` default|outline, `size`
 * default|sm|lg, `tooltip` (text, or `{ children, ...TooltipContent props }`) —
 * shown only while the sidebar is collapsed to icons on desktop. `as: "a"` for links.
 */
export const SidebarMenuButton = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "as", "isActive", "variant", "size", "tooltip"]);
	const size = own.size || "default";
	const tag = own.as || "button";

	const button = el(tag, Object.assign({
		"data-slot": "sidebar-menu-button",
		"data-sidebar": "menu-button",
		"data-size": size,
		"data-active": activeAttr(own.isActive)
	}, tag === "button" ? { type: "button" } : {}, rest, {
		class: sidebarMenuButtonVariants({ variant: own.variant, size: own.size, class: own.class })
	}), ...children);

	if(own.tooltip === undefined || own.tooltip === null || own.tooltip === "") {
		return button;
	}

	const tip = tooltipParts(own.tooltip);
	// The provider is looked up untracked (and cached once found): this gate is
	// read inside the tooltip's layer effect, and a tracked context read there
	// would re-run that effect when opening the layer re-parents nodes — it
	// would re-enter before the layer handle exists. Hovering always happens
	// after the provider exists, so a lazy lookup is enough; `state` and
	// `isMobile` stay reactive.
	let found = null;
	const controller = () => {
		if(!found) {
			found = SidebarContext.find(button).value;
		}

		return found;
	};
	const visible = () => {
		const current = controller();

		return Boolean(current) && current.state === "collapsed" && !current.isMobile;
	};

	// Gate the OPEN state, not just visibility: a hidden-but-open tooltip would
	// still be the top layer and swallow Escape meant for a sheet or dialog.
	const local = state({ open: false });
	const gated = {
		get open() { return local.open && visible(); },
		set open(value) { local.open = Boolean(value) && visible(); }
	};

	Tooltip({ open: [gated, "open"] },
		TooltipTrigger(button),
		TooltipContent(Object.assign({ side: "right", align: "center" }, tip.props), ...tip.content)
	);

	return button;
};

export const SidebarMenuAction = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "as", "showOnHover"]);
	const tag = own.as || "button";

	return el(tag, Object.assign({ "data-slot": "sidebar-menu-action", "data-sidebar": "menu-action" }, tag === "button" ? { type: "button" } : {}, rest, {
		class: cn(
			"absolute top-1.5 right-1 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform peer-hover/menu-button:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
			"after:absolute after:-inset-2 md:after:hidden",
			"peer-data-[size=sm]/menu-button:top-1",
			"peer-data-[size=default]/menu-button:top-1.5",
			"peer-data-[size=lg]/menu-button:top-2.5",
			"group-data-[collapsible=icon]:hidden",
			own.showOnHover && "group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground data-[state=open]:opacity-100 md:opacity-0",
			own.class
		)
	}), ...children);
};

export const SidebarMenuBadge = part("div", "sidebar-menu-badge", [
	"pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none",
	"peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground",
	"peer-data-[size=sm]/menu-button:top-1",
	"peer-data-[size=default]/menu-button:top-1.5",
	"peer-data-[size=lg]/menu-button:top-2.5",
	"group-data-[collapsible=icon]:hidden"
].join(" "), { attrs: { "data-sidebar": "menu-badge" } });

/** Loading placeholder row; `showIcon` adds an icon block. Width is random (50–90%). */
export const SidebarMenuSkeleton = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "showIcon"]);
	const width = `${Math.floor(Math.random() * 40) + 50}%`;

	return el("div", Object.assign({ "data-slot": "sidebar-menu-skeleton", "data-sidebar": "menu-skeleton" }, rest, {
		class: cn("flex h-8 items-center gap-2 rounded-md px-2", own.class)
	}),
	own.showIcon ? Skeleton({ class: "size-4 rounded-md", "data-sidebar": "menu-skeleton-icon" }) : null,
	Skeleton({ class: "h-4 max-w-(--skeleton-width) flex-1", "data-sidebar": "menu-skeleton-text", style: `--skeleton-width: ${width}` }));
};

export const SidebarMenuSub = part("ul", "sidebar-menu-sub", [
	"mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
	"group-data-[collapsible=icon]:hidden"
].join(" "), { attrs: { "data-sidebar": "menu-sub" } });

export const SidebarMenuSubItem = part("li", "sidebar-menu-sub-item", "group/menu-sub-item relative", { attrs: { "data-sidebar": "menu-sub-item" } });

/** A sub-menu link (`a` by default): `size` sm|md, `isActive` (bool or thunk). */
export const SidebarMenuSubButton = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "as", "size", "isActive"]);
	const size = own.size || "md";

	return el(own.as || "a", Object.assign({
		"data-slot": "sidebar-menu-sub-button",
		"data-sidebar": "menu-sub-button",
		"data-size": size,
		"data-active": activeAttr(own.isActive)
	}, rest, {
		class: cn(
			"flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
			"data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
			size === "sm" && "text-xs",
			size === "md" && "text-sm",
			"group-data-[collapsible=icon]:hidden",
			own.class
		)
	}), ...children);
};

/**
 * components/navigation-menu.js — NavigationMenu: site navigation with
 * dropdown panels.
 *
 *   NavigationMenu(
 *     NavigationMenuList(
 *       NavigationMenuItem(
 *         NavigationMenuTrigger("Getting started"),
 *         NavigationMenuContent(el("ul", …, NavigationMenuLink({ href: "/docs" }, "Introduction")))
 *       ),
 *       NavigationMenuItem(NavigationMenuLink({ href: "/docs", class: navigationMenuTriggerStyle() }, "Docs"))
 *     )
 *   )
 *
 * Panels open on hover (after `delayDuration`, default 200ms; instant when
 * moving between triggers) or click, and render into a shared viewport that
 * animates its size and slides panels in the direction of travel. Pass
 * `viewport: false` to drop each panel under its own trigger instead.
 * `value` / `defaultValue` / `onValueChange` name the open item (an item's
 * `value` prop, or its position). Escape or an outside click closes it; a
 * link click closes it too.
 * https://ui.shadcn.com/docs/components/navigation-menu
 */

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, variants, controllable, animateOut, uid } from "../utils/index.js";
import { ChevronDownIcon } from "../icons/index.js";

const OPEN_DELAY = 200;
const CLOSE_DELAY = 150;
const CLICK_AFTER_HOVER = 400;

// item element → { trigger, content, value }
const itemParts = new WeakMap();

export const navigationMenuTriggerStyle = variants("group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 data-[state=open]:bg-accent/50 data-[state=open]:text-accent-foreground data-[state=open]:hover:bg-accent data-[state=open]:focus:bg-accent");

export const NavigationMenuList = part("ul", "navigation-menu-list", "group flex flex-1 list-none items-center justify-center gap-1");

export const NavigationMenuTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("button", Object.assign({
		type: "button",
		"data-slot": "navigation-menu-trigger",
		"data-state": "closed",
		"aria-expanded": "false"
	}, rest, { class: cn(navigationMenuTriggerStyle(), "group", own.class) }), ...children, " ", ChevronDownIcon({
		class: "relative top-[1px] ml-1 size-3 transition duration-300 group-data-[state=open]:rotate-180"
	}));
};

export const NavigationMenuContent = part("div", "navigation-menu-content", [
	"top-0 left-0 w-full p-2 pr-2.5 data-[motion=from-end]:slide-in-from-right-52 data-[motion=from-start]:slide-in-from-left-52 data-[motion=to-end]:slide-out-to-right-52 data-[motion=to-start]:slide-out-to-left-52 data-[motion^=from-]:animate-in data-[motion^=from-]:fade-in data-[motion^=to-]:animate-out data-[motion^=to-]:fade-out md:absolute md:w-auto",
	"group-data-[viewport=false]/navigation-menu:top-full group-data-[viewport=false]/navigation-menu:mt-1.5 group-data-[viewport=false]/navigation-menu:overflow-hidden group-data-[viewport=false]/navigation-menu:rounded-md group-data-[viewport=false]/navigation-menu:border group-data-[viewport=false]/navigation-menu:bg-popover group-data-[viewport=false]/navigation-menu:text-popover-foreground group-data-[viewport=false]/navigation-menu:shadow group-data-[viewport=false]/navigation-menu:duration-200 **:data-[slot=navigation-menu-link]:focus:ring-0 **:data-[slot=navigation-menu-link]:focus:outline-none group-data-[viewport=false]/navigation-menu:data-[state=closed]:animate-out group-data-[viewport=false]/navigation-menu:data-[state=closed]:fade-out-0 group-data-[viewport=false]/navigation-menu:data-[state=closed]:zoom-out-95 group-data-[viewport=false]/navigation-menu:data-[state=open]:animate-in group-data-[viewport=false]/navigation-menu:data-[state=open]:fade-in-0 group-data-[viewport=false]/navigation-menu:data-[state=open]:zoom-in-95"
].join(" "));

/**
 * `NavigationMenuItem({ value }, Trigger, Content)` or `NavigationMenuItem(Link)`.
 * The content is kept aside until the root opens this item.
 */
export const NavigationMenuItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value"]);
	const item = el("li", Object.assign({ "data-slot": "navigation-menu-item" }, rest, { class: cn("relative", own.class) }), ...children);
	const trigger = item.querySelector(":scope > [data-slot=navigation-menu-trigger]");
	const content = item.querySelector(":scope > [data-slot=navigation-menu-content]");

	if(trigger && content) {
		content.remove();
		content.id = content.id || uid("navigation-menu-content");
		trigger.setAttribute("aria-controls", content.id);
		itemParts.set(item, { trigger, content, value: own.value === undefined ? null : String(own.value) });
	}

	return item;
};

/**
 * `NavigationMenuLink({ href, active, onSelect })` — a link that closes the
 * menu when followed; `active` marks the current page (`aria-current`).
 */
export const NavigationMenuLink = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "active", "onSelect"]);
	const link = el("a", Object.assign({
		"data-slot": "navigation-menu-link",
		"data-active": own.active ? "true" : null,
		"aria-current": own.active ? "page" : null
	}, rest, {
		class: cn("flex flex-col gap-1 rounded-sm p-2 text-sm transition-all outline-none hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 data-[active=true]:bg-accent/50 data-[active=true]:text-accent-foreground data-[active=true]:hover:bg-accent data-[active=true]:focus:bg-accent [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", own.class)
	}), ...children);

	link.addEventListener("click", () => {
		const select = new CustomEvent("navigation-select", { cancelable: true });

		if(own.onSelect) {
			own.onSelect(select);
		}

		// onSelect may call preventDefault() to keep the menu open.
		if(!select.defaultPrevented) {
			link.dispatchEvent(new CustomEvent("qs-navigation-select", { bubbles: true }));
		}
	});

	return link;
};

const IndicatorPart = part("div", "navigation-menu-indicator", "top-full z-[1] flex h-1.5 items-end justify-center overflow-hidden data-[state=hidden]:animate-out data-[state=hidden]:fade-out data-[state=visible]:animate-in data-[state=visible]:fade-in", {
	attrs: { "data-state": "hidden", "aria-hidden": "true" }
});

/** Marks the open trigger with a small arrow; place it inside NavigationMenuList. */
export const NavigationMenuIndicator = (...args) => {
	const node = IndicatorPart(...args);

	node.append(el("div", { class: "relative top-[60%] h-2 w-2 rotate-45 rounded-tl-sm bg-border shadow-md" }));

	return node;
};

/** The shared panel container: an outer positioning wrapper + the viewport. */
export const NavigationMenuViewport = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const viewport = el("div", Object.assign({ "data-slot": "navigation-menu-viewport", "data-state": "closed" }, rest, {
		class: cn("origin-top-center relative mt-1.5 h-[var(--radix-navigation-menu-viewport-height)] w-full overflow-hidden rounded-md border bg-popover text-popover-foreground shadow data-[state=closed]:animate-out data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:zoom-in-90 md:w-[var(--radix-navigation-menu-viewport-width)]", own.class)
	}));

	return el("div", { class: "absolute top-full left-0 isolate z-50 flex justify-center", hidden: true }, viewport);
};

const sizeViewport = (viewport, content) => {
	viewport.style.setProperty("--radix-navigation-menu-viewport-width", `${content.offsetWidth}px`);
	viewport.style.setProperty("--radix-navigation-menu-viewport-height", `${content.offsetHeight}px`);
};

/**
 * Show one item's panel and retire the previous one, sliding in the
 * direction of travel along the list.
 */
const keyOf = (entry) => (entry ? entry.key : null);

const presenter = (root, items, wrapper) => {
	const viewport = wrapper ? wrapper.firstChild : null;
	let shown = null;

	const retire = (entry, motion) => {
		const content = entry.content;

		content.setAttribute("data-state", "closed");

		if(motion) {
			content.setAttribute("data-motion", motion);
		}

		return animateOut(content).then(() => {
			if(content.getAttribute("data-state") === "closed") {
				content.remove();
				content.removeAttribute("data-motion");
			}
		});
	};

	return (entry) => {
		const previous = shown;

		shown = entry;

		if(keyOf(previous) === keyOf(entry)) {
			return;
		}

		const index = (target) => items().findIndex((candidate) => candidate.key === target.key);
		const forward = previous && entry ? index(entry) > index(previous) : true;

		if(previous) {
			retire(previous, entry && viewport ? (forward ? "to-start" : "to-end") : null);
		}

		if(entry) {
			const content = entry.content;

			content.setAttribute("data-state", "open");

			if(previous && viewport) {
				content.setAttribute("data-motion", forward ? "from-end" : "from-start");
			} else {
				content.removeAttribute("data-motion");
			}

			if(viewport) {
				wrapper.hidden = false;
				viewport.setAttribute("data-state", "open");
				viewport.append(content);
				sizeViewport(viewport, content);
			} else {
				entry.item.append(content);
			}

			return;
		}

		if(viewport) {
			viewport.setAttribute("data-state", "closed");
			animateOut(viewport).then(() => {
				if(viewport.getAttribute("data-state") === "closed") {
					wrapper.hidden = true;
				}
			});
		}
	};
};

const placeIndicator = (root, trigger, active) => {
	const indicator = root.querySelector("[data-slot=navigation-menu-indicator]");

	if(!indicator) {
		return;
	}

	indicator.setAttribute("data-state", active ? "visible" : "hidden");

	if(active && trigger) {
		Object.assign(indicator.style, {
			position: "absolute",
			left: "0px",
			width: `${trigger.offsetWidth}px`,
			transform: `translateX(${trigger.offsetLeft}px)`
		});
	}
};

/**
 * `NavigationMenu({ viewport = true, value, defaultValue, onValueChange,
 * delayDuration = 200 }, NavigationMenuList(…))`.
 */
export const NavigationMenu = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "viewport", "value", "defaultValue", "onValueChange", "delayDuration"]);
	const useViewport = own.viewport !== false;
	const delay = own.delayDuration === undefined ? OPEN_DELAY : own.delayDuration;
	const active = controllable(own.value === undefined ? own.defaultValue : own.value, "", own.onValueChange);
	const wrapper = useViewport ? NavigationMenuViewport() : null;

	const root = el("nav", Object.assign({
		"data-slot": "navigation-menu",
		"data-viewport": String(useViewport),
		"data-orientation": "horizontal",
		"aria-label": "Main"
	}, rest, {
		class: cn("group/navigation-menu relative flex max-w-max flex-1 items-center justify-center", own.class)
	}), ...children, wrapper);

	const items = () => [...root.querySelectorAll("[data-slot=navigation-menu-item]")]
		.filter((item) => itemParts.has(item) && item.closest("[data-slot=navigation-menu]") === root)
		.map((item, index) => Object.assign({ item, key: itemParts.get(item).value || String(index) }, itemParts.get(item)));

	const entryFor = (key) => items().find((entry) => entry.key === key) || null;
	const show = presenter(root, items, wrapper);

	let openTimer = null;
	let closeTimer = null;
	let hoverOpenedAt = 0;

	const cancel = () => {
		clearTimeout(openTimer);
		clearTimeout(closeTimer);
	};
	const scheduleClose = () => {
		clearTimeout(closeTimer);
		closeTimer = setTimeout(() => active.set(""), CLOSE_DELAY);
	};

	onDispose(cancel);

	effect(() => {
		const key = active.get();

		untracked(() => {
			const entry = key ? entryFor(key) : null;

			items().forEach((other) => {
				const isOpen = Boolean(entry) && other.key === entry.key;

				other.trigger.setAttribute("data-state", isOpen ? "open" : "closed");
				other.trigger.setAttribute("aria-expanded", String(isOpen));
			});

			show(entry);
			placeIndicator(root, entry ? entry.trigger : null, Boolean(entry));
		});
	});

	items().forEach((entry) => {
		const { trigger, content } = entry;

		trigger.addEventListener("pointerenter", (event) => {
			if(event.pointerType === "touch") {
				return;
			}

			cancel();

			if(active.get()) {
				active.set(entry.key);
				return;
			}

			openTimer = setTimeout(() => {
				hoverOpenedAt = Date.now();
				active.set(entry.key);
			}, delay);
		});

		trigger.addEventListener("pointerleave", () => {
			clearTimeout(openTimer);
			scheduleClose();
		});

		trigger.addEventListener("click", () => {
			cancel();

			const isOpen = active.get() === entry.key;

			// A click right after hover-opening would otherwise close it again.
			if(isOpen && Date.now() - hoverOpenedAt < CLICK_AFTER_HOVER) {
				return;
			}

			active.set(isOpen ? "" : entry.key);
		});

		trigger.addEventListener("keydown", (event) => {
			if(event.key === "ArrowDown") {
				event.preventDefault();
				active.set(entry.key);

				const first = content.querySelector("a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])");

				if(first) {
					first.focus();
				}
			}
		});

		content.addEventListener("pointerenter", cancel);
		content.addEventListener("pointerleave", scheduleClose);
	});

	if(wrapper) {
		wrapper.firstChild.addEventListener("pointerenter", cancel);
		wrapper.firstChild.addEventListener("pointerleave", scheduleClose);
	}

	root.addEventListener("qs-navigation-select", () => {
		cancel();
		active.set("");
	});

	// Left/Right roam the top-level triggers and links.
	const list = root.querySelector("[data-slot=navigation-menu-list]");

	if(list) {
		list.addEventListener("keydown", (event) => {
			if(event.key !== "ArrowRight" && event.key !== "ArrowLeft") {
				return;
			}

			const stops = [...list.querySelectorAll(":scope > [data-slot=navigation-menu-item] > :is(button, a)")];
			const index = stops.indexOf(document.activeElement);

			if(index === -1) {
				return;
			}

			event.preventDefault();
			stops[(index + (event.key === "ArrowRight" ? 1 : -1) + stops.length) % stops.length].focus();
		});
	}

	const onKey = (event) => {
		if(event.key !== "Escape" || !active.get()) {
			return;
		}

		const entry = entryFor(active.get());

		active.set("");

		if(entry && (root.contains(document.activeElement) || entry.content.contains(document.activeElement))) {
			entry.trigger.focus();
		}
	};
	const onPointerDown = (event) => {
		if(active.get() && !root.contains(event.target)) {
			active.set("");
		}
	};

	document.addEventListener("keydown", onKey);
	document.addEventListener("pointerdown", onPointerDown, true);
	onDispose(() => {
		document.removeEventListener("keydown", onKey);
		document.removeEventListener("pointerdown", onPointerDown, true);
	});

	return root;
};

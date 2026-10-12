/**
 * components/tabs.js — Tabs, TabsList, TabsTrigger, TabsContent.
 *
 *   Tabs({ defaultValue: "account" },
 *     TabsList(TabsTrigger({ value: "account" }, "Account"), TabsTrigger({ value: "password" }, "Password")),
 *     TabsContent({ value: "account" }, …),
 *     TabsContent({ value: "password" }, …))
 *
 * `value` (string, thunk, or `[state, "key"]`) or qrp's `bind: [state, "key"]`,
 * `defaultValue`, `onValueChange`,
 * `orientation`, `activationMode: "automatic" | "manual"`. Arrow keys move
 * between triggers (and select them in automatic mode).
 * https://ui.shadcn.com/docs/components/tabs
 */

import { el } from "@nemanjan00/qrp";
import { createContext } from "@nemanjan00/qrp/context";
import { parseArgs, pick, cn, variants, controllable, uid } from "../utils/index.js";
import { members, joinGroup, tabStop, isDisabled, roveTarget, bound } from "../utils/roving.js";

export const tabsListVariants = variants(
	"group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-9 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=line]:rounded-none",
	{
		variants: {
			variant: {
				default: "bg-muted",
				line: "gap-1 bg-transparent"
			}
		},
		defaultVariants: {
			variant: "default"
		}
	}
);

const TRIGGER = [
	"relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 group-data-[variant=default]/tabs-list:data-[state=active]:shadow-sm group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none dark:text-muted-foreground dark:hover:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	"group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:border-transparent dark:group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent",
	"data-[state=active]:bg-background data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 dark:data-[state=active]:text-foreground",
	"after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:bottom-[-5px] group-data-[orientation=horizontal]/tabs:after:h-0.5 group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-right-1 group-data-[orientation=vertical]/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100"
].join(" ");

const safeId = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, "_");

/** The Tabs controller its parts read: value, orientation, ids, trigger set. */
const TabsContext = createContext(null);

/**
 * Tabs root.
 *
 * @param {object} [props]
 * @param {string|Function|Array} [props.value] active tab (string, thunk, or [state, key])
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {string} [props.defaultValue] initial tab when uncontrolled
 * @param {Function} [props.onValueChange] (value) => void
 * @param {("horizontal"|"vertical")} [props.orientation] default horizontal
 * @param {("automatic"|"manual")} [props.activationMode] arrow keys select (automatic) or only focus
 */
export const Tabs = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "bind", "defaultValue", "onValueChange", "orientation", "activationMode"]);
	const orientation = own.orientation || "horizontal";
	const manual = own.activationMode === "manual";
	const value = controllable(bound(own, "value"), own.defaultValue, own.onValueChange);
	const base = uid("tabs");
	const triggers = members();

	const tabs = {
		orientation,
		triggers,
		value: () => value.get(),
		triggerId: (itemValue) => `${base}-trigger-${safeId(itemValue)}`,
		contentId: (itemValue) => `${base}-content-${safeId(itemValue)}`,
		select: (trigger) => {
			if(trigger && !isDisabled(trigger)) {
				value.set(trigger.getAttribute("data-value"));
			}
		}
	};

	const root = el("div", Object.assign({ "data-slot": "tabs", "data-orientation": orientation }, rest, {
		class: cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", own.class)
	}), ...children);

	root.addEventListener("keydown", (event) => {
		const trigger = event.target.closest("[data-slot=tabs-trigger]");

		if(!trigger || !triggers.has(trigger)) {
			return;
		}

		const target = roveTarget(event, triggers.list().filter((item) => !isDisabled(item)), { orientation });

		if(target) {
			event.preventDefault();
			target.focus();

			if(!manual) {
				tabs.select(target);
			}
		}
	});

	return TabsContext.provide(root, tabs);
};

export const TabsList = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "loop"]);

	return TabsContext.watch(el("div", Object.assign({ "data-slot": "tabs-list", "data-variant": own.variant || "default", role: "tablist" }, rest, {
		class: tabsListVariants({ variant: own.variant, class: own.class })
	}), ...children), (tabs, node) => {
		if(tabs) {
			node.setAttribute("aria-orientation", tabs.orientation);
		}
	});
};

export const TabsTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value"]);
	const itemValue = String(own.value);

	const node = el("button", Object.assign({ type: "button", role: "tab", "data-slot": "tabs-trigger", "data-value": itemValue }, rest, {
		class: cn(TRIGGER, own.class)
	}), ...children);

	const join = joinGroup(node);

	node.addEventListener("click", () => {
		const tabs = TabsContext.find(node).value;

		if(tabs) {
			tabs.select(node);
		}
	});

	return TabsContext.watch(node, (tabs) => {
		join(tabs && tabs.triggers);

		if(!tabs) {
			return;
		}

		const active = tabs.value();
		const selected = itemValue === active;
		// The trigger Tab lands on: the active one, else the first enabled.
		const stop = tabStop(tabs.triggers.list(), (item) => item.getAttribute("data-value") === active);

		node.id = tabs.triggerId(itemValue);
		node.setAttribute("aria-controls", tabs.contentId(itemValue));
		node.setAttribute("aria-selected", String(selected));
		node.setAttribute("data-state", selected ? "active" : "inactive");
		node.setAttribute("data-orientation", tabs.orientation);
		node.tabIndex = stop === node ? 0 : -1;
	});
};

/** `TabsContent({ value, forceMount })` — forceMount keeps it in the layout when inactive. */
export const TabsContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "forceMount"]);
	const itemValue = String(own.value);

	return TabsContext.watch(el("div", Object.assign({
		"data-slot": "tabs-content",
		role: "tabpanel",
		tabindex: "0",
		"data-value": itemValue,
		"data-force-mount": own.forceMount ? true : null
	}, rest, {
		class: cn("flex-1 outline-none", own.class)
	}), ...children), (tabs, node) => {
		if(!tabs) {
			return;
		}

		const selected = itemValue === tabs.value();

		node.id = tabs.contentId(itemValue);
		node.setAttribute("aria-labelledby", tabs.triggerId(itemValue));
		node.setAttribute("data-state", selected ? "active" : "inactive");
		node.setAttribute("data-orientation", tabs.orientation);
		node.hidden = !selected && !own.forceMount;
	});
};

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

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, variants, controllable, owned, watchTree, uid } from "../utils/index.js";
import { ownerOf, isDisabled, roveTarget, bound } from "../utils/roving.js";

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

	const root = el("div", Object.assign({ "data-slot": "tabs", "data-orientation": orientation }, rest, {
		class: cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", own.class)
	}), ...children);

	const triggers = () => owned(root, "tabs-trigger", "tabs");

	const sync = (active) => {
		owned(root, "tabs-list", "tabs").forEach((list) => list.setAttribute("aria-orientation", orientation));

		triggers().forEach((trigger) => {
			const itemValue = trigger.getAttribute("data-value");
			const selected = itemValue === active;

			trigger.id = `${base}-trigger-${safeId(itemValue)}`;
			trigger.setAttribute("aria-controls", `${base}-content-${safeId(itemValue)}`);
			trigger.setAttribute("aria-selected", String(selected));
			trigger.setAttribute("data-state", selected ? "active" : "inactive");
			trigger.setAttribute("data-orientation", orientation);
			trigger.tabIndex = selected ? 0 : -1;
		});

		owned(root, "tabs-content", "tabs").forEach((content) => {
			const itemValue = content.getAttribute("data-value");
			const selected = itemValue === active;

			content.id = `${base}-content-${safeId(itemValue)}`;
			content.setAttribute("aria-labelledby", `${base}-trigger-${safeId(itemValue)}`);
			content.setAttribute("data-state", selected ? "active" : "inactive");
			content.setAttribute("data-orientation", orientation);
			content.hidden = !selected && !content.hasAttribute("data-force-mount");
		});

		// Nothing selectable has focus: let Tab reach the first enabled trigger.
		const all = triggers();

		if(!all.some((trigger) => trigger.tabIndex === 0)) {
			const first = all.find((trigger) => !isDisabled(trigger));

			if(first) {
				first.tabIndex = 0;
			}
		}
	};

	const select = (trigger) => {
		if(trigger && !isDisabled(trigger)) {
			value.set(trigger.getAttribute("data-value"));
		}
	};

	root.addEventListener("click", (event) => {
		const trigger = event.target.closest("[data-slot=tabs-trigger]");

		if(trigger && ownerOf(trigger, "tabs") === root) {
			select(trigger);
		}
	});

	root.addEventListener("keydown", (event) => {
		const trigger = event.target.closest("[data-slot=tabs-trigger]");

		if(!trigger || ownerOf(trigger, "tabs") !== root) {
			return;
		}

		const target = roveTarget(event, triggers().filter((item) => !isDisabled(item)), { orientation });

		if(target) {
			event.preventDefault();
			target.focus();

			if(!manual) {
				select(target);
			}
		}
	});

	effect(() => {
		const active = value.get();

		untracked(() => sync(active));
	});

	onDispose(watchTree(root, () => sync(value.get())));

	return root;
};

export const TabsList = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "loop"]);

	return el("div", Object.assign({ "data-slot": "tabs-list", "data-variant": own.variant || "default", role: "tablist" }, rest, {
		class: tabsListVariants({ variant: own.variant, class: own.class })
	}), ...children);
};

export const TabsTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value"]);

	return el("button", Object.assign({ type: "button", role: "tab", "data-slot": "tabs-trigger", "data-value": String(own.value) }, rest, {
		class: cn(TRIGGER, own.class)
	}), ...children);
};

/** `TabsContent({ value, forceMount })` — forceMount keeps it in the layout when inactive. */
export const TabsContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "forceMount"]);

	return el("div", Object.assign({
		"data-slot": "tabs-content",
		role: "tabpanel",
		tabindex: "0",
		"data-value": String(own.value),
		"data-force-mount": own.forceMount ? true : null
	}, rest, {
		class: cn("flex-1 outline-none", own.class)
	}), ...children);
};

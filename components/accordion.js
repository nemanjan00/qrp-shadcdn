/**
 * components/accordion.js — Accordion, AccordionItem, AccordionTrigger,
 * AccordionContent.
 *
 *   Accordion({ type: "single", collapsible: true, defaultValue: "item-1" },
 *     AccordionItem({ value: "item-1" }, AccordionTrigger("Is it accessible?"), AccordionContent("Yes.")))
 *
 * `type: "single"` → `value` is a string ("" = none); `"multiple"` → an array.
 * `value` (or qrp's `bind: [state, "key"]`) / `defaultValue` / `onValueChange`,
 * `collapsible` (single only),
 * `disabled`, `orientation`. Panels animate their height and hide only after
 * the close animation; Up/Down/Home/End move between triggers. Each item's
 * open state is a qrp `disclosure()`; the root only decides which are open.
 * https://ui.shadcn.com/docs/components/accordion
 */

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { disclosure } from "@nemanjan00/qrp/behaviors/disclosure";
import { parseArgs, pick, cn, part, controllable, owned, watchTree, uid } from "../utils/index.js";
import { ownerOf, isDisabled, roveTarget, showPanel, bound } from "../utils/roving.js";
import { ChevronDownIcon } from "../icons/index.js";

const HEIGHT_VAR = "--radix-accordion-content-height";

// item element → { disclosure, render }
const itemState = new WeakMap();

const asList = (value) => {
	if(Array.isArray(value)) {
		return value;
	}

	return value === undefined || value === null || value === "" ? [] : [value];
};

/**
 * Accordion root.
 *
 * @param {object} [props]
 * @param {("single"|"multiple")} [props.type] default "single"
 * @param {string|string[]|Function|Array} [props.value] open item(s), thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {string|string[]} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void
 * @param {boolean} [props.collapsible] single: allow closing the open item
 * @param {boolean} [props.disabled] disable every item
 * @param {("vertical"|"horizontal")} [props.orientation] default vertical
 */
export const Accordion = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["type", "value", "bind", "defaultValue", "onValueChange", "collapsible", "disabled", "orientation"]);
	const multiple = own.type === "multiple";
	const orientation = own.orientation || "vertical";
	const fallback = own.defaultValue !== undefined ? own.defaultValue : (multiple ? [] : "");
	const value = controllable(bound(own, "value"), fallback, own.onValueChange);

	const root = el("div", Object.assign({ "data-slot": "accordion", "data-orientation": orientation }, rest), ...children);

	const items = () => owned(root, "accordion-item", "accordion");
	const partOf = (item, slot) => owned(item, slot, "accordion-item")[0];
	const itemDisabled = (item) => Boolean(own.disabled) || item.hasAttribute("data-disabled");

	const sync = (current) => {
		const open = asList(current);

		items().forEach((item) => {
			const entry = itemState.get(item);
			const trigger = partOf(item, "accordion-trigger");
			const isOpen = open.includes(item.getAttribute("data-value"));

			item.setAttribute("data-orientation", orientation);

			if(trigger) {
				trigger.disabled = itemDisabled(item);
				// Single + not collapsible: the open item can't be closed — say so.
				trigger.setAttribute("aria-disabled", String(isOpen && !multiple && !own.collapsible));
			}

			if(entry) {
				entry.disclosure.state.open = isOpen;
				entry.render();
			}
		});
	};

	const toggle = (item) => {
		const itemValue = item.getAttribute("data-value");
		const open = asList(value.get());
		const isOpen = open.includes(itemValue);

		if(multiple) {
			value.set(isOpen ? open.filter((entry) => entry !== itemValue) : open.concat([itemValue]));
		} else if(!isOpen) {
			value.set(itemValue);
		} else if(own.collapsible) {
			value.set("");
		}
	};

	root.addEventListener("click", (event) => {
		const trigger = event.target.closest("[data-slot=accordion-trigger]");
		const item = trigger ? ownerOf(trigger, "accordion-item") : null;

		if(item && ownerOf(item, "accordion") === root && !itemDisabled(item)) {
			toggle(item);
		}
	});

	root.addEventListener("keydown", (event) => {
		const trigger = event.target.closest("[data-slot=accordion-trigger]");

		if(!trigger || ownerOf(ownerOf(trigger, "accordion-item") || trigger, "accordion") !== root) {
			return;
		}

		const triggers = items().map((item) => partOf(item, "accordion-trigger")).filter((node) => node && !isDisabled(node));
		const target = roveTarget(event, triggers, { orientation, loop: true });

		if(target) {
			event.preventDefault();
			target.focus();
		}
	});

	effect(() => {
		const current = value.get();

		untracked(() => sync(current));
	});

	onDispose(watchTree(root, () => sync(value.get())));

	return root;
};

const AccordionItemBase = part("div", "accordion-item", "border-b last:border-b-0", {
	own: ["value", "disabled"],
	data: (own) => ({ "data-value": String(own.value), "data-disabled": own.disabled ? true : null })
});

/**
 * Render an item from its disclosure: state attributes, aria wiring, and the
 * animated panel. Re-run by the root too, for parts that mount later.
 */
const renderItem = (item, d) => () => {
	const isOpen = d.state.open;
	const state = isOpen ? "open" : "closed";
	const trigger = owned(item, "accordion-trigger", "accordion-item")[0];
	const content = owned(item, "accordion-content", "accordion-item")[0];
	const orientation = item.getAttribute("data-orientation") || "vertical";

	item.setAttribute("data-state", state);

	if(trigger) {
		trigger.id = trigger.id || uid("accordion-trigger");
		trigger.setAttribute("aria-expanded", String(isOpen));
		trigger.setAttribute("data-state", state);
		trigger.setAttribute("data-orientation", orientation);

		if(trigger.parentElement && trigger.parentElement.tagName === "H3") {
			trigger.parentElement.setAttribute("data-state", state);
			trigger.parentElement.setAttribute("data-orientation", orientation);
		}
	}

	if(content) {
		content.id = content.id || uid("accordion-content");
		content.setAttribute("data-orientation", orientation);

		if(trigger) {
			trigger.setAttribute("aria-controls", content.id);
			content.setAttribute("aria-labelledby", trigger.id);
		}

		showPanel(content, isOpen, HEIGHT_VAR);
	}
};

/** `AccordionItem({ value, disabled }, AccordionTrigger(…), AccordionContent(…))`. */
export const AccordionItem = (...args) => {
	const item = AccordionItemBase(...args);
	const d = disclosure(false);
	const render = renderItem(item, d);

	itemState.set(item, { disclosure: d, render: () => untracked(render) });
	effect(render);

	return item;
};

export const AccordionTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("h3", { class: "flex" }, el("button", Object.assign({ type: "button", "data-slot": "accordion-trigger" }, rest, {
		class: cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", own.class)
	}), ...children, ChevronDownIcon({ class: "pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" })));
};

export const AccordionContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("div", Object.assign({ "data-slot": "accordion-content", role: "region" }, rest, {
		class: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
	}), el("div", { class: cn("pt-0 pb-4", own.class) }, ...children));
};

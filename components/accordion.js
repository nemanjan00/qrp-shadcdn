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

import { el } from "@nemanjan00/qrp";
import { disclosure } from "@nemanjan00/qrp/behaviors/disclosure";
import { createContext } from "@nemanjan00/qrp/context";
import { parseArgs, pick, cn, part, controllable, uid } from "../utils/index.js";
import { members, joinGroup, isDisabled, roveTarget, showPanel, bound } from "../utils/roving.js";
import { ChevronDownIcon } from "../icons/index.js";

const HEIGHT_VAR = "--radix-accordion-content-height";

/** The root controller items read: open values, type, trigger set. */
const AccordionContext = createContext(null);

/** One item's state its trigger/content read: disclosure, value, ids. */
const AccordionItemContext = createContext(null);

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
	const triggers = members();

	const accordion = {
		multiple,
		orientation,
		triggers,
		collapsible: Boolean(own.collapsible),
		disabled: Boolean(own.disabled),
		isOpen: (itemValue) => asList(value.get()).includes(itemValue),
		toggle: (itemValue) => {
			const open = asList(value.get());
			const isOpen = open.includes(itemValue);

			if(multiple) {
				value.set(isOpen ? open.filter((entry) => entry !== itemValue) : open.concat([itemValue]));
			} else if(!isOpen) {
				value.set(itemValue);
			} else if(own.collapsible) {
				value.set("");
			}
		}
	};

	const root = el("div", Object.assign({ "data-slot": "accordion", "data-orientation": orientation }, rest), ...children);

	root.addEventListener("keydown", (event) => {
		const trigger = event.target.closest("[data-slot=accordion-trigger]");

		if(!trigger || !triggers.has(trigger)) {
			return;
		}

		const target = roveTarget(event, triggers.list().filter((node) => !isDisabled(node)), { orientation, loop: true });

		if(target) {
			event.preventDefault();
			target.focus();
		}
	});

	return AccordionContext.provide(root, accordion);
};

const AccordionItemBase = part("div", "accordion-item", "border-b last:border-b-0", {
	own: ["value", "disabled"],
	data: (own) => ({ "data-value": String(own.value), "data-disabled": own.disabled ? true : null })
});

/** `AccordionItem({ value, disabled }, AccordionTrigger(…), AccordionContent(…))`. */
export const AccordionItem = (...args) => {
	const { props } = parseArgs(args);
	const node = AccordionItemBase(...args);
	const item = {
		value: String(props.value),
		disabled: Boolean(props.disabled),
		disclosure: disclosure(false),
		triggerId: uid("accordion-trigger"),
		contentId: uid("accordion-content"),
		orientation: () => node.getAttribute("data-orientation") || "vertical"
	};

	// The root decides which items are open; the item's disclosure mirrors it.
	AccordionContext.watch(node, (accordion) => {
		if(accordion) {
			node.setAttribute("data-orientation", accordion.orientation);
			item.disclosure.state.open = accordion.isOpen(item.value);
		}
	});

	AccordionItemContext.watch(node, () => {
		node.setAttribute("data-state", item.disclosure.state.open ? "open" : "closed");
	});

	return AccordionItemContext.provide(node, item);
};

export const AccordionTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	const trigger = el("button", Object.assign({ type: "button", "data-slot": "accordion-trigger" }, rest, {
		class: cn("flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180", own.class)
	}), ...children, ChevronDownIcon({ class: "pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" }));
	const heading = el("h3", { class: "flex" }, trigger);
	const join = joinGroup(trigger);

	trigger.addEventListener("click", () => {
		const accordion = AccordionContext.find(trigger).value;
		const item = AccordionItemContext.find(trigger).value;

		if(accordion && item && !accordion.disabled && !item.disabled) {
			accordion.toggle(item.value);
		}
	});

	AccordionContext.watch(trigger, (accordion) => {
		join(accordion && accordion.triggers);

		const item = AccordionItemContext.read(trigger);

		if(accordion && item) {
			const isOpen = item.disclosure.state.open;

			trigger.disabled = accordion.disabled || item.disabled;
			// Single + not collapsible: the open item can't be closed — say so.
			trigger.setAttribute("aria-disabled", String(isOpen && !accordion.multiple && !accordion.collapsible));
		}
	});

	AccordionItemContext.watch(trigger, (item) => {
		if(!item) {
			return;
		}

		const isOpen = item.disclosure.state.open;
		const state = isOpen ? "open" : "closed";

		trigger.id = item.triggerId;
		trigger.setAttribute("aria-controls", item.contentId);
		trigger.setAttribute("aria-expanded", String(isOpen));
		trigger.setAttribute("data-state", state);
		trigger.setAttribute("data-orientation", item.orientation());
		heading.setAttribute("data-state", state);
		heading.setAttribute("data-orientation", item.orientation());
	});

	return heading;
};

export const AccordionContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return AccordionItemContext.watch(el("div", Object.assign({ "data-slot": "accordion-content", role: "region" }, rest, {
		class: "overflow-hidden text-sm data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down"
	}), el("div", { class: cn("pt-0 pb-4", own.class) }, ...children)), (item, content) => {
		if(!item) {
			// Not inside an item yet: start closed (no animation on first render).
			showPanel(content, false, HEIGHT_VAR);
			return;
		}

		content.id = item.contentId;
		content.setAttribute("aria-labelledby", item.triggerId);
		content.setAttribute("data-orientation", item.orientation());
		showPanel(content, item.disclosure.state.open, HEIGHT_VAR);
	});
};

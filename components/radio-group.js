/**
 * components/radio-group.js — RadioGroup, RadioGroupItem.
 *
 *   RadioGroup({ defaultValue: "comfortable", name: "density" },
 *     el("div", { class: "flex items-center gap-3" },
 *       RadioGroupItem({ value: "default", id: "r1" }), Label({ for: "r1" }, "Default")), …)
 *
 * `value` (string, thunk, or `[state, "key"]`) or qrp's `bind`, `defaultValue`,
 * `onValueChange`, `disabled`, `required`, `orientation`, `loop`, and `name`
 * to submit with a <form>. Arrow keys move focus and select, like native radios.
 * https://ui.shadcn.com/docs/components/radio-group
 */

import { el } from "@nemanjan00/qrp";
import { createContext } from "@nemanjan00/qrp/context";
import { parseArgs, pick, cn, controllable } from "../utils/index.js";
import { members, joinGroup, tabStop, isDisabled, roveTarget, bound } from "../utils/roving.js";
import { CircleIcon } from "../icons/index.js";
import { Label } from "./label.js";

/** The group controller items read: value, disabled, item set. */
const RadioGroupContext = createContext(null);

/**
 * RadioGroup root.
 *
 * @param {object} [props]
 * @param {string|Function|Array} [props.value] selected value, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {string} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void
 * @param {string} [props.name] form field name
 * @param {boolean} [props.disabled]
 * @param {boolean} [props.required]
 * @param {("horizontal"|"vertical")} [props.orientation] arrow-key axis (default both)
 * @param {boolean} [props.loop] wrap around at the ends (default true)
 */
export const RadioGroup = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "bind", "defaultValue", "onValueChange", "name", "disabled", "required", "orientation", "loop"]);
	const value = controllable(bound(own, "value"), own.defaultValue === undefined ? "" : own.defaultValue, own.onValueChange);

	const input = own.name ? el("input", {
		type: "hidden",
		name: own.name,
		value: () => value.get() || "",
		disabled: () => !value.get()
	}) : null;

	const items = members();

	const group = {
		items,
		disabled: Boolean(own.disabled),
		value: () => value.get(),
		select: (item) => {
			if(item && !isDisabled(item)) {
				value.set(item.getAttribute("data-value"));
			}
		}
	};

	const root = el("div", Object.assign({
		"data-slot": "radio-group",
		role: "radiogroup",
		"aria-required": own.required ? "true" : null,
		"aria-orientation": own.orientation || null,
		"data-disabled": own.disabled ? true : null
	}, rest, {
		class: cn("grid gap-3", own.class)
	}), ...children, input);

	root.addEventListener("keydown", (event) => {
		const item = event.target.closest("[data-slot=radio-group-item]");

		if(!item || !items.has(item)) {
			return;
		}

		// Native radios don't activate on Enter.
		if(event.key === "Enter") {
			event.preventDefault();
			return;
		}

		const target = roveTarget(event, items.list().filter((node) => !isDisabled(node)), { orientation: own.orientation, loop: own.loop !== false });

		if(target) {
			event.preventDefault();
			target.focus();
			group.select(target);
		}
	});

	return RadioGroupContext.provide(root, group);
};

/** `RadioGroupItem({ value, id, disabled })`. */
export const RadioGroupItem = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value"]);
	const itemValue = String(own.value);
	const indicator = el("span", {
		"data-slot": "radio-group-indicator",
		class: "relative flex items-center justify-center",
		hidden: true
	}, CircleIcon({ class: "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" }));

	const node = el("button", Object.assign({
		type: "button",
		role: "radio",
		"data-slot": "radio-group-item",
		"data-value": itemValue
	}, rest, {
		class: cn("aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40", own.class)
	}), indicator);

	const join = joinGroup(node);

	node.addEventListener("click", () => {
		const group = RadioGroupContext.find(node).value;

		if(group) {
			group.select(node);
		}
	});

	return RadioGroupContext.watch(node, (group) => {
		join(group && group.items);

		if(!group) {
			return;
		}

		const current = group.value();
		const on = itemValue === current;

		if(group.disabled) {
			node.disabled = true;
			node.setAttribute("data-disabled", "");
		}

		node.setAttribute("aria-checked", String(on));
		node.setAttribute("data-state", on ? "checked" : "unchecked");
		indicator.setAttribute("data-state", on ? "checked" : "unchecked");
		indicator.hidden = !on;
		node.tabIndex = tabStop(group.items.list(), (item) => item.getAttribute("data-value") === current) === node ? 0 : -1;
	});
};

let radioSeq = 0;

/**
 * qrp `forms` input type: `registerInput("radio-group", radioGroupInput)`, then
 * `{ type: "radio-group", options: { value: "Label", … } }` in a field spec.
 *
 * @param {object} settings reactive state
 * @param {string} key the field key
 * @param {object} [spec] field spec (`options`, `disabled`, `required`, `orientation`)
 * @returns {HTMLElement}
 */
export const radioGroupInput = (settings, key, spec = {}) => {
	radioSeq += 1;

	return RadioGroup({ bind: [settings, key], name: key, disabled: spec.disabled, required: spec.required, orientation: spec.orientation },
		...Object.entries(spec.options || {}).map(([value, label], index) => {
			const id = `qs-radio-${radioSeq}-${index}`;

			return el("div", { class: "flex items-center gap-3" }, RadioGroupItem({ value, id }), Label({ for: id }, label));
		}));
};

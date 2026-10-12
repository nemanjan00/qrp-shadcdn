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

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, controllable, owned, watchTree } from "../utils/index.js";
import { ownerOf, isDisabled, roveTarget, bound } from "../utils/roving.js";
import { CircleIcon } from "../icons/index.js";
import { Label } from "./label.js";

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

	const root = el("div", Object.assign({
		"data-slot": "radio-group",
		role: "radiogroup",
		"aria-required": own.required ? "true" : null,
		"aria-orientation": own.orientation || null,
		"data-disabled": own.disabled ? true : null
	}, rest, {
		class: cn("grid gap-3", own.class)
	}), ...children, input);

	const items = () => owned(root, "radio-group-item", "radio-group");

	const sync = (current) => {
		const all = items();

		all.forEach((item) => {
			const on = item.getAttribute("data-value") === current;
			const indicator = item.querySelector("[data-slot=radio-group-indicator]");

			if(own.disabled) {
				item.disabled = true;
				item.setAttribute("data-disabled", "");
			}

			item.setAttribute("aria-checked", String(on));
			item.setAttribute("data-state", on ? "checked" : "unchecked");
			item.tabIndex = -1;

			if(indicator) {
				indicator.setAttribute("data-state", on ? "checked" : "unchecked");
				indicator.hidden = !on;
			}
		});

		const enabled = all.filter((item) => !isDisabled(item));
		const focusable = enabled.find((item) => item.getAttribute("data-state") === "checked") || enabled[0];

		if(focusable) {
			focusable.tabIndex = 0;
		}
	};

	root.addEventListener("click", (event) => {
		const item = event.target.closest("[data-slot=radio-group-item]");

		if(item && ownerOf(item, "radio-group") === root && !isDisabled(item)) {
			value.set(item.getAttribute("data-value"));
		}
	});

	root.addEventListener("keydown", (event) => {
		const item = event.target.closest("[data-slot=radio-group-item]");

		if(!item || ownerOf(item, "radio-group") !== root) {
			return;
		}

		// Native radios don't activate on Enter.
		if(event.key === "Enter") {
			event.preventDefault();
			return;
		}

		const target = roveTarget(event, items().filter((node) => !isDisabled(node)), { orientation: own.orientation, loop: own.loop !== false });

		if(target) {
			event.preventDefault();
			target.focus();
			value.set(target.getAttribute("data-value"));
		}
	});

	effect(() => {
		const current = value.get();

		untracked(() => sync(current));
	});

	onDispose(watchTree(root, () => sync(value.get())));

	return root;
};

/** `RadioGroupItem({ value, id, disabled })`. */
export const RadioGroupItem = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value"]);

	return el("button", Object.assign({
		type: "button",
		role: "radio",
		"data-slot": "radio-group-item",
		"data-value": String(own.value)
	}, rest, {
		class: cn("aspect-square size-4 shrink-0 rounded-full border border-input text-primary shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:ring-destructive/40", own.class)
	}), el("span", {
		"data-slot": "radio-group-indicator",
		class: "relative flex items-center justify-center",
		hidden: true
	}, CircleIcon({ class: "absolute top-1/2 left-1/2 size-2 -translate-x-1/2 -translate-y-1/2 fill-primary" })));
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

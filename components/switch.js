/**
 * components/switch.js — Switch.
 *
 *   Switch({ id: "airplane-mode", checked: [settings, "airplane"] })
 *
 * `checked` (bool, thunk, or `[state, "key"]`) or qrp's `bind`, `defaultChecked`,
 * `onCheckedChange`, `size: "default" | "sm"`, `disabled`, `required`, and
 * `name` / `value` (default "on") to submit with a <form>.
 * https://ui.shadcn.com/docs/components/switch
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, controllable } from "../utils/index.js";
import { bound } from "../utils/roving.js";

/**
 * @param {object} [props]
 * @param {boolean|Function|Array} [props.checked] state, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {boolean} [props.defaultChecked]
 * @param {Function} [props.onCheckedChange] (checked) => void
 * @param {("default"|"sm")} [props.size]
 * @param {string} [props.name] form field name
 * @param {string} [props.value] submitted value when on (default "on")
 */
export const Switch = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "size", "checked", "bind", "defaultChecked", "onCheckedChange", "name", "value", "required"]);
	const checked = controllable(bound(own, "checked"), Boolean(own.defaultChecked), own.onCheckedChange);
	const status = () => (checked.get() ? "checked" : "unchecked");

	const input = own.name ? el("input", {
		type: "hidden",
		name: own.name,
		value: own.value === undefined ? "on" : own.value,
		disabled: () => !checked.get()
	}) : null;

	const node = el("button", Object.assign({
		type: "button",
		role: "switch",
		"data-slot": "switch",
		"data-size": own.size || "default",
		"aria-checked": () => String(Boolean(checked.get())),
		"aria-required": own.required ? "true" : null,
		"data-state": status
	}, rest, {
		class: cn("peer group/switch inline-flex shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-[1.15rem] data-[size=default]:w-8 data-[size=sm]:h-3.5 data-[size=sm]:w-6 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80", own.class)
	}), el("span", {
		"data-slot": "switch-thumb",
		"data-state": status,
		class: "pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=sm]/switch:size-3 data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground"
	}), input);

	node.addEventListener("click", () => {
		if(!node.disabled) {
			checked.set(!checked.get());
		}
	});

	return node;
};

/**
 * qrp `forms` input type: `registerInput("switch", switchInput)`, then
 * `{ type: "switch" }` in a field spec.
 *
 * @param {object} settings reactive state
 * @param {string} key the field key
 * @param {object} [spec] field spec (`disabled`, `required`, `size`)
 * @returns {HTMLElement}
 */
export const switchInput = (settings, key, spec = {}) => Switch({ bind: [settings, key], name: key, disabled: spec.disabled, required: spec.required, size: spec.size });

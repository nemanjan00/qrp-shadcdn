/**
 * components/checkbox.js — Checkbox.
 *
 *   Checkbox({ id: "terms", checked: [settings, "terms"] })
 *
 * `checked` (true / false / "indeterminate", a thunk, or `[state, "key"]`) or
 * qrp's `bind: [state, "key"]` (like `el("input", { type: "checkbox", bind })`),
 * `defaultChecked`, `onCheckedChange`, `disabled`, `required`, and `name` /
 * `value` (default "on") to submit with a <form>. Space toggles (Enter does
 * not, per WAI-ARIA); a `Label({ for: id })` toggles it too.
 * https://ui.shadcn.com/docs/components/checkbox
 */

import { el, when } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, read, controllable } from "../utils/index.js";
import { CheckIcon, MinusIcon } from "../icons/index.js";
import { bound } from "../utils/roving.js";

const stateOf = (checked) => {
	if(checked === "indeterminate") {
		return "indeterminate";
	}

	return checked ? "checked" : "unchecked";
};

/**
 * @param {object} [props]
 * @param {boolean|"indeterminate"|Function|Array} [props.checked] state, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {boolean|"indeterminate"} [props.defaultChecked]
 * @param {Function} [props.onCheckedChange] (checked) => void
 * @param {string} [props.name] form field name
 * @param {string} [props.value] submitted value when checked (default "on")
 * @param {boolean} [props.required]
 */
export const Checkbox = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "checked", "bind", "defaultChecked", "onCheckedChange", "name", "value", "required"]);
	const checked = controllable(bound(own, "checked"), own.defaultChecked === undefined ? false : own.defaultChecked, own.onCheckedChange);
	const status = () => stateOf(checked.get());

	const indicator = el("span", {
		"data-slot": "checkbox-indicator",
		"data-state": status,
		hidden: () => status() === "unchecked",
		class: "grid place-content-center text-current transition-none"
	}, when(status, (current) => (current === "indeterminate" ? MinusIcon({ class: "size-3.5" }) : CheckIcon({ class: "size-3.5" }))));

	const input = own.name ? el("input", {
		type: "hidden",
		name: own.name,
		value: own.value === undefined ? "on" : own.value,
		disabled: () => status() !== "checked"
	}) : null;

	const node = el("button", Object.assign({
		type: "button",
		role: "checkbox",
		"data-slot": "checkbox",
		"aria-checked": () => (status() === "indeterminate" ? "mixed" : String(status() === "checked")),
		"aria-required": own.required ? "true" : null,
		"data-state": status,
		"data-disabled": () => (read(rest.disabled) ? true : null)
	}, rest, {
		class: cn("peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-[state=checked]:bg-primary", own.class)
	}), indicator, input);

	node.addEventListener("keydown", (event) => {
		if(event.key === "Enter") {
			event.preventDefault();
		}
	});

	node.addEventListener("click", () => {
		if(!node.disabled) {
			checked.set(checked.get() === "indeterminate" ? true : !checked.get());
		}
	});

	return node;
};

/**
 * qrp `forms` input type: `registerInput("checkbox", checkboxInput)` swaps the
 * native checkbox for this one in every form.
 *
 * @param {object} settings reactive state
 * @param {string} key the field key
 * @param {object} [spec] field spec (`disabled`, `required`)
 * @returns {HTMLElement}
 */
export const checkboxInput = (settings, key, spec = {}) => Checkbox({ bind: [settings, key], name: key, disabled: spec.disabled, required: spec.required });

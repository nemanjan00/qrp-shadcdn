/**
 * components/native-select.js — NativeSelect: a styled native <select>.
 * Every qrp el() prop works on it, including `bind: [state, "key"]`.
 *
 *   NativeSelect({ bind: [form, "status"] },
 *     NativeSelectOption({ value: "" }, "Select status"),
 *     NativeSelectOption({ value: "todo" }, "Todo"))
 *
 * https://ui.shadcn.com/docs/components/native-select
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn } from "../utils/index.js";
import { ChevronDownIcon } from "../icons/index.js";

/**
 * `NativeSelect({ size: "default" | "sm", ...select props }, …options)` —
 * returns the wrapper; the <select> itself is its first child.
 */
export const NativeSelect = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "size"]);

	return el("div", { "data-slot": "native-select-wrapper", class: "group/native-select relative w-fit has-[select:disabled]:opacity-50" },
		el("select", Object.assign({ "data-slot": "native-select", "data-size": own.size || "default" }, rest, {
			class: cn(
				"h-9 w-full min-w-0 appearance-none rounded-md border border-input bg-transparent px-3 py-2 pr-9 text-sm shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed data-[size=sm]:h-8 data-[size=sm]:py-1 dark:bg-input/30 dark:hover:bg-input/50",
				"focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
				"aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
				own.class
			)
		}), ...children),
		ChevronDownIcon({ "data-slot": "native-select-icon", class: "pointer-events-none absolute top-1/2 right-3.5 size-4 -translate-y-1/2 text-muted-foreground opacity-50 select-none" })
	);
};

export const NativeSelectOption = part("option", "native-select-option", "bg-[Canvas] text-[CanvasText]");
export const NativeSelectOptGroup = part("optgroup", "native-select-optgroup", "bg-[Canvas] text-[CanvasText]");

/**
 * qrp `forms` input factory: `registerInput("ui-native-select", nativeSelectInput)`;
 * field spec `{ options: { value: label } }`. Returns the native <select>
 * (labelable), bound with `bind`; the styled wrapper is its parent.
 *
 * @param {object} settings reactive state
 * @param {string} key
 * @param {object} [field] `{ options, size, class, disabled }`
 * @returns {HTMLSelectElement}
 */
export const nativeSelectInput = (settings, key, field = {}) => {
	const wrapper = NativeSelect({ bind: [settings, key], size: field.size, class: field.class, disabled: field.disabled },
		...Object.entries(field.options || {}).map(([value, label]) => NativeSelectOption({ value }, label)));

	return wrapper.querySelector("select");
};

/**
 * components/toggle.js — Toggle + toggleVariants: a two-state button.
 * `pressed` (bool, thunk, or `[state, "key"]`) or qrp's `bind`, `defaultPressed`,
 * `onPressedChange`, `variant: "default" | "outline"`, `size: "default" | "sm" | "lg"`.
 * https://ui.shadcn.com/docs/components/toggle
 */

import { el, effect } from "@nemanjan00/qrp";
import { parseArgs, pick, variants, controllable } from "../utils/index.js";
import { bound } from "../utils/roving.js";

export const toggleVariants = variants(
	"inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: "bg-transparent",
				outline: "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground"
			},
			size: {
				default: "h-9 min-w-9 px-2",
				sm: "h-8 min-w-8 px-1.5",
				lg: "h-10 min-w-10 px-2.5"
			}
		},
		defaultVariants: {
			variant: "default",
			size: "default"
		}
	}
);

/**
 * @param {object} [props]
 * @param {boolean|Function|Array} [props.pressed] pressed state, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {boolean} [props.defaultPressed]
 * @param {Function} [props.onPressedChange] (pressed) => void
 * @param {("default"|"outline")} [props.variant]
 * @param {("default"|"sm"|"lg")} [props.size]
 */
export const Toggle = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "size", "pressed", "bind", "defaultPressed", "onPressedChange"]);
	const pressed = controllable(bound(own, "pressed"), Boolean(own.defaultPressed), own.onPressedChange);

	const node = el("button", Object.assign({ type: "button", "data-slot": "toggle" }, rest, {
		class: toggleVariants({ variant: own.variant, size: own.size, class: own.class })
	}), ...children);

	node.addEventListener("click", () => {
		if(!node.disabled) {
			pressed.set(!pressed.get());
		}
	});

	effect(() => {
		const on = Boolean(pressed.get());

		node.setAttribute("aria-pressed", String(on));
		node.setAttribute("data-state", on ? "on" : "off");
	});

	return node;
};

/**
 * qrp `forms` input type: `registerInput("toggle", toggleInput)`, then
 * `{ type: "toggle", text: "Bold" }` (content defaults to the field name).
 *
 * @param {object} settings reactive state
 * @param {string} key the field key
 * @param {object} [spec] field spec (`text`, `variant`, `size`, `disabled`)
 * @returns {HTMLElement}
 */
export const toggleInput = (settings, key, spec = {}) => Toggle({
	bind: [settings, key],
	variant: spec.variant,
	size: spec.size,
	disabled: spec.disabled,
	"aria-label": spec.name || key
}, spec.text || spec.name || key);

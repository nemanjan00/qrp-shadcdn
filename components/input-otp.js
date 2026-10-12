/**
 * components/input-otp.js — InputOTP: one-time-code input with per-character
 * slots, in the model of the `input-otp` package: one real (transparent)
 * <input> covers the slots, so typing, paste, autofill and SMS one-time-code
 * suggestions all work natively.
 *
 *   InputOTP({ maxLength: 6, value: [form, "code"], pattern: REGEXP_ONLY_DIGITS, onComplete },
 *     InputOTPGroup(InputOTPSlot({ index: 0 }), InputOTPSlot({ index: 1 }), InputOTPSlot({ index: 2 })),
 *     InputOTPSeparator(),
 *     InputOTPGroup(InputOTPSlot({ index: 3 }), InputOTPSlot({ index: 4 }), InputOTPSlot({ index: 5 })))
 *
 * https://ui.shadcn.com/docs/components/input-otp
 */

import { el, state, effect } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, part, controllable } from "../utils/index.js";
import { MinusIcon } from "../icons/index.js";

export const REGEXP_ONLY_DIGITS = "^\\d+$";
export const REGEXP_ONLY_CHARS = "^[a-zA-Z]+$";
export const REGEXP_ONLY_DIGITS_AND_CHARS = "^[a-zA-Z0-9]+$";

export const InputOTPGroup = part("div", "input-otp-group", "flex items-center");

export const InputOTPSlot = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["index", "class"]);

	return el("div", Object.assign({
		"data-slot": "input-otp-slot",
		"data-index": String(own.index || 0),
		"data-active": "false",
		class: cn("relative flex h-9 w-9 items-center justify-center border-y border-r border-input text-sm shadow-xs transition-all outline-none first:rounded-l-md first:border-l last:rounded-r-md aria-invalid:border-destructive data-[active=true]:z-10 data-[active=true]:border-ring data-[active=true]:ring-[3px] data-[active=true]:ring-ring/50 data-[active=true]:aria-invalid:border-destructive data-[active=true]:aria-invalid:ring-destructive/20 dark:bg-input/30 dark:data-[active=true]:aria-invalid:ring-destructive/40", own.class)
	}, rest), el("span", { "data-slot": "input-otp-char" }), el("div", {
		"data-slot": "input-otp-caret",
		hidden: true,
		class: "pointer-events-none absolute inset-0 flex items-center justify-center"
	}, el("div", { class: "h-4 w-px animate-caret-blink bg-foreground duration-1000" })));
};

export const InputOTPSeparator = (...args) => {
	const { props, children } = parseArgs(args);

	return el("div", Object.assign({ "data-slot": "input-otp-separator", role: "separator" }, props), ...(children.length ? children : [MinusIcon()]));
};

const toRegExp = (pattern) => {
	if(!pattern) {
		return null;
	}

	return pattern instanceof RegExp ? pattern : new RegExp(pattern);
};

/**
 * `InputOTP(props, ...groups)`.
 *
 * @param {object} props
 * @param {number} props.maxLength number of characters
 * @param {*} [props.value] string; value, thunk, or `[state, "key"]`
 * @param {Function} [props.onValueChange] (value) => void — like every other control
 * @param {Function} [props.onChange] alias of onValueChange (input-otp's name)
 * @param {Function} [props.onComplete] (value) => void, once all slots are filled
 * @param {string|RegExp} [props.pattern] allowed full value, e.g. REGEXP_ONLY_DIGITS
 * @param {boolean} [props.disabled]
 * @param {string} [props.containerClassName] classes for the slot container
 * @param {string} [props.class] classes for the real <input>
 * @returns {HTMLElement} the container
 */
export const InputOTP = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["maxLength", "value", "defaultValue", "onValueChange", "onChange", "onComplete", "pattern", "class", "containerClassName", "disabled"]);
	const maxLength = own.maxLength || 6;
	const pattern = toRegExp(own.pattern);
	const onValueChange = own.onValueChange || own.onChange;
	const value = controllable(own.value === undefined ? own.defaultValue : own.value, "", onValueChange);
	const ui = state({ focused: false });
	const digits = own.pattern === REGEXP_ONLY_DIGITS;

	const input = el("input", Object.assign({
		"data-slot": "input-otp",
		"data-input-otp": "true",
		autocomplete: "one-time-code",
		inputmode: digits ? "numeric" : "text",
		spellcheck: false,
		maxLength,
		disabled: own.disabled,
		class: cn("disabled:cursor-not-allowed", own.class),
		style: {
			position: "absolute",
			inset: "0",
			width: "100%",
			height: "100%",
			opacity: "0",
			color: "transparent",
			caretColor: "transparent",
			background: "transparent",
			border: "0",
			outline: "none",
			fontSize: "16px"
		}
	}, rest));

	const container = el("div", {
		"data-slot": "input-otp-container",
		"data-input-otp-container": "true",
		class: cn("relative flex items-center gap-2 has-disabled:opacity-50", own.containerClassName)
	}, ...children, input);

	const slots = [...container.querySelectorAll("[data-slot=input-otp-slot]")];

	const keepCaretAtEnd = () => {
		const end = input.value.length;

		input.setSelectionRange(end, end);
	};

	input.addEventListener("input", () => {
		const next = input.value.slice(0, maxLength);
		const previous = value.get() || "";

		if(next !== "" && pattern && !pattern.test(next)) {
			input.value = previous;
			keepCaretAtEnd();

			return;
		}

		value.set(next);
		keepCaretAtEnd();

		if(next.length === maxLength && own.onComplete) {
			own.onComplete(next);
		}
	});

	input.addEventListener("focus", () => {
		ui.focused = true;
		keepCaretAtEnd();
	});

	input.addEventListener("blur", () => {
		ui.focused = false;
	});

	["click", "keyup", "select"].forEach((type) => input.addEventListener(type, keepCaretAtEnd));

	effect(() => {
		const current = value.get() || "";

		if(input.value !== current) {
			input.value = current;
		}

		slots.forEach((slot) => {
			const index = Number(slot.getAttribute("data-index"));
			const char = current[index] || "";
			const active = ui.focused && index === Math.min(current.length, maxLength - 1);

			slot.querySelector("[data-slot=input-otp-char]").textContent = char;
			slot.setAttribute("data-active", String(active));
			slot.querySelector("[data-slot=input-otp-caret]").hidden = !(active && char === "");
		});
	});

	return container;
};

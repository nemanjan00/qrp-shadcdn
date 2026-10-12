/**
 * components/date-picker.js — DatePicker: the shadcn docs' Popover + Calendar
 * composition packaged as one component (shadcn ships it as an example, not a
 * file). Compose Popover/Calendar yourself for anything more custom.
 *
 *   DatePicker({ value: [form, "dueDate"], placeholder: "Pick a date" })
 *   DatePicker({ mode: "range", value: () => s.range, onValueChange: (r) => { s.range = r; } })
 *
 * https://ui.shadcn.com/docs/components/date-picker
 */

import { el, state } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, controllable } from "../utils/index.js";
import { formatDate } from "../utils/dates.js";
import { Button } from "./button.js";
import { Calendar } from "./calendar.js";
import { Popover, PopoverTrigger, PopoverContent } from "./popover.js";
import { CalendarIcon } from "../icons/index.js";

const LONG = { dateStyle: "long" };
const MEDIUM = { dateStyle: "medium" };

/**
 * Format a date-picker value for the trigger label.
 *
 * @param {("single"|"range")} mode
 * @param {*} value Date or { from, to }
 * @param {string} [locale]
 * @returns {string} "" when nothing is selected
 */
export const formatPicked = (mode, value, locale) => {
	if(mode === "range") {
		if(!value || !value.from) {
			return "";
		}

		if(!value.to) {
			return formatDate(value.from, MEDIUM, locale);
		}

		return `${formatDate(value.from, MEDIUM, locale)} - ${formatDate(value.to, MEDIUM, locale)}`;
	}

	return value ? formatDate(value, LONG, locale) : "";
};

/**
 * `DatePicker(props)`.
 *
 * @param {object} [props]
 * @param {("single"|"range")} [props.mode] default "single"
 * @param {*} [props.value] Date / { from, to }; value, thunk, or `[state, "key"]`
 * @param {Function} [props.onValueChange] (value) => void
 * @param {string} [props.placeholder] default "Pick a date"
 * @param {string} [props.locale] label locale
 * @param {object} [props.calendar] extra Calendar props (disabled, numberOfMonths, captionLayout, …)
 * @param {object} [props.content] extra PopoverContent props (align, side, class)
 * @param {string} [props.class] trigger classes
 * @returns {DocumentFragment} the trigger (the calendar is portaled on open)
 */
export const DatePicker = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["mode", "value", "defaultValue", "onValueChange", "placeholder", "locale", "calendar", "content", "class"]);
	const mode = own.mode || "single";
	const value = controllable(own.value === undefined ? own.defaultValue : own.value, undefined, own.onValueChange);
	const popover = state({ open: false });
	const label = () => formatPicked(mode, value.get(), own.locale);

	const onSelect = (next) => {
		value.set(next);

		if(mode === "single" || (next && next.from && next.to)) {
			popover.open = false;
		}
	};

	return Popover({ open: [popover, "open"] },
		PopoverTrigger(Button(Object.assign({ variant: "outline", "data-slot": "date-picker-trigger" }, rest, {
			"data-empty": () => String(!label()),
			class: cn("w-[280px] justify-start text-left font-normal data-[empty=true]:text-muted-foreground", own.class)
		}), CalendarIcon(), el("span", {}, () => label() || own.placeholder || "Pick a date"))),
		PopoverContent(Object.assign({ align: "start" }, own.content, { class: cn("w-auto p-0", own.content && own.content.class) }),
			Calendar(Object.assign({
				numberOfMonths: mode === "range" ? 2 : 1,
				autoFocus: true
			}, own.calendar, {
				mode,
				locale: own.locale,
				selected: () => value.get(),
				onSelect
			})))
	);
};

/**
 * components/calendar.js — Calendar: a zero-dependency month grid with the
 * look of shadcn's react-day-picker wrapper.
 *
 *   Calendar({ mode: "single", selected: [form, "date"] })
 *   Calendar({ mode: "range", selected: () => s.range, onSelect: (r) => { s.range = r; }, numberOfMonths: 2 })
 *
 * Selection value by mode: single → Date | undefined, multiple → Date[],
 * range → { from, to } | undefined. `selected` is a value, a thunk, or a
 * `[state, "key"]` tuple (two-way); `onSelect(value, day)` reports changes.
 * Arrow keys / Home / End / PageUp / PageDown (Shift = year) move focus.
 * https://ui.shadcn.com/docs/components/calendar
 */

import { el, state, untracked } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, controllable } from "../utils/index.js";
import {
	startOfDay, startOfMonth, addMonths, addDays, startOfWeek, sameDay, sameMonth, dayDiff, isoDay,
	monthWeeks, matchesDay, formatDate
} from "../utils/dates.js";
import { buttonVariants, Button } from "./button.js";
import { ChevronLeftIcon, ChevronRightIcon, ChevronDownIcon } from "../icons/index.js";

const OWN = [
	"class", "mode", "selected", "onSelect", "month", "defaultMonth", "onMonthChange", "numberOfMonths",
	"disabled", "hidden", "showOutsideDays", "weekStartsOn", "captionLayout", "startMonth", "endMonth",
	"locale", "buttonVariant", "required", "fixedWeeks", "today", "autoFocus"
];

const YEARS_BACK = 100;
const YEARS_AHEAD = 10;
const MAX_SKIP = 366;

const DAY_BUTTON = "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ring group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-ring/50 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-end=true]:bg-primary data-[range-end=true]:text-primary-foreground data-[range-middle=true]:rounded-none data-[range-middle=true]:bg-accent data-[range-middle=true]:text-accent-foreground data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[range-start=true]:bg-primary data-[range-start=true]:text-primary-foreground data-[selected-single=true]:bg-primary data-[selected-single=true]:text-primary-foreground dark:hover:text-accent-foreground [&>span]:text-xs [&>span]:opacity-70";

const NAV_BUTTON = "size-(--cell-size) p-0 select-none aria-disabled:opacity-50";

/** Selection queries for the three modes. */
const selection = (mode, value) => {
	if(mode === "range") {
		const range = value || {};

		return {
			has: (day) => {
				if(range.from && range.to) {
					return dayDiff(day, range.from) >= 0 && dayDiff(day, range.to) <= 0;
				}

				return sameDay(day, range.from);
			},
			start: (day) => sameDay(day, range.from),
			end: (day) => sameDay(day, range.to),
			first: () => range.from
		};
	}

	if(mode === "multiple") {
		const days = value || [];

		return {
			has: (day) => days.some((one) => sameDay(one, day)),
			start: () => false,
			end: () => false,
			first: () => days[0]
		};
	}

	return {
		has: (day) => sameDay(value, day),
		start: () => false,
		end: () => false,
		first: () => value
	};
};

/** The next selection value after clicking `day`. */
const nextSelection = (mode, value, day, required) => {
	if(mode === "multiple") {
		const days = value || [];

		if(days.some((one) => sameDay(one, day))) {
			const rest = days.filter((one) => !sameDay(one, day));

			return required && rest.length === 0 ? days : rest;
		}

		return days.concat([day]);
	}

	if(mode === "range") {
		const range = value || {};

		if(!range.from || range.to) {
			if(range.from && range.to && sameDay(range.from, day) && sameDay(range.to, day) && !required) {
				return undefined;
			}

			return { from: day, to: undefined };
		}

		if(dayDiff(day, range.from) < 0) {
			return { from: day, to: range.from };
		}

		return { from: range.from, to: day };
	}

	if(sameDay(value, day) && !required) {
		return undefined;
	}

	return day;
};

const captionLabel = (text, dropdown) => el("span", {
	"aria-hidden": dropdown ? "true" : null,
	class: cn("font-medium select-none", dropdown
		? "flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground"
		: "text-sm")
}, text, dropdown ? ChevronDownIcon({ class: "size-4" }) : null);

/** A native <select> styled like react-day-picker's dropdown (label on top). */
const dropdown = (label, options, value, onChange) => el("span", {
	class: "relative rounded-md border border-input shadow-xs has-focus:border-ring has-focus:ring-[3px] has-focus:ring-ring/50"
},
el("select", {
	"aria-label": label,
	class: "absolute inset-0 bg-popover opacity-0",
	onchange: (event) => onChange(Number(event.target.value))
}, ...options.map((option) => el("option", { value: String(option.value), selected: option.value === value, disabled: option.disabled }, option.label))),
captionLabel(options.find((option) => option.value === value).label, true));

/**
 * `Calendar(props)` — see the file header for the selection model.
 *
 * @param {object} [props]
 * @param {("single"|"multiple"|"range")} [props.mode] default "single"
 * @param {*} [props.selected] value, thunk, or `[state, "key"]`
 * @param {Function} [props.onSelect] (value, day) => void
 * @param {*} [props.month] displayed month: Date, thunk, or `[state, "key"]`
 * @param {Date} [props.defaultMonth] initial month when uncontrolled
 * @param {Function} [props.onMonthChange] (month) => void
 * @param {number} [props.numberOfMonths] months side by side (default 1)
 * @param {*} [props.disabled] matcher: Date, Date[], fn, {before}, {after}, {from,to}, {dayOfWeek}
 * @param {*} [props.hidden] matcher for days not rendered at all
 * @param {boolean} [props.showOutsideDays] default true
 * @param {boolean} [props.fixedWeeks] always render 6 weeks
 * @param {number} [props.weekStartsOn] 0 = Sunday (default) … 6
 * @param {("label"|"dropdown"|"dropdown-months"|"dropdown-years")} [props.captionLayout]
 * @param {Date} [props.startMonth] first navigable month
 * @param {Date} [props.endMonth] last navigable month
 * @param {string} [props.locale] BCP 47 tag for labels (default: the browser's)
 * @param {boolean} [props.required] clicking the selected day keeps it selected
 * @param {string} [props.buttonVariant] nav button variant (default "ghost")
 * @param {boolean} [props.autoFocus] mark the tab-stop day `data-autofocus`, so a
 *   Popover/Dialog opening around the calendar focuses that day
 * @returns {HTMLElement}
 */
export const Calendar = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, OWN);
	const mode = own.mode || "single";
	const locale = own.locale;
	const weekStartsOn = own.weekStartsOn || 0;
	const showOutside = own.showOutsideDays !== false;
	const count = own.numberOfMonths || 1;
	const layout = own.captionLayout || "label";
	const today = startOfDay(own.today || new Date());
	const selected = controllable(own.selected, undefined, own.onSelect ? (value) => own.onSelect(value, ui.clicked) : undefined);
	const initial = selection(mode, untracked(selected.get)).first();
	const view = controllable(own.month, startOfMonth(own.defaultMonth || initial || today), own.onMonthChange);
	const startMonth = own.startMonth ? startOfMonth(own.startMonth) : null;
	const endMonth = own.endMonth ? startOfMonth(own.endMonth) : null;
	const ui = state({ focus: null, focused: false, clicked: null });

	const isDisabled = (day) => matchesDay(day, own.disabled) ||
		(startMonth !== null && dayDiff(day, startMonth) < 0) ||
		(endMonth !== null && dayDiff(day, addMonths(endMonth, 1)) >= 0);

	const firstMonth = () => startOfMonth(view.get());

	const canGo = (delta) => {
		const target = addMonths(firstMonth(), delta);

		if(delta < 0 && startMonth) {
			return dayDiff(target, startMonth) >= 0;
		}

		if(delta > 0 && endMonth) {
			return dayDiff(addMonths(target, count - 1), endMonth) <= 0;
		}

		return true;
	};

	const go = (delta) => {
		if(canGo(delta)) {
			view.set(addMonths(firstMonth(), delta));
		}
	};

	const inView = (day) => {
		const first = firstMonth();
		const offset = (day.getFullYear() - first.getFullYear()) * 12 + day.getMonth() - first.getMonth();

		return offset >= 0 && offset < count;
	};

	// The one day that is in the Tab order: focus, else selection, else today, else the 1st.
	const tabTarget = () => {
		const focus = ui.focus ? new Date(`${ui.focus}T00:00:00`) : null;

		if(focus && inView(focus)) {
			return ui.focus;
		}

		const first = selection(mode, selected.get()).first();

		if(first && inView(first)) {
			return isoDay(first);
		}

		if(inView(today)) {
			return isoDay(today);
		}

		return isoDay(firstMonth());
	};

	const root = el("div", Object.assign({ "data-slot": "calendar" }, rest, {
		class: cn(
			"group/calendar w-fit bg-background p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
			own.class
		)
	}));

	const focusDay = (day) => {
		ui.focus = isoDay(day);

		if(!inView(day)) {
			view.set(startOfMonth(dayDiff(day, firstMonth()) < 0 ? day : addMonths(day, 1 - count)));
		}

		const button = root.querySelector(`[data-date="${isoDay(day)}"]`);

		if(button) {
			button.focus();
		}
	};

	const select = (day) => {
		ui.clicked = day;
		ui.focus = isoDay(day);
		selected.set(nextSelection(mode, selected.get(), day, own.required));
	};

	const moveBy = (from, step, unit) => {
		const shift = (day) => (unit === "month" ? new Date(day.getFullYear(), day.getMonth() + step, day.getDate()) : addDays(day, step));
		const tries = Array.from({ length: MAX_SKIP });
		const found = tries.reduce((acc) => {
			if(acc.done) {
				return acc;
			}

			const next = shift(acc.day);

			return { day: next, done: !isDisabled(next) };
		}, { day: from, done: false });

		return found.done ? found.day : from;
	};

	const onKeyDown = (event) => {
		const target = event.target.closest("[data-date]");

		if(!target) {
			return;
		}

		const day = new Date(`${target.getAttribute("data-date")}T00:00:00`);
		const moves = {
			ArrowLeft: () => moveBy(day, -1, "day"),
			ArrowRight: () => moveBy(day, 1, "day"),
			ArrowUp: () => moveBy(day, -7, "day"),
			ArrowDown: () => moveBy(day, 7, "day"),
			Home: () => startOfWeek(day, weekStartsOn),
			End: () => addDays(startOfWeek(day, weekStartsOn), 6),
			PageUp: () => moveBy(day, event.shiftKey ? -12 : -1, "month"),
			PageDown: () => moveBy(day, event.shiftKey ? 12 : 1, "month")
		};

		if(moves[event.key]) {
			event.preventDefault();
			focusDay(moves[event.key]());
		}
	};

	const dayCell = (day, month) => {
		const outside = !sameMonth(day, month);
		const iso = isoDay(day);
		const hidden = (outside && !showOutside) || matchesDay(day, own.hidden);
		const disabled = isDisabled(day);
		const isToday = sameDay(day, today);
		const query = () => selection(mode, selected.get());
		const isSelected = () => !outside && query().has(day);
		const isStart = () => !outside && mode === "range" && query().start(day);
		const isEnd = () => !outside && mode === "range" && query().end(day);
		const isMiddle = () => isSelected() && mode === "range" && !isStart() && !isEnd();

		if(hidden) {
			return el("td", { role: "gridcell", class: "group/day relative aspect-square h-full w-full p-0 text-center select-none invisible" });
		}

		return el("td", {
			role: "gridcell",
			"data-day": day.toLocaleDateString(),
			"data-selected": () => (isSelected() ? "true" : null),
			"data-today": isToday ? "true" : null,
			"data-outside": outside ? "true" : null,
			"data-disabled": disabled ? "true" : null,
			"data-focused": () => (ui.focused && ui.focus === iso ? "true" : null),
			"aria-selected": () => (isSelected() ? "true" : null),
			class: () => cn(
				"group/day relative aspect-square h-full w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md",
				isStart() && "rounded-l-md bg-accent",
				isMiddle() && "rounded-none",
				isEnd() && "rounded-r-md bg-accent",
				isToday && "rounded-md bg-accent text-accent-foreground data-[selected=true]:rounded-none",
				outside && "text-muted-foreground aria-selected:text-muted-foreground",
				disabled && "text-muted-foreground opacity-50"
			)
		}, Button({
			variant: "ghost",
			size: "icon",
			class: DAY_BUTTON,
			"data-date": iso,
			"data-day": day.toLocaleDateString(),
			"data-selected-single": () => String(isSelected() && !isStart() && !isEnd() && !isMiddle()),
			"data-range-start": () => String(isStart()),
			"data-range-end": () => String(isEnd()),
			"data-range-middle": () => String(isMiddle()),
			"aria-label": formatDate(day, { dateStyle: "full" }, locale),
			tabindex: () => (tabTarget() === iso ? "0" : "-1"),
			"data-autofocus": own.autoFocus ? () => (tabTarget() === iso ? "true" : null) : null,
			disabled,
			onclick: () => select(day),
			onfocus: () => {
				ui.focus = iso;
				ui.focused = true;
			},
			onblur: () => {
				ui.focused = false;
			}
		}, String(day.getDate())));
	};

	const weekdayNames = () => monthWeeks(today, weekStartsOn)[0].map((day) => ({
		short: formatDate(day, { weekday: "short" }, locale).slice(0, 2),
		long: formatDate(day, { weekday: "long" }, locale)
	}));

	const yearRange = () => {
		const from = startMonth ? startMonth.getFullYear() : today.getFullYear() - YEARS_BACK;
		const to = endMonth ? endMonth.getFullYear() : today.getFullYear() + YEARS_AHEAD;

		return Array.from({ length: to - from + 1 }, (_, i) => from + i);
	};

	const caption = (month) => {
		const label = formatDate(month, { month: "long", year: "numeric" }, locale);

		if(layout === "label") {
			return el("div", { class: "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)" },
				el("span", { role: "status", "aria-live": "polite", class: "text-sm font-medium select-none" }, label));
		}

		const setMonth = (value) => view.set(new Date(month.getFullYear(), value, 1));
		const setYear = (value) => view.set(new Date(value, month.getMonth(), 1));
		const months = Array.from({ length: 12 }, (_, i) => {
			const date = new Date(month.getFullYear(), i, 1);
			const outOfRange = (startMonth && dayDiff(date, startMonth) < 0) || (endMonth && dayDiff(date, endMonth) > 0);

			return { value: i, label: formatDate(date, { month: "short" }, locale), disabled: Boolean(outOfRange) };
		});
		const years = yearRange().map((year) => ({ value: year, label: String(year) }));

		return el("div", { class: "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)" },
			el("div", { class: "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium" },
				layout === "dropdown-years" ? captionLabel(formatDate(month, { month: "long" }, locale), false) : dropdown("Choose the Month", months, month.getMonth(), setMonth),
				layout === "dropdown-months" ? captionLabel(String(month.getFullYear()), false) : dropdown("Choose the Year", years, month.getFullYear(), setYear)
			));
	};

	const monthGrid = (month) => {
		const names = weekdayNames();

		return el("div", { class: "flex w-full flex-col gap-4" },
			caption(month),
			el("table", { role: "grid", "aria-label": formatDate(month, { month: "long", year: "numeric" }, locale), class: "w-full border-collapse" },
				el("thead", { "aria-hidden": "true" }, el("tr", { class: "flex" }, ...names.map((name) => el("th", {
					scope: "col",
					"aria-label": name.long,
					class: "flex-1 rounded-md text-[0.8rem] font-normal text-muted-foreground select-none"
				}, name.short)))),
				el("tbody", {}, ...monthWeeks(month, weekStartsOn, own.fixedWeeks).map((week) => el("tr", { class: "mt-2 flex w-full" },
					...week.map((day) => dayCell(day, month)))))
			));
	};

	const nav = () => el("nav", { "aria-label": "Navigation bar", class: "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1" },
		el("button", {
			type: "button",
			"aria-label": "Go to the Previous Month",
			"aria-disabled": () => (canGo(-1) ? null : "true"),
			class: cn(buttonVariants({ variant: own.buttonVariant || "ghost" }), NAV_BUTTON),
			onclick: () => go(-1)
		}, ChevronLeftIcon({ class: "size-4" })),
		el("button", {
			type: "button",
			"aria-label": "Go to the Next Month",
			"aria-disabled": () => (canGo(1) ? null : "true"),
			class: cn(buttonVariants({ variant: own.buttonVariant || "ghost" }), NAV_BUTTON),
			onclick: () => go(1)
		}, ChevronRightIcon({ class: "size-4" })));

	const months = el("div", { class: "relative flex flex-col gap-4 md:flex-row", onkeydown: onKeyDown },
		nav(),
		() => {
			const first = firstMonth();

			return untracked(() => Array.from({ length: count }, (_, i) => monthGrid(addMonths(first, i))));
		});

	root.append(months);

	return root;
};

/** The day button, exported for parity with shadcn; Calendar renders it itself. */
export const CalendarDayButton = (...args) => {
	const { props, children } = parseArgs(args);

	return Button(Object.assign({ variant: "ghost", size: "icon" }, props, { class: cn(DAY_BUTTON, props.class) }), ...children);
};

/**
 * utils/dates.js — the small calendar math Calendar and DatePicker need.
 * Plain local-time `Date`s, no time zones beyond the platform's. Labels go
 * through qrp's Intl-backed `format.date`; an explicit locale falls back to
 * Intl directly (qrp's formatters always use the browser locale).
 */

import { date as formatQrpDate } from "@nemanjan00/qrp/format";

/** @param {Date} date @returns {Date} midnight of that day */
export const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

/** @param {Date} date @returns {Date} the 1st of that month */
export const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

/** @param {Date} date @param {number} months @returns {Date} 1st of the shifted month */
export const addMonths = (date, months) => new Date(date.getFullYear(), date.getMonth() + months, 1);

/** @param {Date} date @param {number} days @returns {Date} */
export const addDays = (date, days) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** @param {Date} date @param {number} weekStartsOn 0 = Sunday … 6 = Saturday @returns {Date} */
export const startOfWeek = (date, weekStartsOn = 0) => addDays(date, -((date.getDay() - weekStartsOn + 7) % 7));

/** @param {Date|null|undefined} a @param {Date|null|undefined} b @returns {boolean} */
export const sameDay = (a, b) => Boolean(a && b) &&
	a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** @param {Date} a @param {Date} b @returns {boolean} */
export const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Whole-day difference a − b. */
export const dayDiff = (a, b) => Math.round((startOfDay(a) - startOfDay(b)) / 86400000);

/** `YYYY-MM-DD` in local time — a stable key for a day. */
export const isoDay = (date) => [
	date.getFullYear(),
	String(date.getMonth() + 1).padStart(2, "0"),
	String(date.getDate()).padStart(2, "0")
].join("-");

/**
 * The weeks (arrays of 7 dates) covering a month, outside days included.
 *
 * @param {Date} month any date in the month
 * @param {number} weekStartsOn
 * @param {boolean} [fixedWeeks] always return 6 weeks
 * @returns {Date[][]}
 */
export const monthWeeks = (month, weekStartsOn = 0, fixedWeeks = false) => {
	const first = startOfMonth(month);
	const start = startOfWeek(first, weekStartsOn);
	const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
	const count = fixedWeeks ? 6 : Math.ceil((dayDiff(last, start) + 1) / 7);

	return Array.from({ length: count }, (_, week) => Array.from({ length: 7 }, (__, day) => addDays(start, week * 7 + day)));
};

/**
 * Does a date match a react-day-picker style matcher?
 * Matchers: boolean, Date, Date[], (date) => boolean, `{ before }`, `{ after }`,
 * `{ from, to }`, `{ dayOfWeek: [0, 6] }`, or an array of any of these.
 *
 * @param {Date} date
 * @param {*} matcher
 * @returns {boolean}
 */
export const matchesDay = (date, matcher) => {
	if(!matcher) {
		return false;
	}

	if(matcher === true) {
		return true;
	}

	if(Array.isArray(matcher)) {
		return matcher.some((one) => matchesDay(date, one));
	}

	if(matcher instanceof Date) {
		return sameDay(date, matcher);
	}

	if(typeof matcher === "function") {
		return Boolean(matcher(date));
	}

	const checks = [];

	if(matcher.before) {
		checks.push(dayDiff(date, matcher.before) < 0);
	}

	if(matcher.after) {
		checks.push(dayDiff(date, matcher.after) > 0);
	}

	if(matcher.from) {
		checks.push(dayDiff(date, matcher.from) >= 0 && dayDiff(date, matcher.to || matcher.from) <= 0);
	}

	if(matcher.dayOfWeek) {
		checks.push([].concat(matcher.dayOfWeek).includes(date.getDay()));
	}

	// { before, after } together means "outside the window", as in react-day-picker.
	if(matcher.before && matcher.after) {
		return checks[0] || checks[1];
	}

	return checks.length > 0 && checks.every(Boolean);
};

/**
 * Format with Intl; `options` is an Intl.DateTimeFormat options object.
 *
 * @param {Date} date
 * @param {object} options
 * @param {string} [locale]
 * @returns {string}
 */
export const formatDate = (date, options, locale) => (locale
	? new Intl.DateTimeFormat(locale, options).format(date)
	: formatQrpDate(date, options));

/**
 * components/slider.js — Slider: one or more thumbs on a track.
 *
 *   Slider({ defaultValue: [50], max: 100, step: 1, class: "w-[60%]" })
 *   Slider({ value: [settings, "range"], min: 0, max: 1000, step: 10 })   // two thumbs if the array has two
 *
 * `value` (number array, thunk, or `[state, "key"]`) or qrp's `bind` (a number
 * key works too, like `el("input", { type: "range", bind })`), `defaultValue`,
 * `onValueChange`, `onValueCommit` (pointer released / key pressed), `min`,
 * `max`, `step`, `minStepsBetweenThumbs`, `orientation`, `inverted`,
 * `disabled`, and `name` to submit with a <form> (`name[]` for several thumbs).
 * Drag anywhere on the track; arrows / PageUp / PageDown / Home / End on a thumb.
 * https://ui.shadcn.com/docs/components/slider
 */

import { el, list } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, read, controllable } from "../utils/index.js";
import { bound } from "../utils/roving.js";

// Half the thumb's size (size-4 = 16px): keeps the thumb inside the track ends.
const THUMB_HALF = 8;
const PAGE_STEPS = 10;

const clamp = (value, low, high) => Math.min(Math.max(value, low), high);

/**
 * @param {object} [props]
 * @param {number[]|Function|Array} [props.value] values, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]; a number key binds one thumb
 * @param {number[]} [props.defaultValue] default [min]
 * @param {Function} [props.onValueChange] (values) => void, while dragging
 * @param {Function} [props.onValueCommit] (values) => void, at the end of an interaction
 * @param {number} [props.min] default 0
 * @param {number} [props.max] default 100
 * @param {number} [props.step] default 1
 * @param {number} [props.minStepsBetweenThumbs] default 0
 * @param {("horizontal"|"vertical")} [props.orientation] default horizontal
 * @param {boolean} [props.inverted] flip the direction
 * @param {boolean} [props.disabled]
 * @param {string} [props.name] form field name
 */
export const Slider = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, [
		"class", "value", "bind", "defaultValue", "onValueChange", "onValueCommit", "min", "max", "step",
		"minStepsBetweenThumbs", "orientation", "inverted", "disabled", "name"
	]);
	const min = own.min === undefined ? 0 : own.min;
	const max = own.max === undefined ? 100 : own.max;
	const step = own.step || 1;
	const gap = (own.minStepsBetweenThumbs || 0) * step;
	const orientation = own.orientation || "horizontal";
	const vertical = orientation === "vertical";
	const decimals = (String(step).split(".")[1] || "").length;
	const asArray = (value) => {
		if(Array.isArray(value)) {
			return value;
		}

		return value === undefined || value === null || value === "" ? [min] : [Number(value)];
	};
	const raw = controllable(bound(own, "value"), Array.isArray(own.defaultValue) ? own.defaultValue : [min], own.onValueChange ? (value) => own.onValueChange(asArray(value)) : undefined);
	// A bound NUMBER (qrp's `bind` on a range input) stays a number: one thumb.
	const values = {
		get: () => asArray(raw.get()),
		set: (next) => raw.set(Array.isArray(raw.get()) ? next : next[0])
	};
	const disabled = () => Boolean(read(own.disabled));
	const current = () => values.get() || [];

	const percent = (value) => {
		const ratio = ((value - min) / (max - min)) * 100;

		return own.inverted ? 100 - ratio : ratio;
	};

	const snap = (value) => Number((Math.round((clamp(value, min, max) - min) / step) * step + min).toFixed(decimals));

	const update = (index, raw) => {
		const now = current();
		const low = index > 0 ? now[index - 1] + gap : min;
		const high = index < now.length - 1 ? now[index + 1] - gap : max;
		const next = snap(clamp(raw, low, high));

		if(next !== now[index]) {
			values.set(now.map((value, position) => (position === index ? next : value)));
		}
	};

	const commit = () => {
		if(own.onValueCommit) {
			own.onValueCommit(current());
		}
	};

	const dataDisabled = () => (disabled() ? true : null);

	const rangeStyle = () => {
		const points = current().map(percent);
		const start = points.length > 1 ? Math.min(...points) : (own.inverted ? Math.max(...points) : 0);
		const end = points.length > 1 ? Math.max(...points) : (own.inverted ? 100 : Math.max(...points, 0));
		const low = Math.min(start, end);
		const high = Math.max(start, end);

		return vertical ? { bottom: `${low}%`, top: `${100 - high}%` } : { left: `${low}%`, right: `${100 - high}%` };
	};

	const thumbStyle = (index) => () => {
		const position = percent(current()[index]);
		const offset = THUMB_HALF - (position / 50) * THUMB_HALF;

		if(vertical) {
			return { position: "absolute", bottom: `calc(${position}% + ${offset}px)`, transform: "translateY(50%)" };
		}

		return { position: "absolute", left: `calc(${position}% + ${offset}px)`, transform: "translateX(-50%)" };
	};

	const onThumbKey = (index) => (event) => {
		if(disabled()) {
			return;
		}

		const big = event.shiftKey ? PAGE_STEPS : 1;
		const flip = own.inverted ? -1 : 1;
		const deltas = {
			ArrowRight: step * big * (vertical ? 1 : flip),
			ArrowUp: step * big * (vertical ? flip : 1),
			ArrowLeft: -step * big * (vertical ? 1 : flip),
			ArrowDown: -step * big * (vertical ? flip : 1),
			PageUp: step * PAGE_STEPS,
			PageDown: -step * PAGE_STEPS
		};

		if(event.key === "Home" || event.key === "End") {
			event.preventDefault();
			update(index, event.key === "Home" ? min : max);
			commit();
			return;
		}

		if(deltas[event.key] !== undefined) {
			event.preventDefault();
			update(index, current()[index] + deltas[event.key]);
			commit();
		}
	};

	const thumb = (index) => el("span", { style: thumbStyle(index) }, el("span", {
		"data-slot": "slider-thumb",
		role: "slider",
		tabindex: () => (disabled() ? null : "0"),
		"aria-valuemin": String(min),
		"aria-valuemax": String(max),
		"aria-valuenow": () => String(current()[index]),
		"aria-orientation": orientation,
		"data-orientation": orientation,
		"data-disabled": dataDisabled,
		onkeydown: onThumbKey(index),
		class: "block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
	}));

	const indexes = () => current().map((_, index) => index);
	const multiple = () => current().length > 1;

	const inputs = own.name ? list(indexes, (index) => index, (index) => el("input", {
		type: "hidden",
		name: () => (multiple() ? `${own.name}[]` : own.name),
		value: () => String(current()[index])
	})) : null;

	const root = el("span", Object.assign({
		"data-slot": "slider",
		"data-orientation": orientation,
		"data-disabled": dataDisabled,
		"aria-disabled": () => (disabled() ? "true" : null),
		dir: "ltr"
	}, rest, {
		class: cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", own.class)
	}), el("span", {
		"data-slot": "slider-track",
		"data-orientation": orientation,
		"data-disabled": dataDisabled,
		class: "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
	}, el("span", {
		"data-slot": "slider-range",
		"data-orientation": orientation,
		"data-disabled": dataDisabled,
		class: "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
		style: rangeStyle
	})), list(indexes, (index) => index, thumb), inputs);

	const valueAt = (event) => {
		const rect = root.getBoundingClientRect();
		const ratio = vertical ? (rect.bottom - event.clientY) / (rect.height || 1) : (event.clientX - rect.left) / (rect.width || 1);
		const directed = own.inverted ? 1 - ratio : ratio;

		return min + clamp(directed, 0, 1) * (max - min);
	};

	const closest = (raw) => current().reduce((best, value, index, all) => (Math.abs(value - raw) < Math.abs(all[best] - raw) ? index : best), 0);

	const thumbs = () => [...root.querySelectorAll("[data-slot=slider-thumb]")];

	root.addEventListener("pointerdown", (event) => {
		if(disabled() || event.button > 0) {
			return;
		}

		event.preventDefault();

		const raw = valueAt(event);
		const index = closest(raw);

		update(index, raw);

		if(thumbs()[index]) {
			thumbs()[index].focus();
		}

		if(root.setPointerCapture && event.pointerId !== undefined) {
			try {
				root.setPointerCapture(event.pointerId);
			} catch {
				// Synthetic events have no active pointer to capture.
			}
		}

		const onMove = (move) => update(index, valueAt(move));
		const onUp = () => {
			root.removeEventListener("pointermove", onMove);
			root.removeEventListener("pointerup", onUp);
			root.removeEventListener("pointercancel", onUp);
			commit();
		};

		root.addEventListener("pointermove", onMove);
		root.addEventListener("pointerup", onUp);
		root.addEventListener("pointercancel", onUp);
	});

	return root;
};

/**
 * qrp `forms` input type: `registerInput("range", sliderInput)` swaps native
 * range inputs for this slider; `min` / `max` / `step` come from the spec.
 *
 * @param {object} settings reactive state
 * @param {string} key the field key (a number, or an array for several thumbs)
 * @param {object} [spec] field spec (`min`, `max`, `step`, `disabled`, `orientation`)
 * @returns {HTMLElement}
 */
export const sliderInput = (settings, key, spec = {}) => Slider({
	bind: [settings, key],
	name: key,
	min: spec.min === undefined ? undefined : Number(spec.min),
	max: spec.max === undefined ? undefined : Number(spec.max),
	step: spec.step === undefined ? undefined : Number(spec.step),
	disabled: spec.disabled,
	orientation: spec.orientation
});

/**
 * utils/floating.js — position a floating element against a reference.
 *
 * Side + align placement with flip and viewport shift, the subset of Radix
 * Popper the shadcn components rely on. It writes:
 *
 * - `data-side` / `data-align` on the floating node (drives the slide-in classes)
 * - `--qs-transform-origin`  (zoom animations grow from the anchor)
 * - `--qs-anchor-width` / `--qs-anchor-height` (Select matches its trigger)
 * - `--qs-available-width` / `--qs-available-height` (menus cap their height)
 *
 * qrp's `behaviors/anchored` covers top/bottom + left alignment; this adds the
 * left/right sides, center/end alignment and the CSS variables above.
 */

const OPPOSITE = { top: "bottom", bottom: "top", left: "right", right: "left" };

const ORIGIN_SIDE = { top: "bottom", bottom: "top", left: "right", right: "left" };

const VIEWPORT_PADDING = 8;

const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });

const isVertical = (side) => side === "top" || side === "bottom";

const spaceOn = (side, ref, view) => {
	if(side === "top") {
		return ref.top;
	}

	if(side === "bottom") {
		return view.height - ref.bottom;
	}

	if(side === "left") {
		return ref.left;
	}

	return view.width - ref.right;
};

const mainAxis = (side, ref, size, offset) => {
	if(side === "top") {
		return ref.top - size.height - offset;
	}

	if(side === "bottom") {
		return ref.bottom + offset;
	}

	if(side === "left") {
		return ref.left - size.width - offset;
	}

	return ref.right + offset;
};

const crossAxis = (side, align, ref, size, offset) => {
	const start = isVertical(side) ? ref.left : ref.top;
	const length = isVertical(side) ? ref.width : ref.height;
	const own = isVertical(side) ? size.width : size.height;

	if(align === "start") {
		return start + offset;
	}

	if(align === "end") {
		return start + length - own - offset;
	}

	return start + (length - own) / 2 + offset;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

const transformOrigin = (side, align) => {
	const alongMain = ORIGIN_SIDE[side];
	const cross = { start: isVertical(side) ? "left" : "top", center: "center", end: isVertical(side) ? "right" : "bottom" }[align];

	return isVertical(side) ? `${cross} ${alongMain}` : `${alongMain} ${cross}`;
};

/**
 * Pick the side to render on: the preferred one, unless it overflows and the
 * opposite side has more room.
 */
const chooseSide = (preferred, ref, size, offset, view) => {
	const needed = (isVertical(preferred) ? size.height : size.width) + offset + VIEWPORT_PADDING;
	const opposite = OPPOSITE[preferred];

	if(spaceOn(preferred, ref, view) < needed && spaceOn(opposite, ref, view) > spaceOn(preferred, ref, view)) {
		return opposite;
	}

	return preferred;
};

/**
 * Place `floating` next to `reference` once.
 *
 * @param {Element|{getBoundingClientRect: Function}} reference element or virtual point
 * @param {HTMLElement} floating the positioned node (made position: fixed)
 * @param {object} [options]
 * @param {("top"|"right"|"bottom"|"left")} [options.side] preferred side (default bottom)
 * @param {("start"|"center"|"end")} [options.align] cross-axis alignment (default center)
 * @param {number} [options.sideOffset] gap from the reference in px (default 4)
 * @param {number} [options.alignOffset] cross-axis nudge in px (default 0)
 * @param {boolean} [options.avoidCollisions] flip/shift to stay on screen (default true)
 */
export const place = (reference, floating, options = {}) => {
	const preferred = options.side || "bottom";
	const align = options.align || "center";
	const sideOffset = options.sideOffset === undefined ? 4 : options.sideOffset;
	const alignOffset = options.alignOffset || 0;
	const avoid = options.avoidCollisions !== false;
	const ref = reference.getBoundingClientRect();
	const view = viewport();

	floating.style.position = "fixed";
	floating.style.setProperty("--qs-anchor-width", `${ref.width}px`);
	floating.style.setProperty("--qs-anchor-height", `${ref.height}px`);

	const rect = floating.getBoundingClientRect();
	const size = { width: rect.width, height: rect.height };
	const side = avoid ? chooseSide(preferred, ref, size, sideOffset, view) : preferred;

	let top;
	let left;

	if(isVertical(side)) {
		top = mainAxis(side, ref, size, sideOffset);
		left = crossAxis(side, align, ref, size, alignOffset);
	} else {
		left = mainAxis(side, ref, size, sideOffset);
		top = crossAxis(side, align, ref, size, alignOffset);
	}

	if(avoid) {
		left = clamp(left, VIEWPORT_PADDING, view.width - size.width - VIEWPORT_PADDING);
		top = clamp(top, VIEWPORT_PADDING, view.height - size.height - VIEWPORT_PADDING);
	}

	floating.style.top = `${Math.round(top)}px`;
	floating.style.left = `${Math.round(left)}px`;
	floating.style.setProperty("--qs-available-height", `${Math.max(0, Math.round(isVertical(side) ? spaceOn(side, ref, view) - sideOffset - VIEWPORT_PADDING : view.height - 2 * VIEWPORT_PADDING))}px`);
	floating.style.setProperty("--qs-available-width", `${Math.max(0, Math.round(isVertical(side) ? view.width - 2 * VIEWPORT_PADDING : spaceOn(side, ref, view) - sideOffset - VIEWPORT_PADDING))}px`);
	floating.style.setProperty("--qs-transform-origin", transformOrigin(side, align));
	floating.dataset.side = side;
	floating.dataset.align = align;
};

/**
 * Keep `floating` placed next to `reference` across scroll and resize.
 *
 * @param {Element|{getBoundingClientRect: Function}} reference
 * @param {HTMLElement} floating
 * @param {object} [options] see place()
 * @returns {Function} stop (also exposes `.update()`)
 */
export const follow = (reference, floating, options = {}) => {
	const update = () => place(reference, floating, options);

	update();

	window.addEventListener("resize", update);
	window.addEventListener("scroll", update, true);

	const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);

	if(observer) {
		observer.observe(floating);
	}

	const stop = () => {
		window.removeEventListener("resize", update);
		window.removeEventListener("scroll", update, true);

		if(observer) {
			observer.disconnect();
		}
	};

	stop.update = update;

	return stop;
};

/**
 * A virtual reference at a viewport point — for context menus.
 *
 * @param {number} x clientX
 * @param {number} y clientY
 * @returns {{ getBoundingClientRect: Function }}
 */
export const pointAt = (x, y) => ({
	getBoundingClientRect: () => ({ top: y, bottom: y, left: x, right: x, width: 0, height: 0, x, y })
});

/**
 * components/carousel.js — Carousel on native scroll-snap (shadcn uses Embla).
 *
 *   Carousel({ opts: { align: "start", loop: true }, setApi: (api) => … },
 *     CarouselContent(...slides.map((s) => CarouselItem({ class: "basis-1/3" }, s))),
 *     CarouselPrevious(), CarouselNext())
 *
 * Swipe / trackpad scrolling snaps natively; buttons and ←/→ move one slide.
 * `setApi(api)` hands back `{ scrollPrev, scrollNext, scrollTo(i), canScrollPrev(),
 * canScrollNext(), selectedScrollSnap(), scrollSnapList(), state }` where `state`
 * is reactive `{ index, count, canPrev, canNext }`.
 * https://ui.shadcn.com/docs/components/carousel
 */

import { el, state, effect, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, watchTree } from "../utils/index.js";
import { Button } from "./button.js";
import { ArrowLeftIcon, ArrowRightIcon } from "../icons/index.js";

/** The caller's class per part, so the root can compose orientation defaults
 *  without fighting a user override (shadcn relies on tailwind-merge here). */
const userClass = new WeakMap();

const ORIENTED = {
	horizontal: {
		track: "-ml-4",
		trackOverride: /(^|\s)-?m[lx]?-/,
		item: "pl-4",
		itemOverride: /(^|\s)p[lx]?-/,
		previous: "top-1/2 -left-12 -translate-y-1/2",
		next: "top-1/2 -right-12 -translate-y-1/2",
		viewport: "overflow-x-auto overscroll-x-contain snap-x snap-mandatory no-scrollbar",
		start: "left",
		size: "width",
		scroll: "scrollLeft",
		scrollSize: "scrollWidth",
		client: "clientWidth",
		padding: "paddingLeft",
		paddingEnd: "paddingRight",
		margin: "scrollMarginLeft"
	},
	vertical: {
		track: "-mt-4 flex-col",
		trackOverride: /(^|\s)-?m[ty]?-/,
		item: "pt-4",
		itemOverride: /(^|\s)p[ty]?-/,
		previous: "-top-12 left-1/2 -translate-x-1/2 rotate-90",
		next: "-bottom-12 left-1/2 -translate-x-1/2 rotate-90",
		viewport: "overflow-y-auto overscroll-y-contain snap-y snap-mandatory no-scrollbar",
		start: "top",
		size: "height",
		scroll: "scrollTop",
		scrollSize: "scrollHeight",
		client: "clientHeight",
		padding: "paddingTop",
		paddingEnd: "paddingBottom",
		margin: "scrollMarginTop"
	}
};

const SNAP = { start: "snap-start", center: "snap-center", end: "snap-end" };

const remember = (node, value) => {
	userClass.set(node, value);

	return node;
};

const userOf = (node) => userClass.get(node) || "";

const classText = (value) => (typeof value === "function" ? value() : value) || "";

export const CarouselContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const track = remember(el("div", Object.assign({ "data-slot": "carousel-track", class: "flex" }, rest), ...children), own.class);

	return el("div", { "data-slot": "carousel-content", class: "overflow-hidden" }, track);
};

export const CarouselItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return remember(el("div", Object.assign({
		"data-slot": "carousel-item",
		role: "group",
		"aria-roledescription": "slide",
		// A caller's basis-* (basis-1/3 for three per view) replaces the default.
		class: cn("min-w-0 shrink-0 grow-0", /(^|\s)basis-/.test(classText(own.class)) ? null : "basis-full", own.class)
	}, rest), ...children), own.class);
};

const navButton = (slot, label, icon) => (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "size"]);

	return remember(Button(Object.assign({ "data-slot": slot }, rest, {
		variant: own.variant || "outline",
		size: own.size || "icon",
		class: cn("absolute size-8 rounded-full", own.class)
	}), ...(children.length ? children : [icon(), el("span", { class: "sr-only" }, label)])), own.class);
};

export const CarouselPrevious = navButton("carousel-previous", "Previous slide", ArrowLeftIcon);
export const CarouselNext = navButton("carousel-next", "Next slide", ArrowRightIcon);

/**
 * `Carousel(props, ...parts)`.
 *
 * @param {object} [props]
 * @param {("horizontal"|"vertical")} [props.orientation] default horizontal
 * @param {object} [props.opts] `{ align: "start"|"center"|"end", loop: boolean }`
 * @param {Function} [props.setApi] (api) => void — see the file header
 * @returns {HTMLElement}
 */
export const Carousel = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "orientation", "opts", "setApi", "plugins"]);
	const opts = own.opts || {};
	const orientation = own.orientation || (opts.axis === "y" ? "vertical" : "horizontal");
	const axis = ORIENTED[orientation];
	const align = opts.align || "start";
	const live = state({ index: 0, count: 0, canPrev: false, canNext: false });

	const root = el("div", Object.assign({
		"data-slot": "carousel",
		"data-orientation": orientation,
		role: "region",
		"aria-roledescription": "carousel"
	}, rest, { class: cn("relative", own.class) }), ...children);

	const viewport = root.querySelector("[data-slot=carousel-content]");
	const track = root.querySelector("[data-slot=carousel-track]");
	const previous = root.querySelector("[data-slot=carousel-previous]");
	const next = root.querySelector("[data-slot=carousel-next]");

	if(!viewport || !track) {
		return root;
	}

	viewport.className = axis.viewport;
	track.className = cn("flex", axis.trackOverride.test(classText(userOf(track))) ? null : axis.track, classText(userOf(track)));

	if(previous) {
		previous.classList.add(...axis.previous.split(" "));
	}

	if(next) {
		next.classList.add(...axis.next.split(" "));
	}

	const items = () => [...track.children].filter((node) => node.getAttribute("data-slot") === "carousel-item");

	// Where the viewport must scroll to so item i's CONTENT box (inside its
	// gutter padding) sits at the aligned position.
	const snapOf = (item) => {
		const style = getComputedStyle(item);
		const pad = parseFloat(style[axis.padding]) || 0;
		const padEnd = parseFloat(style[axis.paddingEnd]) || 0;
		const offset = item.getBoundingClientRect()[axis.start] - viewport.getBoundingClientRect()[axis.start] + viewport[axis.scroll];
		const content = item.getBoundingClientRect()[axis.size] - pad - padEnd;
		const view = viewport[axis.client];
		const max = viewport[axis.scrollSize] - view;
		const alignShift = { start: 0, center: (view - content) / 2, end: view - content }[align];

		return Math.max(0, Math.min(max, offset + pad - alignShift));
	};

	const snaps = () => items().map(snapOf);

	const sync = () => {
		const list = items();
		const positions = snaps();
		const at = viewport[axis.scroll];
		const max = viewport[axis.scrollSize] - viewport[axis.client];
		const index = positions.reduce((best, position, i) => (Math.abs(position - at) < Math.abs(positions[best] - at) ? i : best), 0);

		// Snap to the content box, not the padded gutter, so native swipes land
		// exactly where the buttons do.
		list.forEach((item) => {
			item.classList.add(SNAP[align]);
			item.style[axis.margin] = `-${getComputedStyle(item)[axis.padding]}`;

			if(!axis.itemOverride.test(classText(userOf(item)))) {
				item.classList.add(axis.item);
			}
		});

		live.count = list.length;
		live.index = list.length === 0 ? 0 : index;
		live.canPrev = Boolean(opts.loop) || at > 1;
		live.canNext = Boolean(opts.loop) || at < max - 1;
	};

	const scrollTo = (index, jump) => {
		const positions = snaps();

		if(positions.length === 0) {
			return;
		}

		const target = ((index % positions.length) + positions.length) % positions.length;

		viewport.scrollTo({ [axis.start]: positions[target], behavior: jump ? "auto" : "smooth" });
		live.index = target;
	};

	const scrollPrev = () => {
		if(live.index === 0 && !opts.loop) {
			return;
		}

		scrollTo(live.index - 1);
	};

	const scrollNext = () => {
		const last = items().length - 1;

		if(live.index >= last && !opts.loop) {
			return;
		}

		scrollTo(live.index + 1);
	};

	if(previous) {
		previous.addEventListener("click", scrollPrev);
	}

	if(next) {
		next.addEventListener("click", scrollNext);
	}

	effect(() => {
		if(previous) {
			previous.disabled = !live.canPrev;
		}

		if(next) {
			next.disabled = !live.canNext;
		}
	});

	root.addEventListener("keydown", (event) => {
		if(event.target.closest("input, textarea, select, [contenteditable]")) {
			return;
		}

		if(event.key === "ArrowLeft") {
			event.preventDefault();
			scrollPrev();
		} else if(event.key === "ArrowRight") {
			event.preventDefault();
			scrollNext();
		}
	}, true);

	let frame = 0;
	const onScroll = () => {
		cancelAnimationFrame(frame);
		frame = requestAnimationFrame(sync);
	};

	viewport.addEventListener("scroll", onScroll, { passive: true });
	window.addEventListener("resize", onScroll);

	const stopWatching = watchTree(track, sync);

	onDispose(() => {
		cancelAnimationFrame(frame);
		window.removeEventListener("resize", onScroll);
		stopWatching();
	});

	// Measurements need layout: resync once the carousel is in the document.
	requestAnimationFrame(sync);

	if(own.setApi) {
		own.setApi({
			scrollPrev,
			scrollNext,
			scrollTo,
			canScrollPrev: () => live.canPrev,
			canScrollNext: () => live.canNext,
			selectedScrollSnap: () => live.index,
			scrollSnapList: snaps,
			state: live,
			root
		});
	}

	return root;
};

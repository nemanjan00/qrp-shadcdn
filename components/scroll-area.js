/**
 * components/scroll-area.js — ScrollArea + ScrollBar: native scrolling with
 * custom overlay scrollbars, like Radix ScrollArea.
 *
 *   ScrollArea({ class: "h-72 w-48 rounded-md border" }, longContent)
 *   ScrollArea({ class: "w-96 whitespace-nowrap" }, row, ScrollBar({ orientation: "horizontal" }))
 *
 * A vertical ScrollBar is always included; pass a horizontal one as a child.
 * `type`: "hover" (default — shown while hovered), "scroll" (while scrolling),
 * "auto" (whenever content overflows), "always".
 * https://ui.shadcn.com/docs/components/scroll-area
 */

import { el, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn } from "../utils/index.js";

const MIN_THUMB = 18;
const HIDE_DELAY = 600;

const AXES = {
	vertical: {
		size: "clientHeight",
		content: "scrollHeight",
		scroll: "scrollTop",
		thumbSize: "height",
		translate: "translateY",
		client: "clientY",
		rect: "height",
		start: "top"
	},
	horizontal: {
		size: "clientWidth",
		content: "scrollWidth",
		scroll: "scrollLeft",
		thumbSize: "width",
		translate: "translateX",
		client: "clientX",
		rect: "width",
		start: "left"
	}
};

/**
 * `ScrollBar({ orientation: "vertical" | "horizontal" })`.
 */
export const ScrollBar = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["orientation", "class"]);
	const orientation = own.orientation || "vertical";

	return el("div", Object.assign({
		"data-slot": "scroll-area-scrollbar",
		"data-orientation": orientation,
		"data-state": "hidden",
		class: cn(
			"flex touch-none p-px transition-colors select-none",
			orientation === "vertical" && "h-full w-2.5 border-l border-l-transparent",
			orientation === "horizontal" && "h-2.5 flex-col border-t border-t-transparent",
			own.class
		)
	}, rest), el("div", { "data-slot": "scroll-area-thumb", class: "relative flex-1 rounded-full bg-border" }));
};

/** Wire one scrollbar to the viewport; returns its `update()`. */
const connect = (viewport, bar, visible) => {
	const axis = AXES[bar.getAttribute("data-orientation")];
	const thumb = bar.querySelector("[data-slot=scroll-area-thumb]");

	const metrics = () => {
		const view = viewport[axis.size];
		const content = viewport[axis.content];
		const track = bar.getBoundingClientRect()[axis.rect] || view;
		const size = content > 0 ? Math.max(MIN_THUMB, Math.min(track, (view / content) * track)) : track;

		return { view, content, track, size, room: track - size, range: Math.max(0, content - view) };
	};

	const update = () => {
		const m = metrics();
		const offset = m.range > 0 ? (viewport[axis.scroll] / m.range) * m.room : 0;

		thumb.style[axis.thumbSize] = `${m.size}px`;
		thumb.style.flex = "none";
		thumb.style.transform = `${axis.translate}(${offset}px)`;
		bar.hidden = m.range <= 0 && bar.getAttribute("data-force") !== "true";
		const shown = visible() && !bar.hidden;

		bar.setAttribute("data-state", shown ? "visible" : "hidden");
		// Radix unmounts a hidden scrollbar; hiding it in place keeps the wiring.
		bar.style.visibility = shown ? "" : "hidden";
	};

	const scrollToPointer = (event, grab) => {
		const m = metrics();
		const start = bar.getBoundingClientRect()[axis.start];
		const position = event[axis.client] - start - grab;

		viewport[axis.scroll] = m.room > 0 ? (position / m.room) * m.range : 0;
	};

	bar.addEventListener("pointerdown", (down) => {
		down.preventDefault();

		const onThumb = down.target === thumb;
		const grab = onThumb ? down[axis.client] - thumb.getBoundingClientRect()[axis.start] : metrics().size / 2;

		if(!onThumb) {
			scrollToPointer(down, grab);
		}

		bar.setAttribute("data-dragging", "true");

		const onMove = (event) => scrollToPointer(event, grab);
		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			bar.removeAttribute("data-dragging");
		};

		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	});

	return update;
};

/**
 * `ScrollArea({ type, scrollHideDelay }, ...children)`.
 *
 * @param {object} [props]
 * @param {("hover"|"scroll"|"auto"|"always")} [props.type] scrollbar visibility (default hover)
 * @param {number} [props.scrollHideDelay] ms before hiding (default 600)
 * @returns {HTMLElement}
 */
export const ScrollArea = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "type", "scrollHideDelay"]);
	const type = own.type || "hover";
	const hideDelay = own.scrollHideDelay === undefined ? HIDE_DELAY : own.scrollHideDelay;
	const isBar = (child) => child instanceof Element && child.getAttribute("data-slot") === "scroll-area-scrollbar";
	const bars = children.filter(isBar);
	const content = children.filter((child) => !isBar(child));

	if(!bars.some((bar) => bar.getAttribute("data-orientation") === "vertical")) {
		bars.unshift(ScrollBar());
	}

	const horizontal = bars.some((bar) => bar.getAttribute("data-orientation") === "horizontal");

	const viewport = el("div", {
		"data-slot": "scroll-area-viewport",
		tabindex: "0",
		class: "size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 no-scrollbar",
		style: { overflowY: "scroll", overflowX: horizontal ? "scroll" : "hidden" }
	}, el("div", { style: { minWidth: "100%", display: "table" } }, ...content));

	const root = el("div", Object.assign({ "data-slot": "scroll-area" }, rest, {
		class: cn("relative", own.class),
		style: { overflow: "hidden" }
	}), viewport, ...bars);

	bars.forEach((bar) => {
		const vertical = bar.getAttribute("data-orientation") === "vertical";

		Object.assign(bar.style, vertical
			? { position: "absolute", top: "0", right: "0", bottom: horizontal ? "10px" : "0" }
			: { position: "absolute", left: "0", right: "0", bottom: "0" });

		if(type === "always") {
			bar.setAttribute("data-force", "true");
		}
	});

	let hovered = false;
	let scrolling = false;
	let timer = 0;

	const visible = () => type === "always" || type === "auto" || (type === "hover" && (hovered || scrolling)) || (type === "scroll" && scrolling);
	const updates = bars.map((bar) => connect(viewport, bar, visible));
	const update = () => updates.forEach((fn) => fn());

	const showBriefly = () => {
		scrolling = true;
		clearTimeout(timer);
		timer = setTimeout(() => {
			scrolling = false;
			update();
		}, hideDelay);
	};

	viewport.addEventListener("scroll", () => {
		showBriefly();
		update();
	}, { passive: true });

	root.addEventListener("pointerenter", () => {
		hovered = true;
		update();
	});

	root.addEventListener("pointerleave", () => {
		hovered = false;
		clearTimeout(timer);
		timer = setTimeout(update, hideDelay);
	});

	const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);

	if(observer) {
		observer.observe(viewport);
		observer.observe(viewport.firstChild);
	}

	requestAnimationFrame(update);

	onDispose(() => {
		clearTimeout(timer);

		if(observer) {
			observer.disconnect();
		}
	});

	return root;
};

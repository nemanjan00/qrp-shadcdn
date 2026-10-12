/**
 * components/resizable.js — Resizable panel groups (shadcn wraps
 * react-resizable-panels).
 *
 *   ResizablePanelGroup({ orientation: "horizontal" },
 *     ResizablePanel({ defaultSize: 25, minSize: 15 }, sidebar),
 *     ResizableHandle({ withHandle: true }),
 *     ResizablePanel({ defaultSize: 75 }, content))
 *
 * Sizes are percentages of the group. Drag a handle, or focus it and use the
 * arrow keys (Home/End jump to the limits). `onLayout(sizes)` reports changes;
 * `direction` is accepted as an alias of `orientation`.
 * https://ui.shadcn.com/docs/components/resizable
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, uid } from "../utils/index.js";
import { GripVerticalIcon } from "../icons/index.js";

const KEYBOARD_STEP = 10;

const limits = new WeakMap();

/**
 * `ResizablePanel({ defaultSize, minSize = 0, maxSize = 100 }, ...children)`.
 */
export const ResizablePanel = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["defaultSize", "minSize", "maxSize", "class", "id"]);
	const panel = el("div", Object.assign({
		"data-slot": "resizable-panel",
		id: own.id || uid("panel"),
		class: cn("overflow-hidden", own.class)
	}, rest), ...children);

	limits.set(panel, {
		defaultSize: own.defaultSize,
		minSize: own.minSize === undefined ? 0 : own.minSize,
		maxSize: own.maxSize === undefined ? 100 : own.maxSize
	});

	return panel;
};

/**
 * `ResizableHandle({ withHandle })` — the draggable divider between two panels.
 */
export const ResizableHandle = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["withHandle", "class", "disabled"]);

	return el("div", Object.assign({
		"data-slot": "resizable-handle",
		role: "separator",
		tabindex: own.disabled ? null : "0",
		"data-disabled": own.disabled ? "true" : null,
		"data-resize-handle-state": "inactive",
		class: cn("relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90", own.class)
	}, rest), own.withHandle ? el("div", { class: "z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border" }, GripVerticalIcon({ class: "size-2.5" })) : null);
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** Split 100% across panels: explicit defaultSize first, the rest evenly. */
const initialSizes = (panels) => {
	const given = panels.map((panel) => limits.get(panel).defaultSize);
	const fixed = given.filter((size) => size !== undefined).reduce((sum, size) => sum + size, 0);
	const open = given.filter((size) => size === undefined).length;
	const share = open === 0 ? 0 : Math.max(0, 100 - fixed) / open;

	return given.map((size) => (size === undefined ? share : size));
};

/**
 * `ResizablePanelGroup({ orientation, onLayout }, ...panelsAndHandles)`.
 *
 * @param {object} [props]
 * @param {("horizontal"|"vertical")} [props.orientation] default horizontal (alias: direction)
 * @param {Function} [props.onLayout] (sizes: number[]) => void
 * @returns {HTMLElement}
 */
export const ResizablePanelGroup = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["orientation", "direction", "onLayout", "class"]);
	const orientation = own.orientation || own.direction || "horizontal";
	const horizontal = orientation === "horizontal";

	const group = el("div", Object.assign({
		"data-slot": "resizable-panel-group",
		"data-panel-group-direction": orientation,
		class: cn("flex h-full w-full data-[panel-group-direction=vertical]:flex-col", own.class)
	}, rest), ...children);

	const panels = [...group.children].filter((node) => limits.has(node));
	const handles = [...group.children].filter((node) => node.getAttribute("data-slot") === "resizable-handle");
	const sizes = initialSizes(panels);

	const apply = () => {
		panels.forEach((panel, i) => {
			panel.style.flex = `${sizes[i]} 1 0px`;
			panel.setAttribute("data-panel-size", sizes[i].toFixed(1));
		});

		handles.forEach((handle) => {
			const before = handle.previousElementSibling;
			const index = panels.indexOf(before);

			if(index !== -1) {
				handle.setAttribute("aria-valuenow", String(Math.round(sizes[index])));
			}
		});

		if(own.onLayout) {
			own.onLayout(sizes.slice());
		}
	};

	/** Move the boundary after panel `index` by `delta` percent, within limits. */
	const resize = (index, delta) => {
		const a = limits.get(panels[index]);
		const b = limits.get(panels[index + 1]);
		const total = sizes[index] + sizes[index + 1];
		const low = Math.max(a.minSize, total - b.maxSize);
		const high = Math.min(a.maxSize, total - b.minSize);
		const next = clamp(sizes[index] + delta, low, high);

		sizes[index] = next;
		sizes[index + 1] = total - next;
		apply();
	};

	handles.forEach((handle) => {
		const index = panels.indexOf(handle.previousElementSibling);

		if(index === -1 || index + 1 >= panels.length) {
			return;
		}

		const a = limits.get(panels[index]);

		handle.setAttribute("aria-orientation", horizontal ? "vertical" : "horizontal");
		handle.setAttribute("aria-controls", panels[index].id);
		handle.setAttribute("aria-valuemin", String(a.minSize));
		handle.setAttribute("aria-valuemax", String(a.maxSize));

		if(handle.getAttribute("data-disabled") === "true") {
			return;
		}

		handle.style.cursor = horizontal ? "col-resize" : "row-resize";

		handle.addEventListener("pointerenter", () => {
			if(handle.getAttribute("data-resize-handle-state") !== "drag") {
				handle.setAttribute("data-resize-handle-state", "hover");
			}
		});

		handle.addEventListener("pointerleave", () => {
			if(handle.getAttribute("data-resize-handle-state") === "hover") {
				handle.setAttribute("data-resize-handle-state", "inactive");
			}
		});

		handle.addEventListener("pointerdown", (down) => {
			down.preventDefault();

			const rect = group.getBoundingClientRect();
			const length = horizontal ? rect.width : rect.height;
			const start = horizontal ? down.clientX : down.clientY;
			const startSize = sizes[index];

			handle.setAttribute("data-resize-handle-state", "drag");
			document.body.style.cursor = handle.style.cursor;

			const onMove = (event) => {
				const position = horizontal ? event.clientX : event.clientY;

				if(length > 0) {
					resize(index, startSize + ((position - start) / length) * 100 - sizes[index]);
				}
			};

			const onUp = () => {
				window.removeEventListener("pointermove", onMove);
				window.removeEventListener("pointerup", onUp);
				document.body.style.cursor = "";
				handle.setAttribute("data-resize-handle-state", "inactive");
			};

			window.addEventListener("pointermove", onMove);
			window.addEventListener("pointerup", onUp);
		});

		handle.addEventListener("keydown", (event) => {
			const back = horizontal ? "ArrowLeft" : "ArrowUp";
			const forward = horizontal ? "ArrowRight" : "ArrowDown";
			const moves = {
				[back]: () => -KEYBOARD_STEP,
				[forward]: () => KEYBOARD_STEP,
				Home: () => -100,
				End: () => 100
			};

			if(moves[event.key]) {
				event.preventDefault();
				resize(index, moves[event.key]());
			}
		});
	});

	apply();

	return group;
};

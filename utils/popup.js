/**
 * utils/popup.js — `popupRoot`, the shared root for everything anchored to a
 * trigger: Popover, Tooltip, HoverCard, DropdownMenu, Select, Combobox.
 *
 * Like `modalRoot`, the root takes `(props?, Trigger(...), Content(...))`,
 * returns the trigger in place and keeps the content detached until open. The
 * content part records its placement (`side`, `align`, `sideOffset`,
 * `alignOffset`) with `placeContent`, so it can be read when the layer opens.
 */

import { el, effect, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, uid, withRole, splitContent } from "./index.js";
import { layerWhen, openState } from "./layer.js";

const placements = new WeakMap();

/**
 * Remember where a content part wants to sit; called by Content components.
 *
 * @param {Element} content
 * @param {object} placement `{ side, align, sideOffset, alignOffset }`
 * @returns {Element} content
 */
export const placeContent = (content, placement) => {
	placements.set(content, placement);

	return content;
};

const placementOf = (content) => placements.get(content) || {};

/**
 * Hover intent: open after `openDelay` of hovering/focusing the trigger, close
 * after `closeDelay` once the pointer has left both trigger and content.
 */
const hoverIntent = (trigger, content, open, delays) => {
	let timer = null;

	const schedule = (value, delay) => {
		clearTimeout(timer);
		timer = setTimeout(() => open.set(value), delay);
	};
	const show = () => schedule(true, delays.openDelay);
	const hide = () => schedule(false, delays.closeDelay);

	trigger.addEventListener("pointerenter", show);
	trigger.addEventListener("pointerleave", hide);
	trigger.addEventListener("focus", show);
	trigger.addEventListener("blur", hide);
	trigger.addEventListener("pointerdown", () => {
		clearTimeout(timer);
		open.set(false);
	});

	if(delays.interactive) {
		content.addEventListener("pointerenter", () => clearTimeout(timer));
		content.addEventListener("pointerleave", hide);
	}

	onDispose(() => clearTimeout(timer));
};

/**
 * Build an anchored-popup root.
 *
 * @param {string} name slot prefix: "popover", "tooltip", …
 * @param {object} [options]
 * @param {string} [options.role] content role (default "dialog")
 * @param {string} [options.haspopup] trigger aria-haspopup (default options.role)
 * @param {("click"|"hover")} [options.mode] how the trigger opens it (default click)
 * @param {number} [options.openDelay] hover mode: ms before opening
 * @param {number} [options.closeDelay] hover mode: ms before closing
 * @param {boolean} [options.interactive] hover mode: keep open while hovering content
 * @param {boolean} [options.focus] move focus into the content on open (default: click mode)
 * @param {Function} [options.setup] ({ content, triggers, open, props }) => void
 * @param {Function} [options.onOpen] ({ content, triggers, open, handle }) => void
 * @returns {Function} root component
 */
export const popupRoot = (name, options = {}) => (...args) => {
	const { props, children } = parseArgs(args);
	const open = openState(props);
	const { fragment, content } = splitContent(children, `${name}-content`);
	const triggers = withRole(fragment, `${name}-trigger`);
	const anchors = withRole(fragment, `${name}-anchor`);
	const mode = options.mode || "click";
	const role = options.role === undefined ? "dialog" : options.role;

	if(!content) {
		return fragment;
	}

	content.id = content.id || uid(name);

	if(role) {
		content.setAttribute("role", role);
	}

	content.addEventListener("click", (event) => {
		const close = event.target.closest(`[data-qs-role="${name}-close"]`);

		if(close && content.contains(close)) {
			open.set(false);
		}
	});

	content.addEventListener("qs-dismiss", () => open.set(false));

	triggers.forEach((trigger) => {
		if(mode === "hover") {
			trigger.setAttribute("aria-describedby", content.id);
		} else {
			trigger.setAttribute("aria-haspopup", options.haspopup || role || "dialog");
			trigger.setAttribute("aria-controls", content.id);
			trigger.addEventListener("click", () => open.set(!open.get()));
		}

		effect(() => {
			const isOpen = Boolean(open.get());

			if(mode !== "hover") {
				trigger.setAttribute("aria-expanded", String(isOpen));
			}

			trigger.setAttribute("data-state", isOpen ? (mode === "hover" ? "delayed-open" : "open") : "closed");
		});

		if(mode === "hover") {
			hoverIntent(trigger, content, open, {
				openDelay: props.delayDuration !== undefined ? props.delayDuration : (props.openDelay !== undefined ? props.openDelay : options.openDelay || 0),
				closeDelay: props.closeDelay !== undefined ? props.closeDelay : options.closeDelay || 0,
				interactive: options.interactive
			});
		}
	});

	if(options.setup) {
		options.setup({ content, triggers, open, props });
	}

	const reference = anchors[0] || triggers[0];

	layerWhen(open, () => ({
		content,
		inside: triggers,
		modal: Boolean(props.modal),
		outside: mode !== "hover",
		escape: true,
		focus: options.focus === undefined ? mode === "click" : options.focus,
		anchor: reference ? Object.assign({ reference }, placementOf(content)) : null
	}), (handle) => {
		if(options.onOpen) {
			options.onOpen({ content, triggers, open, handle });
		}
	});

	return fragment;
};

const PLACEMENT_KEYS = ["side", "align", "sideOffset", "alignOffset", "avoidCollisions"];

/**
 * Factory for popup content parts: a styled element that also records its
 * placement props (defaults merged with the caller's).
 *
 * @param {string} slot data-slot, e.g. "popover-content"
 * @param {string} base classes
 * @param {object} [defaults] placement defaults, e.g. `{ align: "center", sideOffset: 4 }`
 * @param {Function} [extra] () => Renderable appended after children (an arrow)
 * @returns {Function} component (props?, ...children) => HTMLElement
 */
export const contentPart = (slot, base, defaults = {}, extra = null) => (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, PLACEMENT_KEYS.concat(["class"]));
	const placement = Object.assign({}, defaults);

	PLACEMENT_KEYS.forEach((key) => {
		if(own[key] !== undefined) {
			placement[key] = own[key];
		}
	});

	const node = el("div", Object.assign({ "data-slot": slot }, rest, { class: cn(base, own.class) }), ...children, extra ? extra() : null);

	return placeContent(node, placement);
};

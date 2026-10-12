/**
 * utils/roving.js — keyboard and show/hide plumbing shared by the composite
 * input components (Tabs, Accordion, Collapsible, ToggleGroup, RadioGroup).
 *
 * - `members` / `joinGroup` the item set a composite root keeps: items find
 *               their root through qrp `context` and join it, so a root knows
 *               its own items (in document order, reactively) without querying
 *               the DOM — and nested instances can't steal each other's items.
 * - `ownerOf`   the nearest enclosing root of a slot (DOM-based; Collapsible).
 * - `roveTarget` arrow/Home/End roving focus, the WAI-ARIA composite pattern.
 * - `showPanel` open/close a panel with the Radix height animation contract
 *               (a CSS variable carries the measured height; the panel is only
 *               hidden once the close animation has finished).
 * - `disclosed` qrp's `disclosure` behavior as the open state, fed by any of
 *               our controlled forms (`[state, "key"]`, a thunk, or a plain value)
 *               — qrp 0.11+ does that natively; this keeps the old shape.
 * - `bound`     the source a control reads: its own prop, else qrp's `bind`.
 */

import { state, onDispose } from "@nemanjan00/qrp";
import { disclosure } from "@nemanjan00/qrp/behaviors/disclosure";
import { animateOut } from "./index.js";

const FOLLOWING = 4;

const documentOrder = (a, b) => {
	if(a === b) {
		return 0;
	}

	return a.compareDocumentPosition(b) & FOLLOWING ? -1 : 1;
};

/**
 * The item set of a composite root (tab triggers, radio items…). `list()` is
 * reactive and in document order, so effects that read it re-run when an item
 * joins or leaves — the context-era replacement for querying the DOM.
 *
 * @returns {{ add: Function, delete: Function, has: Function, list: Function }}
 */
export const members = () => {
	const nodes = new Set();
	const tick = state({ version: 0 });

	return {
		add: (node) => {
			if(!nodes.has(node)) {
				nodes.add(node);
				tick.version += 1;
			}
		},
		delete: (node) => {
			if(nodes.delete(node)) {
				tick.version += 1;
			}
		},
		has: (node) => nodes.has(node),
		list: () => {
			void tick.version;

			return [...nodes].sort(documentOrder);
		}
	};
};

/**
 * Membership for one item: call the returned function with the root's
 * `members()` (or null) each time the item's context resolves; it joins the
 * new set, leaves the old one, and leaves for good when the item's scope is
 * disposed (a list() row removed).
 *
 * @param {Element} node the item
 * @returns {Function} (set|null) => void
 */
export const joinGroup = (node) => {
	let current = null;

	onDispose(() => {
		if(current) {
			current.delete(node);
		}
	});

	return (set) => {
		if(set === current) {
			return;
		}

		if(current) {
			current.delete(node);
		}

		current = set || null;

		if(current) {
			current.add(node);
		}
	};
};

/**
 * The item that takes Tab: the selected enabled one, else the first enabled.
 *
 * @param {Element[]} items in document order
 * @param {Function} selected (item) => boolean
 * @returns {Element|undefined}
 */
export const tabStop = (items, selected) => {
	const enabled = items.filter((item) => !isDisabled(item));

	return enabled.find(selected) || enabled[0];
};

/**
 * The value source of a control: its own prop (`checked`, `value`, `open`…)
 * when given, else qrp's `bind: [state, "key"]` — so every control binds the
 * way `el("input", { bind })` does.
 *
 * @param {object} own picked props
 * @param {string} key the control's own value prop
 * @returns {*} source for controllable()/disclosed()
 */
export const bound = (own, key) => (own[key] !== undefined ? own[key] : own.bind);

/**
 * Open state backed by qrp's `disclosure()` — which takes our controlled forms
 * natively since qrp 0.11 (`[state, "key"]`, a thunk, or a plain value, plus
 * `onChange`). Kept for its `{ disclosure, get, set }` shape.
 *
 * @param {*} source open prop: boolean, thunk, or [state, key]
 * @param {boolean} [fallback] initial state when uncontrolled
 * @param {Function} [onChange] (open) => void
 * @returns {{ disclosure: object, get: Function, set: Function }}
 */
export const disclosed = (source, fallback, onChange) => {
	const d = disclosure(source === undefined ? Boolean(fallback) : source, { onChange });

	return {
		disclosure: d,
		get: () => d.state.open,
		set: (value) => { d.state.open = Boolean(value); }
	};
};

export const ownerOf = (node, rootSlot) => (node.parentElement ? node.parentElement.closest(`[data-slot="${rootSlot}"]`) : null);

/**
 * Whether a composite item is disabled (native or data-disabled).
 *
 * @param {Element} node
 * @returns {boolean}
 */
export const isDisabled = (node) => Boolean(node.disabled) || node.hasAttribute("data-disabled");

const NEXT = { horizontal: ["ArrowRight"], vertical: ["ArrowDown"], both: ["ArrowRight", "ArrowDown"] };
const PREVIOUS = { horizontal: ["ArrowLeft"], vertical: ["ArrowUp"], both: ["ArrowLeft", "ArrowUp"] };

/**
 * Resolve the item a roving-focus key should move to.
 *
 * @param {KeyboardEvent} event the keydown
 * @param {Element[]} items focusable items in DOM order (disabled ones excluded)
 * @param {object} [options]
 * @param {("horizontal"|"vertical"|"both")} [options.orientation] axis (default both)
 * @param {boolean} [options.loop] wrap around at the ends (default true)
 * @returns {Element|null} the target, or null when the key isn't a roving key
 */
export const roveTarget = (event, items, options = {}) => {
	const orientation = options.orientation || "both";
	const loop = options.loop !== false;
	const current = items.findIndex((item) => item === event.target || item.contains(event.target));

	if(items.length === 0) {
		return null;
	}

	if(event.key === "Home") {
		return items[0];
	}

	if(event.key === "End") {
		return items[items.length - 1];
	}

	const step = NEXT[orientation].includes(event.key) ? 1 : (PREVIOUS[orientation].includes(event.key) ? -1 : 0);

	if(step === 0) {
		return null;
	}

	const next = current + step;

	if(next < 0) {
		return loop ? items[items.length - 1] : items[0];
	}

	if(next >= items.length) {
		return loop ? items[0] : items[items.length - 1];
	}

	return items[next];
};

const panelState = new WeakMap();

/**
 * Show or hide a panel, animating its height on transitions.
 *
 * The first call for a panel only sets its state (no mount animation, like
 * Radix). Opening un-hides it, measures it into `heightVar`, then flips
 * `data-state` so `animate-accordion-down`-style keyframes run; closing flips
 * `data-state` and hides the panel once the exit animation ends.
 *
 * @param {HTMLElement} panel
 * @param {boolean} open
 * @param {string} [heightVar] CSS variable for the measured height
 */
export const showPanel = (panel, open, heightVar = "--radix-collapsible-content-height") => {
	const previous = panelState.get(panel);

	if(previous === open) {
		return;
	}

	panelState.set(panel, open);

	if(previous === undefined) {
		panel.style.animationName = "none";
		panel.setAttribute("data-state", open ? "open" : "closed");
		panel.hidden = !open;

		return;
	}

	panel.style.animationName = "";

	if(open) {
		panel.hidden = false;
		panel.style.setProperty(heightVar, `${panel.scrollHeight}px`);
		panel.setAttribute("data-state", "open");

		return;
	}

	panel.style.setProperty(heightVar, `${panel.scrollHeight}px`);
	panel.setAttribute("data-state", "closed");

	animateOut(panel).then(() => {
		if(panelState.get(panel) === false) {
			panel.hidden = true;
		}
	});
};

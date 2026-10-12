/**
 * utils/roving.js — keyboard and show/hide plumbing shared by the composite
 * input components (Tabs, Accordion, Collapsible, ToggleGroup, RadioGroup).
 *
 * - `ownerOf`   the nearest enclosing root of a slot, so nested instances of
 *               the same component don't steal each other's items.
 * - `roveTarget` arrow/Home/End roving focus, the WAI-ARIA composite pattern.
 * - `showPanel` open/close a panel with the Radix height animation contract
 *               (a CSS variable carries the measured height; the panel is only
 *               hidden once the close animation has finished).
 * - `disclosed` qrp's `disclosure` behavior as the open state, fed by any of
 *               our controlled forms (`[state, "key"]`, a thunk, or a plain value).
 * - `bound`     the source a control reads: its own prop, else qrp's `bind`.
 */

import { effect, untracked } from "@nemanjan00/qrp";
import { disclosure } from "@nemanjan00/qrp/behaviors/disclosure";
import { animateOut } from "./index.js";

const isTuple = (source) => Array.isArray(source) && source.length === 2 && typeof source[1] === "string";

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
 * Open state backed by qrp's `disclosure()`. Rendering reads `d.state.open`;
 * writes go through `set`, which respects who owns the value:
 *
 * - `[state, "key"]` → writes the key; the disclosure mirrors it
 * - thunk            → only calls `onChange` (the owner decides); mirrors the thunk
 * - plain / none     → the disclosure IS the state (uncontrolled)
 *
 * @param {*} source the `open` prop (or `bind`)
 * @param {boolean} fallback initial open state when uncontrolled
 * @param {Function} [onChange] (open) => void
 * @returns {{ disclosure: object, get: Function, set: Function }}
 */
export const disclosed = (source, fallback, onChange) => {
	const notify = (value) => {
		if(onChange) {
			onChange(value);
		}
	};

	if(isTuple(source)) {
		const [obj, key] = source;
		const d = disclosure(Boolean(obj[key]));

		effect(() => {
			const value = Boolean(obj[key]);

			untracked(() => { d.state.open = value; });
		});

		return {
			disclosure: d,
			get: () => d.state.open,
			set: (value) => {
				if(Boolean(obj[key]) !== value) {
					obj[key] = value;
					notify(value);
				}
			}
		};
	}

	if(typeof source === "function") {
		const d = disclosure(Boolean(source()));

		effect(() => {
			const value = Boolean(source());

			untracked(() => { d.state.open = value; });
		});

		return {
			disclosure: d,
			get: () => d.state.open,
			set: (value) => {
				if(Boolean(source()) !== value) {
					notify(value);
				}
			}
		};
	}

	const d = disclosure(source === undefined ? Boolean(fallback) : Boolean(source));

	return {
		disclosure: d,
		get: () => d.state.open,
		set: (value) => {
			if(d.state.open !== value) {
				d.state.open = value;
				notify(value);
			}
		}
	};
};

/**
 * The closest ancestor (excluding the node itself) with data-slot `rootSlot`.
 *
 * @param {Element} node
 * @param {string} rootSlot
 * @returns {Element|null}
 */
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

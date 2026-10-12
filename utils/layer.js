/**
 * utils/layer.js — the lifecycle of everything that floats: dialogs, sheets,
 * popovers, menus, tooltips, selects.
 *
 * A layer is portaled to <body>, gets `data-state="open"`, and on close flips
 * to `data-state="closed"`, waits for the exit animation, then leaves the DOM.
 * Open layers form a STACK so nesting behaves (the Radix DismissableLayer
 * model, which qrp's single-node `dismissable` can't express):
 *
 * - Escape dismisses only the topmost layer.
 * - A pointerdown dismisses layers from the top down until it reaches the layer
 *   it landed in — so clicking inside a popover that sits above a dialog closes
 *   neither, and clicking the dialog body closes just the popover. A modal
 *   layer stops the walk: what's under a modal can't be clicked anyway.
 */

import { scoped, untracked, effect, onDispose } from "@nemanjan00/qrp";
import { trapFocus } from "@nemanjan00/qrp/behaviors/trap-focus";
import { follow } from "./floating.js";
import { animateOut, controllable } from "./index.js";

const stack = [];

let listening = false;
let scrollLocks = 0;
let savedOverflow = "";

const contains = (layer, target) => layer.inside.some((node) => node && node.contains(target));

const onKeyDown = (event) => {
	if(event.key !== "Escape") {
		return;
	}

	const top = stack[stack.length - 1];

	if(top && top.escape) {
		event.preventDefault();
		event.stopPropagation();
		top.dismiss("escape");
	}
};

const onPointerDown = (event) => {
	const layers = stack.slice().reverse();

	layers.every((layer) => {
		if(contains(layer, event.target)) {
			return false;
		}

		if(layer.armed && layer.outside) {
			layer.dismiss("outside");
		}

		return !layer.modal;
	});
};

const listen = () => {
	if(listening) {
		return;
	}

	listening = true;
	document.addEventListener("keydown", onKeyDown, true);
	document.addEventListener("pointerdown", onPointerDown, true);
};

const lockScroll = () => {
	if(scrollLocks === 0) {
		savedOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";
	}

	scrollLocks += 1;
};

const unlockScroll = () => {
	scrollLocks = Math.max(0, scrollLocks - 1);

	if(scrollLocks === 0) {
		document.body.style.overflow = savedOverflow;
	}
};

const setState = (nodes, value) => nodes.forEach((node) => node.setAttribute("data-state", value));

/**
 * Show `content` (and `extras`, e.g. an overlay) as a layer.
 *
 * @param {object} options
 * @param {HTMLElement} options.content the layer's main node
 * @param {HTMLElement[]} [options.extras] nodes portaled before content (overlay)
 * @param {Element[]} [options.inside] extra nodes that count as "inside" (trigger)
 * @param {Function} options.onDismiss (reason: "escape"|"outside") => void
 * @param {boolean} [options.modal] trap focus, lock scroll, block layers below
 * @param {boolean} [options.escape] dismiss on Escape (default true)
 * @param {boolean} [options.outside] dismiss on outside pointerdown (default true)
 * @param {boolean} [options.focus] move focus into content (default = modal)
 * @param {object} [options.anchor] `{ reference, side, align, sideOffset, alignOffset }`
 * @param {Element} [options.container] portal target (default document.body)
 * @returns {{ close: Function, update: Function }} close() resolves once removed
 */
export const openLayer = (options) => {
	listen();

	const content = options.content;
	const nodes = (options.extras || []).concat([content]);
	const container = options.container || document.body;
	const modal = Boolean(options.modal);
	const wantsFocus = options.focus === undefined ? modal : options.focus;

	const layer = {
		inside: [content].concat(options.inside || []),
		escape: options.escape !== false,
		outside: options.outside !== false,
		modal,
		armed: false,
		dismiss: (reason) => options.onDismiss(reason)
	};

	setState(nodes, "open");
	nodes.forEach((node) => container.appendChild(node));
	stack.push(layer);

	// The click that opened this layer must not count as an outside click.
	const armTimer = setTimeout(() => { layer.armed = true; }, 0);

	if(modal) {
		lockScroll();
	}

	// Behaviors register their own cleanup with the current owner; build them in
	// a detached scope so an effect that opened the layer can't tear them down.
	const behaviors = untracked(() => scoped(() => ({
		position: options.anchor ? follow(options.anchor.reference, content, options.anchor) : null,
		release: wantsFocus ? trapFocus(content) : null
	})));

	let closed = false;

	const close = () => {
		if(closed) {
			return Promise.resolve();
		}

		closed = true;
		clearTimeout(armTimer);

		const index = stack.indexOf(layer);

		if(index !== -1) {
			stack.splice(index, 1);
		}

		if(modal) {
			unlockScroll();
		}

		if(behaviors.value.release) {
			behaviors.value.release();
		}

		setState(nodes, "closed");

		return Promise.all(nodes.map(animateOut)).then(() => {
			behaviors.dispose();
			nodes.forEach((node) => node.remove());
		});
	};

	return {
		close,
		update: () => {
			if(behaviors.value.position) {
				behaviors.value.position.update();
			}
		}
	};
};

/**
 * Drive a layer from reactive open state: opens when `open.get()` turns true,
 * closes when it turns false, and closes for good when the owner disposes.
 *
 * @param {{ get: Function, set: Function }} open a controllable()
 * @param {Function} build () => openLayer options (called on each open)
 * @param {Function} [onOpen] (handle) => void, after the layer is shown
 * @returns {{ current: Function }} current() → the live handle or null
 */
export const layerWhen = (open, build, onOpen) => {
	let handle = null;

	effect(() => {
		const isOpen = Boolean(open.get());

		untracked(() => {
			if(isOpen && !handle) {
				handle = openLayer(Object.assign({ onDismiss: () => open.set(false) }, build()));

				if(onOpen) {
					onOpen(handle);
				}
			} else if(!isOpen && handle) {
				handle.close();
				handle = null;
			}
		});
	});

	onDispose(() => {
		if(handle) {
			handle.close();
			handle = null;
		}
	});

	return { current: () => handle };
};

/**
 * The open state every overlay root accepts: `open` (bool, `[state, key]`, or
 * thunk), `defaultOpen`, `onOpenChange`.
 *
 * @param {object} props
 * @returns {{ get: Function, set: Function }}
 */
export const openState = (props) => controllable(props.open, Boolean(props.defaultOpen), props.onOpenChange);

/**
 * utils/layer.js — the lifecycle of everything that floats: dialogs, sheets,
 * popovers, menus, tooltips, selects.
 *
 * A layer is portaled to <body>, gets `data-state="open"`, and on close flips
 * to `data-state="closed"`, waits for the exit animation, then leaves the DOM.
 * The hard parts are qrp's own behaviors:
 *
 * - `dismissable` keeps every open layer in ONE stack, so nesting behaves:
 *   Escape dismisses only the topmost layer, and a pointerdown dismisses layers
 *   from the top down until it reaches the layer it landed in (a click inside a
 *   popover above a dialog closes neither; a click on the dialog closes just
 *   the popover). A modal layer stops the walk.
 * - `anchored` places popups (side/align, flip + shift, `--qrp-*` CSS vars).
 * - `portal` records the trigger as the content's owner, so qrp contexts
 *   resolve from inside an overlay exactly as from inside its trigger.
 */

import { scoped, untracked, effect, onDispose } from "@nemanjan00/qrp";
import { trapFocus } from "@nemanjan00/qrp/behaviors/trap-focus";
import { dismissable } from "@nemanjan00/qrp/behaviors/dismissable";
import { anchored } from "@nemanjan00/qrp/behaviors/anchored";
import { portal } from "@nemanjan00/qrp/behaviors/portal";
import { animateOut, controllable } from "./index.js";

// shadcn/Radix popup defaults that differ from qrp anchored's.
const PLACEMENT_DEFAULTS = { align: "center", collisionPadding: 8 };

// --- modal scroll lock ------------------------------------------------------
//
// overflow:hidden alone shifts the layout when the scrollbar disappears and is
// ignored by iOS Safari's touch scrolling. Like Radix (react-remove-scroll):
// pad the body by the scrollbar width, and block wheel/touch scrolling that
// doesn't start inside an open modal's content.

let scrollLocks = 0;
let savedBody = null;
const modalContents = new Set();

const insideModal = (target) => [...modalContents].some((content) => content.contains(target));

const blockScroll = (event) => {
	if(!insideModal(event.target)) {
		event.preventDefault();
	}
};

const lockScroll = () => {
	if(scrollLocks === 0) {
		const body = document.body;
		const gap = Math.max(0, window.innerWidth - document.documentElement.clientWidth);

		savedBody = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
		body.style.overflow = "hidden";

		if(gap > 0) {
			const padding = parseFloat(getComputedStyle(body).paddingRight) || 0;

			body.style.paddingRight = `${padding + gap}px`;
		}

		document.addEventListener("wheel", blockScroll, { passive: false });
		document.addEventListener("touchmove", blockScroll, { passive: false });
	}

	scrollLocks += 1;
};

const unlockScroll = () => {
	scrollLocks = Math.max(0, scrollLocks - 1);

	if(scrollLocks === 0 && savedBody) {
		document.body.style.overflow = savedBody.overflow;
		document.body.style.paddingRight = savedBody.paddingRight;
		savedBody = null;
		document.removeEventListener("wheel", blockScroll);
		document.removeEventListener("touchmove", blockScroll);
	}
};

// --- modal inert background -------------------------------------------------
//
// aria-modal + a focus trap still let a screen reader's virtual cursor walk
// behind the dialog. Like Radix's hideOthers: while a modal is open, every other
// top-level child of <body> is `inert` (unfocusable, unclickable, hidden from
// assistive tech). Reference-counted, so nested modals stack and an element
// that was inert before is left as it was.

const inertCounts = new Map();

const hideOthers = (keep) => {
	const kept = keep.filter(Boolean);
	const others = [...document.body.children].filter((child) =>
		!kept.some((node) => child === node || child.contains(node)) &&
		!["SCRIPT", "STYLE", "TEMPLATE"].includes(child.tagName));

	others.forEach((child) => {
		const count = inertCounts.get(child);

		if(count === undefined) {
			inertCounts.set(child, child.hasAttribute("inert") ? Infinity : 1);
			child.setAttribute("inert", "");
		} else {
			inertCounts.set(child, count + 1);
		}
	});

	return () => others.forEach((child) => {
		const count = inertCounts.get(child);

		if(count === undefined || count === Infinity) {
			return;
		}

		if(count <= 1) {
			inertCounts.delete(child);
			child.removeAttribute("inert");
		} else {
			inertCounts.set(child, count - 1);
		}
	});
};

// Closes still waiting for their exit animation, by content node. Reopening the
// same content (Dialog reuses its node) must finish that close first — else its
// late portal-undo removes the node from under the new layer.
const pendingCloses = new WeakMap();

const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

/**
 * Non-modal focus: move focus into the layer, and on release put it back —
 * but only if it is still inside (the user may have tabbed away on purpose).
 */
const moveFocus = (content) => {
	const previous = document.activeElement;
	const target = content.querySelector("[data-autofocus]") || content.querySelector(FOCUSABLE) || content;

	if(target === content && !content.hasAttribute("tabindex")) {
		content.setAttribute("tabindex", "-1");
	}

	target.focus({ preventScroll: true });

	return () => {
		if(content.contains(document.activeElement) && previous && previous.focus) {
			previous.focus({ preventScroll: true });
		}
	};
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
 * @param {boolean} [options.focus] move focus into content (default = modal);
 *   modal layers also trap Tab inside
 * @param {object} [options.anchor] `{ reference, side, align, sideOffset, alignOffset }`
 *   (qrp anchored options; align defaults to "center", collisionPadding to 8)
 * @param {Node} [options.owner] where contexts resolve from (default: the first
 *   `inside` node — the trigger — or the anchor reference)
 * @param {Element} [options.container] portal target (default document.body)
 * @returns {{ close: Function, update: Function }} close() resolves once removed
 */
export const openLayer = (options) => {
	const content = options.content;
	const nodes = (options.extras || []).concat([content]);
	const container = options.container || document.body;
	const modal = Boolean(options.modal);
	const wantsFocus = options.focus === undefined ? modal : options.focus;
	const inside = options.inside || [];
	const reference = options.anchor ? options.anchor.reference : null;
	const owner = options.owner || inside.find((node) => node instanceof Node) || (reference instanceof Node ? reference : null);

	// qrp hands over the raw event; callers get "escape" | "outside". Escape is
	// consumed so a component's own Escape handling doesn't run as well.
	const onDismiss = (event) => {
		if(event.type === "keydown") {
			event.preventDefault();
			event.stopPropagation();
			options.onDismiss("escape");
		} else {
			options.onDismiss("outside");
		}
	};

	const pending = pendingCloses.get(content);

	if(pending) {
		pending();
	}

	setState(nodes, "open");

	if(modal) {
		lockScroll();
	}

	// Behaviors register their own cleanup with the current owner; build them in
	// a detached scope so an effect that opened the layer can't tear them down.
	const behaviors = untracked(() => scoped(() => {
		const removers = nodes.map((node) => portal(node, container, owner ? { owner } : {}));

		if(modal) {
			modalContents.add(content);
		}

		return {
			removers,
			restore: modal ? hideOthers(nodes) : null,
			position: options.anchor ? anchored(reference, content, Object.assign({}, PLACEMENT_DEFAULTS, options.anchor)) : null,
			release: modal ? trapFocus(content) : (wantsFocus ? moveFocus(content) : null),
			undismiss: dismissable(content, onDismiss, {
				inside,
				modal,
				escape: options.escape !== false,
				outside: options.outside !== false
			})
		};
	}));

	let closed = false;

	const close = () => {
		if(closed) {
			return Promise.resolve();
		}

		closed = true;
		behaviors.value.undismiss();

		if(modal) {
			// Un-inert first: focus is about to return to the trigger, which an
			// inert background would refuse.
			behaviors.value.restore();
			modalContents.delete(content);
			unlockScroll();
		}

		if(behaviors.value.release) {
			behaviors.value.release();
		}

		setState(nodes, "closed");

		// Each node leaves on its OWN animationend: the overlay's fade is shorter
		// than the content's exit, and waiting for both would let the finished
		// overlay snap back to visible for the difference (a flash).
		const removed = nodes.map(() => false);
		let finished = false;
		const removeNode = (index) => {
			if(!removed[index]) {
				removed[index] = true;
				behaviors.value.removers[index]();
			}
		};
		const finish = () => {
			if(finished) {
				return;
			}

			finished = true;
			nodes.forEach((_node, index) => removeNode(index));
			behaviors.dispose();

			if(pendingCloses.get(content) === finish) {
				pendingCloses.delete(content);
			}
		};

		pendingCloses.set(content, finish);

		return Promise.all(nodes.map((node, index) => animateOut(node).then(() => {
			if(!finished) {
				removeNode(index);
			}
		}))).then(finish);
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
	let opening = false;
	let wanted = false;

	const sync = () => {
		if(wanted && !handle) {
			// openLayer can re-enter this effect synchronously (portal → setOwner
			// → context readers re-run); the flag stops a second layer opening
			// before `handle` is assigned. A close requested meanwhile is applied
			// right after.
			opening = true;

			try {
				handle = openLayer(Object.assign({ onDismiss: () => open.set(false) }, build()));
			} finally {
				opening = false;
			}

			if(onOpen) {
				onOpen(handle);
			}

			if(!wanted) {
				sync();
			}
		} else if(!wanted && handle) {
			handle.close();
			handle = null;
		}
	};

	effect(() => {
		wanted = Boolean(open.get());

		if(!opening) {
			untracked(sync);
		}
	});

	onDispose(() => {
		wanted = false;

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

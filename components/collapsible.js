/**
 * components/collapsible.js — Collapsible, CollapsibleTrigger, CollapsibleContent.
 *
 *   Collapsible({ defaultOpen: false },
 *     CollapsibleTrigger(Button({ variant: "ghost", size: "icon" }, ChevronsUpDownIcon())),
 *     CollapsibleContent(…))
 *
 * `open` (bool, thunk, or `[state, "key"]`) or qrp's `bind: [state, "key"]`,
 * `defaultOpen`, `onOpenChange`, `disabled`. The open state is qrp's
 * `disclosure()` behavior. The trigger wraps a single element child (shadcn's asChild).
 * The content exposes `--radix-collapsible-content-height` for animations.
 * https://ui.shadcn.com/docs/components/collapsible
 */

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, watchTree, withRole, roleMarker, uid } from "../utils/index.js";
import { ownerOf, showPanel, disclosed, bound } from "../utils/roving.js";

/**
 * Collapsible root.
 *
 * @param {object} [props]
 * @param {boolean|Function|Array} [props.open] open state, thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key] (alias of a tuple `open`)
 * @param {boolean} [props.defaultOpen]
 * @param {Function} [props.onOpenChange] (open) => void
 * @param {boolean} [props.disabled]
 */
export const Collapsible = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "open", "bind", "defaultOpen", "onOpenChange", "disabled"]);
	const open = disclosed(bound(own, "open"), own.defaultOpen, own.onOpenChange);

	const root = el("div", Object.assign({ "data-slot": "collapsible", "data-disabled": own.disabled ? true : null }, rest, {
		class: cn(own.class)
	}), ...children);

	const mine = (nodes) => nodes.filter((node) => ownerOf(node, "collapsible") === root);

	const sync = (isOpen) => {
		const state = isOpen ? "open" : "closed";
		const contents = mine([...root.querySelectorAll("[data-slot=collapsible-content]")]);

		root.setAttribute("data-state", state);
		contents.forEach((content) => {
			content.id = content.id || uid("collapsible-content");
			showPanel(content, isOpen, "--radix-collapsible-content-height");
		});

		mine(withRole(root, "collapsible-trigger")).forEach((trigger) => {
			trigger.setAttribute("aria-expanded", String(isOpen));
			trigger.setAttribute("data-state", state);

			if(contents[0]) {
				trigger.setAttribute("aria-controls", contents[0].id);
			}

			if(own.disabled) {
				trigger.setAttribute("data-disabled", "");
				trigger.disabled = true;
			}
		});
	};

	root.addEventListener("click", (event) => {
		const trigger = event.target.closest("[data-qs-role=collapsible-trigger]");

		if(trigger && ownerOf(trigger, "collapsible") === root && !own.disabled) {
			open.set(!open.get());
		}
	});

	effect(() => {
		const isOpen = Boolean(open.get());

		untracked(() => sync(isOpen));
	});

	onDispose(watchTree(root, () => sync(Boolean(open.get()))));

	return root;
};

export const CollapsibleTrigger = roleMarker("collapsible-trigger");

export const CollapsibleContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("div", Object.assign({ "data-slot": "collapsible-content" }, rest, { class: cn(own.class) }), ...children);
};

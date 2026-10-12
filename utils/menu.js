/**
 * utils/menu.js — the engine shared by DropdownMenu, ContextMenu and Menubar.
 *
 * `menuParts(prefix, classes)` builds the whole family of parts for one menu
 * kind (Content, Item, CheckboxItem, RadioGroup/RadioItem, Label, Separator,
 * Shortcut, Group, Sub/SubTrigger/SubContent, Portal). The behavior follows
 * Radix Menu:
 *
 * - items are focusable (`tabindex=-1`); pointer hover and Arrow/Home/End move
 *   real focus, and the focused item carries `data-highlighted`
 * - typeahead jumps to the next item starting with the typed text
 * - Enter/Space/click select; `onSelect(event)` runs first and
 *   `event.preventDefault()` keeps the menu open, otherwise the whole menu tree
 *   closes and focus returns to the trigger
 * - submenus open on hover, click, Enter/Space or ArrowRight; ArrowLeft closes
 *   them; Escape closes the whole tree
 *
 * A root (dropdown, context, menubar menu) registers its content with
 * `registerRoot` so items know how to close the tree.
 */

import { el, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, controllable, fragmentOf, splitContent, watchTree } from "./index.js";
import { layerWhen } from "./layer.js";
import { placeContent } from "./popup.js";
import { CheckIcon, CircleIcon, ChevronRightIcon } from "../icons/index.js";

const TYPEAHEAD_RESET = 500;
const SUB_CLOSE_DELAY = 150;
const PLACEMENT_KEYS = ["side", "align", "sideOffset", "alignOffset", "avoidCollisions"];
const SUB_PLACEMENT = { side: "right", align: "start", sideOffset: 0, alignOffset: -5 };

const ITEM = "[data-qs-menu-item]";
const MENU = "[data-qs-menu]";

// content element → { close, parent?: () => Element, trigger?: Element, subs: Set, timer }
const menus = new WeakMap();
// content element → placement props
const placements = new WeakMap();
// sub-trigger element → { open, content }
const subTriggers = new WeakMap();

const infoOf = (content) => {
	if(!menus.has(content)) {
		menus.set(content, { close: () => {}, subs: new Set(), timer: null });
	}

	return menus.get(content);
};

/**
 * Register a root menu content: how to close it, and which trigger gets focus
 * back. Also closes open submenus whenever the root closes.
 *
 * @param {Element} content
 * @param {object} root
 * @param {Function} root.close closes the root menu
 * @param {{ get: Function }} root.open the root's open state
 * @param {Element} [root.trigger] focus target after selection
 */
export const registerRoot = (content, root) => {
	Object.assign(infoOf(content), { close: root.close, trigger: root.trigger || null, parent: null });

	effect(() => {
		if(!root.open.get()) {
			untracked(() => closeSubs(content));
		}
	});
};

/**
 * The placement a menu content part was created with.
 *
 * @param {Element} content
 * @returns {object}
 */
export const placementOf = (content) => placements.get(content) || {};

const closeSubs = (content) => {
	const info = menus.get(content);

	if(!info) {
		return;
	}

	clearTimeout(info.timer);
	[...info.subs].forEach((sub) => {
		closeSubs(sub.content);
		sub.open.set(false);
	});
};

/**
 * Close the menu tree `node` lives in — every level up to the root — and
 * return focus to the root's trigger when focus was inside the tree.
 *
 * @param {Element} node an item or content inside the tree
 */
export const closeTree = (node) => {
	const chain = [];
	let content = node.closest(MENU);

	while(content) {
		const info = infoOf(content);

		chain.push(Object.assign({ content }, info));
		content = info.parent ? info.parent() : null;
	}

	const refocus = chain.some((level) => level.content.contains(document.activeElement));
	const root = chain[chain.length - 1];

	if(root) {
		closeSubs(root.content);
	}

	chain.forEach((level) => level.close());

	if(refocus && root && root.trigger && root.trigger.isConnected) {
		root.trigger.focus({ preventScroll: true });
	}
};

/**
 * The enabled items of one menu level, in DOM order.
 *
 * @param {Element} content
 * @returns {Element[]}
 */
export const itemsOf = (content) => [...content.querySelectorAll(ITEM)]
	.filter((item) => !item.hasAttribute("data-disabled") && item.closest(MENU) === content);

const focusItem = (item) => {
	if(item) {
		item.focus({ preventScroll: true });
	}
};

/** Focus the first (or last) item of a menu level. */
export const focusEdge = (content, last = false) => {
	const items = itemsOf(content);

	focusItem(last ? items[items.length - 1] : items[0]);
};

const textOf = (item) => (item.getAttribute("data-text-value") || item.textContent || "").trim().toLowerCase();

const openSub = (trigger, focusFirst) => {
	const sub = subTriggers.get(trigger);

	if(!sub) {
		return false;
	}

	sub.open.set(true);

	if(focusFirst) {
		focusEdge(sub.content);
	}

	return true;
};

/**
 * Keyboard, pointer and highlight behavior for one menu level.
 *
 * @param {Element} content
 * @param {object} [options]
 * @param {boolean} [options.loop] wrap Arrow navigation at the ends
 */
const menuBehavior = (content, options = {}) => {
	let typed = "";
	let typedTimer = null;

	const typeahead = (key) => {
		clearTimeout(typedTimer);
		typed += key.toLowerCase();
		typedTimer = setTimeout(() => { typed = ""; }, TYPEAHEAD_RESET);

		const items = itemsOf(content);
		const start = Math.max(0, items.indexOf(document.activeElement));
		const ordered = items.slice(start + (typed.length === 1 ? 1 : 0)).concat(items.slice(0, start + (typed.length === 1 ? 1 : 0)));

		focusItem(ordered.find((item) => textOf(item).startsWith(typed)));
	};

	const move = (delta) => {
		const items = itemsOf(content);

		if(items.length === 0) {
			return;
		}

		const index = items.indexOf(document.activeElement);

		if(index === -1) {
			focusItem(delta > 0 ? items[0] : items[items.length - 1]);
			return;
		}

		const next = index + delta;

		if(options.loop) {
			focusItem(items[(next + items.length) % items.length]);
		} else {
			focusItem(items[Math.min(Math.max(next, 0), items.length - 1)]);
		}
	};

	content.addEventListener("keydown", (event) => {
		const item = event.target.closest(ITEM);
		const key = event.key;

		if(key === "ArrowDown" || key === "ArrowUp") {
			event.preventDefault();
			move(key === "ArrowDown" ? 1 : -1);
		} else if(key === "Home" || key === "End") {
			event.preventDefault();
			focusEdge(content, key === "End");
		} else if(key === "ArrowRight" && item && subTriggers.has(item)) {
			event.preventDefault();
			openSub(item, true);
		} else if(key === "ArrowLeft" && infoOf(content).parent) {
			event.preventDefault();

			const info = infoOf(content);

			info.close();
			focusItem(info.subTrigger);
		} else if((key === "Enter" || key === " ") && item) {
			event.preventDefault();

			if(!openSub(item, true)) {
				item.click();
			}
		} else if(key === "Tab") {
			event.preventDefault();
			closeTree(content);
		} else if(key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
			if(key === " " && typed === "") {
				return;
			}

			event.preventDefault();
			typeahead(key);
		}
	});

	content.addEventListener("pointermove", (event) => {
		const item = event.target.closest(ITEM);

		if(item && item.closest(MENU) === content && !item.hasAttribute("data-disabled") && document.activeElement !== item) {
			focusItem(item);
		}
	});

	content.addEventListener("pointerleave", () => {
		if(content.contains(document.activeElement) && document.activeElement !== content) {
			const active = document.activeElement;

			// Keep an open submenu's trigger highlighted while the pointer heads into it.
			if(!(subTriggers.has(active) && subTriggers.get(active).open.get())) {
				content.focus({ preventScroll: true });
			}
		}
	});

	content.addEventListener("focusin", (event) => {
		const info = infoOf(content);

		itemsOf(content).concat([...content.querySelectorAll("[data-highlighted]")]).forEach((item) => {
			item.toggleAttribute("data-highlighted", item === event.target);
		});

		// Moving to another item closes sibling submenus, after a grace period
		// so a diagonal pointer path into the submenu doesn't close it.
		clearTimeout(info.timer);

		const openSubs = [...info.subs].filter((sub) => sub.trigger !== event.target);

		if(openSubs.length > 0) {
			info.timer = setTimeout(() => openSubs.forEach((sub) => {
				closeSubs(sub.content);
				sub.open.set(false);
			}), event.target === content ? 0 : SUB_CLOSE_DELAY);
		}
	});

	content.addEventListener("focusout", (event) => {
		if(event.target.hasAttribute && event.target.hasAttribute("data-highlighted")) {
			event.target.removeAttribute("data-highlighted");
		}
	});
};

/**
 * Selection: run the item's action, then `menu-select` (→ onSelect); unless
 * prevented, close the whole tree.
 */
const activate = (item, action) => {
	if(item.hasAttribute("data-disabled")) {
		return;
	}

	if(action) {
		action();
	}

	const event = new CustomEvent("menu-select", { cancelable: true });

	item.dispatchEvent(event);

	if(!event.defaultPrevented) {
		closeTree(item);
	}
};

const itemAttrs = (own, role, slot) => {
	const attrs = { role, tabindex: "-1", "data-slot": slot, "data-qs-menu-item": "" };

	if(own.disabled) {
		attrs["data-disabled"] = "";
		attrs["aria-disabled"] = "true";
	}

	if(own.inset) {
		attrs["data-inset"] = "";
	}

	if(own.textValue) {
		attrs["data-text-value"] = own.textValue;
	}

	return attrs;
};

const ITEM_KEYS = ["class", "disabled", "inset", "textValue", "onSelect"];


const checkedState = (value) => {
	if(value === "indeterminate") {
		return "indeterminate";
	}

	return value ? "checked" : "unchecked";
};

/**
 * Build every part of one menu kind.
 *
 * @param {string} prefix slot prefix: "dropdown-menu", "context-menu", "menubar"
 * @param {object} classes class strings: content, item, checkboxItem, radioItem,
 *   indicator, checkIcon, radioIcon, label, separator, shortcut, subTrigger,
 *   subTriggerIcon, subContent. (They live in the component files: Tailwind
 *   only scans components/ for class names.)
 * @param {object} [contentDefaults] placement defaults for Content
 * @returns {object} parts keyed by shadcn suffix (Content, Item, …)
 */
export const menuParts = (prefix, classes, contentDefaults = {}) => {
	const indicator = (icon) => el("span", { class: classes.indicator }, icon);

	const contentPart = (slot, base, defaults) => (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, PLACEMENT_KEYS.concat(["class", "loop"]));
		const placement = Object.assign({}, defaults);

		PLACEMENT_KEYS.forEach((key) => {
			if(own[key] !== undefined) {
				placement[key] = own[key];
			}
		});

		const node = el("div", Object.assign({
			"data-slot": slot,
			role: "menu",
			"aria-orientation": "vertical",
			tabindex: "-1",
			"data-qs-menu": ""
		}, rest, { class: cn(base, own.class) }), ...children);

		placements.set(node, placement);
		placeContent(node, placement);
		menuBehavior(node, { loop: own.loop });

		return node;
	};

	const Item = (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ITEM_KEYS.concat(["variant"]));
		const item = el("div", Object.assign(itemAttrs(own, "menuitem", `${prefix}-item`), {
			"data-variant": own.variant || "default"
		}, rest, { class: cn(classes.item, own.class) }), ...children);

		if(own.onSelect) {
			item.addEventListener("menu-select", own.onSelect);
		}

		item.addEventListener("click", () => activate(item));

		return item;
	};

	const CheckboxItem = (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ITEM_KEYS.concat(["checked", "defaultChecked", "onCheckedChange"]));
		const checked = controllable(own.checked === undefined ? own.defaultChecked : own.checked, false, own.onCheckedChange);
		const icon = CheckIcon({ class: classes.checkIcon });
		const item = el("div", Object.assign(itemAttrs(own, "menuitemcheckbox", `${prefix}-checkbox-item`), rest, {
			class: cn(classes.checkboxItem, own.class),
			"aria-checked": () => String(checked.get() === "indeterminate" ? "mixed" : Boolean(checked.get())),
			"data-state": () => checkedState(checked.get())
		}), indicator(icon), ...children);

		effect(() => {
			icon.style.display = checked.get() ? "" : "none";
		});

		if(own.onSelect) {
			item.addEventListener("menu-select", own.onSelect);
		}

		item.addEventListener("click", () => activate(item, () => checked.set(checked.get() !== true)));

		return item;
	};

	const RadioGroup = (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ["value", "defaultValue", "onValueChange"]);
		const value = controllable(own.value === undefined ? own.defaultValue : own.value, null, own.onValueChange);
		const group = el("div", Object.assign({ role: "group", "data-slot": `${prefix}-radio-group`, "data-qs-radio-group": "" }, rest), ...children);

		const sync = () => {
			const current = value.get();

			[...group.querySelectorAll("[data-qs-radio-value]")]
				.filter((item) => item.closest("[data-qs-radio-group]") === group)
				.forEach((item) => {
					const on = item.getAttribute("data-qs-radio-value") === String(current);
					const icon = item.querySelector("[data-qs-indicator] svg");

					item.setAttribute("aria-checked", String(on));
					item.setAttribute("data-state", on ? "checked" : "unchecked");

					if(icon) {
						icon.style.display = on ? "" : "none";
					}
				});
		};

		effect(sync);
		onDispose(watchTree(group, () => untracked(sync)));

		group.addEventListener("qs-menu-radio", (event) => value.set(event.detail));

		return group;
	};

	const RadioItem = (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ITEM_KEYS.concat(["value"]));
		const mark = indicator(CircleIcon({ class: classes.radioIcon }));

		mark.setAttribute("data-qs-indicator", "");
		mark.firstChild.style.display = "none";

		const item = el("div", Object.assign(itemAttrs(own, "menuitemradio", `${prefix}-radio-item`), {
			"aria-checked": "false",
			"data-state": "unchecked",
			"data-qs-radio-value": String(own.value)
		}, rest, { class: cn(classes.radioItem, own.class) }), mark, ...children);

		if(own.onSelect) {
			item.addEventListener("menu-select", own.onSelect);
		}

		item.addEventListener("click", () => activate(item, () => {
			item.dispatchEvent(new CustomEvent("qs-menu-radio", { bubbles: true, detail: own.value }));
		}));

		return item;
	};

	const simple = (tag, slot, base, attrs = {}) => (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ["class", "inset"]);

		return el(tag, Object.assign({ "data-slot": slot }, attrs, own.inset ? { "data-inset": "" } : {}, rest, {
			class: cn(base, own.class)
		}), ...children);
	};

	const SubTrigger = (...args) => {
		const { props, children } = parseArgs(args);
		const [own, rest] = pick(props, ITEM_KEYS);

		return el("div", Object.assign(itemAttrs(own, "menuitem", `${prefix}-sub-trigger`), {
			"aria-haspopup": "menu",
			"aria-expanded": "false",
			"data-state": "closed"
		}, rest, { class: cn(classes.subTrigger, own.class) }), ...children, ChevronRightIcon({ class: classes.subTriggerIcon }));
	};

	const SubContent = contentPart(`${prefix}-sub-content`, classes.subContent, SUB_PLACEMENT);

	/**
	 * `Sub({ open, defaultOpen, onOpenChange }, SubTrigger(…), SubContent(…))`.
	 */
	const Sub = (...args) => {
		const { props, children } = parseArgs(args);
		const open = controllable(props.open === undefined ? props.defaultOpen : props.open, false, props.onOpenChange);
		const { fragment, content } = splitContent(children, `${prefix}-sub-content`);
		const trigger = fragment.querySelector(`[data-slot="${prefix}-sub-trigger"]`);

		if(!trigger || !content) {
			return fragment;
		}

		const parent = () => trigger.closest(MENU);
		const sub = { open, content, trigger };

		subTriggers.set(trigger, sub);
		Object.assign(infoOf(content), {
			close: () => open.set(false),
			parent,
			subTrigger: trigger
		});

		effect(() => {
			const isOpen = Boolean(open.get());

			trigger.setAttribute("aria-expanded", String(isOpen));
			trigger.setAttribute("data-state", isOpen ? "open" : "closed");

			untracked(() => {
				const parentContent = parent();

				if(parentContent) {
					infoOf(parentContent).subs[isOpen ? "add" : "delete"](sub);
				}

				if(!isOpen) {
					closeSubs(content);
				}
			});
		});

		trigger.addEventListener("pointermove", () => {
			if(!trigger.hasAttribute("data-disabled")) {
				open.set(true);
			}
		});

		trigger.addEventListener("click", () => {
			if(!trigger.hasAttribute("data-disabled")) {
				open.set(true);
			}
		});

		// The pointer reached the submenu: cancel the parent's pending close.
		content.addEventListener("pointerenter", () => {
			const parentContent = parent();

			if(parentContent) {
				clearTimeout(infoOf(parentContent).timer);
			}
		});

		layerWhen(open, () => ({
			content,
			inside: [trigger],
			focus: false,
			anchor: Object.assign({ reference: trigger }, placementOf(content)),
			onDismiss: (reason) => {
				if(reason === "escape") {
					closeTree(content);
				} else {
					open.set(false);
				}
			}
		}));

		return fragment;
	};

	const Portal = (...args) => fragmentOf(parseArgs(args).children);

	return {
		Content: contentPart(`${prefix}-content`, classes.content, contentDefaults),
		Group: simple("div", `${prefix}-group`, "", { role: "group" }),
		Label: simple("div", `${prefix}-label`, classes.label),
		Item,
		CheckboxItem,
		RadioGroup,
		RadioItem,
		Separator: simple("div", `${prefix}-separator`, classes.separator, { role: "separator", "aria-orientation": "horizontal" }),
		Shortcut: simple("span", `${prefix}-shortcut`, classes.shortcut),
		Sub,
		SubTrigger,
		SubContent,
		Portal
	};
};

/**
 * Keyboard for a menu trigger: ArrowDown/Enter/Space open and focus the first
 * item, ArrowUp opens and focuses the last.
 *
 * @param {Element} trigger
 * @param {{ get: Function, set: Function }} open
 * @param {Element} content
 */
export const triggerKeys = (trigger, open, content) => {
	trigger.addEventListener("keydown", (event) => {
		const key = event.key;

		if(key === "ArrowDown" || key === "Enter" || key === " " || key === "ArrowUp") {
			event.preventDefault();
			open.set(true);
			focusEdge(content, key === "ArrowUp");
		}
	});
};

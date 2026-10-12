/**
 * components/select.js — Select: a styled single-choice listbox.
 *
 *   Select({ value: [settings, "fruit"], name: "fruit" },
 *     SelectTrigger({ class: "w-[180px]" }, SelectValue({ placeholder: "Select a fruit" })),
 *     SelectContent(
 *       SelectGroup(SelectLabel("Fruits"), SelectItem({ value: "apple" }, "Apple"), …)
 *     )
 *   )
 *
 * Value: `value` (string, `[state, "key"]` two-way, or a thunk), `defaultValue`,
 * `onValueChange(value)`. Open state like Popover. `name` (+ `required`) adds a
 * hidden native <select> so the value submits with a <form>.
 * https://ui.shadcn.com/docs/components/select
 */

import { el, effect, untracked, list } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, controllable, watchTree, uid, read } from "../utils/index.js";
import { popupRoot, placeContent } from "../utils/popup.js";
import { navigableItems, navTarget, typeahead, reveal } from "../utils/listbox.js";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "../icons/index.js";

const ITEM = "[data-slot=select-item]";
const SCROLL_STEP = 32;
const SCROLL_INTERVAL = 50;

const itemValue = (item) => item.getAttribute("data-value");
const itemText = (item) => item.querySelector("[data-slot=select-item-text]") || item;
const labelOf = (item) => item.getAttribute("data-text-value") || itemText(item).textContent.trim();

/** Show the selected option's text in SelectValue, or its placeholder. */
const renderValue = (valueNode, trigger, selected) => {
	if(trigger) {
		if(selected) {
			trigger.removeAttribute("data-placeholder");
		} else {
			trigger.setAttribute("data-placeholder", "");
		}
	}

	if(!valueNode) {
		return;
	}

	if(selected) {
		valueNode.replaceChildren(...[...itemText(selected).childNodes].map((node) => node.cloneNode(true)));
	} else {
		valueNode.replaceChildren(valueNode.getAttribute("data-placeholder-text") || "");
	}
};

/** The hidden native <select> that carries the value into form submission. */
const bubbleSelect = (props, value) => {
	const option = el("option", { value: "" });
	const native = el("select", {
		"aria-hidden": "true",
		tabindex: "-1",
		name: props.name,
		required: props.required ? true : null,
		disabled: props.disabled ? true : null,
		style: "position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap"
	}, option);

	effect(() => {
		const current = value.get();

		option.value = current === undefined || current === null ? "" : String(current);
		option.textContent = option.value;
		native.value = option.value;
	});

	return native;
};

const setup = ({ content, triggers, open, props }) => {
	const value = props.qsValue;
	const trigger = triggers[0];
	const valueNode = trigger ? trigger.querySelector("[data-slot=select-value]") : null;
	const viewport = content.querySelector("[data-slot=select-viewport]") || content;
	const find = typeahead(labelOf);
	const findClosed = typeahead(labelOf);

	const items = () => navigableItems(content, ITEM);
	const allItems = () => [...content.querySelectorAll(ITEM)];
	const selectedItem = (current) => allItems().find((item) => itemValue(item) === current) || null;

	const sync = (current) => {
		allItems().forEach((item) => {
			const isSelected = itemValue(item) === current && current !== undefined && current !== null;

			item.setAttribute("aria-selected", String(isSelected));
			item.setAttribute("data-state", isSelected ? "checked" : "unchecked");

			const indicator = item.querySelector("[data-slot=select-item-indicator]");

			if(indicator) {
				indicator.style.visibility = isSelected ? "" : "hidden";
			}
		});

		renderValue(valueNode, trigger, selectedItem(current));
	};

	effect(() => {
		const current = value.get();

		untracked(() => sync(current));
	});

	// Items added later (a list() of options) pick up their state too.
	watchTree(content, () => sync(untracked(value.get)));

	const choose = (item) => {
		value.set(itemValue(item));
		open.set(false);
	};

	content.addEventListener("click", (event) => {
		const item = event.target.closest(ITEM);

		if(item && items().includes(item)) {
			choose(item);
		}
	});

	content.addEventListener("pointermove", (event) => {
		const item = event.target.closest(ITEM);

		if(item && items().includes(item) && document.activeElement !== item) {
			item.focus({ preventScroll: true });
		}
	});

	content.addEventListener("pointerleave", () => {
		if(content.contains(document.activeElement)) {
			content.focus({ preventScroll: true });
		}
	});

	content.addEventListener("keydown", (event) => {
		const list = items();
		const current = list.includes(document.activeElement) ? document.activeElement : null;

		if((event.key === "Enter" || event.key === " ") && current) {
			event.preventDefault();
			choose(current);
			return;
		}

		if(event.key === "Tab") {
			event.preventDefault();
			return;
		}

		const target = navTarget(event, list, current) || find(event, list, current);

		if(target) {
			event.preventDefault();
			target.focus({ preventScroll: true });
			reveal(target);
		}
	});

	if(trigger) {
		trigger.addEventListener("keydown", (event) => {
			if(trigger.disabled) {
				return;
			}

			if(event.key === "ArrowDown" || event.key === "ArrowUp") {
				event.preventDefault();
				open.set(true);
				return;
			}

			// Typing on the closed trigger selects the matching option (Radix).
			if(!open.get()) {
				const match = findClosed(event, items(), selectedItem(value.get()));

				if(match) {
					event.preventDefault();
					value.set(itemValue(match));
				}
			}
		});

		if(props.disabled) {
			trigger.disabled = true;
			trigger.setAttribute("data-disabled", "");
		}

		trigger.setAttribute("aria-controls", content.id);

		// Closing always hands focus back to the trigger (Radix), unless the user
		// already moved it somewhere else (an outside click on another control).
		let wasOpen = false;

		effect(() => {
			const isOpen = Boolean(open.get());

			if(wasOpen && !isOpen) {
				const active = document.activeElement;

				if(!active || active === document.body || content.contains(active)) {
					trigger.focus({ preventScroll: true });
				}
			}

			wasOpen = isOpen;
		});
	}

	setupScrollButtons(content, viewport);
};

/** Show the scroll buttons only while there is more to scroll; hover scrolls. */
const setupScrollButtons = (content, viewport) => {
	const up = content.querySelector("[data-slot=select-scroll-up-button]");
	const down = content.querySelector("[data-slot=select-scroll-down-button]");

	const update = () => {
		if(up) {
			up.hidden = viewport.scrollTop <= 0;
		}

		if(down) {
			down.hidden = Math.ceil(viewport.scrollTop + viewport.clientHeight) >= viewport.scrollHeight;
		}
	};

	const scroller = (button, delta) => {
		if(!button) {
			return;
		}

		let timer = null;
		const stop = () => {
			clearInterval(timer);
			timer = null;
		};

		button.addEventListener("pointerenter", () => {
			stop();
			timer = setInterval(() => {
				viewport.scrollTop += delta;
				update();
			}, SCROLL_INTERVAL);
		});
		button.addEventListener("pointerleave", stop);
		button.addEventListener("pointerdown", (event) => event.preventDefault());
	};

	viewport.addEventListener("scroll", update);
	scroller(up, -SCROLL_STEP);
	scroller(down, SCROLL_STEP);
	update();

	return update;
};

const onOpen = ({ content }) => {
	const selected = content.querySelector(`${ITEM}[aria-selected=true]`);
	const target = selected && navigableItems(content, ITEM).includes(selected) ? selected : navigableItems(content, ITEM)[0];

	if(target) {
		target.focus({ preventScroll: true });
		reveal(target);
	}

	const viewport = content.querySelector("[data-slot=select-viewport]");

	if(viewport) {
		viewport.dispatchEvent(new Event("scroll"));
	}
};

const SelectRoot = popupRoot("select", { role: "listbox", haspopup: "listbox", setup, onOpen });

/**
 * `Select(props, SelectTrigger(…), SelectContent(…))` — returns the trigger
 * (plus a hidden native select when `name` is given).
 *
 * @param {object} [props]
 * @param {*} [props.value] string, `[state, "key"]`, or thunk
 * @param {Array} [props.bind] `[state, "key"]` — qrp's two-way binding convention
 * @param {string} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void
 * @param {string} [props.name] form field name
 * @param {boolean} [props.required]
 * @param {boolean} [props.disabled]
 */
export const Select = (...args) => {
	const { props, children } = parseArgs(args);
	const value = controllable(props.bind || props.value, props.defaultValue, props.onValueChange);
	const fragment = SelectRoot(Object.assign({}, props, { qsValue: value }), ...children);

	if(props.name) {
		fragment.append(bubbleSelect(props, value));
	}

	return fragment;
};

export const SelectGroup = part("div", "select-group", "", { attrs: { role: "group" } });

/**
 * `SelectValue({ placeholder })` — inside SelectTrigger; renders the selected
 * option's text.
 */
export const SelectValue = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["placeholder", "class"]);

	return el("span", Object.assign({ "data-slot": "select-value" }, rest, {
		class: cn("pointer-events-none", own.class),
		"data-placeholder-text": own.placeholder || ""
	}), ...children);
};

/**
 * `SelectTrigger({ size: "default" | "sm" }, SelectValue(…))`.
 */
export const SelectTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "size"]);

	return el("button", Object.assign({
		type: "button",
		role: "combobox",
		"aria-autocomplete": "none",
		"data-slot": "select-trigger",
		"data-qs-role": "select-trigger",
		"data-size": own.size || "default",
		"data-placeholder": ""
	}, rest, {
		class: cn("flex w-fit items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[placeholder]:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", own.class)
	}), ...children, ChevronDownIcon({ class: "size-4 opacity-50" }));
};

export const SelectScrollUpButton = part("div", "select-scroll-up-button", "flex cursor-default items-center justify-center py-1", {
	attrs: { "aria-hidden": "true" }
});

export const SelectScrollDownButton = part("div", "select-scroll-down-button", "flex cursor-default items-center justify-center py-1", {
	attrs: { "aria-hidden": "true" }
});

/**
 * `SelectContent({ position = "popper", side, align = "center", sideOffset }, …items)`.
 * Only popper positioning is implemented: the list opens below (or above) the
 * trigger, at least as wide as it. `position: "item-aligned"` is treated as popper.
 */
export const SelectContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "position", "side", "align", "sideOffset", "alignOffset", "avoidCollisions"]);

	const viewport = el("div", {
		"data-slot": "select-viewport",
		role: "presentation",
		class: "no-scrollbar min-w-[var(--qs-anchor-width)] flex-1 scroll-my-1 overflow-x-hidden overflow-y-auto p-1",
		id: uid("select-viewport")
	}, ...children);

	const node = el("div", Object.assign({ "data-slot": "select-content", tabindex: "-1" }, rest, {
		class: cn(
			"relative z-50 flex max-h-(--qs-available-height) min-w-[8rem] origin-(--qs-transform-origin) flex-col overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md outline-none data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
			"data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
			own.class
		)
	}), SelectScrollUpButton(ChevronUpIcon({ class: "size-4" })), viewport, SelectScrollDownButton(ChevronDownIcon({ class: "size-4" })));

	return placeContent(node, {
		side: own.side || "bottom",
		align: own.align || "center",
		sideOffset: own.sideOffset === undefined ? 0 : own.sideOffset,
		alignOffset: own.alignOffset,
		avoidCollisions: own.avoidCollisions
	});
};

export const SelectLabel = part("div", "select-label", "px-2 py-1.5 text-xs text-muted-foreground");

/**
 * `SelectItem({ value, disabled, textValue }, …children)` — `textValue` is the
 * label used for typeahead when the children aren't plain text.
 */
export const SelectItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "disabled", "textValue"]);

	return el("div", Object.assign({
		role: "option",
		tabindex: "-1",
		"data-slot": "select-item",
		"data-value": String(own.value),
		"data-text-value": own.textValue || null,
		"data-disabled": own.disabled ? "" : null,
		"aria-disabled": own.disabled ? "true" : null,
		"aria-selected": "false",
		"data-state": "unchecked"
	}, rest, {
		class: cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2", own.class)
	}),
	el("span", { "data-slot": "select-item-indicator", class: "absolute right-2 flex size-3.5 items-center justify-center", style: "visibility:hidden" }, CheckIcon({ class: "size-4" })),
	el("span", { "data-slot": "select-item-text" }, ...children));
};

export const SelectSeparator = part("div", "select-separator", "pointer-events-none -mx-1 my-1 h-px bg-border", {
	attrs: { "aria-hidden": "true" }
});

/**
 * qrp `forms` input factory: `registerInput("ui-select", selectInput)`, then a
 * field spec `{ type: "ui-select", options: { apple: "Apple" }, placeholder }`.
 * Returns the trigger (labelable), two-way bound to `settings[key]`.
 *
 * @param {object} settings reactive state
 * @param {string} key
 * @param {object} [field] `{ options: { value: label } | () => …, placeholder, class, disabled }`
 * @returns {HTMLElement}
 */
export const selectInput = (settings, key, field = {}) => {
	const options = () => Object.entries(read(field.options) || {});
	const fragment = Select({ bind: [settings, key], disabled: field.disabled },
		SelectTrigger({ class: field.class }, SelectValue({ placeholder: field.placeholder || "" })),
		SelectContent(list(options, ([value]) => value, ([value, label]) => SelectItem({ value }, label)))
	);

	return fragment.querySelector("[data-slot=select-trigger]");
};

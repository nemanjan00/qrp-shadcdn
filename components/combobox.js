/**
 * components/combobox.js — Combobox: an input that filters a list of options
 * (the shadcn v4 / Base UI API).
 *
 *   Combobox({ items: frameworks, value: [form, "framework"] },
 *     ComboboxInput({ placeholder: "Select a framework" }),
 *     ComboboxContent(
 *       ComboboxEmpty("No items found."),
 *       ComboboxList((item) => ComboboxItem({ value: item }, item))
 *     )
 *   )
 *
 * Multiple selection with chips:
 *
 *   Combobox({ multiple: true, items: frameworks, defaultValue: ["Next.js"] },
 *     ComboboxChips(
 *       ComboboxValue((values) => values.map((value) => ComboboxChip({ value }, value))),
 *       ComboboxChipsInput({ placeholder: "Add framework" })
 *     ),
 *     ComboboxContent(ComboboxEmpty("No items found."), ComboboxList((item) => ComboboxItem({ value: item }, item)))
 *   )
 *
 * Options can also be written out directly (`ComboboxList(ComboboxItem(…), …)`)
 * or grouped (`ComboboxGroup({ items }, ComboboxLabel(…), ComboboxCollection(render))`).
 * The classic "Popover + Command" combobox from the shadcn docs works too.
 * https://ui.shadcn.com/docs/components/combobox
 */

import { el, effect, state, untracked, list } from "@nemanjan00/qrp";
import { collection } from "@nemanjan00/qrp/collection";
import { part, parseArgs, pick, cn, controllable, watchTree, uid, read, fragmentOf, splitContent } from "../utils/index.js";
import { layerWhen, openState } from "../utils/layer.js";
import { navigableItems, navTarget, reveal, defaultFilter } from "../utils/listbox.js";
import { buttonVariants } from "./button.js";
import { CheckIcon, ChevronDownIcon, XIcon } from "../icons/index.js";

const ITEM = "[data-slot=combobox-item]";
const INPUT = "[data-combobox-input]";

const itemValues = new WeakMap();
const renderers = new WeakMap();
const chipValues = new WeakMap();
const placements = new WeakMap();

// The combobox whose items are being rendered right now — lets a ComboboxGroup
// built inside a ComboboxList render function filter its own collection.
let rendering = null;

const keyOf = (item) => (item !== null && typeof item === "object" && item.value !== undefined ? item.value : item);

const INPUT_GROUP = [
	"group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30",
	"h-9 min-w-0 has-[>textarea]:h-auto",
	"has-[>[data-align=inline-start]]:[&>input]:pl-2",
	"has-[>[data-align=inline-end]]:[&>input]:pr-2",
	"has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
	"has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40"
].join(" ");

const INPUT_GROUP_ADDON_END = "flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4 order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]";

const INPUT_GROUP_INPUT = "h-9 w-full min-w-0 rounded-md border border-input px-3 py-1 text-base transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex-1 rounded-none border-0 bg-transparent shadow-none focus-visible:ring-0 dark:bg-transparent";

const INPUT_GROUP_ICON_BUTTON = cn(buttonVariants({ variant: "ghost", size: "icon-xs" }), "flex items-center gap-2 text-sm shadow-none size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0");

const sameValue = (a, b) => a === b || (a !== null && b !== null && typeof a === "object" && JSON.stringify(a) === JSON.stringify(b));

/**
 * A ref for the chips container — accepted for shadcn compatibility; the
 * chips container is the popup's anchor automatically.
 *
 * @returns {{ current: Element|null }}
 */
export const useComboboxAnchor = () => ({ current: null });

/**
 * `Combobox(props, input or chips, ComboboxContent(…))` — returns the input
 * part in place; the content opens below it.
 *
 * @param {object} [props]
 * @param {Array|Function} [props.items] options rendered by ComboboxList/ComboboxCollection render functions
 * @param {*} [props.value] selected value (array when multiple): value, `[state, "key"]`, or thunk
 * @param {*} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void
 * @param {boolean} [props.multiple] select several values (chips)
 * @param {Function} [props.itemToStringLabel] (value) => label shown in the input
 * @param {Function} [props.filter] (label, query, keywords) => number, 0 hides
 * @param {boolean} [props.autoHighlight] highlight the first match while typing
 * @param {boolean} [props.disabled]
 * @param {*} [props.open] / defaultOpen / onOpenChange — popup state
 */
export const Combobox = (...args) => {
	const { props, children } = parseArgs(args);
	const multiple = Boolean(props.multiple);
	const value = controllable(props.bind || props.value, props.defaultValue !== undefined ? props.defaultValue : (multiple ? [] : null), props.onValueChange);
	const open = openState(props);
	const query = state({ text: "", dirty: false });
	const filter = props.filter || defaultFilter;
	const labelOf = props.itemToStringLabel || ((item) => {
		if(item === null || item === undefined) {
			return "";
		}

		return typeof item === "object" && item.label !== undefined ? String(item.label) : String(item);
	});

	// Data-driven items go through a qrp collection: the query is its filter,
	// items() feeds a keyed list(). A group item matches when any child does.
	const matches = (item, text) => {
		if(!text) {
			return true;
		}

		if(item !== null && typeof item === "object" && Array.isArray(item.items)) {
			return item.items.some((child) => matches(child, text));
		}

		return filter(labelOf(item), text, []) > 0;
	};
	const view = collection(() => read(props.items) || [], {
		filter: { q: "" },
		filterFn: (item, current) => matches(item, current.q)
	});
	const context = { matches, query: () => view.filter.q };

	const { fragment, content } = splitContent(children, "combobox-content");
	const anchor = [...fragment.children].find((node) => node.matches("[data-slot=combobox-chips], [data-slot=input-group]")) || fragment.firstElementChild;
	const parts = [...fragment.children];

	const values = () => {
		const current = value.get();

		if(multiple) {
			return Array.isArray(current) ? current : [];
		}

		return current === null || current === undefined ? [] : [current];
	};

	const isSelected = (candidate) => values().some((existing) => sameValue(existing, candidate));

	const inputNode = () => parts.map((node) => (node.matches(INPUT) ? node : node.querySelector(INPUT))).find(Boolean) || null;

	if(!content) {
		return fragment;
	}

	content.id = content.id || uid("combobox");
	content.setAttribute("role", "listbox");

	if(multiple) {
		content.setAttribute("aria-multiselectable", "true");
	}

	if(anchor && anchor.matches("[data-slot=combobox-chips]")) {
		content.setAttribute("data-chips", "true");
	}

	// Render functions handed to ComboboxList / ComboboxValue.
	const fill = (node) => {
		const render = renderers.get(node);

		if(render) {
			node.append(fragmentOf([list(view.items, keyOf, (item, index) => {
				const previous = rendering;

				rendering = context;

				try {
					return render(item, index);
				} finally {
					rendering = previous;
				}
			})]));
		}
	};

	[...content.querySelectorAll("[data-slot=combobox-list]")].forEach(fill);

	parts.forEach((part) => {
		const nodes = part.matches("[data-slot=combobox-value]") ? [part] : [...part.querySelectorAll("[data-slot=combobox-value]")];

		nodes.forEach((node) => {
			const render = renderers.get(node);

			// Re-rendering may rebuild a chips input; keep focus in it.
			node.append(fragmentOf([() => {
				const hadFocus = node.contains(document.activeElement);
				const out = render ? render(multiple ? values() : value.get()) : labelOf(value.get());

				if(hadFocus) {
					queueMicrotask(() => {
						const next = node.querySelector(INPUT);

						if(next) {
							next.focus();
						}
					});
				}

				return out;
			}]));
		});
	});

	const all = () => [...content.querySelectorAll(ITEM)];
	const visible = () => navigableItems(content, ITEM);
	const current = () => all().find((item) => item.hasAttribute("data-highlighted")) || null;
	const labelOfItem = (item) => item.getAttribute("data-label") || item.textContent.trim();

	const paint = (target) => {
		all().forEach((item) => {
			if(item === target) {
				item.setAttribute("data-highlighted", "");
			} else {
				item.removeAttribute("data-highlighted");
			}
		});

		const field = inputNode();

		if(field) {
			if(target) {
				field.setAttribute("aria-activedescendant", target.id);
			} else {
				field.removeAttribute("aria-activedescendant");
			}
		}

		reveal(target);
	};

	const applyFilter = () => {
		const text = query.dirty ? query.text.trim() : "";

		all().forEach((item) => {
			item.hidden = text !== "" && filter(labelOfItem(item), text, []) <= 0;
		});

		[...content.querySelectorAll("[data-slot=combobox-group]")].forEach((group) => {
			group.hidden = ![...group.querySelectorAll(ITEM)].some((item) => !item.hidden);
		});

		const empty = !all().some((item) => !item.hidden);

		[content].concat([...content.querySelectorAll("[data-slot=combobox-list]")]).forEach((node) => {
			if(empty) {
				node.setAttribute("data-empty", "");
			} else {
				node.removeAttribute("data-empty");
			}
		});

		if(current() && current().hidden) {
			paint(null);
		}
	};

	const syncSelection = () => {
		all().forEach((item) => {
			const on = isSelected(itemValues.get(item));

			item.setAttribute("aria-selected", String(on));

			if(on) {
				item.setAttribute("data-selected", "");
			} else {
				item.removeAttribute("data-selected");
			}

			const indicator = item.querySelector("[data-slot=combobox-item-indicator]");

			if(indicator) {
				indicator.style.visibility = on ? "" : "hidden";
			}
		});
	};

	// Single mode: the input shows the selected label while not being edited.
	const showSelection = () => {
		const field = inputNode();

		if(!multiple && field && !query.dirty) {
			field.value = labelOf(value.get());
		}
	};

	effect(() => {
		value.get();
		untracked(() => {
			syncSelection();
			showSelection();
		});
	});

	effect(() => {
		const text = query.dirty ? query.text.trim() : "";

		untracked(() => {
			view.filter.q = text;
			applyFilter();

			if(props.autoHighlight && query.dirty && query.text) {
				paint(visible()[0] || null);
			}
		});
	});

	watchTree(content, () => {
		syncSelection();
		applyFilter();
	});

	const commit = (item) => {
		const picked = itemValues.get(item);
		const field = inputNode();

		if(multiple) {
			const next = isSelected(picked)
				? values().filter((existing) => !sameValue(existing, picked))
				: values().concat([picked]);

			value.set(next);
			query.text = "";
			query.dirty = false;

			if(field) {
				field.value = "";
				field.focus();
			}

			return;
		}

		value.set(picked);
		query.dirty = false;
		showSelection();
		open.set(false);
	};

	const remove = (picked) => {
		value.set(values().filter((existing) => !sameValue(existing, picked)));
	};

	content.addEventListener("pointerdown", (event) => {
		// Keep focus in the input while picking.
		event.preventDefault();
	});

	content.addEventListener("click", (event) => {
		const item = event.target.closest(ITEM);

		if(item && visible().includes(item)) {
			commit(item);
		}
	});

	content.addEventListener("pointermove", (event) => {
		const item = event.target.closest(ITEM);

		if(item && visible().includes(item) && item !== current()) {
			paint(item);
		}
	});

	const onKeyDown = (event) => {
		if(!event.target.matches(INPUT)) {
			return;
		}

		if(event.key === "ArrowDown" || event.key === "ArrowUp") {
			event.preventDefault();

			if(!open.get()) {
				open.set(true);
			}

			paint(navTarget(event, visible(), current()));
			return;
		}

		if((event.key === "Home" || event.key === "End") && open.get() && event.ctrlKey) {
			event.preventDefault();
			paint(navTarget(event, visible(), current()));
			return;
		}

		if(event.key === "Enter" && open.get()) {
			const target = current();

			if(target && visible().includes(target)) {
				event.preventDefault();
				commit(target);
			}

			return;
		}

		if(event.key === "Backspace" && multiple && event.target.value === "" && values().length > 0) {
			remove(values()[values().length - 1]);
		}
	};

	const onInput = (event) => {
		if(!event.target.matches(INPUT)) {
			return;
		}

		query.text = event.target.value;
		query.dirty = true;

		if(!open.get()) {
			open.set(true);
		}
	};

	const onClick = (event) => {
		const removeButton = event.target.closest("[data-slot=combobox-chip-remove]");

		if(removeButton) {
			const chip = removeButton.closest("[data-slot=combobox-chip]");

			remove(chipValues.has(chip) ? chipValues.get(chip) : chip.textContent.trim());
			return;
		}

		if(event.target.closest("[data-slot=combobox-clear]")) {
			value.set(multiple ? [] : null);
			query.text = "";
			query.dirty = false;

			const field = inputNode();

			if(field) {
				field.value = "";
				field.focus();
			}

			return;
		}

		if(event.target.closest("[data-slot=combobox-trigger]")) {
			open.set(!open.get());

			const field = inputNode();

			if(field) {
				field.focus();
			}

			return;
		}

		if(event.target.matches(INPUT) || (anchor && anchor.matches("[data-slot=combobox-chips]"))) {
			open.set(true);

			const field = inputNode();

			if(field && document.activeElement !== field) {
				field.focus();
			}
		}
	};

	parts.forEach((part) => {
		part.addEventListener("keydown", onKeyDown);
		part.addEventListener("input", onInput);
		part.addEventListener("click", onClick);
	});

	// The input reflects the popup state for assistive tech.
	effect(() => {
		const isOpen = Boolean(open.get());

		parts.forEach((part) => {
			[...part.querySelectorAll(`${INPUT}, [data-slot=combobox-trigger]`)].concat(part.matches(INPUT) ? [part] : []).forEach((node) => {
				node.setAttribute("aria-expanded", String(isOpen));
				node.setAttribute("aria-controls", content.id);
			});
		});

		if(!isOpen) {
			untracked(() => {
				query.dirty = false;
				showSelection();
				paint(null);
			});
		}
	});

	if(props.disabled) {
		parts.forEach((part) => {
			[...part.querySelectorAll("input, button")].forEach((node) => { node.disabled = true; });
			part.setAttribute("data-disabled", "true");
		});
	}

	const placement = placements.get(content) || {};

	layerWhen(open, () => ({
		content,
		inside: parts,
		modal: false,
		focus: false,
		anchor: anchor ? Object.assign({ reference: anchor }, placement) : null
	}), () => {
		const selected = all().find((item) => isSelected(itemValues.get(item)) && visible().includes(item));

		paint(selected || (props.autoHighlight ? visible()[0] : null) || null);
	});

	return fragment;
};

/**
 * `ComboboxValue(render?)` — renders `render(value)` (the values array when
 * `multiple`), or the selected label.
 */
export const ComboboxValue = (...args) => {
	const { props, children } = parseArgs(args);
	const node = el("span", Object.assign({ "data-slot": "combobox-value", class: "contents" }, props));
	const render = children.find((child) => typeof child === "function");

	if(render) {
		renderers.set(node, render);
	}

	return node;
};

/** The chevron button that toggles the list. */
export const ComboboxTrigger = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("button", Object.assign({ type: "button", tabindex: "-1", "aria-haspopup": "listbox", "aria-label": "Toggle options", "data-slot": "combobox-trigger" }, rest, {
		class: cn("[&_svg:not([class*='size-'])]:size-4", own.class)
	}), ...children, ChevronDownIcon({ "data-slot": "combobox-trigger-icon", class: "pointer-events-none size-4 text-muted-foreground" }));
};

/** A ghost icon button that clears the selection. */
export const ComboboxClear = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("button", Object.assign({ type: "button", "aria-label": "Clear", "data-slot": "combobox-clear", "data-size": "icon-xs" }, rest, {
		class: cn(INPUT_GROUP_ICON_BUTTON, own.class)
	}), XIcon({ class: "pointer-events-none" }));
};

/**
 * `ComboboxInput({ placeholder, showTrigger = true, showClear = false, disabled })`.
 */
export const ComboboxInput = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "showTrigger", "showClear", "disabled"]);
	const disabled = Boolean(own.disabled);

	const input = el("input", Object.assign({
		type: "text",
		role: "combobox",
		autocomplete: "off",
		"aria-autocomplete": "list",
		"aria-expanded": "false"
	}, rest, {
		"data-slot": "input-group-control",
		"data-combobox-input": "",
		disabled,
		class: INPUT_GROUP_INPUT
	}));

	const trigger = own.showTrigger === false ? null : ComboboxTrigger({
		disabled,
		"data-size": "icon-xs",
		class: cn(INPUT_GROUP_ICON_BUTTON, "group-has-data-[slot=combobox-clear]/input-group:hidden data-pressed:bg-transparent")
	});

	return el("div", {
		"data-slot": "input-group",
		role: "group",
		"data-disabled": disabled ? "true" : null,
		// shadcn's "w-auto" overrides InputGroup's "w-full" via tailwind-merge;
		// cn() doesn't merge, so the width class is simply left out of the base.
		class: cn(INPUT_GROUP.replace("w-full ", ""), "w-auto", own.class)
	}, input, el("div", { role: "group", "data-slot": "input-group-addon", "data-align": "inline-end", class: INPUT_GROUP_ADDON_END },
		trigger, own.showClear ? ComboboxClear({ disabled }) : null), ...children);
};

/**
 * `ComboboxContent({ side = "bottom", align = "start", sideOffset = 6 }, …)`.
 */
export const ComboboxContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "side", "align", "sideOffset", "alignOffset", "anchor", "avoidCollisions"]);

	const node = el("div", Object.assign({ "data-slot": "combobox-content" }, rest, {
		class: cn("group/combobox-content relative isolate z-50 max-h-96 w-(--qs-anchor-width) max-w-(--qs-available-width) min-w-[calc(var(--qs-anchor-width)+--spacing(7))] origin-(--qs-transform-origin) overflow-hidden rounded-md bg-popover text-popover-foreground shadow-md ring-1 ring-foreground/10 duration-100 data-[chips=true]:min-w-(--qs-anchor-width) data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 *:data-[slot=input-group]:m-1 *:data-[slot=input-group]:mb-0 *:data-[slot=input-group]:h-8 *:data-[slot=input-group]:border-input/30 *:data-[slot=input-group]:bg-input/30 *:data-[slot=input-group]:shadow-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95", own.class)
	}), ...children);

	const placement = {
		side: own.side || "bottom",
		align: own.align || "start",
		sideOffset: own.sideOffset === undefined ? 6 : own.sideOffset,
		alignOffset: own.alignOffset || 0,
		avoidCollisions: own.avoidCollisions
	};

	placements.set(node, placement);

	return node;
};

/**
 * `ComboboxList(render)` renders `render(item)` for each of the root's `items`;
 * `ComboboxList(…items)` takes the options as children.
 */
export const ComboboxList = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const render = children.length === 1 && typeof children[0] === "function" && children[0].length > 0 ? children[0] : null;

	const node = el("div", Object.assign({ "data-slot": "combobox-list", role: "presentation" }, rest, {
		class: cn("max-h-[min(calc(--spacing(96)---spacing(9)),calc(var(--qs-available-height)---spacing(9)))] scroll-py-1 overflow-y-auto p-1 data-empty:p-0", own.class)
	}), ...(render ? [] : children));

	if(render) {
		renderers.set(node, render);
	}

	return node;
};

/**
 * `ComboboxItem({ value, disabled, label }, …children)` — `value` may be any
 * value (string or object); `label` overrides the text used for filtering.
 */
export const ComboboxItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "disabled", "label"]);

	const item = el("div", Object.assign({
		role: "option",
		id: uid("combobox-item"),
		"data-slot": "combobox-item",
		"aria-selected": "false",
		"data-label": own.label || null,
		"data-disabled": own.disabled ? "" : null,
		"aria-disabled": own.disabled ? "true" : null
	}, rest, {
		class: cn("relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-highlighted:bg-accent data-highlighted:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", own.class)
	}), ...children, el("span", {
		"data-slot": "combobox-item-indicator",
		class: "pointer-events-none absolute right-2 flex size-4 items-center justify-center",
		style: "visibility:hidden"
	}, CheckIcon({ class: "pointer-events-none size-4 pointer-coarse:size-5" })));

	itemValues.set(item, own.value !== undefined ? own.value : item.textContent.trim());

	return item;
};

/**
 * `ComboboxGroup({ items }, ComboboxLabel(…), ComboboxCollection(render))` —
 * a labelled group; hidden while none of its options match.
 */
export const ComboboxGroup = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "items"]);
	const node = el("div", Object.assign({ "data-slot": "combobox-group", role: "group" }, rest, { class: cn(own.class) }), ...children);
	const owner = rendering;
	const groupView = collection(() => read(own.items) || [], {
		filterFn: (item) => !owner || owner.matches(item, owner.query())
	});

	[...node.querySelectorAll("[data-slot=combobox-collection]")].forEach((slotNode) => {
		const render = renderers.get(slotNode);

		if(render) {
			slotNode.append(fragmentOf([list(groupView.items, keyOf, render)]));
		}
	});

	const label = node.querySelector("[data-slot=combobox-label]");

	if(label) {
		label.id = label.id || uid("combobox-label");
		node.setAttribute("aria-labelledby", label.id);
	}

	return node;
};

export const ComboboxLabel = part("div", "combobox-label", "px-2 py-1.5 text-xs text-muted-foreground pointer-coarse:px-3 pointer-coarse:py-2 pointer-coarse:text-sm");

/** `ComboboxCollection(render)` — inside a ComboboxGroup with `items`. */
export const ComboboxCollection = (...args) => {
	const { children } = parseArgs(args);
	const node = el("div", { "data-slot": "combobox-collection", class: "contents" });
	const render = children.find((child) => typeof child === "function");

	if(render) {
		renderers.set(node, render);
	}

	return node;
};

export const ComboboxEmpty = part("div", "combobox-empty", "hidden w-full justify-center py-2 text-center text-sm text-muted-foreground group-data-empty/combobox-content:flex");

export const ComboboxSeparator = part("div", "combobox-separator", "-mx-1 my-1 h-px bg-border", { attrs: { role: "separator" } });

/** `ComboboxChips(ComboboxValue(…), ComboboxChipsInput())` — the multi-select field. */
export const ComboboxChips = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "ref"]);

	const node = el("div", Object.assign({ "data-slot": "combobox-chips" }, rest, {
		class: cn("flex min-h-9 flex-wrap items-center gap-1.5 rounded-md border border-input bg-transparent bg-clip-padding px-2.5 py-1.5 text-sm shadow-xs transition-[color,box-shadow] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50 has-aria-invalid:border-destructive has-aria-invalid:ring-[3px] has-aria-invalid:ring-destructive/20 has-data-[slot=combobox-chip]:px-1.5 dark:bg-input/30 dark:has-aria-invalid:border-destructive/50 dark:has-aria-invalid:ring-destructive/40", own.class)
	}), ...children);

	if(own.ref && typeof own.ref === "object") {
		own.ref.current = node;
	}

	return node;
};

/**
 * `ComboboxChip({ value, showRemove = true }, label)` — `value` identifies the
 * chip for removal (defaults to its text).
 */
export const ComboboxChip = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "showRemove"]);

	const chip = el("div", Object.assign({ "data-slot": "combobox-chip" }, rest, {
		class: cn("flex h-[calc(--spacing(5.5))] w-fit items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium whitespace-nowrap text-foreground has-disabled:pointer-events-none has-disabled:cursor-not-allowed has-disabled:opacity-50 has-data-[slot=combobox-chip-remove]:pr-0", own.class)
	}), ...children, own.showRemove === false ? null : el("button", {
		type: "button",
		tabindex: "-1",
		"aria-label": "Remove",
		"data-slot": "combobox-chip-remove",
		class: cn(buttonVariants({ variant: "ghost", size: "icon-xs" }), "-ml-1 opacity-50 hover:opacity-100")
	}, XIcon({ class: "pointer-events-none" })));

	if(own.value !== undefined) {
		chipValues.set(chip, own.value);
	}

	return chip;
};

export const ComboboxChipsInput = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("input", Object.assign({
		type: "text",
		role: "combobox",
		autocomplete: "off",
		"aria-autocomplete": "list",
		"aria-expanded": "false"
	}, rest, {
		"data-slot": "combobox-chip-input",
		"data-combobox-input": "",
		class: cn("min-w-16 flex-1 bg-transparent outline-none placeholder:text-muted-foreground", own.class)
	}));
};

/**
 * qrp `forms` input factory: `registerInput("ui-combobox", comboboxInput)`;
 * field spec `{ options: { value: label } | () => …, placeholder, empty }`.
 * Returns the input group, two-way bound to `settings[key]`.
 *
 * @param {object} settings reactive state
 * @param {string} key
 * @param {object} [field] `{ options, placeholder, empty, class, disabled }`
 * @returns {HTMLElement}
 */
export const comboboxInput = (settings, key, field = {}) => {
	const options = () => read(field.options) || {};
	const fragment = Combobox({
		bind: [settings, key],
		items: () => Object.keys(options()),
		itemToStringLabel: (value) => (value === null || value === undefined ? "" : String(options()[value] || "")),
		autoHighlight: true,
		disabled: field.disabled
	},
	ComboboxInput({ placeholder: field.placeholder || "", class: field.class }),
	ComboboxContent(
		ComboboxEmpty(field.empty || "No items found."),
		ComboboxList((value) => ComboboxItem({ value, label: options()[value] }, options()[value]))
	));

	return fragment.firstElementChild;
};

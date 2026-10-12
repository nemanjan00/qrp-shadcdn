/**
 * components/command.js — Command: a searchable command menu (the cmdk port).
 *
 *   Command({ class: "rounded-lg border shadow-md md:min-w-[450px]" },
 *     CommandInput({ placeholder: "Type a command or search..." }),
 *     CommandList(
 *       CommandEmpty("No results found."),
 *       CommandGroup({ heading: "Suggestions" },
 *         CommandItem({ onSelect: (value) => … }, CalendarIcon(), "Calendar")),
 *       CommandSeparator(),
 *       …
 *     )
 *   )
 *
 * Typing filters items (case-insensitive, every word must match the item's
 * value or `keywords`); groups and separators with nothing left hide, and
 * CommandEmpty shows when no item matches. Arrow keys (and Ctrl+n/p/j/k) move
 * the highlight from the input, Enter runs the highlighted item's `onSelect`.
 * Items keep their DOM order (cmdk also re-sorts by score).
 * https://ui.shadcn.com/docs/components/command
 */

import { el, effect, state, untracked } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, controllable, watchTree, uid, read } from "../utils/index.js";
import { navigableItems, navTarget, reveal, defaultFilter } from "../utils/listbox.js";
import { SearchIcon } from "../icons/index.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog.js";

const ITEM = "[data-slot=command-item]";

const items = new WeakMap();

const valueOf = (item) => {
	const meta = items.get(item) || {};

	return meta.value !== undefined ? String(meta.value) : item.textContent.trim();
};

const keywordsOf = (item) => (items.get(item) || {}).keywords || [];

const ownedBy = (root) => (node) => node.closest("[data-slot=command]") === root;

/**
 * `Command(props, CommandInput(…), CommandList(…))`.
 *
 * @param {object} [props]
 * @param {*} [props.value] highlighted item value: string, `[state, "key"]` or thunk
 * @param {string} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void, as the highlight moves
 * @param {Function} [props.filter] (value, search, keywords) => number, 0 hides
 * @param {boolean} [props.shouldFilter] false = you filter the items yourself
 * @param {boolean} [props.loop] wrap arrow navigation at the ends
 * @param {string} [props.label] accessible label for the input
 */
export const Command = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "defaultValue", "onValueChange", "filter", "shouldFilter", "loop", "label", "vimBindings"]);
	const filter = own.filter || defaultFilter;
	const highlight = controllable(own.value, own.defaultValue, own.onValueChange);
	const search = state({ text: "" });

	const root = el("div", Object.assign({ "data-slot": "command", "cmdk-root": "", tabindex: "-1" }, rest, {
		class: cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", own.class)
	}), ...children);

	const mine = ownedBy(root);
	const all = () => [...root.querySelectorAll(ITEM)].filter(mine);
	const visible = () => navigableItems(root, ITEM).filter(mine);
	const input = () => [...root.querySelectorAll("[data-slot=command-input]")].find(mine) || null;
	const list = () => [...root.querySelectorAll("[data-slot=command-list]")].find(mine) || null;

	const current = () => all().find((item) => item.getAttribute("data-selected") === "true") || null;

	const paintHighlight = (target) => {
		all().forEach((item) => {
			const on = item === target;

			item.setAttribute("data-selected", String(on));
			item.setAttribute("aria-selected", String(on));
		});

		const field = input();

		if(field) {
			if(target) {
				field.setAttribute("aria-activedescendant", target.id);
			} else {
				field.removeAttribute("aria-activedescendant");
			}
		}
	};

	const moveTo = (target) => {
		paintHighlight(target);
		reveal(target);
		highlight.set(target ? valueOf(target) : "");
	};

	const applyFilter = () => {
		const text = search.text.trim();
		const filtering = own.shouldFilter !== false && text !== "";

		all().forEach((item) => {
			item.hidden = filtering && filter(valueOf(item), text, keywordsOf(item)) <= 0;
		});

		[...root.querySelectorAll("[data-slot=command-group]")].filter(mine).forEach((group) => {
			group.hidden = ![...group.querySelectorAll(ITEM)].some((item) => !item.hidden);
		});

		[...root.querySelectorAll("[data-slot=command-separator]")].filter(mine).forEach((separator) => {
			separator.hidden = filtering && !separator.hasAttribute("data-always-render");
		});

		const count = all().filter((item) => !item.hidden).length;

		[...root.querySelectorAll("[data-slot=command-empty]")].filter(mine).forEach((empty) => {
			empty.hidden = count > 0;
		});

		const listNode = list();

		if(listNode) {
			listNode.style.setProperty("--cmdk-list-height", `${listNode.scrollHeight}px`);
		}
	};

	const choose = (item) => {
		const meta = items.get(item) || {};

		if(meta.onSelect) {
			meta.onSelect(valueOf(item));
		}
	};

	const refresh = () => {
		applyFilter();

		const options = visible();
		const wanted = untracked(highlight.get);
		const keep = options.find((item) => valueOf(item) === wanted);

		// After a search the first match is highlighted, as in cmdk.
		paintHighlight(keep || options[0] || null);
	};

	// Search text changes re-filter and reset the highlight to the first match.
	effect(() => {
		search.text;

		untracked(() => {
			applyFilter();

			const first = visible()[0] || null;

			paintHighlight(first);

			if(first) {
				highlight.set(valueOf(first));
			}
		});
	});

	// A controlled highlight from outside.
	effect(() => {
		const wanted = highlight.get();

		untracked(() => {
			const match = visible().find((item) => valueOf(item) === wanted);

			if(match && match !== current()) {
				paintHighlight(match);
			}
		});
	});

	watchTree(root, refresh);

	const onSearch = (event) => {
		if(event.target.matches("[data-slot=command-input]") && mine(event.target)) {
			search.text = event.target.value;
		}
	};

	root.addEventListener("input", onSearch);
	root.addEventListener("qs-search", onSearch);

	root.addEventListener("keydown", (event) => {
		if(event.isComposing) {
			return;
		}

		if(event.key === "Enter") {
			const target = current();

			if(target && visible().includes(target)) {
				event.preventDefault();
				choose(target);
			}

			return;
		}

		const target = navTarget(event, visible(), current(), { loop: own.loop, vim: own.vimBindings !== false });

		if(target) {
			event.preventDefault();
			moveTo(target);
		}
	});

	root.addEventListener("pointermove", (event) => {
		const item = event.target.closest(ITEM);

		if(item && mine(item) && visible().includes(item) && item !== current()) {
			moveTo(item);
		}
	});

	root.addEventListener("click", (event) => {
		const item = event.target.closest(ITEM);

		if(item && mine(item) && visible().includes(item)) {
			choose(item);
		}
	});

	const field = input();
	const listNode = list();

	if(field && listNode) {
		field.setAttribute("aria-controls", listNode.id);
	}

	if(field && own.label) {
		field.setAttribute("aria-label", own.label);
	}

	return root;
};

/**
 * `CommandInput({ placeholder, bind: [state, "key"], onValueChange })` — the
 * search text; `bind` (or `value` as a tuple / thunk) drives it from outside.
 */
export const CommandInput = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "bind", "onValueChange"]);
	const source = own.bind || own.value;
	const bound = Array.isArray(source) && source.length === 2;

	const input = el("input", Object.assign({
		type: "text",
		"data-slot": "command-input",
		"cmdk-input": "",
		role: "combobox",
		"aria-autocomplete": "list",
		"aria-expanded": "true",
		autocomplete: "off",
		autocorrect: "off",
		spellcheck: false
	}, rest, {
		class: cn("flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-hidden placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50", own.class)
	}));

	if(typeof source === "function" || bound) {
		const getter = bound ? () => source[0][source[1]] : source;

		effect(() => {
			const next = getter() || "";

			if(input.value !== next) {
				input.value = next;
				input.dispatchEvent(new Event("qs-search", { bubbles: true }));
			}
		});
	} else if(source !== undefined) {
		input.value = source;
	}

	input.addEventListener("input", () => {
		if(bound) {
			source[0][source[1]] = input.value;
		}

		if(own.onValueChange) {
			own.onValueChange(input.value);
		}
	});

	return el("div", { "data-slot": "command-input-wrapper", "cmdk-input-wrapper": "", class: "flex h-9 items-center gap-2 border-b px-3" },
		SearchIcon({ class: "size-4 shrink-0 opacity-50" }), input);
};

export const CommandList = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "label"]);

	return el("div", Object.assign({
		"data-slot": "command-list",
		"cmdk-list": "",
		role: "listbox",
		id: uid("command-list"),
		"aria-label": own.label || "Suggestions"
	}, rest, {
		class: cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto", own.class)
	}), ...children);
};

export const CommandEmpty = part("div", "command-empty", "py-6 text-center text-sm", {
	attrs: { "cmdk-empty": "", role: "presentation", hidden: true }
});

/**
 * `CommandGroup({ heading }, …items)` — hidden while none of its items match.
 */
export const CommandGroup = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "heading", "value"]);
	const headingId = uid("command-group-heading");

	return el("div", Object.assign({ "data-slot": "command-group", "cmdk-group": "", role: "presentation", "data-value": own.value || null }, rest, {
		class: cn("overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground", own.class)
	}),
	own.heading ? el("div", { "cmdk-group-heading": "", "aria-hidden": "true", id: headingId }, own.heading) : null,
	el("div", { "cmdk-group-items": "", role: "group", "aria-labelledby": own.heading ? headingId : null }, ...children));
};

/**
 * `CommandSeparator({ alwaysRender })` — hidden while searching unless `alwaysRender`.
 */
export const CommandSeparator = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "alwaysRender"]);

	return el("div", Object.assign({
		"data-slot": "command-separator",
		"cmdk-separator": "",
		role: "separator",
		"data-always-render": own.alwaysRender ? "" : null
	}, rest, { class: cn("-mx-1 h-px bg-border", own.class) }));
};

/**
 * `CommandItem({ value, keywords, onSelect, disabled }, …children)` — `value`
 * defaults to the item's text; `onSelect(value)` runs on click or Enter.
 */
export const CommandItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "keywords", "onSelect", "disabled", "forceMount"]);

	const item = el("div", Object.assign({
		"data-slot": "command-item",
		"cmdk-item": "",
		role: "option",
		id: uid("command-item"),
		"data-selected": "false",
		"aria-selected": "false",
		"data-disabled": () => String(Boolean(read(own.disabled))),
		"aria-disabled": () => String(Boolean(read(own.disabled)))
	}, rest, {
		class: cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", own.class)
	}), ...children);

	items.set(item, { value: own.value, keywords: own.keywords, onSelect: own.onSelect });

	if(own.value !== undefined) {
		item.setAttribute("data-value", String(own.value));
	}

	return item;
};

export const CommandShortcut = part("span", "command-shortcut", "ml-auto text-xs tracking-widest text-muted-foreground");

/**
 * `CommandDialog({ open, title, description, showCloseButton }, …command parts)`
 * — a Command palette in a Dialog. Drive `open` with `[state, "key"]` (e.g.
 * from a ⌘K listener). Other Dialog props (defaultOpen, onOpenChange) pass through.
 */
export const CommandDialog = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "title", "description", "showCloseButton", "commandProps"]);

	return Dialog(rest,
		DialogContent({ class: cn("overflow-hidden p-0", own.class), showCloseButton: own.showCloseButton !== false },
			DialogHeader({ class: "sr-only" },
				DialogTitle(own.title || "Command Palette"),
				DialogDescription(own.description || "Search for a command to run...")),
			Command(Object.assign({}, own.commandProps, {
				class: "**:data-[slot=command-input-wrapper]:h-12 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]]:px-2 [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5"
			}), ...children))
	);
};

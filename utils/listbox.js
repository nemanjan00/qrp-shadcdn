/**
 * utils/listbox.js — navigation over a list of options: Select, Command,
 * Combobox.
 *
 * Two highlight styles share it: Select moves real DOM focus between options
 * (`focus:bg-accent` classes), Command / Combobox keep focus in their input and
 * mark the active option with an attribute (`aria-activedescendant`).
 */

const TYPEAHEAD_RESET = 1000;

const isOff = (node, attr) => node.hasAttribute(attr) && node.getAttribute(attr) !== "false";

/**
 * Whether an option can be highlighted: not disabled, not filtered out.
 *
 * @param {Element} node
 * @param {Element} root stop looking for hidden ancestors here
 * @returns {boolean}
 */
export const isNavigable = (node, root) => {
	if(isOff(node, "data-disabled") || node.getAttribute("aria-disabled") === "true") {
		return false;
	}

	let current = node;

	while(current && current !== root) {
		if(current.hidden) {
			return false;
		}

		current = current.parentElement;
	}

	return true;
};

/**
 * Options under `root` matching `selector`, in DOM order, that can be reached.
 *
 * @param {Element} root
 * @param {string} selector
 * @returns {Element[]}
 */
export const navigableItems = (root, selector) => [...root.querySelectorAll(selector)]
	.filter((node) => isNavigable(node, root));

/**
 * The option `delta` steps from `current` (or the first/last when there is none).
 *
 * @param {Element[]} items
 * @param {Element|null} current
 * @param {number} delta +1 / -1
 * @param {boolean} [loop] wrap around the ends
 * @returns {Element|null}
 */
export const step = (items, current, delta, loop = false) => {
	if(items.length === 0) {
		return null;
	}

	const index = items.indexOf(current);

	if(index === -1) {
		return delta > 0 ? items[0] : items[items.length - 1];
	}

	const next = index + delta;

	if(next < 0 || next >= items.length) {
		if(loop) {
			return items[(next + items.length) % items.length];
		}

		return current;
	}

	return items[next];
};

/**
 * Map a navigation key to the option it should highlight; null for other keys.
 *
 * @param {KeyboardEvent} event
 * @param {Element[]} items
 * @param {Element|null} current
 * @param {object} [options]
 * @param {boolean} [options.loop] wrap at the ends
 * @param {boolean} [options.vim] Ctrl+n/p/j/k as arrows (cmdk)
 * @returns {Element|null}
 */
export const navTarget = (event, items, current, options = {}) => {
	const vim = options.vim && event.ctrlKey;
	const key = event.key;

	if(key === "ArrowDown" || (vim && (key === "n" || key === "j"))) {
		return step(items, current, 1, options.loop);
	}

	if(key === "ArrowUp" || (vim && (key === "p" || key === "k"))) {
		return step(items, current, -1, options.loop);
	}

	if(key === "Home") {
		return items[0] || null;
	}

	if(key === "End") {
		return items[items.length - 1] || null;
	}

	return null;
};

/**
 * Type-to-find: returns a function fed with keydown events that answers the
 * option whose label starts with the typed prefix (reset after a pause).
 *
 * @param {Function} labelOf (item) => string
 * @returns {Function} (event, items, current) => Element|null
 */
export const typeahead = (labelOf) => {
	let buffer = "";
	let timer = null;

	return (event, items, current) => {
		if(event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) {
			return null;
		}

		clearTimeout(timer);
		timer = setTimeout(() => { buffer = ""; }, TYPEAHEAD_RESET);

		const repeated = buffer.length > 0 && event.key === buffer[buffer.length - 1] && buffer.split("").every((char) => char === event.key);

		buffer += event.key.toLowerCase();

		// Pressing the same letter repeatedly cycles through items with that initial.
		const search = repeated ? event.key.toLowerCase() : buffer;
		const start = current ? items.indexOf(current) + (repeated || buffer.length === 1 ? 1 : 0) : 0;
		const ordered = items.slice(start).concat(items.slice(0, start));

		return ordered.find((item) => labelOf(item).toLowerCase().startsWith(search)) || null;
	};
};

/**
 * Bring an option into view inside its scroll container.
 *
 * @param {Element|null} node
 */
export const reveal = (node) => {
	if(node && typeof node.scrollIntoView === "function") {
		node.scrollIntoView({ block: "nearest" });
	}
};

/**
 * Case-insensitive match used by Command and Combobox: every word of the
 * search must appear in the value or a keyword. Returns a cmdk-style score.
 *
 * @param {string} value
 * @param {string} search
 * @param {string[]} [keywords]
 * @returns {number} 1 = match, 0 = hide
 */
export const defaultFilter = (value, search, keywords = []) => {
	const haystack = [value].concat(keywords).join(" ").toLowerCase();
	const words = search.toLowerCase().split(/\s+/).filter(Boolean);

	return words.every((word) => haystack.includes(word)) ? 1 : 0;
};

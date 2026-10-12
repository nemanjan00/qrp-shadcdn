/**
 * components/toggle-group.js — ToggleGroup, ToggleGroupItem.
 *
 *   ToggleGroup({ type: "multiple", variant: "outline" },
 *     ToggleGroupItem({ value: "bold", "aria-label": "Toggle bold" }, BoldIcon()), …)
 *
 * `type: "single"` → `value` is a string ("" = none); `"multiple"` → an array.
 * `value` (or qrp's `bind: [state, "key"]`) / `defaultValue` / `onValueChange`, `variant`, `size`, `spacing`
 * (gap in spacing units, 0 = joined), `disabled`, `orientation`. The group's
 * variant/size win over the items' (shadcn's context). Arrow keys rove focus.
 * https://ui.shadcn.com/docs/components/toggle-group
 */

import { el } from "@nemanjan00/qrp";
import { createContext } from "@nemanjan00/qrp/context";
import { parseArgs, pick, cn, read, controllable } from "../utils/index.js";
import { members, joinGroup, tabStop, isDisabled, roveTarget, bound } from "../utils/roving.js";
import { toggleVariants } from "./toggle.js";

/** The group controller items read: value, type, look (variant/size/spacing), item set. */
const ToggleGroupContext = createContext(null);

const asList = (value) => {
	if(Array.isArray(value)) {
		return value;
	}

	return value === undefined || value === null || value === "" ? [] : [value];
};

/**
 * ToggleGroup root.
 *
 * @param {object} [props]
 * @param {("single"|"multiple")} [props.type] default "single"
 * @param {string|string[]|Function|Array} [props.value] pressed item(s), thunk, or [state, key]
 * @param {Array} [props.bind] qrp two-way binding [state, key]
 * @param {string|string[]} [props.defaultValue]
 * @param {Function} [props.onValueChange] (value) => void
 * @param {("default"|"outline")} [props.variant]
 * @param {("default"|"sm"|"lg")} [props.size]
 * @param {number} [props.spacing] gap between items in spacing units (default 0)
 * @param {boolean} [props.disabled]
 * @param {("horizontal"|"vertical")} [props.orientation] arrow-key axis (default both)
 */
export const ToggleGroup = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "type", "value", "bind", "defaultValue", "onValueChange", "variant", "size", "spacing", "disabled", "orientation", "loop"]);
	const multiple = own.type === "multiple";
	const spacing = own.spacing || 0;
	const fallback = own.defaultValue !== undefined ? own.defaultValue : (multiple ? [] : "");
	const value = controllable(bound(own, "value"), fallback, own.onValueChange);
	const items = members();

	const group = {
		multiple,
		spacing,
		items,
		variant: own.variant,
		size: own.size,
		disabled: Boolean(own.disabled),
		pressed: () => asList(value.get()),
		toggle: (itemValue) => {
			const pressed = asList(value.get());
			const on = pressed.includes(itemValue);

			if(multiple) {
				value.set(on ? pressed.filter((entry) => entry !== itemValue) : pressed.concat([itemValue]));
			} else {
				value.set(on ? "" : itemValue);
			}
		}
	};

	const root = el("div", Object.assign({
		"data-slot": "toggle-group",
		role: "group",
		"data-variant": own.variant,
		"data-size": own.size,
		"data-spacing": String(spacing),
		"data-orientation": own.orientation
	}, rest, {
		class: cn("group/toggle-group flex w-fit items-center gap-[--spacing(var(--gap))] rounded-md data-[spacing=default]:data-[variant=outline]:shadow-xs", own.class)
	}), ...children);

	root.style.setProperty("--gap", String(spacing));

	root.addEventListener("keydown", (event) => {
		const item = event.target.closest("[data-slot=toggle-group-item]");

		if(!item || !items.has(item)) {
			return;
		}

		const target = roveTarget(event, items.list().filter((node) => !isDisabled(node)), { orientation: own.orientation, loop: own.loop !== false });

		if(target) {
			event.preventDefault();
			target.focus();
		}
	});

	return ToggleGroupContext.provide(root, group);
};

const ITEM = "w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10 data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l";

/** `ToggleGroupItem({ value, variant, size, disabled }, …children)` — the group's variant/size win. */
export const ToggleGroupItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "variant", "size"]);
	const itemValue = String(own.value);

	const node = el("button", Object.assign({ type: "button", "data-slot": "toggle-group-item", "data-value": itemValue }, rest), ...children);
	const join = joinGroup(node);

	node.addEventListener("click", () => {
		const group = ToggleGroupContext.find(node).value;

		if(group && !isDisabled(node)) {
			group.toggle(itemValue);
		}
	});

	return ToggleGroupContext.watch(node, (group) => {
		join(group && group.items);

		const variant = (group && group.variant) || own.variant;
		const size = (group && group.size) || own.size;

		node.setAttribute("data-variant", variant || "default");
		node.setAttribute("data-size", size || "default");
		node.setAttribute("data-spacing", String(group ? group.spacing : 0));
		node.setAttribute("class", read(cn(toggleVariants({ variant, size }), ITEM, own.class)));

		if(!group) {
			return;
		}

		const pressed = group.pressed();
		const on = pressed.includes(itemValue);

		if(group.disabled) {
			node.disabled = true;
		}

		node.setAttribute("data-state", on ? "on" : "off");

		if(group.multiple) {
			node.removeAttribute("role");
			node.removeAttribute("aria-checked");
			node.setAttribute("aria-pressed", String(on));
		} else {
			node.setAttribute("role", "radio");
			node.setAttribute("aria-checked", String(on));
			node.removeAttribute("aria-pressed");
		}

		node.tabIndex = tabStop(group.items.list(), (item) => pressed.includes(item.getAttribute("data-value"))) === node ? 0 : -1;
	});
};

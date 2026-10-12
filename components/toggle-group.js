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

import { el, state, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, read, controllable, owned, watchTree } from "../utils/index.js";
import { ownerOf, isDisabled, roveTarget, bound } from "../utils/roving.js";
import { toggleVariants } from "./toggle.js";

const contexts = new WeakMap();

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

	const items = () => owned(root, "toggle-group-item", "toggle-group");

	const sync = (current) => {
		const pressed = asList(current);
		const all = items();

		all.forEach((item) => {
			const on = pressed.includes(item.getAttribute("data-value"));
			const context = contexts.get(item);

			if(context) {
				context.variant = own.variant || context.ownVariant;
				context.size = own.size || context.ownSize;
				context.spacing = spacing;
			}

			if(own.disabled) {
				item.disabled = true;
			}

			item.setAttribute("data-state", on ? "on" : "off");

			if(multiple) {
				item.removeAttribute("role");
				item.removeAttribute("aria-checked");
				item.setAttribute("aria-pressed", String(on));
			} else {
				item.setAttribute("role", "radio");
				item.setAttribute("aria-checked", String(on));
				item.removeAttribute("aria-pressed");
			}

			item.tabIndex = -1;
		});

		const enabled = all.filter((item) => !isDisabled(item));
		const focusable = enabled.find((item) => item.getAttribute("data-state") === "on") || enabled[0];

		if(focusable) {
			focusable.tabIndex = 0;
		}
	};

	root.addEventListener("click", (event) => {
		const item = event.target.closest("[data-slot=toggle-group-item]");

		if(!item || ownerOf(item, "toggle-group") !== root || isDisabled(item)) {
			return;
		}

		const itemValue = item.getAttribute("data-value");
		const pressed = asList(value.get());
		const on = pressed.includes(itemValue);

		if(multiple) {
			value.set(on ? pressed.filter((entry) => entry !== itemValue) : pressed.concat([itemValue]));
		} else {
			value.set(on ? "" : itemValue);
		}
	});

	root.addEventListener("keydown", (event) => {
		const item = event.target.closest("[data-slot=toggle-group-item]");

		if(!item || ownerOf(item, "toggle-group") !== root) {
			return;
		}

		const target = roveTarget(event, items().filter((node) => !isDisabled(node)), { orientation: own.orientation, loop: own.loop !== false });

		if(target) {
			event.preventDefault();
			target.focus();
		}
	});

	effect(() => {
		const current = value.get();

		untracked(() => sync(current));
	});

	onDispose(watchTree(root, () => sync(value.get())));

	return root;
};

/** `ToggleGroupItem({ value, variant, size, disabled }, …children)`. */
export const ToggleGroupItem = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "value", "variant", "size"]);
	const context = state({ ownVariant: own.variant, ownSize: own.size, variant: own.variant, size: own.size, spacing: 0 });

	const node = el("button", Object.assign({
		type: "button",
		"data-slot": "toggle-group-item",
		"data-value": String(own.value),
		"data-variant": () => context.variant || "default",
		"data-size": () => context.size || "default",
		"data-spacing": () => String(context.spacing)
	}, rest, {
		class: () => read(cn(
			toggleVariants({ variant: context.variant, size: context.size }),
			"w-auto min-w-0 shrink-0 px-3 focus:z-10 focus-visible:z-10",
			"data-[spacing=0]:rounded-none data-[spacing=0]:shadow-none data-[spacing=0]:first:rounded-l-md data-[spacing=0]:last:rounded-r-md data-[spacing=0]:data-[variant=outline]:border-l-0 data-[spacing=0]:data-[variant=outline]:first:border-l",
			own.class
		))
	}), ...children);

	contexts.set(node, context);

	return node;
};

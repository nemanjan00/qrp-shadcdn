/**
 * components/label.js — Label. Pass `for: "input-id"` (or `htmlFor`).
 * https://ui.shadcn.com/docs/components/label
 */

import { part } from "../utils/index.js";

const LabelBase = part("label", "label", "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50");

export const Label = (...args) => {
	const node = LabelBase(...args);

	// Radix Label: a double-click on the label must not select its text.
	node.addEventListener("mousedown", (event) => {
		if(!event.defaultPrevented && event.detail > 1) {
			event.preventDefault();
		}
	});

	return node;
};

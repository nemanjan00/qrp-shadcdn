/**
 * components/separator.js — Separator.
 * https://ui.shadcn.com/docs/components/separator
 */

import { part } from "../utils/index.js";

/**
 * `Separator({ orientation: "horizontal" | "vertical", decorative = true })`.
 * Decorative separators are hidden from assistive tech (role="none").
 */
export const Separator = part("div", "separator", "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", {
	own: ["orientation", "decorative"],
	data: (own) => {
		const orientation = own.orientation || "horizontal";

		if(own.decorative === false) {
			return { "data-orientation": orientation, role: "separator", "aria-orientation": orientation };
		}

		return { "data-orientation": orientation, role: "none" };
	}
});

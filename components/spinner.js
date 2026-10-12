/**
 * components/spinner.js — Spinner.
 * https://ui.shadcn.com/docs/components/spinner
 */

import { parseArgs, cn } from "../utils/index.js";
import { Loader2Icon } from "../icons/index.js";

export const Spinner = (...args) => {
	const { props } = parseArgs(args);

	return Loader2Icon(Object.assign({ role: "status", "aria-label": "Loading", "data-slot": "spinner" }, props, {
		class: cn("size-4 animate-spin", props.class)
	}));
};

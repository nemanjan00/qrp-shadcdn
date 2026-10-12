/**
 * components/progress.js — Progress.
 * https://ui.shadcn.com/docs/components/progress
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, read } from "../utils/index.js";

/**
 * `Progress({ value: () => job.percent, max = 100 })` — value may be a thunk.
 */
export const Progress = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["value", "max", "class"]);
	const max = own.max || 100;
	const percent = () => {
		const value = read(own.value);

		if(value === null || value === undefined) {
			return null;
		}

		return Math.min(100, Math.max(0, (value / max) * 100));
	};
	const dataState = () => {
		const value = percent();

		if(value === null) {
			return "indeterminate";
		}

		return value >= 100 ? "complete" : "loading";
	};

	return el("div", Object.assign({
		"data-slot": "progress",
		role: "progressbar",
		"aria-valuemin": "0",
		"aria-valuemax": String(max),
		"aria-valuenow": () => {
			const value = read(own.value);

			return value === null || value === undefined ? null : String(value);
		},
		"data-state": dataState
	}, rest, {
		class: cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", own.class)
	}), el("div", {
		"data-slot": "progress-indicator",
		"data-state": dataState,
		class: "h-full w-full flex-1 bg-primary transition-all",
		style: () => ({ transform: `translateX(-${100 - (percent() || 0)}%)` })
	}));
};

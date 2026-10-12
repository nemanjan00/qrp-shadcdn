/**
 * components/aspect-ratio.js — AspectRatio.
 * https://ui.shadcn.com/docs/components/aspect-ratio
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, pick, cn } from "../utils/index.js";

/**
 * `AspectRatio({ ratio: 16 / 9 }, child)` — the child fills a box of that ratio.
 */
export const AspectRatio = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["ratio", "class"]);
	const ratio = own.ratio || 1;

	return el("div", Object.assign({ "data-slot": "aspect-ratio" }, rest, {
		class: cn("relative w-full *:absolute *:inset-0 *:size-full", own.class),
		style: { aspectRatio: String(ratio) }
	}), ...children);
};

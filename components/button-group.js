/**
 * components/button-group.js — ButtonGroup: buttons (and inputs, selects)
 * joined into one control.
 * https://ui.shadcn.com/docs/components/button-group
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, variants } from "../utils/index.js";

export const buttonGroupVariants = variants("flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1", {
	variants: {
		orientation: {
			horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
			vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none"
		}
	},
	defaultVariants: { orientation: "horizontal" }
});

/** `ButtonGroup({ orientation: "horizontal" | "vertical" }, ...buttons)`. */
export const ButtonGroup = part("div", "button-group", buttonGroupVariants, {
	own: ["orientation"],
	attrs: { role: "group" },
	data: (own) => (own.orientation ? { "data-orientation": own.orientation } : {})
});

export const ButtonGroupText = part("div", "button-group-text", "flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4");

/**
 * The Separator's classes with shadcn's overrides already merged (there is
 * no tailwind-merge in the bundle): `bg-input` replaces `bg-border`, and a
 * vertical separator stretches (`h-auto`) instead of `h-full`.
 */
export const ButtonGroupSeparator = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "orientation"]);
	const orientation = own.orientation || "vertical";

	return el("div", Object.assign({ "data-slot": "button-group-separator", "data-orientation": orientation, role: "none" }, rest, {
		class: cn("relative m-0! shrink-0 self-stretch bg-input data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-auto data-[orientation=vertical]:w-px", own.class)
	}));
};

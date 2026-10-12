/**
 * components/input-group.js — InputGroup: an input with addons (icons, text,
 * buttons, kbd) inside the same border.
 * https://ui.shadcn.com/docs/components/input-group
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, variants } from "../utils/index.js";
import { buttonVariants } from "./button.js";

export const InputGroup = part("div", "input-group", [
	"group/input-group relative flex w-full items-center rounded-md border border-input shadow-xs transition-[color,box-shadow] outline-none dark:bg-input/30",
	"h-9 min-w-0 has-[>textarea]:h-auto",
	"has-[>[data-align=inline-start]]:[&>input]:pl-2",
	"has-[>[data-align=inline-end]]:[&>input]:pr-2",
	"has-[>[data-align=block-start]]:h-auto has-[>[data-align=block-start]]:flex-col has-[>[data-align=block-start]]:[&>input]:pb-3",
	"has-[>[data-align=block-end]]:h-auto has-[>[data-align=block-end]]:flex-col has-[>[data-align=block-end]]:[&>input]:pt-3",
	"has-[[data-slot=input-group-control]:focus-visible]:border-ring has-[[data-slot=input-group-control]:focus-visible]:ring-[3px] has-[[data-slot=input-group-control]:focus-visible]:ring-ring/50",
	"has-[[data-slot][aria-invalid=true]]:border-destructive has-[[data-slot][aria-invalid=true]]:ring-destructive/20 dark:has-[[data-slot][aria-invalid=true]]:ring-destructive/40"
].join(" "), { attrs: { role: "group" } });

export const inputGroupAddonVariants = variants("flex h-auto cursor-text items-center justify-center gap-2 py-1.5 text-sm font-medium text-muted-foreground select-none group-data-[disabled=true]/input-group:opacity-50 [&>kbd]:rounded-[calc(var(--radius)-5px)] [&>svg:not([class*='size-'])]:size-4", {
	variants: {
		align: {
			"inline-start": "order-first pl-3 has-[>button]:ml-[-0.45rem] has-[>kbd]:ml-[-0.35rem]",
			"inline-end": "order-last pr-3 has-[>button]:mr-[-0.45rem] has-[>kbd]:mr-[-0.35rem]",
			"block-start": "order-first w-full justify-start px-3 pt-3 group-has-[>input]/input-group:pt-2.5 [.border-b]:pb-3",
			"block-end": "order-last w-full justify-start px-3 pb-3 group-has-[>input]/input-group:pb-2.5 [.border-t]:pt-3"
		}
	},
	defaultVariants: { align: "inline-start" }
});

/**
 * `InputGroupAddon({ align: "inline-start" | "inline-end" | "block-start" |
 * "block-end" }, …)`. Clicking the addon (outside a button) focuses the input.
 */
export const InputGroupAddon = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "align"]);
	const align = own.align || "inline-start";

	const node = el("div", Object.assign({ role: "group", "data-slot": "input-group-addon", "data-align": align }, rest, {
		class: inputGroupAddonVariants({ align, class: own.class })
	}), ...children);

	node.addEventListener("click", (event) => {
		if(event.target.closest("button")) {
			return;
		}

		const input = node.parentElement ? node.parentElement.querySelector("input, textarea") : null;

		if(input) {
			input.focus();
		}
	});

	return node;
};

export const inputGroupButtonVariants = variants("flex items-center gap-2 text-sm shadow-none", {
	variants: {
		size: {
			xs: "h-6 gap-1 rounded-[calc(var(--radius)-5px)] px-2 has-[>svg]:px-2 [&>svg:not([class*='size-'])]:size-3.5",
			sm: "h-8 gap-1.5 rounded-md px-2.5 has-[>svg]:px-2.5",
			"icon-xs": "size-6 rounded-[calc(var(--radius)-5px)] p-0 has-[>svg]:p-0",
			"icon-sm": "size-8 p-0 has-[>svg]:p-0"
		}
	},
	defaultVariants: { size: "xs" }
});

// Button base minus what the group-button sizes override (no tailwind-merge).
const drop = (classes, tokens) => classes.split(" ").filter((token) => !tokens.includes(token)).join(" ");

/** `InputGroupButton({ variant = "ghost", size = "xs" | "sm" | "icon-xs" | "icon-sm" }, …)`. */
export const InputGroupButton = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "variant", "size"]);
	const size = own.size || "xs";
	const variant = own.variant || "ghost";
	const base = drop(buttonVariants({ variant, size: "none" }), ["gap-2", "rounded-md", "shadow-xs"]);

	return el("button", Object.assign({ type: "button", "data-slot": "button", "data-variant": variant, "data-size": size }, rest, {
		class: cn(base, inputGroupButtonVariants({ size }), own.class)
	}), ...children);
};

export const InputGroupText = part("span", "input-group-text", "flex items-center gap-2 text-sm text-muted-foreground [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4");

// Input / Textarea classes with the group's overrides already merged: no own
// border, radius, shadow, background or focus ring — the group draws those.
export const InputGroupInput = part("input", "input-group-control", "h-9 w-full min-w-0 flex-1 rounded-none border-0 bg-transparent px-3 py-1 text-base shadow-none transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent aria-invalid:border-destructive");

export const InputGroupTextarea = part("textarea", "input-group-control", "flex field-sizing-content min-h-16 w-full flex-1 resize-none rounded-none border-0 bg-transparent px-3 py-3 text-base shadow-none transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-transparent");

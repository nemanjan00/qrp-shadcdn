/**
 * components/empty.js — Empty: an empty-state block.
 * https://ui.shadcn.com/docs/components/empty
 */

import { part, variants } from "../utils/index.js";

export const emptyMediaVariants = variants("mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-transparent",
			icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6"
		}
	},
	defaultVariants: { variant: "default" }
});

export const Empty = part("div", "empty", "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12");
export const EmptyHeader = part("div", "empty-header", "flex max-w-sm flex-col items-center gap-2 text-center");

/** `EmptyMedia({ variant: "default" | "icon" }, icon)`. */
export const EmptyMedia = part("div", "empty-icon", emptyMediaVariants, {
	own: ["variant"],
	data: (own) => ({ "data-variant": own.variant || "default" })
});

export const EmptyTitle = part("div", "empty-title", "text-lg font-medium tracking-tight");
export const EmptyDescription = part("div", "empty-description", "text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary");
export const EmptyContent = part("div", "empty-content", "flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance");

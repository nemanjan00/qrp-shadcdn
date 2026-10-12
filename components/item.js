/**
 * components/item.js — Item: a flexible row (media, content, actions).
 * `Item({ as: "a", href })` makes the whole row a link.
 * https://ui.shadcn.com/docs/components/item
 */

import { part, parseArgs, cn, variants, watchTree } from "../utils/index.js";
import { Separator } from "./separator.js";

// shadcn's base has `border-transparent`, which its outline variant overrides
// via tailwind-merge; without a merger the CSS order would keep it transparent,
// so it lives on the variants that want it.
export const itemVariants = variants("group/item flex flex-wrap items-center rounded-md border text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50", {
	variants: {
		variant: {
			default: "border-transparent bg-transparent",
			outline: "border-border",
			muted: "border-transparent bg-muted/50"
		},
		size: {
			default: "gap-4 p-4",
			sm: "gap-2.5 px-4 py-3"
		}
	},
	defaultVariants: { variant: "default", size: "default" }
});

export const itemMediaVariants = variants("flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none", {
	variants: {
		variant: {
			default: "bg-transparent",
			icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
			image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover"
		}
	},
	defaultVariants: { variant: "default" }
});

const ItemGroupBase = part("div", "item-group", "group/item-group flex flex-col", { attrs: { role: "list" } });

// A role="list" may only own list items: Items become listitems, separators
// between them presentational. An Item rendered as a link or button keeps its
// own role — then the group drops role="list" rather than hide the link.
// Children added later (list()/when()) are marked as they appear — attributes
// only, never the child list.
const INTERACTIVE = new Set(["A", "BUTTON"]);

const markListChildren = (group) => {
	const children = [...group.children];
	const items = children.filter((child) => child.getAttribute("data-slot") === "item");
	const interactive = items.some((child) => INTERACTIVE.has(child.tagName) || (child.hasAttribute("role") && child.getAttribute("role") !== "listitem"));

	if(interactive) {
		if(group.getAttribute("role") === "list") {
			group.removeAttribute("role");
		}

		return;
	}

	items.filter((child) => !child.hasAttribute("role")).forEach((child) => child.setAttribute("role", "listitem"));
	children
		.filter((child) => child.getAttribute("data-slot") === "item-separator" && child.getAttribute("role") !== "none")
		.forEach((child) => child.setAttribute("role", "none"));
};

export const ItemGroup = (...args) => {
	const group = ItemGroupBase(...args);

	watchTree(group, () => markListChildren(group));

	return group;
};

export const ItemSeparator = (...args) => {
	const { props } = parseArgs(args);

	return Separator(Object.assign({}, props, { "data-slot": "item-separator", orientation: "horizontal", class: cn("my-0", props.class) }));
};

/** `Item({ variant: "default" | "outline" | "muted", size: "default" | "sm", as })`. */
export const Item = part("div", "item", itemVariants, {
	own: ["variant", "size"],
	data: (own) => ({ "data-variant": own.variant || "default", "data-size": own.size || "default" })
});

/** `ItemMedia({ variant: "default" | "icon" | "image" }, …)`. */
export const ItemMedia = part("div", "item-media", itemMediaVariants, {
	own: ["variant"],
	data: (own) => ({ "data-variant": own.variant || "default" })
});

export const ItemContent = part("div", "item-content", "flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none");
export const ItemTitle = part("div", "item-title", "flex w-fit items-center gap-2 text-sm leading-snug font-medium");
export const ItemDescription = part("p", "item-description", "line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary");
export const ItemActions = part("div", "item-actions", "flex items-center gap-2");
export const ItemHeader = part("div", "item-header", "flex basis-full items-center justify-between gap-2");
export const ItemFooter = part("div", "item-footer", "flex basis-full items-center justify-between gap-2");

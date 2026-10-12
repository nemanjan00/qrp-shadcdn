/**
 * components/breadcrumb.js — Breadcrumb and its parts.
 * https://ui.shadcn.com/docs/components/breadcrumb
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn } from "../utils/index.js";
import { ChevronRightIcon, MoreHorizontalIcon } from "../icons/index.js";

export const Breadcrumb = part("nav", "breadcrumb", "", { attrs: { "aria-label": "breadcrumb" } });
export const BreadcrumbList = part("ol", "breadcrumb-list", "flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5");
export const BreadcrumbItem = part("li", "breadcrumb-item", "inline-flex items-center gap-1.5");

/** `BreadcrumbLink({ href }, "Home")`; `as` swaps the tag (shadcn's asChild). */
export const BreadcrumbLink = part("a", "breadcrumb-link", "transition-colors hover:text-foreground");

export const BreadcrumbPage = part("span", "breadcrumb-page", "font-normal text-foreground", {
	attrs: { role: "link", "aria-disabled": "true", "aria-current": "page" }
});

/** Renders a chevron unless given children (e.g. a slash icon). */
export const BreadcrumbSeparator = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("li", Object.assign({ "data-slot": "breadcrumb-separator", role: "presentation", "aria-hidden": "true" }, rest, {
		class: cn("[&>svg]:size-3.5", own.class)
	}), ...(children.length > 0 ? children : [ChevronRightIcon()]));
};

export const BreadcrumbEllipsis = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("span", Object.assign({ "data-slot": "breadcrumb-ellipsis", role: "presentation", "aria-hidden": "true" }, rest, {
		class: cn("flex size-9 items-center justify-center", own.class)
	}), MoreHorizontalIcon({ class: "size-4" }), el("span", { class: "sr-only" }, "More"));
};

/**
 * components/pagination.js — Pagination and its parts (markup). Wire the links
 * to your own page state: `PaginationLink({ isActive: () => page.n === 2,
 * onclick: () => { page.n = 2; } }, "2")`.
 * https://ui.shadcn.com/docs/components/pagination
 */

import { el, list, when } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, read } from "../utils/index.js";
import { buttonVariants } from "./button.js";
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from "../icons/index.js";

export const Pagination = part("nav", "pagination", "mx-auto flex w-full justify-center", {
	attrs: { role: "navigation", "aria-label": "pagination" }
});
export const PaginationContent = part("ul", "pagination-content", "flex flex-row items-center gap-1");
export const PaginationItem = part("li", "pagination-item", "");

// The bundle has no tailwind-merge, so the few classes a part overrides on the
// button base are dropped from it explicitly instead of relying on CSS order.
const drop = (classes, tokens) => classes.split(" ").filter((token) => !tokens.includes(token)).join(" ");

/**
 * `PaginationLink({ isActive, size = "icon", href, onclick }, children)`;
 * `isActive` may be a thunk.
 */
export const PaginationLink = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "isActive", "size", "_extra"]);
	const active = () => Boolean(read(own.isActive));
	const classes = () => {
		const size = own._extra ? "none" : own.size || "icon";
		const base = buttonVariants({ variant: active() ? "outline" : "ghost", size });

		return cn(own._extra ? drop(base, ["gap-2"]) : base, own._extra, read(own.class));
	};

	return el("a", Object.assign({
		"data-slot": "pagination-link",
		"aria-current": () => (active() ? "page" : null),
		"data-active": () => (active() ? "true" : null)
	}, rest, { class: classes }), ...children);
};

export const PaginationPrevious = (...args) => {
	const { props } = parseArgs(args);

	return PaginationLink(Object.assign({ "aria-label": "Go to previous page" }, props, {
		_extra: "h-9 py-2 has-[>svg]:px-3 gap-1 px-2.5 sm:pl-2.5"
	}), ChevronLeftIcon(), el("span", { class: "hidden sm:block" }, "Previous"));
};

export const PaginationNext = (...args) => {
	const { props } = parseArgs(args);

	return PaginationLink(Object.assign({ "aria-label": "Go to next page" }, props, {
		_extra: "h-9 py-2 has-[>svg]:px-3 gap-1 px-2.5 sm:pr-2.5"
	}), el("span", { class: "hidden sm:block" }, "Next"), ChevronRightIcon());
};

export const PaginationEllipsis = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("span", Object.assign({ "aria-hidden": "true", "data-slot": "pagination-ellipsis" }, rest, {
		class: cn("flex size-9 items-center justify-center", own.class)
	}), MoreHorizontalIcon({ class: "size-4" }), el("span", { class: "sr-only" }, "More pages"));
};

const go = (action) => (event) => {
	event.preventDefault();
	action();
};

/**
 * Pagination driven by a qrp `dataGrid()` (or anything with its pager API:
 * `page.index`, `pageCount()`, `pageWindow(span)`, `goto(i)`, `prev()`,
 * `next()`, `hasPrev()`, `hasNext()`). The page links are a keyed `list()`
 * over `pageWindow`; ellipses mark pages outside the window.
 *
 * @param {object} grid a qrp datagrid controller
 * @param {object} [options]
 * @param {number} [options.span] pages shown around the current one (default 5)
 * @returns {HTMLElement}
 */
export const PaginationFor = (grid, options = {}) => {
	const span = options.span || 5;
	const pages = () => grid.pageWindow(span);
	const gapBefore = () => {
		const range = pages();

		return range.length > 0 && range[0] > 0;
	};
	const gapAfter = () => {
		const range = pages();

		return range.length > 0 && range[range.length - 1] < grid.pageCount() - 1;
	};
	const ellipsis = (visible) => when(visible, () => PaginationItem(PaginationEllipsis()));

	return Pagination(PaginationContent(
		PaginationItem(PaginationPrevious({
			href: "#",
			"aria-disabled": () => (grid.hasPrev() ? null : "true"),
			class: () => (grid.hasPrev() ? "" : "pointer-events-none opacity-50"),
			onclick: go(() => grid.prev())
		})),
		ellipsis(gapBefore),
		list(pages, (index) => index, (index) => PaginationItem(PaginationLink({
			href: "#",
			isActive: () => grid.page.index === index,
			onclick: go(() => grid.goto(index))
		}, String(index + 1)))),
		ellipsis(gapAfter),
		PaginationItem(PaginationNext({
			href: "#",
			"aria-disabled": () => (grid.hasNext() ? null : "true"),
			class: () => (grid.hasNext() ? "" : "pointer-events-none opacity-50"),
			onclick: go(() => grid.next())
		}))
	));
};

/**
 * components/use-mobile.js — useIsMobile(): is the viewport narrower than 768px?
 * shadcn's `use-mobile` hook (the Sidebar uses it), built on qrp's reactive
 * `media()` — the listener is owned by the current scope and removed with it.
 *
 *   const mobile = useIsMobile();
 *   el("div", {}, () => (mobile() ? "phone" : "desktop"));
 */

import { media } from "@nemanjan00/qrp/browser";

export const MOBILE_BREAKPOINT = 768;

/**
 * @returns {Function} () => boolean, reactive; `.media` is qrp's `{ matches }` store
 */
export const useIsMobile = () => {
	const query = media(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
	const read = () => query.matches;

	read.media = query;

	return read;
};

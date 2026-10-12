/**
 * components/avatar.js — Avatar and its parts. The fallback shows until the
 * image has loaded (and stays if it fails), like Radix Avatar.
 * https://ui.shadcn.com/docs/components/avatar
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn } from "../utils/index.js";

export const Avatar = part("span", "avatar", "group/avatar relative flex size-8 shrink-0 overflow-hidden rounded-full select-none data-[size=lg]:size-10 data-[size=sm]:size-6", {
	own: ["size"],
	data: (own) => ({ "data-size": own.size || "default" })
});

const fallbackOf = (img) => {
	const root = img.closest("[data-slot=avatar]");

	return root ? root.querySelector("[data-slot=avatar-fallback]") : null;
};

export const AvatarImage = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	const img = el("img", Object.assign({ "data-slot": "avatar-image" }, rest, {
		class: cn("aspect-square size-full", own.class),
		hidden: true
	}));

	img.addEventListener("load", () => {
		img.hidden = false;

		const fallback = fallbackOf(img);

		if(fallback) {
			fallback.hidden = true;
		}
	});

	img.addEventListener("error", () => {
		img.hidden = true;

		const fallback = fallbackOf(img);

		if(fallback) {
			fallback.hidden = false;
		}
	});

	return img;
};

export const AvatarFallback = part("span", "avatar-fallback", "flex size-full items-center justify-center rounded-full bg-muted text-sm text-muted-foreground group-data-[size=sm]/avatar:text-xs");

export const AvatarBadge = part("span", "avatar-badge", [
	"absolute right-0 bottom-0 z-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground ring-2 ring-background select-none",
	"group-data-[size=sm]/avatar:size-2 group-data-[size=sm]/avatar:[&>svg]:hidden",
	"group-data-[size=default]/avatar:size-2.5 group-data-[size=default]/avatar:[&>svg]:size-2",
	"group-data-[size=lg]/avatar:size-3 group-data-[size=lg]/avatar:[&>svg]:size-2"
].join(" "));

export const AvatarGroup = part("div", "avatar-group", "group/avatar-group flex -space-x-2 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-background");

export const AvatarGroupCount = part("div", "avatar-group-count", "relative flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground ring-2 ring-background group-has-data-[size=lg]/avatar-group:size-10 group-has-data-[size=sm]/avatar-group:size-6 [&>svg]:size-4 group-has-data-[size=lg]/avatar-group:[&>svg]:size-5 group-has-data-[size=sm]/avatar-group:[&>svg]:size-3");

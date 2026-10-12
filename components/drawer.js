/**
 * components/drawer.js — Drawer: an edge panel with a drag handle. Drag it
 * toward its edge to dismiss. `Drawer({ direction: "bottom" | "top" | "left" |
 * "right" })`, default bottom.
 * https://ui.shadcn.com/docs/components/drawer
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, roleMarker } from "../utils/index.js";
import { modalRoot } from "./dialog.js";

const DISMISS_RATIO = 0.3;

const AXIS = {
	bottom: { axis: "Y", sign: 1, size: "offsetHeight" },
	top: { axis: "Y", sign: -1, size: "offsetHeight" },
	right: { axis: "X", sign: 1, size: "offsetWidth" },
	left: { axis: "X", sign: -1, size: "offsetWidth" }
};

/** Drag toward the drawer's edge; past DISMISS_RATIO of its size it closes. */
const draggable = (content, direction) => {
	const config = AXIS[direction];
	const coordinate = (event) => (config.axis === "Y" ? event.clientY : event.clientX);

	content.addEventListener("pointerdown", (down) => {
		if(down.target.closest("input, textarea, select, button, a, [contenteditable]")) {
			return;
		}

		const start = coordinate(down);
		let delta = 0;

		const onMove = (event) => {
			delta = Math.max(0, (coordinate(event) - start) * config.sign);
			content.style.transform = `translate${config.axis}(${delta * config.sign}px)`;
		};

		const onUp = () => {
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerup", onUp);
			content.style.transition = "";
			content.style.transform = "";

			if(delta > content[config.size] * DISMISS_RATIO) {
				content.dispatchEvent(new CustomEvent("qs-dismiss", { bubbles: false }));
			}
		};

		content.style.transition = "none";
		window.addEventListener("pointermove", onMove);
		window.addEventListener("pointerup", onUp);
	});
};

export const Drawer = modalRoot("drawer", {
	prepare: (content, props) => {
		const direction = props.direction || "bottom";

		content.setAttribute("data-vaul-drawer-direction", direction);
		draggable(content, direction);
	}
});

export const DrawerTrigger = roleMarker("drawer-trigger");
export const DrawerClose = roleMarker("drawer-close");

export const DrawerContent = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("div", Object.assign({ "data-slot": "drawer-content" }, rest, {
		class: cn(
			"group/drawer-content fixed z-50 flex h-auto flex-col bg-background",
			"data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:duration-500 data-[state=closed]:duration-300",
			"data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:mb-24 data-[vaul-drawer-direction=top]:max-h-[80vh] data-[vaul-drawer-direction=top]:rounded-b-lg data-[vaul-drawer-direction=top]:border-b data-[vaul-drawer-direction=top]:data-[state=open]:slide-in-from-top data-[vaul-drawer-direction=top]:data-[state=closed]:slide-out-to-top",
			"data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:mt-24 data-[vaul-drawer-direction=bottom]:max-h-[80vh] data-[vaul-drawer-direction=bottom]:rounded-t-lg data-[vaul-drawer-direction=bottom]:border-t data-[vaul-drawer-direction=bottom]:data-[state=open]:slide-in-from-bottom data-[vaul-drawer-direction=bottom]:data-[state=closed]:slide-out-to-bottom",
			"data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=right]:border-l data-[vaul-drawer-direction=right]:sm:max-w-sm data-[vaul-drawer-direction=right]:data-[state=open]:slide-in-from-right data-[vaul-drawer-direction=right]:data-[state=closed]:slide-out-to-right",
			"data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=left]:border-r data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=left]:data-[state=open]:slide-in-from-left data-[vaul-drawer-direction=left]:data-[state=closed]:slide-out-to-left",
			own.class
		)
	}), el("div", { class: "mx-auto mt-4 hidden h-2 w-[100px] shrink-0 cursor-grab rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block" }), ...children);
};

export const DrawerHeader = part("div", "drawer-header", "flex flex-col gap-0.5 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:gap-1.5 md:text-left");
export const DrawerFooter = part("div", "drawer-footer", "mt-auto flex flex-col gap-2 p-4");
export const DrawerTitle = part("h2", "drawer-title", "font-semibold text-foreground");
export const DrawerDescription = part("p", "drawer-description", "text-sm text-muted-foreground");

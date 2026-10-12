/**
 * components/sonner.js — Toaster + toast(): sonner's API and look, zero-dep.
 *
 *   mount(document.body, () => Toaster({ position: "bottom-right" }));   // once
 *   toast("Event has been created", { description: "Sunday, December 03", action: { label: "Undo", onClick: undo } });
 *   toast.success("Saved"); toast.error("Failed"); toast.loading("Working…");
 *   toast.promise(save(), { loading: "Saving…", success: "Saved", error: "Could not save" });
 *   toast.dismiss(id);
 *
 * The stack collapses like sonner's (front toast + two peeking behind) and
 * fans out on hover, which also pauses the auto-dismiss timers. Titles,
 * descriptions and icons are any qrp renderable; a thunk stays reactive.
 *
 * Not ported: swipe-to-dismiss and the `light` theme override (the theme
 * follows the page's `.dark` class; `theme: "dark"` forces dark).
 * https://ui.shadcn.com/docs/components/sonner
 */

import { el, state, effect, list, onDispose, untracked } from "@nemanjan00/qrp";
import { parseArgs, pick, cn, read } from "../utils/index.js";
import { createToasts } from "@nemanjan00/qrp/toasts";
import { toastLayer, toastApi } from "../utils/toaster.js";
import { XIcon, Loader2Icon } from "../icons/index.js";

const GAP = 14;
const VISIBLE_TOASTS = 3;
const OFFSET = "32px";
const SCALE_STEP = 0.05;

// The toast's exit transition (duration-400 in TOAST below).
const EXIT_MS = 400;

/**
 * The default store: a qrp toasts controller on the global event bus (so
 * `notify.success("…")` from any qrp code shows here too). qrp runs the
 * countdowns, pausing and the exit phase; the layer sets sonner's durations.
 */
export const sonner = toastLayer(createToasts({ timeout: 0, exitMs: EXIT_MS }), { duration: 4000 });

export const toast = toastApi(sonner);

/** Build your own stack (private bus, other exit time) for `Toaster({ toaster })`. */
export { toastLayer, toastApi };

/**
 * qrp's `notify` and global `bus`, re-exported from the bundle. On the CDN the
 * bundle carries its own copy of qrp's events/toasts modules (only the core is
 * shared), so `notify.*` / `bus.emit("error", …)` must come from here to reach
 * this Toaster. With a bundler both resolve to the same module either way.
 */
export { notify } from "@nemanjan00/qrp/toasts";
export { bus } from "@nemanjan00/qrp/events";

// qrp's default titles for bus toasts ("Success" …): a bus toast shows its
// content as the message, and only a custom title as the description.
const QRP_TITLES = ["Success", "Error", "Info", "Warning"];

/** What to show for a store item: ours carry title/description; bus ones title/content. */
const textOf = (item) => {
	if(item.layered) {
		return { title: item.untitled ? null : item.title, description: item.description };
	}

	return { title: item.content, description: QRP_TITLES.includes(item.title) ? null : item.title };
};

const svg = (shapes) => el("svg", {
	xmlns: "http://www.w3.org/2000/svg",
	viewBox: "0 0 24 24",
	fill: "none",
	stroke: "currentColor",
	"stroke-width": "2",
	"stroke-linecap": "round",
	"stroke-linejoin": "round",
	"aria-hidden": "true",
	class: "size-4"
}, ...shapes.map(([tag, attrs]) => el(tag, attrs)));

// lucide (ISC): circle-check, info, triangle-alert, octagon-x
const ICONS = {
	success: () => svg([["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "m16 9-5.5 5.5L8 12" }]]),
	info: () => svg([["circle", { cx: "12", cy: "12", r: "10" }], ["path", { d: "M12 16v-4" }], ["path", { d: "M12 8h.01" }]]),
	warning: () => svg([["path", { d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" }], ["path", { d: "M12 9v4" }], ["path", { d: "M12 17h.01" }]]),
	error: () => svg([["path", { d: "m15 9-6 6" }], ["path", { d: "M2.586 16.726A2 2 0 0 1 2 15.312V8.688a2 2 0 0 1 .586-1.414l4.688-4.688A2 2 0 0 1 8.688 2h6.624a2 2 0 0 1 1.414.586l4.688 4.688A2 2 0 0 1 22 8.688v6.624a2 2 0 0 1-.586 1.414l-4.688 4.688a2 2 0 0 1-1.414.586H8.688a2 2 0 0 1-1.414-.586z" }], ["path", { d: "m9 9 6 6" }]]),
	loading: () => Loader2Icon({ class: "size-4 animate-spin" })
};

const TOASTER = "fixed z-[999999999] m-0 box-border w-[356px] list-none p-0 outline-none data-[y-position=bottom]:bottom-(--offset) data-[y-position=top]:top-(--offset) data-[x-position=right]:right-(--offset) data-[x-position=left]:left-(--offset) data-[x-position=center]:left-1/2 data-[x-position=center]:-translate-x-1/2 max-[600px]:w-auto max-[600px]:data-[x-position]:left-4 max-[600px]:data-[x-position]:right-4 max-[600px]:data-[x-position=center]:translate-x-0";

const TOAST = [
	"group/toast absolute left-0 box-border flex w-full touch-none items-center gap-1.5 overflow-hidden rounded-(--border-radius) border border-(--normal-border) bg-(--normal-bg) p-4 text-[13px] text-(--normal-text) shadow-[0_4px_12px_#0000001a] outline-none select-none",
	"transition-[transform,opacity,height,box-shadow] duration-400 ease-out focus-visible:shadow-[0_4px_12px_#0000001a,0_0_0_2px_#0003]",
	"data-[y-position=bottom]:bottom-0 data-[y-position=top]:top-0",
	"after:absolute after:left-0 after:h-[15px] after:w-full after:content-[''] data-[y-position=bottom]:after:top-full data-[y-position=top]:after:bottom-full",
	"*:transition-opacity *:duration-400 data-[expanded=false]:data-[front=false]:*:opacity-0",
	"data-[rich=true]:data-[type=success]:border-[hsl(145,92%,87%)] data-[rich=true]:data-[type=success]:bg-[hsl(143,85%,96%)] data-[rich=true]:data-[type=success]:text-[hsl(140,100%,27%)]",
	"data-[rich=true]:data-[type=info]:border-[hsl(221,91%,93%)] data-[rich=true]:data-[type=info]:bg-[hsl(208,100%,97%)] data-[rich=true]:data-[type=info]:text-[hsl(210,92%,45%)]",
	"data-[rich=true]:data-[type=warning]:border-[hsl(49,91%,84%)] data-[rich=true]:data-[type=warning]:bg-[hsl(49,100%,97%)] data-[rich=true]:data-[type=warning]:text-[hsl(31,92%,45%)]",
	"data-[rich=true]:data-[type=error]:border-[hsl(359,100%,94%)] data-[rich=true]:data-[type=error]:bg-[hsl(359,100%,97%)] data-[rich=true]:data-[type=error]:text-[hsl(360,100%,45%)]",
	"dark:data-[rich=true]:data-[type=success]:border-[hsl(147,100%,12%)] dark:data-[rich=true]:data-[type=success]:bg-[hsl(150,100%,6%)] dark:data-[rich=true]:data-[type=success]:text-[hsl(150,86%,65%)]",
	"dark:data-[rich=true]:data-[type=info]:border-[hsl(223,43%,17%)] dark:data-[rich=true]:data-[type=info]:bg-[hsl(215,100%,6%)] dark:data-[rich=true]:data-[type=info]:text-[hsl(216,87%,65%)]",
	"dark:data-[rich=true]:data-[type=warning]:border-[hsl(60,100%,9%)] dark:data-[rich=true]:data-[type=warning]:bg-[hsl(64,100%,6%)] dark:data-[rich=true]:data-[type=warning]:text-[hsl(46,87%,65%)]",
	"dark:data-[rich=true]:data-[type=error]:border-[hsl(357,89%,16%)] dark:data-[rich=true]:data-[type=error]:bg-[hsl(358,76%,10%)] dark:data-[rich=true]:data-[type=error]:text-[hsl(358,100%,81%)]"
].join(" ");

const CLOSE = "absolute top-0 left-0 z-10 flex size-5 -translate-x-[35%] -translate-y-[35%] cursor-pointer items-center justify-center rounded-full border border-(--normal-border) bg-(--normal-bg) p-0 text-(--normal-text) transition-[opacity,background,border-color] hover:bg-(--normal-border) [&>svg]:size-3";
const ICON = "relative -ml-[3px] mr-1 flex size-4 shrink-0 items-center justify-start";
const BUTTON = "ml-auto flex h-6 shrink-0 cursor-pointer items-center rounded-[4px] border-none px-2 text-xs font-medium outline-none transition-opacity focus-visible:shadow-[0_0_0_2px_#0006]";
const ACTION = `${BUTTON} bg-(--normal-text) text-(--normal-bg)`;
const CANCEL = `${BUTTON} bg-black/[0.08] text-(--normal-text) dark:bg-white/30`;

const isRenderableObject = (value) => value instanceof Node;

/** Sonner's action/cancel: `{ label, onClick }`, or any node. */
const actionButton = (engine, toastItem, key, classes) => () => {
	const spec = toastItem[key];

	if(!spec) {
		return null;
	}

	if(isRenderableObject(spec)) {
		return spec;
	}

	return el("button", {
		type: "button",
		[`data-${key}`]: "",
		class: classes,
		onclick: (event) => {
			if(spec.onClick) {
				spec.onClick(event);
			}

			if(!event.defaultPrevented) {
				engine.dismiss(toastItem.id);
			}
		}
	}, read(spec.label));
};

const body = (engine, item, options) => {
	if(item.variant === "custom" && item.custom) {
		return [() => item.custom(item.id)];
	}

	const icon = () => {
		const custom = item.icon !== undefined ? read(item.icon) : null;
		const builtin = options.icons && options.icons[item.variant] ? options.icons[item.variant] : ICONS[item.variant];

		if(custom) {
			return el("div", { "data-icon": "", class: ICON }, custom);
		}

		return builtin ? el("div", { "data-icon": "", class: ICON }, typeof builtin === "function" ? builtin() : builtin.cloneNode(true)) : null;
	};

	const closeButton = () => {
		const wanted = item.closeButton !== undefined ? item.closeButton : read(options.closeButton);

		if(!wanted || item.dismissible === false) {
			return null;
		}

		return el("button", { type: "button", "aria-label": "Close toast", "data-close-button": "", class: CLOSE, onclick: () => engine.dismiss(item.id) }, XIcon());
	};

	return [
		closeButton,
		icon,
		el("div", { "data-content": "", class: "flex flex-col gap-0.5" },
			el("div", { "data-title": "", class: "leading-normal font-medium" }, () => read(textOf(item).title)),
			() => {
				const description = textOf(item).description;

				return description ? el("div", { "data-description": "", class: "leading-[1.4] font-normal opacity-80" }, read(description)) : null;
			}
		),
		actionButton(engine, item, "cancel", CANCEL),
		actionButton(engine, item, "action", ACTION)
	];
};

/**
 * Mount once. Every option except `toaster` may be a thunk.
 *
 * @param {object} [props]
 * @param {string} [props.position] "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right"
 * @param {boolean} [props.expand] always show the stack fanned out
 * @param {boolean} [props.richColors] tinted success/info/warning/error toasts
 * @param {boolean} [props.closeButton] an × on every toast
 * @param {number} [props.duration] default auto-dismiss in ms
 * @param {number} [props.visibleToasts] how many show at once (default 3)
 * @param {number} [props.gap] px between fanned-out toasts (default 14)
 * @param {string} [props.offset] distance from the viewport edge (default "32px")
 * @param {("light"|"dark"|"system")} [props.theme] "dark" forces dark colors
 * @param {object} [props.icons] `{ success, info, warning, error, loading }` overrides
 * @param {object} [props.toaster] a toastLayer() (default: the one toast() and notify use);
 *   its qrp controller's `exitMs` should match the 400ms exit transition
 * @returns {HTMLElement}
 */
export const Toaster = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["position", "expand", "richColors", "closeButton", "duration", "visibleToasts", "gap", "offset", "theme", "toaster", "class", "icons", "style"]);
	const engine = own.toaster || sonner;
	const position = own.position || "bottom-right";
	const [yPosition, xPosition] = position.split("-");
	const gap = own.gap === undefined ? GAP : own.gap;
	const visibleToasts = own.visibleToasts || VISIBLE_TOASTS;
	const lift = yPosition === "bottom" ? -1 : 1;
	const ui = state({ hovered: false, focused: false, heights: {} });
	const lastIndex = new Map();

	if(own.duration) {
		engine.configure({ duration: own.duration });
	}

	// Newest first (qrp appends, so read the live items back to front).
	const live = () => engine.items().filter((item) => !item.removed).reverse();
	const expanded = () => Boolean(read(own.expand)) || ui.hovered || ui.focused;
	const heightOf = (id) => ui.heights[id] || 0;

	const indexOf = (item) => {
		const index = live().indexOf(item);

		if(index !== -1) {
			lastIndex.set(item.id, index);

			return index;
		}

		return lastIndex.get(item.id) || 0;
	};

	// Distance from the edge when fanned out: the heights of the toasts in front
	// plus one gap per toast.
	const offsetOf = (index) => live().slice(0, index).reduce((sum, item) => sum + heightOf(item.id), 0) + index * gap;

	const styleOf = (item, mounted) => () => {
		const index = indexOf(item);
		const front = index === 0;
		const isExpanded = expanded();
		const ownHeight = heightOf(item.id);
		const frontItem = live()[0];
		const frontHeight = frontItem ? heightOf(frontItem.id) : ownHeight;
		const style = { zIndex: String(visibleToasts + 1 - index), opacity: "1", height: ownHeight ? `${ownHeight}px` : "" };

		if(!mounted.on) {
			return Object.assign(style, { transform: `translateY(${-lift * 100}%)`, opacity: "0" });
		}

		if(item.removed) {
			if(front) {
				return Object.assign(style, { transform: `translateY(${-lift * 100}%)`, opacity: "0" });
			}

			const transform = isExpanded ? `translateY(calc(${lift * offsetOf(index)}px + ${-lift * 100}%))` : `translateY(${-lift * 40}%)`;

			return Object.assign(style, { transform, opacity: "0" });
		}

		if(index >= visibleToasts) {
			style.opacity = "0";
		}

		if(isExpanded) {
			return Object.assign(style, { transform: `translateY(${lift * offsetOf(index)}px)` });
		}

		return Object.assign(style, {
			transform: `translateY(${lift * gap * index}px) scale(${1 - index * SCALE_STEP})`,
			height: front || !frontHeight ? style.height : `${frontHeight}px`
		});
	};

	const renderToast = (item) => {
		const mounted = state({ on: false });

		const node = el("li", {
			"data-sonner-toast": "",
			"data-slot": "sonner-toast",
			role: "status",
			tabindex: "0",
			"aria-live": "polite",
			"aria-atomic": "true",
			"data-type": () => item.variant,
			"data-rich": () => String(Boolean(read(own.richColors))),
			"data-y-position": yPosition,
			"data-x-position": xPosition,
			"data-front": () => String(indexOf(item) === 0),
			"data-expanded": () => String(expanded()),
			"data-mounted": () => String(mounted.on),
			"data-removed": () => String(Boolean(item.removed)),
			"data-visible": () => String(indexOf(item) < visibleToasts),
			class: cn(TOAST, item.class),
			style: styleOf(item, mounted)
		}, ...body(engine, item, { icons: own.icons, closeButton: own.closeButton }));

		const measure = () => {
			if(!node.isConnected) {
				return;
			}

			const previous = node.style.height;

			node.style.height = "auto";

			const height = node.getBoundingClientRect().height;

			node.style.height = previous;

			if(height && untracked(() => ui.heights[item.id]) !== height) {
				ui.heights[item.id] = height;
			}
		};

		// Measure after content changes (a promise toast swapping its message).
		effect(() => {
			read(textOf(item).title);
			read(textOf(item).description);
			item.variant;
			requestAnimationFrame(measure);
		});

		// Two frames: one to lay out off-screen, one to transition in.
		requestAnimationFrame(() => requestAnimationFrame(() => {
			measure();
			mounted.on = true;
		}));

		onDispose(() => {
			delete ui.heights[item.id];
			lastIndex.delete(item.id);
		});

		return node;
	};

	const pauseWhile = () => {
		if(ui.hovered || ui.focused || document.hidden) {
			engine.pause();
		} else {
			engine.resume();
		}
	};

	effect(() => {
		ui.hovered;
		ui.focused;
		untracked(pauseWhile);
	});

	// The stack can vanish under a resting pointer; don't stay "hovered".
	effect(() => {
		if(live().length === 0) {
			untracked(() => { ui.hovered = false; });
		}
	});

	const onVisibility = () => pauseWhile();

	document.addEventListener("visibilitychange", onVisibility);

	const stack = el("ol", {
		"data-sonner-toaster": "",
		"data-slot": "sonner-toaster",
		"data-y-position": yPosition,
		"data-x-position": xPosition,
		tabindex: "-1",
		class: TOASTER,
		onpointerenter: () => { ui.hovered = true; },
		onpointerleave: () => { ui.hovered = false; },
		onfocusin: () => { ui.focused = true; },
		onfocusout: (event) => {
			if(!stack.contains(event.relatedTarget)) {
				ui.focused = false;
			}
		}
	}, list(() => engine.items(), (item) => item.id, renderToast));

	// sonner's hotkey: Alt+T jumps to the notifications.
	const onKey = (event) => {
		if(event.altKey && event.code === "KeyT" && live().length > 0) {
			stack.focus();
			ui.focused = true;
		}
	};

	document.addEventListener("keydown", onKey);

	onDispose(() => {
		document.removeEventListener("visibilitychange", onVisibility);
		document.removeEventListener("keydown", onKey);
	});

	return el("section", Object.assign({
		"aria-label": "Notifications alt+T",
		"aria-live": "polite",
		"aria-relevant": "additions text",
		"aria-atomic": "false",
		"data-slot": "sonner",
		// Modals leave this region usable: a toast fired from a dialog must be
		// clickable and announced (utils/layer.js hideOthers).
		"data-qs-keep": "",
		class: cn("toaster group", own.theme === "dark" ? "dark" : null, own.class),
		// A string: custom properties don't survive Object.assign onto node.style.
		style: [
			"--normal-bg: var(--popover)",
			"--normal-text: var(--popover-foreground)",
			"--normal-border: var(--border)",
			"--border-radius: var(--radius)",
			`--offset: ${typeof own.offset === "number" ? `${own.offset}px` : own.offset || OFFSET}`,
			own.style || ""
		].filter(Boolean).join("; ")
	}, rest), stack);
};

/**
 * utils/toaster.js — sonner's API over qrp's `toasts` controller.
 *
 * qrp's `createToasts()` owns the toasts: the reactive `store.items`, ids and
 * update-in-place (`push` with `meta.id`), per-toast `duration` countdowns,
 * `pause`/`resume`, the exit phase (`exitMs`: an item is `removed: true` while
 * it animates out) and the event-bus wiring (`notify.success("…")`). This layer
 * only maps sonner's semantics onto it:
 *
 * - its own `toast-N` ids (sonner never dedupes; qrp dedupes id-less strings)
 * - a configurable default duration, sticky `loading`
 * - `limit` (oldest live toasts leave first)
 * - sonner's `onDismiss` / `onAutoClose` callbacks
 * - bus toasts (`notify.*`) get the same default duration
 */

import { effect, batch, untracked } from "@nemanjan00/qrp";

const DEFAULT_DURATION = 4000;

/**
 * Wrap a qrp toasts controller. Create it with `timeout: 0` (this layer sets
 * each toast's duration) and the `exitMs` your exit animation takes.
 *
 * @param {object} controller a qrp createToasts() controller
 * @param {object} [options]
 * @param {number} [options.duration] default auto-dismiss in ms (Infinity = sticky)
 * @param {number} [options.limit] keep at most this many live toasts (oldest go)
 * @returns {object} `{ controller, items, add, update, dismiss, pause, resume, configure, config }`
 */
export const toastLayer = (controller, options = {}) => {
	const config = {
		duration: options.duration || DEFAULT_DURATION,
		limit: options.limit || Infinity
	};
	const store = controller.store;
	const manual = new Set();
	const closed = new Set();
	const timed = new Set();
	let counter = 0;

	const items = () => store.items;
	const find = (id) => untracked(() => store.items.find((item) => item.id === id));
	const live = () => untracked(() => store.items.filter((item) => !item.removed));

	const durationOf = (data) => {
		if(data.duration !== undefined && data.duration !== null) {
			return data.duration;
		}

		return data.variant === "loading" ? Infinity : config.duration;
	};

	/**
	 * Dismiss one toast, or every live one. Runs sonner's `onDismiss`.
	 *
	 * @param {string|number} [id]
	 */
	const dismiss = (id) => {
		const targets = id === undefined ? live() : live().filter((item) => item.id === id);

		batch(() => targets.forEach((item) => {
			manual.add(item.id);

			if(item.onDismiss) {
				item.onDismiss(item);
			}

			controller.dismiss(item.id);
		}));
	};

	const enforceLimit = () => {
		const current = live();

		current.slice(0, Math.max(0, current.length - config.limit)).forEach((item) => dismiss(item.id));
	};

	/**
	 * Show a toast, or update the live one with the same `id`.
	 *
	 * @param {object} data `{ id, variant, title, description, action, cancel, icon, duration, … }`
	 * @returns {string|number} the toast id
	 */
	const add = (data) => {
		const existing = data.id !== undefined ? find(data.id) : null;

		counter += existing ? 0 : 1;

		const id = data.id !== undefined ? data.id : `toast-${counter}`;
		const variant = data.variant || (existing ? existing.variant : "default");
		const meta = Object.assign({}, data, { id, layered: true, duration: durationOf(Object.assign({}, data, { variant })) });

		// qrp titles an untitled toast with its variant name ("loading"); sonner
		// shows nothing, so renderers check `untitled`.
		if(!existing || "title" in data) {
			meta.untitled = data.title === undefined || data.title === null || data.title === "";
		}

		delete meta.variant;
		manual.delete(id);
		closed.delete(id);

		// `content` mirrors the description, so qrp's stock component shows it too.
		controller.push(variant, data.description !== undefined ? data.description : (existing ? existing.content : ""), meta);
		untracked(enforceLimit);

		return id;
	};

	// Toasts qrp pushed from the bus get this layer's default duration once, and
	// a toast that leaves without dismiss() (its countdown ran out) fires
	// sonner's onAutoClose.
	effect(() => {
		const current = store.items;

		// Track each item's exit flag: qrp flips it in place when a countdown ends.
		current.forEach((item) => item.removed);

		untracked(() => {
			current.filter((item) => !item.layered && !timed.has(item.id)).forEach((item) => {
				timed.add(item.id);
				controller.update(item.id, { duration: config.duration });
			});

			current.filter((item) => item.removed && !manual.has(item.id) && !closed.has(item.id)).forEach((item) => {
				closed.add(item.id);

				if(item.onAutoClose) {
					item.onAutoClose(item);
				}
			});
		});
	});

	return {
		controller,
		items,
		add,
		update: (id, data) => add(Object.assign({}, data, { id })),
		dismiss,
		/** Freeze every countdown (pointer over the stack, tab hidden). */
		pause: () => controller.pause(),
		resume: () => controller.resume(),
		/** `{ duration, limit }` — the exit time is the controller's `exitMs`. */
		configure: (next) => Object.assign(config, next),
		config
	};
};

/**
 * Bind sonner's `toast()` API to a layer.
 *
 * @param {object} layer a toastLayer()
 * @returns {Function} toast(message, options) with .success/.error/… helpers
 */
export const toastApi = (layer) => {
	const show = (variant) => (message, options = {}) => layer.add(Object.assign({}, options, { variant, title: message }));

	const toast = show("default");

	toast.message = show("default");
	toast.success = show("success");
	toast.error = show("error");
	toast.info = show("info");
	toast.warning = show("warning");
	toast.loading = show("loading");

	/** `toast.custom((id) => node, options)` — render the whole toast yourself. */
	toast.custom = (render, options = {}) => layer.add(Object.assign({}, options, { variant: "custom", custom: render }));

	/**
	 * `toast.promise(promise, { loading, success, error, description, finally })`;
	 * success/error may be functions of the result/error. Returns the id.
	 */
	toast.promise = (promise, messages = {}) => {
		const pending = typeof promise === "function" ? promise() : promise;
		const id = layer.add({ variant: "loading", title: messages.loading, description: messages.description });
		const resolve = (message, value) => (typeof message === "function" ? message(value) : message);
		const settle = (variant, message, value) => {
			if(message === undefined) {
				layer.dismiss(id);
				return;
			}

			layer.update(id, { variant, title: resolve(message, value) });
		};

		Promise.resolve(pending)
			.then((value) => settle("success", messages.success, value), (error) => settle("error", messages.error, error))
			.finally(() => {
				if(messages.finally) {
					messages.finally();
				}
			});

		return id;
	};

	toast.dismiss = (id) => layer.dismiss(id);
	toast.getToasts = () => untracked(() => layer.items().filter((item) => !item.removed));

	return toast;
};

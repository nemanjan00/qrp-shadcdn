/**
 * utils/toaster.js — sonner's behavior on top of qrp's `toasts` store.
 *
 * qrp's `createToasts()` owns the reactive `store.items`, the event-bus wiring
 * (`notify.success("…")` / `bus.emit("error", …)`), message dedupe and
 * `dismiss(id)`. This layer adds what sonner needs and qrp's controller doesn't
 * expose yet (see the qrp gaps in the README / TODO):
 *
 * - ids you choose + update-in-place (`toast.promise`, `toast.loading` → success)
 * - per-toast meta: description, action, cancel, icon, duration
 * - countdowns that pause (hover, hidden tab), sticky `loading`
 * - an exit phase: `removed: true` for `exitMs` before qrp's dismiss() drops it
 *
 * Toasts pushed by qrp itself (from the bus) get the same countdown and exit.
 */

import { state, effect, batch, untracked } from "@nemanjan00/qrp";

const DEFAULT_DURATION = 4000;
const DEFAULT_EXIT_MS = 400;

const now = () => Date.now();

/**
 * Wrap a qrp toasts controller (`createToasts({ timeout: 0 })` — this layer
 * runs the timers).
 *
 * @param {object} controller a qrp createToasts() controller
 * @param {object} [options]
 * @param {number} [options.duration] default auto-dismiss in ms (Infinity = sticky)
 * @param {number} [options.exitMs] how long a dismissed toast stays for its exit
 * @param {number} [options.limit] keep at most this many live toasts (oldest go)
 * @returns {object} `{ controller, items, add, update, dismiss, pause, resume, configure }`
 */
export const toastLayer = (controller, options = {}) => {
	const config = {
		duration: options.duration || DEFAULT_DURATION,
		exitMs: options.exitMs === undefined ? DEFAULT_EXIT_MS : options.exitMs,
		limit: options.limit || Infinity
	};
	const store = controller.store;
	const status = state({ paused: false });
	const timers = new Map();
	const scheduled = new Set();
	let counter = 0;

	const items = () => store.items;
	const find = (id) => untracked(() => store.items.find((item) => item.id === id));

	const clearTimer = (id) => {
		const timer = timers.get(id);

		if(timer) {
			clearTimeout(timer.handle);
			timers.delete(id);
		}
	};

	const dismiss = (id) => {
		const targets = untracked(() => store.items.filter((item) => !item.removed && (id === undefined || item.id === id)));

		batch(() => targets.forEach((item) => {
			clearTimer(item.id);
			item.removed = true;

			if(item.onDismiss) {
				item.onDismiss(item);
			}

			setTimeout(() => {
				const current = find(item.id);

				// Re-shown under the same id during its exit: keep it.
				if(current && current.removed) {
					scheduled.delete(item.id);
					controller.dismiss(item.id);
				}
			}, config.exitMs);
		}));
	};

	const durationOf = (item) => {
		if(item.duration !== undefined && item.duration !== null) {
			return item.duration;
		}

		return item.variant === "loading" ? Infinity : config.duration;
	};

	const schedule = (item) => {
		const remaining = durationOf(item);

		clearTimer(item.id);

		// Infinity (or a non-positive duration) means sticky: no countdown.
		if(!Number.isFinite(remaining) || remaining <= 0) {
			return;
		}

		const timer = { remaining, started: now(), handle: null };

		timer.start = () => {
			timer.started = now();
			timer.handle = setTimeout(() => {
				timers.delete(item.id);

				const current = find(item.id);

				if(current && current.onAutoClose) {
					current.onAutoClose(current);
				}

				dismiss(item.id);
			}, timer.remaining);
		};

		timers.set(item.id, timer);

		if(!untracked(() => status.paused)) {
			timer.start();
		}
	};

	const enforceLimit = () => {
		const live = untracked(() => store.items.filter((item) => !item.removed));

		live.slice(0, Math.max(0, live.length - config.limit)).forEach((item) => dismiss(item.id));
	};

	// Every toast that appears — ours, or one qrp pushed from the bus — gets a
	// countdown once.
	effect(() => {
		const fresh = store.items.filter((item) => !scheduled.has(item.id));

		untracked(() => fresh.forEach((item) => {
			scheduled.add(item.id);
			schedule(item);
		}));

		if(fresh.length > 0) {
			untracked(enforceLimit);
		}
	});

	/**
	 * Show a toast, or update the live one with the same `id`.
	 *
	 * @param {object} data `{ id, variant, title, description, action, cancel, icon, duration, … }`
	 * @returns {string|number} the toast id
	 */
	const add = (data) => {
		const existing = data.id !== undefined ? find(data.id) : null;

		if(existing) {
			batch(() => {
				Object.assign(existing, data, { removed: false });
			});
			schedule(existing);

			return existing.id;
		}

		counter += 1;

		const id = data.id !== undefined ? data.id : `toast-${counter}`;

		// qrp items are { id, variant, title, content }; `content` mirrors the
		// description so qrp's own toast component would still show it.
		store.items = [...untracked(() => store.items), Object.assign({ variant: "default", content: data.description || "" }, data, {
			id,
			layered: true,
			removed: false,
			createdAt: now()
		})];

		return id;
	};

	/** Freeze every countdown (pointer over the stack, tab hidden). */
	const pause = () => {
		if(untracked(() => status.paused)) {
			return;
		}

		status.paused = true;
		timers.forEach((timer) => {
			clearTimeout(timer.handle);
			timer.remaining -= now() - timer.started;
		});
	};

	const resume = () => {
		if(!untracked(() => status.paused)) {
			return;
		}

		status.paused = false;
		timers.forEach((timer) => timer.start());
	};

	return {
		controller,
		items,
		add,
		update: (id, data) => add(Object.assign({}, data, { id })),
		dismiss,
		pause,
		resume,
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

			layer.update(id, { variant, title: resolve(message, value), duration: undefined });
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

/**
 * utils/index.js — the small machinery every component sits on.
 *
 * - `cn`        clsx-style class joiner (strings, arrays, `{ cls: bool }`), with
 *               qrp thunks: any function input makes the result a reactive thunk.
 *               Conflicts resolve last-wins (`cn("h-9", "h-8")` → "h-8").
 * - `variants`  the `cva` equivalent: base + variant maps + defaults → classes.
 * - `parseArgs` the `(props?, ...children)` calling convention of every component.
 * - `part`      factory for the many "styled element with a data-slot" parts.
 * - `controllable` open/value state that is internal, bound to a state key, or
 *               driven by a thunk — the qrp take on React's controlled props.
 */

import { el, state, effect, renderable } from "@nemanjan00/qrp";
import { mergeClasses } from "./merge.js";

export { mergeClasses };

let classMerge = mergeClasses;

/**
 * Replace the class-conflict resolver. The built-in one (utils/merge.js) lets a
 * caller's `class` beat a component default for the common utilities; pass
 * tailwind-merge's `twMerge` for full fidelity, or null to restore the built-in.
 *
 * @param {Function|null} fn (classString) => classString, null to reset
 */
export const setClassMerge = (fn) => {
	classMerge = fn || mergeClasses;
};

const hasThunk = (input) => {
	if(typeof input === "function") {
		return true;
	}

	if(Array.isArray(input)) {
		return input.some(hasThunk);
	}

	return false;
};

const flatten = (input) => {
	if(!input) {
		return [];
	}

	if(typeof input === "function") {
		return flatten(input());
	}

	if(Array.isArray(input)) {
		return input.flatMap(flatten);
	}

	if(typeof input === "object") {
		return Object.keys(input).filter((key) => input[key]);
	}

	return [String(input)];
};

const joinClasses = (inputs) => classMerge(flatten(inputs).join(" ").trim().replace(/\s+/g, " "));

/**
 * Join class inputs like clsx. If any input is a function (a qrp thunk), the
 * result is a thunk too, so `el()` binds it reactively.
 *
 * @param {...*} inputs strings, arrays, `{ cls: bool }` objects, thunks
 * @returns {string|Function}
 */
export const cn = (...inputs) => {
	if(hasThunk(inputs)) {
		return () => joinClasses(inputs);
	}

	return joinClasses(inputs);
};

/**
 * Read a value that may be a thunk.
 *
 * @param {*} value
 * @returns {*}
 */
export const read = (value) => (typeof value === "function" ? value() : value);

/**
 * Class-variance builder (the `cva` equivalent).
 *
 * @param {string} base classes always applied
 * @param {object} [config]
 * @param {object} [config.variants] `{ variant: { default: "…", outline: "…" } }`
 * @param {object} [config.defaultVariants] `{ variant: "default" }`
 * @param {object[]} [config.compoundVariants] `[{ variant: "x", size: "y", class: "…" }]`
 * @returns {Function} (props) => class string, or a thunk when a prop is a thunk
 */
export const variants = (base, config = {}) => {
	const variantMap = config.variants || {};
	const defaults = config.defaultVariants || {};
	const compounds = config.compoundVariants || [];

	const selected = (props) => Object.keys(variantMap).reduce((acc, name) => {
		const value = read(props[name]);

		acc[name] = value === undefined || value === null ? defaults[name] : value;

		return acc;
	}, {});

	const compute = (props) => {
		const choice = selected(props);

		const variantClasses = Object.keys(variantMap).map((name) => variantMap[name][choice[name]]);

		const compoundClasses = compounds
			.filter((compound) => Object.keys(compound)
				.filter((key) => key !== "class")
				.every((key) => choice[key] === compound[key]))
			.map((compound) => compound.class);

		return joinClasses([base, variantClasses, compoundClasses, read(props.class)]);
	};

	return (props = {}) => {
		const reactive = Object.keys(variantMap).some((name) => typeof props[name] === "function") ||
			typeof props.class === "function";

		if(reactive) {
			return () => compute(props);
		}

		return compute(props);
	};
};

const isProps = (value) => {
	if(!value || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}

	if(value instanceof Node || value[renderable]) {
		return false;
	}

	const proto = Object.getPrototypeOf(value);

	return proto === Object.prototype || proto === null;
};

/**
 * Split a component call into props and children. Every component accepts
 * `Comp(props, ...children)` and the props-less shorthand `Comp(...children)`.
 * `className` is accepted as an alias of `class` for copy-paste from shadcn.
 *
 * @param {Array} args the component's arguments
 * @returns {{ props: object, children: Array }}
 */
export const parseArgs = (args) => {
	if(!isProps(args[0])) {
		return { props: {}, children: args };
	}

	const props = Object.assign({}, args[0]);

	if(props.className !== undefined) {
		props.class = cn(props.class, props.className);
		delete props.className;
	}

	return { props, children: args.slice(1) };
};

/**
 * Remove keys from props, returning [picked, rest]. Undefined values are
 * dropped from `rest` so they never reach `el()` as the string "undefined".
 *
 * @param {object} props
 * @param {string[]} keys keys owned by the component
 * @returns {[object, object]}
 */
export const pick = (props, keys) => {
	const picked = {};
	const rest = {};

	Object.keys(props).forEach((key) => {
		if(keys.includes(key)) {
			picked[key] = props[key];
		} else if(props[key] !== undefined) {
			rest[key] = props[key];
		}
	});

	return [picked, rest];
};

/**
 * Build a styled element: `data-slot`, base classes merged with the caller's
 * `class`, every other prop passed straight to `el()`. The `as` prop swaps the
 * tag (the stand-in for shadcn's `asChild`): `Button({ as: "a", href })`.
 *
 * @param {string} tag default tag
 * @param {string} slot data-slot value
 * @param {string|Function} base base classes, or a variants() function fed the props
 * @param {object} [options]
 * @param {string[]} [options.own] props consumed by `base` (not forwarded to el)
 * @param {object} [options.attrs] extra fixed attributes (role, aria-*)
 * @param {Function} [options.data] (ownProps) => extra data-* attributes
 * @returns {Function} component (props?, ...children) => HTMLElement
 */
export const part = (tag, slot, base, options = {}) => (...args) => {
	const parsed = parseArgs(args);
	const [own, rest] = pick(parsed.props, ["as", "class"].concat(options.own || []));
	const classes = typeof base === "function" ? base(own) : cn(base, own.class);
	const data = options.data ? options.data(own) : {};

	return el(own.as || tag, Object.assign({ "data-slot": slot }, options.attrs, data, rest, { class: classes }), ...parsed.children);
};

/**
 * Open/value state for a component that may be uncontrolled, bound, or driven.
 *
 * - `undefined` / plain value → internal state seeded with it (or `fallback`)
 * - `[obj, key]` tuple        → two-way bound to a reactive state key
 * - thunk                     → read from the thunk; writes go to `onChange` only
 *
 * @param {*} source the prop value (`open`, `value`, …)
 * @param {*} fallback initial value when uncontrolled
 * @param {Function} [onChange] called with each new value
 * @returns {{ get: Function, set: Function }}
 */
export const controllable = (source, fallback, onChange) => {
	const notify = (value) => {
		if(onChange) {
			onChange(value);
		}
	};

	if(Array.isArray(source) && source.length === 2 && typeof source[1] === "string") {
		const [obj, key] = source;

		return {
			get: () => obj[key],
			set: (value) => {
				if(obj[key] !== value) {
					obj[key] = value;
					notify(value);
				}
			}
		};
	}

	if(typeof source === "function") {
		return {
			get: source,
			set: (value) => {
				if(source() !== value) {
					notify(value);
				}
			}
		};
	}

	const local = state({ value: source === undefined ? fallback : source });

	return {
		get: () => local.value,
		set: (value) => {
			if(local.value !== value) {
				local.value = value;
				notify(value);
			}
		}
	};
};

let counter = 0;

/**
 * A document-unique id for aria wiring.
 *
 * @param {string} [prefix]
 * @returns {string}
 */
export const uid = (prefix = "qs") => {
	counter += 1;

	return `${prefix}-${counter}`;
};

/**
 * Elements under `root` with the given data-slot that belong to THIS root —
 * not to a nested instance of the same component.
 *
 * @param {Element} root
 * @param {string} slot data-slot to find
 * @param {string} rootSlot data-slot of the owning component
 * @returns {Element[]}
 */
export const owned = (root, slot, rootSlot) => [...root.querySelectorAll(`[data-slot="${slot}"]`)]
	.filter((node) => node.parentElement && node.parentElement.closest(`[data-slot="${rootSlot}"]`) === root);

/**
 * Run `sync` now and whenever the subtree of `root` gains or loses nodes, so
 * items added later through list()/when() pick up their state attributes.
 *
 * @param {Element} root
 * @param {Function} sync
 * @returns {Function} disconnect
 */
export const watchTree = (root, sync) => {
	sync();

	if(typeof MutationObserver === "undefined") {
		return () => {};
	}

	const observer = new MutationObserver(() => sync());

	observer.observe(root, { childList: true, subtree: true });

	return () => observer.disconnect();
};

/**
 * Wait for a closing animation (tw-animate `animate-out`) before removal. Resolves
 * on animationend, or right away when the node has no running animation.
 *
 * @param {Element} node
 * @returns {Promise<void>}
 */
export const animateOut = (node) => new Promise((resolve) => {
	const style = typeof getComputedStyle === "function" ? getComputedStyle(node) : null;
	const name = style ? style.animationName : "";
	const duration = style ? parseFloat(style.animationDuration) || 0 : 0;
	const delay = style ? parseFloat(style.animationDelay) || 0 : 0;

	if(!name || name === "none" || duration === 0) {
		resolve();
		return;
	}

	let done = false;
	const finish = (event) => {
		// animationend bubbles: a child's animation (a spinner) is not ours.
		if(event && event.target !== node) {
			return;
		}

		if(!done) {
			done = true;
			node.removeEventListener("animationend", finish);
			resolve();
		}
	};

	node.addEventListener("animationend", finish);
	// Safety net: a missed animationend must never leave a dead overlay behind.
	setTimeout(() => finish(), (duration + delay) * 1000 + 50);
});

/**
 * Apply el()-style props to an EXISTING element (the `asChild` merge): `on*`
 * handlers are added, `class` is appended, thunks bind reactively, anything
 * else becomes an attribute.
 *
 * @param {Element} node
 * @param {object} props
 * @returns {Element} node
 */
export const applyProps = (node, props) => {
	Object.keys(props).forEach((key) => {
		const value = props[key];

		if(value === undefined) {
			return;
		}

		if(key.startsWith("on") && typeof value === "function") {
			node.addEventListener(key.slice(2).toLowerCase(), value);
			return;
		}

		if(key === "class") {
			let previous = [];
			const apply = (classes) => {
				const next = flatten(classes).join(" ").split(/\s+/).filter(Boolean);

				node.classList.remove(...previous.filter((cls) => !next.includes(cls)));
				node.classList.add(...next);
				previous = next;
			};

			if(typeof value === "function") {
				effect(() => apply(value()));
			} else {
				apply(value);
			}
			return;
		}

		const setAttribute = (next) => {
			if(next === null || next === false || next === undefined) {
				node.removeAttribute(key);
			} else {
				node.setAttribute(key, next === true ? "" : next);
			}
		};

		if(typeof value === "function") {
			effect(() => setAttribute(value()));
		} else {
			setAttribute(value);
		}
	});

	return node;
};

/**
 * Factory for parts that wire behavior onto a child — triggers and close
 * buttons. With a single element child the child itself is marked and returned
 * (shadcn's `asChild`, the default here): `DialogTrigger(Button("Open"))` gives
 * back that Button. Otherwise the children are wrapped in `tag`.
 *
 * The role is stored in `data-qs-role` so the child keeps its own `data-slot`.
 *
 * @param {string} role e.g. "dialog-trigger"
 * @param {string} [tag] wrapper tag (default "button")
 * @param {string} [base] wrapper classes
 * @returns {Function} (props?, ...children) => Element
 */
export const roleMarker = (role, tag = "button", base = "") => (...args) => {
	const { props, children } = parseArgs(args);
	const only = children.length === 1 && children[0] instanceof Element ? children[0] : null;

	if(only) {
		applyProps(only, props);
		only.setAttribute("data-qs-role", role);

		return only;
	}

	const [own, rest] = pick(props, ["class", "as"]);
	const wrapperTag = own.as || tag;
	const defaults = wrapperTag === "button" ? { type: "button" } : {};

	return el(wrapperTag, Object.assign(defaults, { "data-slot": role, "data-qs-role": role }, rest, {
		class: cn(base, own.class)
	}), ...children);
};

/**
 * Elements carrying a role marker, the root included.
 *
 * @param {ParentNode} root
 * @param {string} role
 * @returns {Element[]}
 */
export const withRole = (root, role) => {
	const found = [...root.querySelectorAll(`[data-qs-role="${role}"]`)];

	if(root instanceof Element && root.getAttribute("data-qs-role") === role) {
		found.unshift(root);
	}

	return found;
};

/**
 * Render children into a DocumentFragment through qrp's normalizer, so markers
 * (list/when), arrays and thunks all work.
 *
 * @param {Array} children
 * @returns {DocumentFragment}
 */
export const fragmentOf = (children) => {
	const fragment = document.createDocumentFragment();

	fragment.append(...el("div", {}, ...children).childNodes);

	return fragment;
};

/**
 * Render children into a fragment and pull out the top-level node with `slot`
 * (the detached content of an overlay).
 *
 * @param {Array} children
 * @param {string} slot data-slot of the content part
 * @returns {{ fragment: DocumentFragment, content: Element|null }}
 */
export const splitContent = (children, slot) => {
	const fragment = fragmentOf(children);
	const content = [...fragment.children].find((node) => node.getAttribute("data-slot") === slot) || null;

	if(content) {
		content.remove();
	}

	return { fragment, content };
};

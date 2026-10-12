/**
 * components/form.js — Form: shadcn's form parts over a qrp reactive object
 * instead of react-hook-form.
 *
 *   const form = useForm({
 *     values: { username: "" },
 *     schema: { username: { required: true, min: 2, message: "Username must be at least 2 characters." } }
 *   });
 *
 *   Form({ form, onSubmit: (values) => save(values) },
 *     FormField({ form, name: "username", render: (field) => FormItem(
 *       FormLabel("Username"),
 *       FormControl(Input(Object.assign({ placeholder: "shadcn" }, field))),
 *       FormDescription("This is your public display name."),
 *       FormMessage()
 *     ) }),
 *     Button({ type: "submit" }, "Submit"))
 *
 * - `useForm({ values, schema, validate, revalidate })` → `{ values, errors,
 *   submitted, submitting, valid(), check(), reset(), setError() }`. `values`
 *   and `errors` are reactive (`errors.username` is the message, or undefined).
 * - `schema` is a qrp `validate` schema (required/type/min/max/pattern/check/
 *   message); `validate(values)` may instead return `{ field: message }`. Both
 *   may be given. Fields re-validate as you type once a submit was attempted.
 * - `render(field, api)` gets `field` = `{ name, bind }`, ready to
 *   spread into Input/Textarea, and `api` = `{ value(), set(v), error() }` for
 *   custom controls (a Switch, a Select).
 * - FormItem gives its parts linked ids: FormLabel `for`, FormControl `id`,
 *   `aria-describedby` and `aria-invalid`, FormMessage shows the error.
 * - `onSubmit(values, event)` runs only when valid; return a promise to keep
 *   `form.submitting` true until it settles. Values are coerced by the schema
 *   ("5" → 5 for `type: "number"`).
 *
 * Declarative, on qrp's forms registry (`@nemanjan00/qrp/forms`):
 *
 * - `FormField({ form, name, type: "email", label, description, ...attrs })`
 *   builds the control from the registry (qrp's `getInput(type)`), so custom
 *   `registerInput()` types work here too.
 * - `FormFields({ form, fields })` — qrp's `{ key: { name, type, description,
 *   options, ...attrs } }` field map rendered as shadcn FormItems.
 * - `registerShadcnInputs()` swaps shadcn-styled factories into qrp's registry
 *   (text/email/password/number/url/tel/search/date/time/textarea/select/
 *   checkbox/radio), so plain qrp `form()` / `field()` get the shadcn controls.
 * https://ui.shadcn.com/docs/components/form
 */

import { el, state, effect, batch, untracked } from "@nemanjan00/qrp";
import { validate as validateSchema } from "@nemanjan00/qrp/utils/validate";
import { registerInput, getInput } from "@nemanjan00/qrp/forms";
import { part, parseArgs, pick, cn, uid, applyProps } from "../utils/index.js";
import { Label } from "./label.js";
import { Input } from "./input.js";
import { Textarea } from "./textarea.js";

const snapshot = (values) => JSON.parse(JSON.stringify(values));

/**
 * Create a form controller.
 *
 * @param {object} options
 * @param {object} options.values initial values (made reactive) or a state() object
 * @param {object} [options.schema] qrp validate schema
 * @param {Function} [options.validate] (values) => ({ field: message } | null)
 * @param {("submit"|"change")} [options.revalidate] when to re-check: after the
 *   first submit (default "submit") or from the first keystroke ("change")
 * @returns {object} form controller
 */
export const useForm = (options = {}) => {
	const values = state(options.values || {});
	const initial = snapshot(values);
	const errors = state({});
	const status = state({ submitted: false, submitting: false });

	const run = () => {
		const found = {};
		let coerced = snapshot(values);

		if(options.schema) {
			const result = validateSchema(options.schema, coerced);

			result.errors.forEach((error) => {
				const key = error.path.split(".")[0];

				if(!found[key]) {
					found[key] = error.message;
				}
			});
			coerced = result.value;
		}

		if(options.validate) {
			const custom = options.validate(coerced) || {};

			Object.keys(custom).filter((key) => custom[key] && !found[key]).forEach((key) => {
				found[key] = custom[key];
			});
		}

		return { found, coerced };
	};

	const apply = (found) => batch(() => {
		Object.keys(untracked(() => Object.assign({}, errors))).filter((key) => !found[key]).forEach((key) => {
			delete errors[key];
		});
		Object.keys(found).forEach((key) => {
			if(errors[key] !== found[key]) {
				errors[key] = found[key];
			}
		});
	});

	const form = {
		values,
		errors,
		get submitted() {
			return status.submitted;
		},
		get submitting() {
			return status.submitting;
		},

		/** Validate now and publish the errors; returns the coerced values or null. */
		check: () => {
			const { found, coerced } = run();

			apply(found);

			return Object.keys(found).length === 0 ? coerced : null;
		},

		valid: () => Object.keys(errors).length === 0,

		setError: (name, message) => {
			errors[name] = message;
		},

		reset: (next) => batch(() => {
			const fresh = next || initial;

			Object.keys(untracked(() => Object.assign({}, values))).forEach((key) => {
				delete values[key];
			});
			Object.assign(values, snapshot(fresh));
			apply({});
			status.submitted = false;
		}),

		/** Wrap a submit handler: prevents default, validates, tracks pending. */
		handleSubmit: (onSubmit) => (event) => {
			if(event && event.preventDefault) {
				event.preventDefault();
			}

			status.submitted = true;

			const coerced = form.check();

			if(!coerced || !onSubmit) {
				return Promise.resolve(false);
			}

			status.submitting = true;

			return Promise.resolve()
				.then(() => onSubmit(coerced, event))
				.then(() => true)
				.finally(() => {
					status.submitting = false;
				});
		}
	};

	// Live re-validation: after the first submit, or always with "change".
	effect(() => {
		JSON.stringify(values);

		const live = options.revalidate === "change" || status.submitted;

		if(live) {
			untracked(() => apply(run().found));
		}
	});

	return form;
};

/**
 * `Form({ form, onSubmit }, …)` — a `<form novalidate>` that validates first.
 */
export const Form = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["form", "onSubmit", "class"]);

	return el("form", Object.assign({ "data-slot": "form", novalidate: true }, rest, {
		class: own.class,
		onsubmit: own.form ? own.form.handleSubmit(own.onSubmit) : (event) => {
			if(own.onSubmit) {
				own.onSubmit(event);
			}
		}
	}), ...children);
};

// The field being rendered: FormField sets it while render() runs, so the parts
// built inside (all synchronous) can link their ids without prop drilling.
const fieldStack = [];

const currentField = (partName) => {
	const field = fieldStack[fieldStack.length - 1];

	if(!field) {
		throw new Error(`${partName} must be used inside FormField's render()`);
	}

	return field;
};

/**
 * One form field. Either `render: (field, api) => FormItem(…)` for full
 * control, or a qrp field spec (`type`, `label`/`name`, `description`,
 * `options`, native attrs) to get the standard FormItem with a registry control.
 *
 * @param {object} props
 * @param {object} props.form a useForm() controller
 * @param {string} props.name the values key
 * @param {Function} [props.render] (field, api) => Renderable
 * @returns {*} the rendered field
 */
export const FormField = (...args) => {
	const { props } = parseArgs(args);
	const form = props.form;
	const name = props.name;
	const id = uid(`form-${name}`);
	const context = {
		name,
		form,
		itemId: `${id}-item`,
		descriptionId: `${id}-description`,
		messageId: `${id}-message`,
		error: () => form.errors[name]
	};
	const field = {
		name,
		bind: [form.values, name]
	};
	const api = {
		value: () => form.values[name],
		set: (value) => {
			form.values[name] = value;
		},
		error: context.error
	};
	const render = props.render || ((_field) => standardItem(form, name, props));

	fieldStack.push(context);

	try {
		return render(field, api);
	} finally {
		fieldStack.pop();
	}
};

// Keys of a FormField spec that are not native attributes (qrp's META_KEYS plus
// ours), so the rest can pass through to the control like qrp's field() does.
const SPEC_KEYS = ["form", "name", "label", "description", "type", "input", "default", "options", "render", "class"];

const attrsOf = (spec) => Object.keys(spec)
	.filter((key) => !SPEC_KEYS.includes(key) && spec[key] !== undefined)
	.reduce((acc, key) => Object.assign(acc, { [key]: spec[key] }), {});

/** The control for a spec: its own `input` factory, else the registry's type, else text. */
const controlFor = (values, name, spec) => {
	const factory = typeof spec.input === "function" ? spec.input : getInput(spec.type || "text") || getInput("text");

	return factory(values, name, Object.assign({ name: undefined }, attrsOf(spec), { options: spec.options }));
};

const standardItem = (form, name, spec) => {
	const checkable = spec.type === "checkbox" || spec.type === "switch";
	const label = FormLabel(spec.label || spec.name || name);
	const control = FormControl(controlFor(form.values, name, spec));

	return FormItem({ class: cn(checkable ? "flex flex-row items-center gap-3" : null, spec.class) },
		checkable ? [control, label] : [label, control],
		spec.description ? FormDescription(spec.description) : null,
		FormMessage());
};

/**
 * `FormFields({ form, fields: { key: spec } })` — qrp's declarative field map,
 * rendered as shadcn FormItems in a vertical stack.
 */
export const FormFields = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["form", "fields", "class"]);
	const fields = own.fields || {};

	return el("div", Object.assign({ "data-slot": "form-fields" }, rest, { class: cn("grid gap-6", own.class) }),
		...Object.keys(fields).map((key) => FormField(Object.assign({}, fields[key], {
			form: own.form,
			name: key,
			label: fields[key].label || fields[key].name
		}))));
};

const INPUT_TYPES = ["text", "email", "password", "number", "url", "tel", "search", "date", "time", "datetime-local", "month", "week"];

const SELECT = "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:bg-input/30 dark:aria-invalid:ring-destructive/40";
const CHECK = "peer size-4 shrink-0 rounded-[4px] border border-input accent-primary shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive";
const RADIO = "aspect-square size-4 shrink-0 rounded-full border border-input accent-primary shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50";

let registered = false;

/**
 * Put shadcn-styled factories into qrp's input registry (once). The factories
 * keep qrp's contract — `(settings, key, spec) => Element`, two-way bound — so
 * qrp `form()` / `field()` and FormField all render the shadcn controls.
 *
 * @returns {void}
 */
export const registerShadcnInputs = () => {
	if(registered) {
		return;
	}

	registered = true;

	const original = {
		select: getInput("select"),
		checkbox: getInput("checkbox"),
		radio: getInput("radio")
	};

	INPUT_TYPES.forEach((type) => {
		registerInput(type, (settings, key, spec = {}) => Input(Object.assign({ type }, attrsOf(spec), { bind: [settings, key] })));
	});

	registerInput("textarea", (settings, key, spec = {}) => Textarea(Object.assign({}, attrsOf(spec), { bind: [settings, key] })));

	// Style qrp's own select/checkbox/radio controls rather than re-implement them.
	registerInput("select", (settings, key, spec = {}) => applyProps(original.select(settings, key, spec), { "data-slot": "native-select", class: SELECT }));
	registerInput("checkbox", (settings, key, spec = {}) => applyProps(original.checkbox(settings, key, spec), { "data-slot": "checkbox", class: CHECK }));
	registerInput("radio", (settings, key, spec = {}) => {
		const group = applyProps(original.radio(settings, key, spec), { "data-slot": "radio-group", role: "radiogroup", class: "grid gap-3" });

		group.querySelectorAll("label").forEach((label) => applyProps(label, { class: "flex items-center gap-3 text-sm" }));
		group.querySelectorAll("input").forEach((input) => applyProps(input, { class: RADIO }));

		return group;
	});
};

export const FormItem = part("div", "form-item", "grid gap-2");

export const FormLabel = (...args) => {
	const field = currentField("FormLabel");
	const { props, children } = parseArgs(args);

	return Label(Object.assign({}, props, {
		"data-slot": "form-label",
		"data-error": () => String(Boolean(field.error())),
		for: field.itemId,
		class: cn("data-[error=true]:text-destructive", props.class)
	}), ...children);
};

/**
 * `FormControl(control)` — wires the control's id and aria to the field.
 * With several children (or none) it wraps them in a div that gets the wiring.
 */
export const FormControl = (...args) => {
	const field = currentField("FormControl");
	const { props, children } = parseArgs(args);
	const only = children.length === 1 && children[0] instanceof Element ? children[0] : el("div", {}, ...children);

	return applyProps(only, Object.assign({}, props, {
		"data-slot": "form-control",
		id: field.itemId,
		"aria-describedby": () => (field.error() ? `${field.descriptionId} ${field.messageId}` : field.descriptionId),
		"aria-invalid": () => (field.error() ? "true" : "false")
	}));
};

export const FormDescription = (...args) => {
	const field = currentField("FormDescription");
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);

	return el("p", Object.assign({ "data-slot": "form-description", id: field.descriptionId }, rest, {
		class: cn("text-sm text-muted-foreground", own.class)
	}), ...children);
};

/** The field's error message (or its children when there is none); hidden when empty. */
export const FormMessage = (...args) => {
	const field = currentField("FormMessage");
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const message = () => field.error();

	return el("p", Object.assign({
		"data-slot": "form-message",
		id: field.messageId,
		hidden: () => !message() && children.length === 0
	}, rest, {
		class: cn("text-sm text-destructive", own.class)
	}), () => message() || children);
};

/**
 * components/prompt.js — promise-returning dialogs: the styled, non-blocking
 * stand-ins for `window.confirm()` / `window.prompt()`.
 *
 *   if(await confirmDialog({ title: "Delete tab?", destructive: true })) { … }
 *
 *   const values = await promptDialog({
 *     title: "Rename tab",
 *     fields: { name: { label: "Name", default: "main", required: true } },
 *     onSubmit: (values) => api.rename(values.name)   // a rejection keeps it open
 *   });                                                // null when cancelled
 *
 * Both are built on the same modal machinery as AlertDialog / Dialog (layer
 * stack, inert background, scroll lock, focus trap) and mount into <body> on
 * their own — no trigger, no host element. Focus returns to whatever had it
 * when the dialog opened; nodes and effects are released once the close
 * animation ends.
 */

import { el, state, scoped, untracked } from "@nemanjan00/qrp";
import { animateOut } from "../utils/index.js";
import {
	AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
	AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel
} from "./alert-dialog.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "./dialog.js";
import { Button } from "./button.js";
import { Spinner } from "./spinner.js";
import { useForm, Form, FormFields, registerShadcnInputs } from "./form.js";

const CHECKABLE = ["checkbox", "switch", "toggle"];

/**
 * Open a modal built by `build(open)` in a detached scope and settle once.
 * `build` returns the content node; the caller's `settle` closes the modal,
 * resolves the promise, and disposes everything after the exit animation.
 */
const openModal = (build) => new Promise((resolve) => {
	const open = state({ value: true });
	let settled = false;
	let content = null;
	let owner = null;

	const settle = (result) => {
		if(settled) {
			return;
		}

		settled = true;
		open.value = false;
		resolve(result);

		const release = () => owner && owner.dispose();

		(content ? animateOut(content) : Promise.resolve()).then(release, release);
	};

	// Detached: a dialog opened from inside an effect or a component must not
	// be torn down when that owner re-runs or unmounts.
	owner = untracked(() => scoped(() => {
		content = build(open, settle);
	}));
});

/**
 * Ask a yes/no question. Resolves `true` on confirm, `false` on cancel or
 * Escape. No outside-click dismissal (it's an AlertDialog).
 *
 * @param {object} [options]
 * @param {*} [options.title] heading (default "Are you sure?")
 * @param {*} [options.description] body text
 * @param {*} [options.confirmText] default "Continue"
 * @param {*} [options.cancelText] default "Cancel"
 * @param {boolean} [options.destructive] red confirm button
 * @returns {Promise<boolean>}
 */
export const confirmDialog = (options = {}) => openModal((open, settle) => {
	const content = AlertDialogContent(
		AlertDialogHeader(
			AlertDialogTitle(options.title == null ? "Are you sure?" : options.title),
			options.description == null ? null : AlertDialogDescription(options.description)),
		AlertDialogFooter(
			AlertDialogCancel({ onclick: () => settle(false) }, options.cancelText == null ? "Cancel" : options.cancelText),
			AlertDialogAction({
				variant: options.destructive ? "destructive" : "default",
				onclick: () => settle(true)
			}, options.confirmText == null ? "Continue" : options.confirmText)));

	AlertDialog({
		open: [open, "value"],
		onOpenChange: (isOpen) => {
			if(!isOpen) {
				settle(false);
			}
		}
	}, content);

	return content;
});

const initialValues = (fields) => Object.keys(fields).reduce((acc, key) => {
	const spec = fields[key] || {};
	const fallback = CHECKABLE.includes(spec.type) ? false : "";

	acc[key] = spec.default === undefined ? fallback : spec.default;

	return acc;
}, {});

const messageOf = (error) => {
	if(error && error.message) {
		return error.message;
	}

	return error == null ? "Something went wrong." : String(error);
};

/**
 * Ask for values with a form in a dialog. Resolves with the submitted values
 * (or whatever `onSubmit` resolves to, when not undefined), or `null` on
 * cancel / Escape / outside click / the close button.
 *
 * `onSubmit(values)` may return a promise: the submit button shows a spinner
 * and is disabled while it is pending, and a REJECTION keeps the dialog open
 * with the error's message shown above the buttons (server-side validation:
 * "name taken"). Field-level `schema` / `validate` errors show under each field
 * like any `useForm` form.
 *
 * @param {object} options
 * @param {*} [options.title]
 * @param {*} [options.description]
 * @param {object} options.fields qrp field map `{ key: { type, label, default, options, description, ...attrs } }`
 * @param {object} [options.values] initial values (override each field's `default`)
 * @param {object} [options.schema] qrp validate schema (see useForm)
 * @param {Function} [options.validate] (values) => ({ field: message } | null)
 * @param {Function} [options.onSubmit] (values) => result | Promise<result>
 * @param {*} [options.submitText] default "Save"
 * @param {*} [options.cancelText] default "Cancel"
 * @param {*} [options.class] extra classes for the dialog content
 * @returns {Promise<object|null>}
 */
export const promptDialog = (options = {}) => openModal((open, settle) => {
	registerShadcnInputs();

	const fields = options.fields || {};
	const form = useForm({
		values: Object.assign(initialValues(fields), options.values),
		schema: options.schema,
		validate: options.validate
	});
	const status = state({ error: "" });
	const submitText = options.submitText == null ? "Save" : options.submitText;

	// Errors are caught here, not left to handleSubmit: a rejection must keep
	// the dialog open, not surface as an unhandled rejection.
	const onSubmit = (values) => {
		status.error = "";

		return Promise.resolve()
			.then(() => (options.onSubmit ? options.onSubmit(values) : undefined))
			.then((result) => settle(result === undefined ? values : result), (error) => {
				status.error = messageOf(error);
			});
	};

	const content = DialogContent({ class: options.class },
		Form({ form, onSubmit, class: "grid gap-4" },
			DialogHeader(
				DialogTitle(options.title == null ? "" : options.title),
				options.description == null ? null : DialogDescription(options.description)),
			FormFields({ form, fields, class: "gap-4" }),
			el("p", {
				"data-slot": "prompt-error",
				role: "alert",
				class: "text-sm text-destructive",
				hidden: () => !status.error
			}, () => status.error),
			DialogFooter(
				DialogClose(Button({ variant: "outline", type: "button" }, options.cancelText == null ? "Cancel" : options.cancelText)),
				Button({
					type: "submit",
					"data-slot": "prompt-submit",
					disabled: () => form.submitting,
					"aria-busy": () => (form.submitting ? "true" : "false")
				}, () => (form.submitting ? [Spinner(), submitText] : submitText)))));

	Dialog({
		open: [open, "value"],
		onOpenChange: (isOpen) => {
			if(!isOpen) {
				settle(null);
			}
		}
	}, content);

	return content;
});

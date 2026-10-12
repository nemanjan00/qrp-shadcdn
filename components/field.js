/**
 * components/field.js — Field: label + control + description + error, and the
 * groups/fieldsets that lay several out.
 *
 *   Field(FieldLabel({ for: "email" }, "Email"), Input({ id: "email" }),
 *     FieldDescription("We never share it."), FieldError({ errors: () => form.errors.email }))
 *
 * https://ui.shadcn.com/docs/components/field
 */

import { el } from "@nemanjan00/qrp";
import { part, parseArgs, pick, cn, read, variants } from "../utils/index.js";
import { Label } from "./label.js";
import { Separator } from "./separator.js";

export const FieldSet = part("fieldset", "field-set", "flex flex-col gap-6 has-[>[data-slot=checkbox-group]]:gap-3 has-[>[data-slot=radio-group]]:gap-3");

/** `FieldLegend({ variant: "legend" | "label" }, …)`. */
export const FieldLegend = part("legend", "field-legend", "mb-3 font-medium data-[variant=legend]:text-base data-[variant=label]:text-sm", {
	own: ["variant"],
	data: (own) => ({ "data-variant": own.variant || "legend" })
});

export const FieldGroup = part("div", "field-group", "group/field-group @container/field-group flex w-full flex-col gap-7 data-[slot=checkbox-group]:gap-3 [&>[data-slot=field-group]]:gap-4");

export const fieldVariants = variants("group/field flex w-full gap-3 data-[invalid=true]:text-destructive", {
	variants: {
		orientation: {
			vertical: "flex-col [&>*]:w-full [&>.sr-only]:w-auto",
			horizontal: "flex-row items-center [&>[data-slot=field-label]]:flex-auto has-[>[data-slot=field-content]]:items-start has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px",
			responsive: "flex-col @md/field-group:flex-row @md/field-group:items-center [&>*]:w-full @md/field-group:[&>*]:w-auto [&>.sr-only]:w-auto @md/field-group:[&>[data-slot=field-label]]:flex-auto @md/field-group:has-[>[data-slot=field-content]]:items-start @md/field-group:has-[>[data-slot=field-content]]:[&>[role=checkbox],[role=radio]]:mt-px"
		}
	},
	defaultVariants: { orientation: "vertical" }
});

/**
 * `Field({ orientation: "vertical" | "horizontal" | "responsive",
 * "data-invalid": () => bool }, …)`.
 */
export const Field = part("div", "field", fieldVariants, {
	own: ["orientation"],
	attrs: { role: "group" },
	data: (own) => ({ "data-orientation": own.orientation || "vertical" })
});

export const FieldContent = part("div", "field-content", "group/field-content flex flex-1 flex-col gap-1.5 leading-snug");

export const FieldLabel = (...args) => {
	const { props, children } = parseArgs(args);
	const node = Label(Object.assign({}, props, {
		"data-slot": "field-label",
		class: cn("group/field-label peer/field-label flex w-fit gap-2 leading-snug group-data-[disabled=true]/field:opacity-50 has-[>[data-slot=field]]:w-full has-[>[data-slot=field]]:flex-col has-[>[data-slot=field]]:rounded-md has-[>[data-slot=field]]:border [&>*]:data-[slot=field]:p-4 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5 dark:has-data-[state=checked]:bg-primary/10", props.class)
	}), ...children);

	// shadcn overrides Label's leading-none with leading-snug (twMerge).
	node.classList.remove("leading-none");

	return node;
};

export const FieldTitle = part("div", "field-label", "flex w-fit items-center gap-2 text-sm leading-snug font-medium group-data-[disabled=true]/field:opacity-50");

export const FieldDescription = part("p", "field-description", "text-sm leading-normal font-normal text-muted-foreground group-has-[[data-orientation=horizontal]]/field:text-balance last:mt-0 nth-last-2:-mt-1 [[data-variant=legend]+&]:-mt-1.5 [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary");

/** A rule, optionally with centered text ("Or continue with"). */
export const FieldSeparator = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class"]);
	const hasContent = children.length > 0;

	return el("div", Object.assign({ "data-slot": "field-separator", "data-content": String(hasContent) }, rest, {
		class: cn("relative -my-2 h-5 text-sm group-data-[variant=outline]/field-group:-mb-2", own.class)
	}), Separator({ class: "absolute inset-0 top-1/2" }), hasContent ? el("span", {
		class: "relative mx-auto block w-fit bg-background px-2 text-muted-foreground",
		"data-slot": "field-separator-content"
	}, ...children) : null);
};

const messageOf = (error) => {
	if(!error) {
		return "";
	}

	return typeof error === "string" ? error : error.message || "";
};

/**
 * `FieldError({ errors })` — errors is an array of strings or `{ message }`
 * (or a thunk returning one); duplicates collapse, several render as a list.
 * Children, when given, are shown instead. Hidden while there is nothing to say.
 */
export const FieldError = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "errors"]);
	const messages = () => {
		const list = read(own.errors);
		const all = (Array.isArray(list) ? list : [list]).map(messageOf).filter(Boolean);

		return [...new Set(all)];
	};
	const empty = () => children.length === 0 && messages().length === 0;
	const content = () => {
		const unique = messages();

		if(unique.length === 1) {
			return unique[0];
		}

		return el("ul", { class: "ml-4 flex list-disc flex-col gap-1" }, ...unique.map((message) => el("li", {}, message)));
	};

	return el("div", Object.assign({ role: "alert", "data-slot": "field-error", hidden: empty }, rest, {
		class: cn("text-sm font-normal text-destructive", own.class)
	}), ...(children.length > 0 ? children : [content]));
};

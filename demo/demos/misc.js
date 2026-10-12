// Demos for the misc batch: navigation, layout helpers, forms and toasts.

import {
	state, el,
	Button, Input, Textarea, Kbd, Avatar, AvatarImage, AvatarFallback,
	Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator, BreadcrumbEllipsis,
	Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationEllipsis, PaginationFor,
	Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
	Item, ItemMedia, ItemContent, ItemTitle, ItemDescription, ItemActions, ItemGroup, ItemSeparator,
	ButtonGroup, ButtonGroupSeparator, ButtonGroupText,
	InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput, InputGroupText, InputGroupTextarea,
	Field, FieldLabel, FieldDescription, FieldError, FieldGroup, FieldSet, FieldLegend, FieldSeparator,
	useForm, Form, FormField, FormFields, FormItem, FormLabel, FormControl, FormDescription, FormMessage, registerShadcnInputs,
	Toaster, toast, LegacyToaster, useToast, ToastAction,
	notify, SearchIcon, CheckIcon, ChevronRightIcon, ArrowRightIcon, CalendarIcon
} from "@nemanjan00/qrp-shadcdn";
import { demo } from "./registry.js";

demo("Breadcrumb", () => Breadcrumb(BreadcrumbList(
	BreadcrumbItem(BreadcrumbLink({ href: "#" }, "Home")),
	BreadcrumbSeparator(),
	BreadcrumbItem(BreadcrumbEllipsis()),
	BreadcrumbSeparator(),
	BreadcrumbItem(BreadcrumbLink({ href: "#" }, "Components")),
	BreadcrumbSeparator(),
	BreadcrumbItem(BreadcrumbPage("Breadcrumb"))
)));

demo("Pagination", () => {
	const page = state({ n: 2 });
	const link = (n, cls) => PaginationItem({ class: cls }, PaginationLink({
		href: "#",
		isActive: () => page.n === n,
		onclick: (event) => { event.preventDefault(); page.n = n; }
	}, String(n)));

	// PaginationFor takes a qrp dataGrid(); any object with its pager API works,
	// which keeps this demo to the bundle's exports.
	const pages = 24;
	const grid = {
		page: state({ index: 0 }),
		pageCount: () => pages,
		goto: (index) => { grid.page.index = Math.min(pages - 1, Math.max(0, index)); },
		prev: () => grid.goto(grid.page.index - 1),
		next: () => grid.goto(grid.page.index + 1),
		hasPrev: () => grid.page.index > 0,
		hasNext: () => grid.page.index < pages - 1,
		pageWindow: (span) => {
			const start = Math.min(Math.max(0, grid.page.index - Math.floor(span / 2)), Math.max(0, pages - span));

			return Array.from({ length: Math.min(span, pages) }, (_, i) => start + i);
		}
	};

	return el("div", { class: "grid gap-6" },
		Pagination(PaginationContent(
			PaginationItem(PaginationPrevious({ href: "#", onclick: (event) => { event.preventDefault(); page.n = Math.max(1, page.n - 1); } })),
			// The narrowest phones (320px) can't fit three numbers + both arrows.
			link(1), link(2), link(3, "max-[359px]:hidden"),
			PaginationItem(PaginationEllipsis()),
			PaginationItem(PaginationNext({ href: "#", onclick: (event) => { event.preventDefault(); page.n = Math.min(3, page.n + 1); } }))
		)),
		el("div", { class: "grid gap-2 text-center" },
			el("p", { class: "text-sm text-muted-foreground" }, () => `PaginationFor(pager) — page ${grid.page.index + 1} of ${grid.pageCount()}`),
			PaginationFor(grid, { span: 3 })
		)
	);
});

demo("Empty", () => Empty({ class: "border" },
	EmptyHeader(
		EmptyMedia({ variant: "icon" }, CalendarIcon()),
		EmptyTitle("No Projects Yet"),
		EmptyDescription("You haven't created any projects yet. Get started by creating your first project.")
	),
	EmptyContent(el("div", { class: "flex gap-2" }, Button("Create Project"), Button({ variant: "outline" }, "Import Project")))
));

demo("Item", () => el("div", { class: "flex w-full max-w-md flex-col gap-6" },
	Item({ variant: "outline" },
		ItemContent(ItemTitle("Basic Item"), ItemDescription("A simple item with title and description.")),
		ItemActions(Button({ variant: "outline", size: "sm" }, "Action"))
	),
	Item({ variant: "outline", size: "sm", as: "a", href: "#" },
		ItemMedia(CheckIcon({ class: "size-5" })),
		ItemContent(ItemTitle("Your profile has been verified.")),
		ItemActions(ChevronRightIcon({ class: "size-4" }))
	),
	ItemGroup({ class: "rounded-md border" },
		...[["shadcn", "shadcn@vercel.com"], ["maxleiter", "maxleiter@vercel.com"]].flatMap(([name, email], index) => [
			index > 0 ? ItemSeparator() : null,
			Item(
				ItemMedia(Avatar(AvatarImage({ src: `https://github.com/${name}.png` }), AvatarFallback(name[0].toUpperCase()))),
				ItemContent(ItemTitle(name), ItemDescription(email)),
				ItemActions(Button({ variant: "ghost", size: "icon", class: "rounded-full", "aria-label": "Invite" }, "+"))
			)
		])
	)
));

demo("Button Group", () => el("div", { class: "flex flex-col items-start gap-6" },
	// flex-wrap: the full toolbar is ~325px, wider than a 320px phone's content box.
	ButtonGroup({ class: "flex-wrap" },
		ButtonGroup(Button({ variant: "outline", size: "icon", "aria-label": "Go Back" }, "←")),
		ButtonGroup(Button({ variant: "outline" }, "Archive"), Button({ variant: "outline" }, "Report")),
		ButtonGroup(Button({ variant: "outline" }, "Snooze"), Button({ variant: "outline", size: "icon", "aria-label": "More" }, "⋯"))
	),
	ButtonGroup(Button({ variant: "secondary", size: "sm" }, "Copy"), ButtonGroupSeparator(), Button({ variant: "secondary", size: "sm" }, "Paste")),
	ButtonGroup(ButtonGroupText("https://"), Input({ placeholder: "example.com", class: "w-48" }), Button({ variant: "outline", size: "icon", "aria-label": "Go" }, ArrowRightIcon())),
	ButtonGroup({ orientation: "vertical" }, Button({ variant: "outline", size: "icon" }, "+"), Button({ variant: "outline", size: "icon" }, "−"))
));

demo("Input Group", () => el("div", { class: "grid w-full max-w-sm gap-6" },
	InputGroup(InputGroupInput({ placeholder: "Search..." }), InputGroupAddon(SearchIcon()), InputGroupAddon({ align: "inline-end" }, "12 results")),
	InputGroup(InputGroupAddon(InputGroupText("https://")), InputGroupInput({ placeholder: "example.com", class: "!pl-0.5" }), InputGroupAddon({ align: "inline-end" }, InputGroupText(".com"))),
	InputGroup(InputGroupInput({ placeholder: "Search…" }), InputGroupAddon({ align: "inline-end" }, Kbd("⌘K"))),
	InputGroup(
		InputGroupTextarea({ placeholder: "Ask, Search or Chat..." }),
		InputGroupAddon({ align: "block-end" },
			InputGroupButton({ variant: "outline", size: "icon-xs", class: "rounded-full" }, "+"),
			InputGroupText({ class: "ml-auto" }, "52% used"),
			InputGroupButton({ variant: "default", size: "icon-xs", class: "rounded-full", disabled: true }, "↑")
		)
	)
));

demo("Field", () => {
	const s = state({ name: "", card: "" });

	return el("div", { class: "w-full max-w-md" }, el("form", { onsubmit: (event) => event.preventDefault() }, FieldGroup(
		FieldSet(
			FieldLegend("Payment Method"),
			FieldDescription("All transactions are secure and encrypted"),
			FieldGroup(
				Field(FieldLabel({ for: "card-name" }, "Name on Card"), Input({ id: "card-name", placeholder: "Evil Rabbit", bind: [s, "name"] })),
				Field({ "data-invalid": () => String(s.card.length > 0 && s.card.length < 12) },
					FieldLabel({ for: "card-number" }, "Card Number"),
					Input({ id: "card-number", placeholder: "1234 5678 9012 3456", bind: [s, "card"], "aria-invalid": () => String(s.card.length > 0 && s.card.length < 12) }),
					FieldDescription("Enter your 16-digit card number"),
					FieldError({ errors: () => (s.card.length > 0 && s.card.length < 12 ? ["Card number is too short."] : []) })
				)
			)
		),
		FieldSeparator(),
		FieldSet(FieldLegend("Comments"), FieldGroup(Field(Textarea({ placeholder: "Add any additional comments", class: "resize-none" })))),
		Field({ orientation: "horizontal" }, Button({ type: "submit" }, "Submit"), Button({ variant: "outline" }, "Cancel"))
	)));
});

demo("Form", () => {
	registerShadcnInputs();

	const form = useForm({
		values: { username: "", email: "", role: "viewer" },
		schema: {
			username: { required: true, min: 2, message: "Username must be at least 2 characters." },
			email: { required: true, pattern: /^[^@\s]+@[^@\s]+$/, message: "Enter a valid email." }
		}
	});

	return Form({ form, class: "w-full max-w-sm space-y-6", onSubmit: (values) => toast.success("Submitted", { description: JSON.stringify(values) }) },
		FormField({ form, name: "username", render: (field) => FormItem(
			FormLabel("Username"),
			FormControl(Input(Object.assign({ placeholder: "shadcn" }, field))),
			FormDescription("This is your public display name."),
			FormMessage()
		) }),
		FormFields({ form, fields: {
			email: { name: "Email", type: "email", placeholder: "m@example.com" },
			role: { name: "Role", type: "select", options: { viewer: "Viewer", editor: "Editor", admin: "Admin" }, description: "From qrp's input registry." }
		} }),
		Button({ type: "submit" }, "Submit")
	);
});

demo("Sonner", () => el("div", { class: "flex flex-wrap gap-2" },
	Toaster({ position: "top-center" }),
	Button({ variant: "outline", onclick: () => toast("Event has been created", {
		description: "Sunday, December 03, 2023 at 9:00 AM",
		action: { label: "Undo", onClick: () => toast.info("Undone") }
	}) }, "Show Toast"),
	Button({ variant: "outline", onclick: () => toast.success("Event has been created") }, "Success"),
	Button({ variant: "outline", onclick: () => toast.error("Event has not been created") }, "Error"),
	Button({ variant: "outline", onclick: () => toast.warning("Event start time cannot be earlier than 8am") }, "Warning"),
	Button({ variant: "outline", onclick: () => toast.promise(new Promise((resolve) => setTimeout(() => resolve("Sonner"), 1500)), {
		loading: "Loading...",
		success: (name) => `${name} toast has been added`,
		error: "Error"
	}) }, "Promise"),
	Button({ variant: "outline", onclick: () => notify.info("Raised with qrp's notify.info()") }, "qrp notify")
));

demo("Toast", () => {
	const { toast: show } = useToast();

	return el("div", { class: "flex gap-2" },
		LegacyToaster(),
		Button({ variant: "outline", onclick: () => show({ title: "Scheduled: Catch up", description: "Friday, February 10, 2023 at 5:57 PM" }) }, "Add to calendar"),
		Button({ variant: "outline", onclick: () => show({
			variant: "destructive",
			title: "Uh oh! Something went wrong.",
			description: "There was a problem with your request.",
			action: ToastAction({ altText: "Try again" }, "Try again")
		}) }, "Destructive")
	);
});

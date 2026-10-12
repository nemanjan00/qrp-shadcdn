// qrp-shadcdn demo — every component, the way ui.shadcn.com shows them.
// Each demo is a function so the page reads like the component docs.

import {
	state, el, mount, effect,
	Button, Badge, Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter,
	Alert, AlertTitle, AlertDescription, Input, Textarea, Label, Separator, Skeleton, Kbd, KbdGroup,
	Spinner, AspectRatio, Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
	TableCaption, Progress, Avatar, AvatarImage, AvatarFallback, AvatarGroup,
	Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
	Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
	AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
	AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
	Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
	list, CheckIcon, ArrowRightIcon
} from "@nemanjan00/qrp-shadcdn";

const DEMOS = [];

const demo = (name, build) => DEMOS.push({ name, id: name.toLowerCase().replace(/\s+/g, "-"), build });

const field = (id, label, input) => el("div", { class: "grid gap-2" }, Label({ for: id }, label), input);

demo("Button", () => el("div", { class: "flex flex-wrap items-center gap-2" },
	Button("Default"),
	Button({ variant: "secondary" }, "Secondary"),
	Button({ variant: "destructive" }, "Destructive"),
	Button({ variant: "outline" }, "Outline"),
	Button({ variant: "ghost" }, "Ghost"),
	Button({ variant: "link" }, "Link"),
	Button({ size: "sm" }, CheckIcon(), "Small"),
	Button({ size: "icon", variant: "outline", "aria-label": "Next" }, ArrowRightIcon()),
	Button({ disabled: true }, Spinner(), "Please wait")
));

demo("Badge", () => el("div", { class: "flex flex-wrap gap-2" },
	Badge("Badge"), Badge({ variant: "secondary" }, "Secondary"),
	Badge({ variant: "destructive" }, "Destructive"), Badge({ variant: "outline" }, "Outline")
));

demo("Card", () => Card({ class: "w-full max-w-sm" },
	CardHeader(
		CardTitle("Login to your account"),
		CardDescription("Enter your email below to login to your account"),
		CardAction(Button({ variant: "link" }, "Sign Up"))
	),
	CardContent(el("div", { class: "flex flex-col gap-6" },
		field("email", "Email", Input({ id: "email", type: "email", placeholder: "m@example.com" })),
		field("password", "Password", Input({ id: "password", type: "password" }))
	)),
	CardFooter({ class: "flex-col gap-2" },
		Button({ type: "submit", class: "w-full" }, "Login"),
		Button({ variant: "outline", class: "w-full" }, "Login with Google")
	)
));

demo("Alert", () => el("div", { class: "grid w-full max-w-xl gap-4" },
	Alert(CheckIcon(), AlertTitle("Success! Your changes have been saved"), AlertDescription("This is an alert with icon, title and description.")),
	Alert({ variant: "destructive" }, AlertTitle("Unable to process your payment."), AlertDescription("Please verify your billing information and try again."))
));

demo("Input", () => {
	const s = state({ name: "" });

	return el("div", { class: "grid w-full max-w-sm gap-3" },
		field("name", "Name", Input({ id: "name", placeholder: "Your name", bind: [s, "name"] })),
		el("p", { class: "text-sm text-muted-foreground" }, () => `Hello, ${s.name || "stranger"}.`),
		Input({ disabled: true, placeholder: "Disabled" }),
		Input({ "aria-invalid": "true", value: "invalid" })
	);
});

demo("Textarea", () => el("div", { class: "grid w-full max-w-sm gap-2" },
	Label({ for: "message" }, "Your message"), Textarea({ id: "message", placeholder: "Type your message here." })
));

demo("Separator", () => el("div", {},
	el("div", { class: "space-y-1" }, el("h4", { class: "text-sm leading-none font-medium" }, "Radix Primitives"),
		el("p", { class: "text-sm text-muted-foreground" }, "An open-source UI component library.")),
	Separator({ class: "my-4" }),
	el("div", { class: "flex h-5 items-center space-x-4 text-sm" },
		el("div", {}, "Blog"), Separator({ orientation: "vertical" }), el("div", {}, "Docs"),
		Separator({ orientation: "vertical" }), el("div", {}, "Source"))
));

demo("Skeleton", () => el("div", { class: "flex items-center space-x-4" },
	Skeleton({ class: "h-12 w-12 rounded-full" }),
	el("div", { class: "space-y-2" }, Skeleton({ class: "h-4 w-[250px]" }), Skeleton({ class: "h-4 w-[200px]" }))
));

demo("Kbd", () => el("div", { class: "flex flex-col items-center gap-4" },
	KbdGroup(Kbd("⌘"), Kbd("⇧"), Kbd("⌥"), Kbd("⌃")),
	KbdGroup(Kbd("Ctrl"), el("span", {}, "+"), Kbd("B"))
));

demo("Spinner", () => el("div", { class: "flex items-center gap-4" }, Spinner(), Spinner({ class: "size-6" }), Spinner({ class: "size-8" })));

demo("Progress", () => {
	const s = state({ value: 13 });

	setTimeout(() => { s.value = 66; }, 500);

	return Progress({ value: () => s.value, class: "w-[60%]" });
});

demo("Avatar", () => el("div", { class: "flex flex-row flex-wrap items-center gap-12" },
	Avatar(AvatarImage({ src: "https://github.com/shadcn.png", alt: "@shadcn" }), AvatarFallback("CN")),
	Avatar(AvatarImage({ src: "https://example.invalid/missing.png", alt: "" }), AvatarFallback("ER")),
	AvatarGroup(
		Avatar(AvatarImage({ src: "https://github.com/shadcn.png", alt: "" }), AvatarFallback("CN")),
		Avatar(AvatarImage({ src: "https://github.com/leerob.png", alt: "" }), AvatarFallback("LR")),
		Avatar(AvatarImage({ src: "https://github.com/evilrabbit.png", alt: "" }), AvatarFallback("ER"))
	)
));

demo("Aspect Ratio", () => el("div", { class: "w-full max-w-sm" }, AspectRatio({ ratio: 16 / 9, class: "rounded-lg bg-muted" },
	el("div", { class: "flex items-center justify-center text-sm text-muted-foreground" }, "16 / 9")
)));

demo("Table", () => {
	const invoices = state({ rows: [
		{ id: "INV001", status: "Paid", method: "Credit Card", amount: 250 },
		{ id: "INV002", status: "Pending", method: "PayPal", amount: 150 },
		{ id: "INV003", status: "Unpaid", method: "Bank Transfer", amount: 350 },
		{ id: "INV004", status: "Paid", method: "Credit Card", amount: 450 }
	] });
	const total = () => invoices.rows.reduce((sum, row) => sum + row.amount, 0);

	return Table(
		TableCaption("A list of your recent invoices."),
		TableHeader(TableRow(TableHead({ class: "w-[100px]" }, "Invoice"), TableHead("Status"), TableHead("Method"), TableHead({ class: "text-right" }, "Amount"))),
		TableBody(list(() => invoices.rows, (row) => row.id, (row) => TableRow(
			TableCell({ class: "font-medium" }, row.id), TableCell(() => row.status), TableCell(row.method),
			TableCell({ class: "text-right" }, () => `$${row.amount.toFixed(2)}`)
		))),
		TableFooter(TableRow(TableCell({ colspan: "3" }, "Total"), TableCell({ class: "text-right" }, () => `$${total().toFixed(2)}`)))
	);
});

demo("Dialog", () => Dialog(
	DialogTrigger(Button({ variant: "outline" }, "Edit Profile")),
	DialogContent({ class: "sm:max-w-[425px]" },
		DialogHeader(DialogTitle("Edit profile"), DialogDescription("Make changes to your profile here. Click save when you're done.")),
		el("div", { class: "grid gap-4" },
			field("dlg-name", "Name", Input({ id: "dlg-name", value: "Pedro Duarte" })),
			field("dlg-user", "Username", Input({ id: "dlg-user", value: "@peduarte" }))
		),
		DialogFooter(DialogClose(Button({ variant: "outline" }, "Cancel")), Button({ type: "submit" }, "Save changes"))
	)
));

demo("Alert Dialog", () => AlertDialog(
	AlertDialogTrigger(Button({ variant: "outline" }, "Show Dialog")),
	AlertDialogContent(
		AlertDialogHeader(AlertDialogTitle("Are you absolutely sure?"),
			AlertDialogDescription("This action cannot be undone. This will permanently delete your account and remove your data from our servers.")),
		AlertDialogFooter(AlertDialogCancel("Cancel"), AlertDialogAction("Continue"))
	)
));

demo("Sheet", () => el("div", { class: "flex gap-2" }, ...["top", "right", "bottom", "left"].map((side) => Sheet(
	SheetTrigger(Button({ variant: "outline" }, side)),
	SheetContent({ side },
		SheetHeader(SheetTitle("Edit profile"), SheetDescription("Make changes to your profile here. Click save when you're done.")),
		el("div", { class: "grid flex-1 auto-rows-min gap-6 px-4" }, field(`sheet-${side}`, "Name", Input({ id: `sheet-${side}`, value: "Pedro Duarte" }))),
		SheetFooter(Button({ type: "submit" }, "Save changes"), SheetClose(Button({ variant: "outline" }, "Close")))
	)
))));

demo("Drawer", () => {
	const goal = state({ value: 350 });

	return Drawer(
		DrawerTrigger(Button({ variant: "outline" }, "Open Drawer")),
		DrawerContent(el("div", { class: "mx-auto w-full max-w-sm" },
			DrawerHeader(DrawerTitle("Move Goal"), DrawerDescription("Set your daily activity goal.")),
			el("div", { class: "flex items-center justify-center gap-4 p-4" },
				Button({ variant: "outline", size: "icon", class: "rounded-full", onclick: () => { goal.value -= 10; } }, "−"),
				el("div", { class: "text-center" }, el("div", { class: "text-7xl font-bold tracking-tighter" }, () => goal.value),
					el("div", { class: "text-[0.70rem] text-muted-foreground uppercase" }, "Calories/day")),
				Button({ variant: "outline", size: "icon", class: "rounded-full", onclick: () => { goal.value += 10; } }, "+")
			),
			DrawerFooter(Button("Submit"), DrawerClose(Button({ variant: "outline" }, "Cancel")))
		))
	);
});

const theme = state({ dark: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches });

const header = () => el("header", { class: "sticky top-0 z-40 border-b bg-background/95 backdrop-blur" },
	el("div", { class: "mx-auto flex h-14 max-w-5xl items-center justify-between px-4" },
		el("a", { href: "#", class: "font-semibold" }, "qrp-shadcdn"),
		Button({ variant: "ghost", size: "sm", onclick: () => { theme.dark = !theme.dark; } }, () => (theme.dark ? "Light" : "Dark"))
	)
);

const section = (entry) => el("section", { id: entry.id, class: "scroll-mt-20 space-y-3" },
	el("h2", { class: "text-xl font-semibold tracking-tight" }, entry.name),
	el("div", { class: "flex min-h-[200px] w-full items-center justify-center rounded-lg border p-10" }, entry.build())
);

effect(() => document.documentElement.classList.toggle("dark", theme.dark));

mount(document.getElementById("app"), () => el("div", {},
	header(),
	el("main", { class: "mx-auto max-w-5xl space-y-12 px-4 py-10" }, ...DEMOS.map(section))
));

import {
	state, el,
	Button, Input, Label,
	Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
	Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose,
	AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
	AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
	Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose,
	Popover, PopoverTrigger, PopoverContent, Tooltip, TooltipTrigger, TooltipContent,
	HoverCard, HoverCardTrigger, HoverCardContent, Avatar, AvatarImage, AvatarFallback
} from "@nemanjan00/qrp-shadcdn";
import { demo, field } from "./registry.js";

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

demo("Popover", () => Popover(
	PopoverTrigger(Button({ variant: "outline" }, "Open popover")),
	PopoverContent({ class: "w-80" }, el("div", { class: "grid gap-4" },
		el("div", { class: "space-y-2" }, el("h4", { class: "leading-none font-medium" }, "Dimensions"),
			el("p", { class: "text-sm text-muted-foreground" }, "Set the dimensions for the layer.")),
		el("div", { class: "grid gap-2" }, ...[["width", "100%"], ["maxWidth", "300px"], ["height", "25px"]].map(([id, value]) =>
			el("div", { class: "grid grid-cols-3 items-center gap-4" }, Label({ for: id }, id), Input({ id, value, class: "col-span-2 h-8" }))))
	))
));

demo("Tooltip", () => el("div", { class: "flex gap-2" }, ...["top", "right", "bottom", "left"].map((side) => Tooltip(
	TooltipTrigger(Button({ variant: "outline" }, side)),
	TooltipContent({ side }, "Add to library")
))));

demo("Hover Card", () => HoverCard(
	HoverCardTrigger(Button({ variant: "link" }, "@nextjs")),
	HoverCardContent({ class: "w-80" }, el("div", { class: "flex justify-between gap-4" },
		Avatar(AvatarImage({ src: "https://github.com/vercel.png" }), AvatarFallback("VC")),
		el("div", { class: "space-y-1" }, el("h4", { class: "text-sm font-semibold" }, "@nextjs"),
			el("p", { class: "text-sm" }, "The React Framework – created and maintained by @vercel."),
			el("div", { class: "text-xs text-muted-foreground" }, "Joined December 2021"))
	))
));

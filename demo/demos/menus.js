// Demos for the menus batch: DropdownMenu, ContextMenu, Menubar, NavigationMenu.

import {
	state, el, Button,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuGroup, DropdownMenuItem,
	DropdownMenuShortcut, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
	DropdownMenuPortal, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem,
	ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuShortcut, ContextMenuSub,
	ContextMenuSubTrigger, ContextMenuSubContent, ContextMenuSeparator, ContextMenuCheckboxItem,
	ContextMenuRadioGroup, ContextMenuLabel, ContextMenuRadioItem,
	Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarShortcut, MenubarSeparator,
	MenubarSub, MenubarSubTrigger, MenubarSubContent, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem,
	NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent,
	NavigationMenuLink, navigationMenuTriggerStyle
} from "@nemanjan00/qrp-shadcdn";
import { demo } from "./registry.js";

demo("Dropdown Menu", () => {
	const view = state({ statusBar: true, activityBar: false, panel: false, position: "bottom" });

	return el("div", { class: "flex flex-wrap gap-4" },
		DropdownMenu(
			DropdownMenuTrigger(Button({ variant: "outline" }, "Open")),
			DropdownMenuContent({ class: "w-56", align: "start" },
				DropdownMenuLabel("My Account"),
				DropdownMenuGroup(
					DropdownMenuItem("Profile", DropdownMenuShortcut("⇧⌘P")),
					DropdownMenuItem("Billing", DropdownMenuShortcut("⌘B")),
					DropdownMenuItem("Settings", DropdownMenuShortcut("⌘S")),
					DropdownMenuItem("Keyboard shortcuts", DropdownMenuShortcut("⌘K"))
				),
				DropdownMenuSeparator(),
				DropdownMenuGroup(
					DropdownMenuItem("Team"),
					DropdownMenuSub(
						DropdownMenuSubTrigger("Invite users"),
						DropdownMenuPortal(DropdownMenuSubContent(
							DropdownMenuItem("Email"),
							DropdownMenuItem("Message"),
							DropdownMenuSeparator(),
							DropdownMenuItem("More...")
						))
					),
					DropdownMenuItem("New Team", DropdownMenuShortcut("⌘+T"))
				),
				DropdownMenuSeparator(),
				DropdownMenuItem("GitHub"),
				DropdownMenuItem("Support"),
				DropdownMenuItem({ disabled: true }, "API"),
				DropdownMenuSeparator(),
				DropdownMenuItem({ variant: "destructive" }, "Log out", DropdownMenuShortcut("⇧⌘Q"))
			)
		),
		DropdownMenu(
			DropdownMenuTrigger(Button({ variant: "outline" }, "Checkboxes")),
			DropdownMenuContent({ class: "w-56" },
				DropdownMenuLabel("Appearance"),
				DropdownMenuSeparator(),
				DropdownMenuCheckboxItem({ checked: [view, "statusBar"] }, "Status Bar"),
				DropdownMenuCheckboxItem({ checked: [view, "activityBar"], disabled: true }, "Activity Bar"),
				DropdownMenuCheckboxItem({ checked: [view, "panel"] }, "Panel")
			)
		),
		DropdownMenu(
			DropdownMenuTrigger(Button({ variant: "outline" }, () => `Position: ${view.position}`)),
			DropdownMenuContent({ class: "w-56" },
				DropdownMenuLabel("Panel Position"),
				DropdownMenuSeparator(),
				DropdownMenuRadioGroup({ value: [view, "position"] },
					DropdownMenuRadioItem({ value: "top" }, "Top"),
					DropdownMenuRadioItem({ value: "bottom" }, "Bottom"),
					DropdownMenuRadioItem({ value: "right" }, "Right")
				)
			)
		)
	);
});

demo("Context Menu", () => {
	const view = state({ bookmarks: true, urls: false, person: "pedro" });

	return ContextMenu(
		ContextMenuTrigger({ class: "flex h-[150px] w-[300px] items-center justify-center rounded-md border border-dashed text-sm" }, "Right click here"),
		ContextMenuContent({ class: "w-52" },
			ContextMenuItem({ inset: true }, "Back", ContextMenuShortcut("⌘[")),
			ContextMenuItem({ inset: true, disabled: true }, "Forward", ContextMenuShortcut("⌘]")),
			ContextMenuItem({ inset: true }, "Reload", ContextMenuShortcut("⌘R")),
			ContextMenuSub(
				ContextMenuSubTrigger({ inset: true }, "More Tools"),
				ContextMenuSubContent({ class: "w-44" },
					ContextMenuItem("Save Page..."),
					ContextMenuItem("Create Shortcut..."),
					ContextMenuItem("Name Window..."),
					ContextMenuSeparator(),
					ContextMenuItem("Developer Tools"),
					ContextMenuSeparator(),
					ContextMenuItem({ variant: "destructive" }, "Delete")
				)
			),
			ContextMenuSeparator(),
			ContextMenuCheckboxItem({ checked: [view, "bookmarks"] }, "Show Bookmarks"),
			ContextMenuCheckboxItem({ checked: [view, "urls"] }, "Show Full URLs"),
			ContextMenuSeparator(),
			ContextMenuRadioGroup({ value: [view, "person"] },
				ContextMenuLabel({ inset: true }, "People"),
				ContextMenuRadioItem({ value: "pedro" }, "Pedro Duarte"),
				ContextMenuRadioItem({ value: "colm" }, "Colm Tuite")
			)
		)
	);
});

demo("Menubar", () => {
	const view = state({ bookmarks: false, urls: true, profile: "benoit" });

	return Menubar(
		MenubarMenu(MenubarTrigger("File"), MenubarContent(
			MenubarItem("New Tab", MenubarShortcut("⌘T")),
			MenubarItem("New Window", MenubarShortcut("⌘N")),
			MenubarItem({ disabled: true }, "New Incognito Window"),
			MenubarSeparator(),
			MenubarSub(MenubarSubTrigger("Share"), MenubarSubContent(MenubarItem("Email link"), MenubarItem("Messages"), MenubarItem("Notes"))),
			MenubarSeparator(),
			MenubarItem("Print...", MenubarShortcut("⌘P"))
		)),
		MenubarMenu(MenubarTrigger("Edit"), MenubarContent(
			MenubarItem("Undo", MenubarShortcut("⌘Z")),
			MenubarItem("Redo", MenubarShortcut("⇧⌘Z")),
			MenubarSeparator(),
			MenubarSub(MenubarSubTrigger("Find"), MenubarSubContent(MenubarItem("Search the web"), MenubarSeparator(), MenubarItem("Find..."), MenubarItem("Find Next"), MenubarItem("Find Previous"))),
			MenubarSeparator(),
			MenubarItem("Cut"),
			MenubarItem("Copy"),
			MenubarItem("Paste")
		)),
		MenubarMenu(MenubarTrigger("View"), MenubarContent(
			MenubarCheckboxItem({ checked: [view, "bookmarks"] }, "Always Show Bookmarks Bar"),
			MenubarCheckboxItem({ checked: [view, "urls"] }, "Always Show Full URLs"),
			MenubarSeparator(),
			MenubarItem({ inset: true }, "Reload", MenubarShortcut("⌘R")),
			MenubarItem({ inset: true, disabled: true }, "Force Reload", MenubarShortcut("⇧⌘R")),
			MenubarSeparator(),
			MenubarItem({ inset: true }, "Toggle Fullscreen"),
			MenubarSeparator(),
			MenubarItem({ inset: true }, "Hide Sidebar")
		)),
		MenubarMenu(MenubarTrigger("Profiles"), MenubarContent(
			MenubarRadioGroup({ value: [view, "profile"] },
				MenubarRadioItem({ value: "andy" }, "Andy"),
				MenubarRadioItem({ value: "benoit" }, "Benoit"),
				MenubarRadioItem({ value: "Luis" }, "Luis")
			),
			MenubarSeparator(),
			MenubarItem({ inset: true }, "Edit..."),
			MenubarSeparator(),
			MenubarItem({ inset: true }, "Add Profile...")
		))
	);
});

const COMPONENTS = [
	["Alert Dialog", "A modal dialog that interrupts the user with important content and expects a response."],
	["Hover Card", "For sighted users to preview content available behind a link."],
	["Progress", "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar."],
	["Scroll-area", "Visually or semantically separates content."],
	["Tabs", "A set of layered sections of content—known as tab panels—that are displayed one at a time."],
	["Tooltip", "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it."]
];

const listItem = (title, text) => el("li", {}, NavigationMenuLink({ href: "#" },
	el("div", { class: "text-sm leading-none font-medium" }, title),
	el("p", { class: "line-clamp-2 text-sm leading-snug text-muted-foreground" }, text)
));

demo("Navigation Menu", () => NavigationMenu(
	NavigationMenuList(
		NavigationMenuItem(
			NavigationMenuTrigger("Home"),
			NavigationMenuContent(el("ul", { class: "grid gap-2 md:w-[400px] lg:w-[500px] lg:grid-cols-[.75fr_1fr]" },
				el("li", { class: "row-span-3" }, NavigationMenuLink({
					href: "#",
					class: "flex h-full w-full flex-col justify-end rounded-md bg-linear-to-b from-muted/50 to-muted p-6 no-underline outline-hidden select-none focus:shadow-md"
				}, el("div", { class: "mt-4 mb-2 text-lg font-medium" }, "qrp-shadcdn"),
				el("p", { class: "text-sm leading-tight text-muted-foreground" }, "Beautifully designed components for qrp."))),
				listItem("Introduction", "Re-usable components built using qrp and Tailwind CSS."),
				listItem("Installation", "One import from a CDN, one stylesheet."),
				listItem("Typography", "Styles for headings, paragraphs, lists...etc")
			))
		),
		NavigationMenuItem(
			NavigationMenuTrigger("Components"),
			NavigationMenuContent(el("ul", { class: "grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]" },
				...COMPONENTS.map(([title, text]) => listItem(title, text))))
		),
		NavigationMenuItem(NavigationMenuLink({ href: "#", class: navigationMenuTriggerStyle() }, "Docs"))
	)
));

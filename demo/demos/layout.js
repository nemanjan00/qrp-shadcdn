// Demos for the layout batch — register with demo(name, build).

import {
	state, el, list,
	SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
	SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSub,
	SidebarMenuSubItem, SidebarMenuSubButton, SidebarRail, SidebarInset, SidebarTrigger, SidebarSeparator,
	Collapsible, CollapsibleTrigger, CollapsibleContent, Separator,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
	Avatar, AvatarImage, AvatarFallback, Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
	BreadcrumbPage, BreadcrumbSeparator,
	ChevronRightIcon, ChevronsUpDownIcon, MoreHorizontalIcon, SearchIcon, CalendarIcon, PanelLeftIcon
} from "@nemanjan00/qrp-shadcdn";
import { demo } from "./registry.js";

const NAV = [
	{ title: "Playground", icon: PanelLeftIcon, open: true, items: ["History", "Starred", "Settings"] },
	{ title: "Models", icon: SearchIcon, items: ["Genesis", "Explorer", "Quantum"] },
	{ title: "Documentation", icon: CalendarIcon, items: ["Introduction", "Get Started", "Tutorials", "Changelog"] }
];

const PROJECTS = state({ rows: [
	{ id: "design", name: "Design Engineering" },
	{ id: "sales", name: "Sales & Marketing" },
	{ id: "travel", name: "Travel" }
] });

const navGroup = () => SidebarGroup(
	SidebarGroupLabel("Platform"),
	SidebarMenu(...NAV.map((item) => SidebarMenuItem(Collapsible({ defaultOpen: Boolean(item.open), class: "group/collapsible" },
		CollapsibleTrigger(SidebarMenuButton({ tooltip: item.title },
			item.icon(), el("span", {}, item.title),
			ChevronRightIcon({ class: "ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" })
		)),
		CollapsibleContent(SidebarMenuSub(...item.items.map((sub) => SidebarMenuSubItem(
			SidebarMenuSubButton({ href: "#sidebar", isActive: sub === "History" }, el("span", {}, sub))
		))))
	))))
);

const inbox = () => SidebarMenu(SidebarMenuItem(
	SidebarMenuButton({ as: "a", href: "#sidebar", tooltip: "Inbox" }, SearchIcon(), el("span", {}, "Inbox")),
	SidebarMenuBadge("24")
));

const projectsGroup = () => SidebarGroup({ class: "group-data-[collapsible=icon]:hidden" },
	SidebarGroupLabel("Projects"),
	SidebarMenu(list(() => PROJECTS.rows, (row) => row.id, (row) => SidebarMenuItem(
		SidebarMenuButton({ as: "a", href: "#sidebar" }, CalendarIcon(), el("span", {}, row.name)),
		DropdownMenu(
			DropdownMenuTrigger(SidebarMenuAction({ showOnHover: true }, MoreHorizontalIcon(), el("span", { class: "sr-only" }, "More"))),
			DropdownMenuContent({ class: "w-48", side: "right", align: "start" },
				DropdownMenuItem("View Project"),
				DropdownMenuItem("Share Project"),
				DropdownMenuSeparator(),
				DropdownMenuItem({ variant: "destructive", onSelect: () => { PROJECTS.rows = PROJECTS.rows.filter((r) => r.id !== row.id); } }, "Delete Project")
			)
		)
	)))
);

const team = () => SidebarMenu(SidebarMenuItem(SidebarMenuButton({ size: "lg", tooltip: "Acme Inc" },
	el("div", { class: "flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground text-xs font-bold" }, "A"),
	el("div", { class: "grid flex-1 text-left text-sm leading-tight" }, el("span", { class: "truncate font-medium" }, "Acme Inc"), el("span", { class: "truncate text-xs" }, "Enterprise")),
	ChevronsUpDownIcon({ class: "ml-auto" })
)));

const user = () => SidebarMenu(SidebarMenuItem(SidebarMenuButton({ size: "lg", tooltip: "shadcn" },
	Avatar({ class: "h-8 w-8 rounded-lg" }, AvatarImage({ src: "https://github.com/shadcn.png", alt: "shadcn" }), AvatarFallback({ class: "rounded-lg" }, "CN")),
	el("div", { class: "grid flex-1 text-left text-sm leading-tight" }, el("span", { class: "truncate font-medium" }, "shadcn"), el("span", { class: "truncate text-xs" }, "m@example.com")),
	ChevronsUpDownIcon({ class: "ml-auto size-4" })
)));

demo("Sidebar", () => el("div", {
	id: "sidebar-shell",
	// transform makes this box the containing block of the fixed sidebar, so the
	// whole app shell renders inside the demo frame (shadcn's docs use an iframe).
	class: "h-[520px] w-full overflow-hidden rounded-lg border [transform:translateZ(0)]"
}, SidebarProvider({ persist: "qs_demo_sidebar", class: "min-h-0! h-full" },
	Sidebar({ collapsible: "icon", class: "h-full!" },
		SidebarHeader(team(), inbox()),
		SidebarContent(navGroup(), projectsGroup()),
		SidebarSeparator(),
		SidebarFooter(user()),
		SidebarRail()
	),
	SidebarInset(
		el("header", { class: "flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12" },
			el("div", { class: "flex items-center gap-2 px-4" },
				SidebarTrigger({ class: "-ml-1" }),
				Separator({ orientation: "vertical", class: "mr-2 data-[orientation=vertical]:h-4" }),
				Breadcrumb(BreadcrumbList(
					BreadcrumbItem({ class: "hidden md:block" }, BreadcrumbLink({ href: "#sidebar" }, "Building Your Application")),
					BreadcrumbSeparator({ class: "hidden md:block" }),
					BreadcrumbItem(BreadcrumbPage("Data Fetching"))
				))
			)
		),
		el("div", { class: "flex flex-1 flex-col gap-4 p-4 pt-0" },
			el("div", { class: "grid auto-rows-min gap-4 md:grid-cols-3" },
				el("div", { class: "aspect-video rounded-xl bg-muted/50" }),
				el("div", { class: "aspect-video rounded-xl bg-muted/50" }),
				el("div", { class: "aspect-video rounded-xl bg-muted/50" })
			),
			el("div", { class: "min-h-[100px] flex-1 rounded-xl bg-muted/50" })
		)
	)
)));

// Demos for the layout batch — register with demo(name, build).

import {
	state, el, list,
	SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupLabel,
	SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuAction, SidebarMenuBadge, SidebarMenuSub,
	SidebarMenuSubItem, SidebarMenuSubButton, SidebarRail, SidebarInset, SidebarTrigger, SidebarSeparator,
	Collapsible, CollapsibleTrigger, CollapsibleContent, Separator,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuLabel,
	DataTable, Button, Badge, toast,
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

// --- Data Table: shadcn's payments example ------------------------------------

const PAYMENTS = state({ rows: [
	{ id: "m5gr84i9", amount: 316, status: "success", email: "ken99@example.com" },
	{ id: "3u1reuv4", amount: 242, status: "success", email: "Abe45@example.com" },
	{ id: "derv1ws0", amount: 837, status: "processing", email: "Monserrat44@example.com" },
	{ id: "5kma53ae", amount: 874, status: "success", email: "Silas22@example.com" },
	{ id: "bhqecj4p", amount: 721, status: "failed", email: "carmella@example.com" },
	{ id: "p0r8sd2f", amount: 129, status: "pending", email: "jason78@example.com" },
	{ id: "k2n7xq1z", amount: 560, status: "success", email: "olivia.m@example.com" },
	{ id: "t9w3vb6c", amount: 98, status: "failed", email: "noah_b@example.com" },
	{ id: "h4j8ld0e", amount: 450, status: "processing", email: "emma.w@example.com" },
	{ id: "r6y1pm3s", amount: 1024, status: "success", email: "liam.k@example.com" },
	{ id: "z3c5nb7q", amount: 77, status: "pending", email: "ava.r@example.com" },
	{ id: "f8g2hk4m", amount: 615, status: "success", email: "lucas.t@example.com" }
] });

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const rowActions = (payment) => DropdownMenu(
	DropdownMenuTrigger(Button({ variant: "ghost", class: "h-8 w-8 p-0", "aria-label": "Open menu" }, MoreHorizontalIcon())),
	DropdownMenuContent({ align: "end" },
		DropdownMenuLabel("Actions"),
		DropdownMenuItem({ onSelect: () => toast("Payment ID copied", { description: payment.id }) }, "Copy payment ID"),
		DropdownMenuSeparator(),
		DropdownMenuItem("View customer"),
		DropdownMenuItem("View payment details"))
);

demo("Data Table", () => DataTable({
	data: () => PAYMENTS.rows,
	selectable: true,
	filterColumns: ["email"],
	filterPlaceholder: "Filter emails...",
	pageSize: 10,
	columns: [
		{ key: "status", title: "Status", render: (p) => Badge({ variant: p.status === "failed" ? "destructive" : "secondary", class: "capitalize" }, p.status) },
		{ key: "email", title: "Email", sortable: true, tdClass: "lowercase" },
		{ key: "amount", title: "Amount", sortable: true, thClass: "text-right", tdClass: "text-right font-medium", formatter: (value) => usd.format(value) },
		{ key: "actions", title: "Actions", hideable: false, header: () => "", render: rowActions }
	]
}));

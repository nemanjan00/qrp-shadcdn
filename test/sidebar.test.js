import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, el, mount } from "@nemanjan00/qrp";
import {
	SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuItem,
	SidebarMenuButton, SidebarMenuSub, SidebarMenuSubItem, SidebarMenuSubButton, SidebarMenuSkeleton,
	SidebarInset, SidebarTrigger, SidebarRail, SidebarHeader, SidebarFooter, SidebarSeparator, SidebarInput,
	SidebarMenuAction, SidebarMenuBadge, SidebarGroupAction, SidebarGroupContent, useSidebar
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const slot = (name, root = document) => root.querySelector(`[data-slot=${name}]`);

const shell = (props = {}) => SidebarProvider(Object.assign({ persist: false }, props),
	Sidebar({ collapsible: "icon" },
		SidebarHeader(SidebarInput({ placeholder: "Search" })),
		SidebarContent(SidebarGroup(
			SidebarGroupLabel("Platform"),
			SidebarGroupAction("+"),
			SidebarGroupContent(SidebarMenu(
				SidebarMenuItem(SidebarMenuButton({ tooltip: "Home", isActive: true }, el("span", {}, "Home")), SidebarMenuBadge("3")),
				SidebarMenuItem(SidebarMenuButton({ as: "a", href: "#x" }, el("span", {}, "Docs")), SidebarMenuAction({ showOnHover: true }, "…")),
				SidebarMenuItem(SidebarMenuSub(SidebarMenuSubItem(SidebarMenuSubButton({ href: "#a" }, el("span", {}, "Intro"))))),
				SidebarMenuSkeleton({ showIcon: true })
			))
		)),
		SidebarSeparator(),
		SidebarFooter("footer"),
		SidebarRail()
	),
	SidebarInset(el("header", {}, SidebarTrigger()), el("p", {}, "Main"))
);

test("SidebarProvider: wrapper, css vars, controller defaults to expanded", () => {
	const wrapper = shell();
	const sidebar = slot("sidebar", wrapper);

	assert.equal(wrapper.dataset.slot, "sidebar-wrapper");
	assert.equal(wrapper.style.getPropertyValue("--sidebar-width"), "16rem");
	assert.equal(sidebar.dataset.state, "expanded");
	assert.equal(sidebar.dataset.collapsible, "");
	assert.equal(sidebar.dataset.variant, "sidebar");
	assert.equal(sidebar.dataset.side, "left");

	const controller = useSidebar(sidebar);

	assert.equal(controller.open, true);
	assert.equal(controller.state, "expanded");
	assert.equal(controller.isMobile, false);
	assert.equal(useSidebar(), controller, "no node → most recent provider");
});

test("SidebarTrigger, SidebarRail and Ctrl+B toggle; collapsed sets data-collapsible", () => {
	const wrapper = shell();
	const sidebar = slot("sidebar", wrapper);
	let clicked = 0;

	document.body.append(wrapper);
	slot("sidebar-trigger", wrapper).click();
	assert.equal(sidebar.dataset.state, "collapsed");
	assert.equal(sidebar.dataset.collapsible, "icon");

	slot("sidebar-rail", wrapper).click();
	assert.equal(sidebar.dataset.state, "expanded");

	window.dispatchEvent(new KeyboardEvent("keydown", { key: "b", ctrlKey: true }));
	assert.equal(sidebar.dataset.state, "collapsed");

	const custom = SidebarTrigger({ onclick: () => { clicked += 1; } });

	slot("sidebar-inset", wrapper).append(custom);
	custom.click();
	assert.equal(clicked, 1, "the caller's onclick runs too");
	assert.equal(sidebar.dataset.state, "expanded");
	wrapper.remove();
});

test("open binds two-way to [state, key] and reports onOpenChange", () => {
	const s = state({ open: false });
	const changes = [];
	const wrapper = shell({ open: [s, "open"], onOpenChange: (v) => changes.push(v) });
	const sidebar = slot("sidebar", wrapper);

	assert.equal(sidebar.dataset.state, "collapsed");
	s.open = true;
	assert.equal(sidebar.dataset.state, "expanded");
	useSidebar(sidebar).toggleSidebar();
	assert.equal(s.open, false);
	assert.deepEqual(changes, [false]);
});

test("persist stores the open state (localStorage, like shadcn's cookie)", () => {
	localStorage.removeItem("test_sidebar");

	const first = shell({ persist: "test_sidebar" });

	useSidebar(slot("sidebar", first)).setOpen(false);
	assert.deepEqual(JSON.parse(localStorage.getItem("test_sidebar")), { open: false });

	const second = shell({ persist: "test_sidebar" });

	assert.equal(slot("sidebar", second).dataset.state, "collapsed", "restored");
	localStorage.removeItem("test_sidebar");
});

test("parts carry shadcn data attributes", () => {
	const wrapper = shell();
	const button = slot("sidebar-menu-button", wrapper);

	assert.equal(button.dataset.active, "true");
	assert.equal(button.dataset.size, "default");
	assert.equal(button.getAttribute("type"), "button");
	assert.equal(wrapper.querySelectorAll("[data-slot=sidebar-menu-button]")[1].tagName, "A");
	assert.equal(slot("sidebar-menu-sub-button", wrapper).dataset.size, "md");
	assert.ok(slot("sidebar-menu-action", wrapper).className.includes("md:opacity-0"));
	assert.ok(slot("sidebar-menu-skeleton", wrapper).querySelector("[data-sidebar=menu-skeleton-icon]"));
	assert.equal(slot("sidebar-group-action", wrapper).getAttribute("type"), "button");
});

test("menu button tooltip only opens while collapsed to icons", async () => {
	const wrapper = shell();
	const button = slot("sidebar-menu-button", wrapper);

	document.body.append(wrapper);
	button.dispatchEvent(new Event("pointerenter"));
	await tick();
	assert.equal(slot("tooltip-content"), null, "expanded: no tooltip");
	button.dispatchEvent(new Event("pointerleave"));
	await tick();

	useSidebar(button).setOpen(false);
	button.dispatchEvent(new Event("pointerenter"));
	await tick();
	assert.equal(slot("tooltip-content").textContent, "Home");
	button.dispatchEvent(new Event("pointerleave"));
	await tick(20);
	assert.equal(slot("tooltip-content"), null);
	wrapper.remove();
});

test("mobile: content moves into a Sheet that the trigger opens", async () => {
	window.happyDOM.setViewport({ width: 375, height: 700 });

	const host = document.createElement("div");

	document.body.append(host);

	const mounted = mount(host, () => shell());
	const wrapper = host.firstChild;
	const controller = useSidebar(slot("sidebar", wrapper));

	assert.equal(controller.isMobile, true);
	assert.equal(slot("sidebar-inner", wrapper).childNodes.length, 0, "content left the desktop panel");

	slot("sidebar-trigger", wrapper).click();
	assert.equal(controller.openMobile, true);

	const sheet = document.querySelector("[data-mobile=true]");

	assert.ok(sheet, "sheet opened");
	assert.ok(sheet.querySelector("[data-slot=sidebar-menu-button]"), "menu lives in the sheet");
	assert.equal(useSidebar(sheet.querySelector("[data-slot=sidebar-menu-button]")), controller, "parts in the sheet still find their provider");

	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	assert.equal(controller.openMobile, false);
	await tick();
	mounted.dispose();
	host.remove();
	window.happyDOM.setViewport({ width: 1024, height: 768 });
});

test("collapsible none renders a plain panel", () => {
	const wrapper = SidebarProvider({ persist: false }, Sidebar({ collapsible: "none" }, "x"));
	const sidebar = slot("sidebar", wrapper);

	assert.ok(sidebar.className.includes("w-(--sidebar-width)"));
	assert.equal(sidebar.querySelector("[data-slot=sidebar-gap]"), null);
});

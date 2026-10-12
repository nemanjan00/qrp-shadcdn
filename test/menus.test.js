import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, list, when } from "@nemanjan00/qrp";
import {
	Button,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuLabel, DropdownMenuItem,
	DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator,
	DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal,
	DropdownMenuGroup,
	ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
	Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
	NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent,
	NavigationMenuLink, navigationMenuTriggerStyle
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const slot = (name) => document.querySelector(`[data-slot=${name}]`);
const press = (target, key) => target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
const pointer = (target) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }));
const itemText = (name) => [...document.querySelectorAll("[data-qs-menu-item]")].find((item) => item.textContent.includes(name));

const cleanup = async () => {
	press(document, "Escape");
	press(document, "Escape");
	await tick();
	document.body.replaceChildren();
};

test("DropdownMenu: opens from the trigger with menu roles and closes on select", async () => {
	const selected = [];

	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			DropdownMenuLabel("My Account"),
			DropdownMenuGroup(
				DropdownMenuItem({ onSelect: () => selected.push("profile") }, "Profile", DropdownMenuShortcut("⇧⌘P")),
				DropdownMenuItem({ disabled: true }, "Billing")
			),
			DropdownMenuSeparator(),
			DropdownMenuItem({ variant: "destructive" }, "Log out")
		)
	));

	const trigger = document.querySelector("button");

	assert.equal(trigger.getAttribute("aria-haspopup"), "menu");
	trigger.click();

	const content = slot("dropdown-menu-content");

	assert.equal(content.getAttribute("role"), "menu");
	assert.equal(itemText("Profile").getAttribute("role"), "menuitem");
	assert.equal(itemText("Billing").getAttribute("aria-disabled"), "true");
	assert.equal(itemText("Log out").dataset.variant, "destructive");
	assert.equal(slot("dropdown-menu-separator").getAttribute("role"), "separator");

	itemText("Billing").click();
	assert.ok(content.isConnected, "a disabled item does nothing");

	itemText("Profile").click();
	assert.deepEqual(selected, ["profile"]);
	await tick();
	assert.equal(content.isConnected, false);
	assert.equal(document.activeElement, trigger, "focus returns to the trigger");
	await cleanup();
});

test("DropdownMenu: onSelect preventDefault keeps it open", async () => {
	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(DropdownMenuItem({ onSelect: (event) => event.preventDefault() }, "Stay"))
	));
	document.querySelector("button").click();
	itemText("Stay").click();
	await tick();
	assert.ok(slot("dropdown-menu-content"));
	await cleanup();
});

test("DropdownMenu: keyboard — open with ArrowDown, arrows skip disabled, Home/End, typeahead, Enter selects", async () => {
	let chosen = "";

	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			DropdownMenuItem({ onSelect: () => { chosen = "apple"; } }, "Apple"),
			DropdownMenuItem({ disabled: true }, "Banana"),
			DropdownMenuItem({ onSelect: () => { chosen = "cherry"; } }, "Cherry"),
			DropdownMenuItem("Date")
		)
	));

	const trigger = document.querySelector("button");

	press(trigger, "ArrowDown");

	const content = slot("dropdown-menu-content");

	assert.equal(document.activeElement, itemText("Apple"));
	assert.ok(itemText("Apple").hasAttribute("data-highlighted"));

	press(document.activeElement, "ArrowDown");
	assert.equal(document.activeElement, itemText("Cherry"), "skips the disabled item");
	assert.equal(itemText("Apple").hasAttribute("data-highlighted"), false);

	press(document.activeElement, "End");
	assert.equal(document.activeElement, itemText("Date"));
	press(document.activeElement, "Home");
	assert.equal(document.activeElement, itemText("Apple"));

	press(document.activeElement, "c");
	assert.equal(document.activeElement, itemText("Cherry"), "typeahead");

	press(document.activeElement, "Enter");
	assert.equal(chosen, "cherry");
	await tick();
	assert.equal(content.isConnected, false);
	await cleanup();
});

test("DropdownMenu: checkbox items toggle a bound key; radio group selects a value", async () => {
	const s = state({ bar: true, position: "bottom" });

	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			DropdownMenuCheckboxItem({ checked: [s, "bar"] }, "Status Bar"),
			DropdownMenuRadioGroup({ value: [s, "position"] },
				DropdownMenuRadioItem({ value: "top" }, "Top"),
				DropdownMenuRadioItem({ value: "bottom" }, "Bottom")
			)
		)
	));
	document.querySelector("button").click();

	const checkbox = itemText("Status Bar");

	assert.equal(checkbox.getAttribute("role"), "menuitemcheckbox");
	assert.equal(checkbox.dataset.state, "checked");
	assert.equal(checkbox.getAttribute("aria-checked"), "true");

	checkbox.click();
	assert.equal(s.bar, false);
	assert.equal(checkbox.dataset.state, "unchecked");

	await tick();
	document.querySelector("button").click();
	assert.equal(itemText("Bottom").dataset.state, "checked");
	assert.equal(itemText("Top").dataset.state, "unchecked");
	itemText("Top").click();
	assert.equal(s.position, "top");
	assert.equal(itemText("Top").getAttribute("aria-checked"), "true");
	assert.equal(itemText("Bottom").dataset.state, "unchecked");
	await cleanup();
});

test("DropdownMenu: submenus open with ArrowRight / hover, ArrowLeft closes, selection closes the tree", async () => {
	let invited = 0;

	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			DropdownMenuItem("Team"),
			DropdownMenuSub(
				DropdownMenuSubTrigger("Invite users"),
				DropdownMenuPortal(DropdownMenuSubContent(DropdownMenuItem({ onSelect: () => { invited += 1; } }, "Email"), DropdownMenuItem("Message")))
			)
		)
	));

	const trigger = document.querySelector("button");

	press(trigger, "ArrowDown");

	const content = slot("dropdown-menu-content");
	const subTrigger = slot("dropdown-menu-sub-trigger");

	assert.equal(subTrigger.getAttribute("aria-haspopup"), "menu");
	press(document.activeElement, "ArrowDown");
	assert.equal(document.activeElement, subTrigger);

	press(subTrigger, "ArrowRight");

	const sub = slot("dropdown-menu-sub-content");

	assert.ok(sub);
	assert.equal(subTrigger.dataset.state, "open");
	assert.equal(document.activeElement, itemText("Email"));

	press(document.activeElement, "ArrowLeft");
	await tick();
	assert.equal(slot("dropdown-menu-sub-content"), null);
	assert.equal(document.activeElement, subTrigger);

	subTrigger.dispatchEvent(new Event("pointermove", { bubbles: true }));
	assert.ok(slot("dropdown-menu-sub-content"), "hover opens the submenu");

	await tick();
	pointer(slot("dropdown-menu-sub-content"));
	assert.ok(content.isConnected, "a click in the submenu keeps the root open");

	itemText("Email").click();
	assert.equal(invited, 1);
	await tick();
	assert.equal(slot("dropdown-menu-sub-content"), null);
	assert.equal(content.isConnected, false);
	await cleanup();
});

test("DropdownMenu: Escape in a submenu closes the whole tree; outside click closes both", async () => {
	const s = state({ open: false });

	document.body.append(DropdownMenu({ open: [s, "open"] },
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(DropdownMenuSub(DropdownMenuSubTrigger("More"), DropdownMenuSubContent(DropdownMenuItem("Deep"))))
	));
	s.open = true;
	slot("dropdown-menu-sub-trigger").click();
	assert.ok(slot("dropdown-menu-sub-content"));
	press(document, "Escape");
	assert.equal(s.open, false);
	await tick();
	assert.equal(slot("dropdown-menu-sub-content"), null);

	s.open = true;
	slot("dropdown-menu-sub-trigger").click();
	await tick();
	pointer(document.body);
	assert.equal(s.open, false);
	await tick();
	assert.equal(slot("dropdown-menu-sub-content"), null);
	assert.equal(slot("dropdown-menu-content"), null);
	await cleanup();
});

test("ContextMenu: opens at the pointer on contextmenu, reopens elsewhere, selects", async () => {
	let opened = 0;

	document.body.append(ContextMenu(
		ContextMenuTrigger({ class: "area" }, "Right click here"),
		ContextMenuContent(ContextMenuItem({ onSelect: () => { opened += 1; } }, "Back"), ContextMenuItem("Forward"))
	));

	const area = document.querySelector(".area");
	const fire = (x, y) => {
		const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y });

		area.dispatchEvent(event);

		return event;
	};

	assert.equal(area.dataset.slot, "context-menu-trigger");

	const first = fire(120, 80);

	assert.equal(first.defaultPrevented, true);

	const content = slot("context-menu-content");

	assert.ok(content);
	assert.equal(content.style.left, "122px", "side right, sideOffset 2");
	assert.equal(content.style.top, "80px");
	assert.equal(area.dataset.state, "open");

	fire(200, 150);
	assert.equal(content.style.left, "202px", "a second right click repositions");

	itemText("Back").click();
	assert.equal(opened, 1);
	await tick();
	assert.equal(content.isConnected, false);
	await cleanup();
});

test("ContextMenu: a disabled trigger lets the native menu through", async () => {
	document.body.append(ContextMenu(ContextMenuTrigger({ disabled: true, class: "area" }, "x"), ContextMenuContent(ContextMenuItem("a"))));

	const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });

	document.querySelector(".area").dispatchEvent(event);
	assert.equal(event.defaultPrevented, false);
	assert.equal(slot("context-menu-content"), null);
	await cleanup();
});

test("Menubar: one menu at a time, hover switches, arrows move between menus", async () => {
	document.body.append(Menubar(
		MenubarMenu(MenubarTrigger("File"), MenubarContent(MenubarItem("New Tab"))),
		MenubarMenu(MenubarTrigger("Edit"), MenubarContent(MenubarItem("Undo"))),
		MenubarMenu(MenubarTrigger("View"), MenubarContent(MenubarItem("Zoom")))
	));

	const bar = slot("menubar");
	const [file, edit, view] = [...bar.querySelectorAll("button")];

	assert.equal(bar.getAttribute("role"), "menubar");
	assert.equal(file.getAttribute("tabindex"), "0");
	assert.equal(edit.getAttribute("tabindex"), "-1");

	edit.dispatchEvent(new Event("pointerenter"));
	assert.equal(slot("menubar-content"), null, "hover alone doesn't open the first menu");

	file.click();
	assert.ok(itemText("New Tab"));

	edit.dispatchEvent(new Event("pointerenter"));
	await tick();
	assert.equal(file.dataset.state, "closed");
	assert.equal(edit.dataset.state, "open");
	assert.ok(itemText("Undo"));
	assert.equal(itemText("New Tab"), undefined);

	press(slot("menubar-content"), "ArrowRight");
	await tick();
	assert.equal(view.dataset.state, "open");
	assert.equal(document.activeElement, itemText("Zoom"));

	press(document.activeElement, "ArrowRight");
	await tick();
	assert.equal(file.dataset.state, "open", "wraps around");
	await cleanup();
});

test("Menubar: arrows move focus between closed triggers", async () => {
	document.body.append(Menubar(
		MenubarMenu(MenubarTrigger("File"), MenubarContent(MenubarItem("a"))),
		MenubarMenu(MenubarTrigger("Edit"), MenubarContent(MenubarItem("b")))
	));

	const [file, edit] = [...document.querySelectorAll("[data-slot=menubar] button")];

	file.focus();
	press(file, "ArrowRight");
	assert.equal(document.activeElement, edit);
	assert.equal(slot("menubar-content"), null);
	await cleanup();
});

test("NavigationMenu: click opens a panel in the viewport, switching sets motion, link click closes", async () => {
	document.body.append(NavigationMenu(
		NavigationMenuList(
			NavigationMenuItem(NavigationMenuTrigger("Getting started"), NavigationMenuContent(NavigationMenuLink({ href: "#intro" }, "Introduction"))),
			NavigationMenuItem(NavigationMenuTrigger("Components"), NavigationMenuContent(NavigationMenuLink({ href: "#alert" }, "Alert"))),
			NavigationMenuItem(NavigationMenuLink({ href: "#docs", class: navigationMenuTriggerStyle() }, "Docs"))
		)
	));

	const root = slot("navigation-menu");
	const [start, components] = [...root.querySelectorAll("[data-slot=navigation-menu-trigger]")];
	const viewport = slot("navigation-menu-viewport");

	assert.equal(root.dataset.viewport, "true");
	assert.equal(slot("navigation-menu-content"), null, "panels stay aside while closed");

	start.click();
	assert.equal(start.dataset.state, "open");
	assert.equal(start.getAttribute("aria-expanded"), "true");
	assert.equal(viewport.dataset.state, "open");
	assert.equal(viewport.querySelector("[data-slot=navigation-menu-content]").textContent, "Introduction");

	components.click();
	await tick();

	const panel = viewport.querySelector("[data-slot=navigation-menu-content][data-state=open]");

	assert.equal(panel.textContent, "Alert");
	assert.equal(panel.dataset.motion, "from-end");
	assert.equal(start.dataset.state, "closed");

	panel.querySelector("a").click();
	assert.equal(components.dataset.state, "closed");
	assert.equal(viewport.dataset.state, "closed");
	await cleanup();
});

test("NavigationMenu: hover opens after the delay; Escape closes; viewport: false renders in the item", async () => {
	document.body.append(NavigationMenu({ viewport: false, delayDuration: 10 },
		NavigationMenuList(NavigationMenuItem(NavigationMenuTrigger("List"), NavigationMenuContent(NavigationMenuLink({ href: "#a" }, "A"))))
	));

	const trigger = slot("navigation-menu-trigger");

	trigger.dispatchEvent(new Event("pointerenter"));
	assert.equal(trigger.dataset.state, "closed");
	await tick(20);
	assert.equal(trigger.dataset.state, "open");
	assert.equal(slot("navigation-menu-content").parentElement, slot("navigation-menu-item"));

	press(document, "Escape");
	assert.equal(trigger.dataset.state, "closed");
	await cleanup();
});

test("DropdownMenu: items from list() and when() navigate, select and stay in sync", async () => {
	const s = state({ files: [{ id: 1, name: "alpha" }, { id: 2, name: "beta" }], admin: false, sort: "beta" });
	const picked = [];

	document.body.append(DropdownMenu(
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			list(() => s.files, (file) => file.id, (file) => DropdownMenuItem({ onSelect: () => picked.push(file.name) }, () => file.name)),
			when(() => s.admin, () => DropdownMenuItem("Admin")),
			DropdownMenuRadioGroup({ value: [s, "sort"] },
				list(() => s.files, (file) => file.id, (file) => DropdownMenuRadioItem({ value: file.name }, () => `by ${file.name}`)))
		)
	));

	const trigger = document.querySelector("button");

	press(trigger, "ArrowDown");
	assert.equal(document.activeElement, itemText("alpha"));

	s.admin = true;
	s.files.push({ id: 3, name: "gamma" });
	await tick();

	press(document.activeElement, "End");
	assert.equal(document.activeElement, itemText("by gamma"), "items added later join keyboard nav");
	assert.equal(itemText("by beta").dataset.state, "checked");
	assert.equal(itemText("by gamma").dataset.state, "unchecked", "a radio item added later gets its state");
	assert.ok(itemText("Admin"), "when() branch renders an item");

	itemText("by gamma").click();
	assert.equal(s.sort, "gamma");
	await tick();

	trigger.click();
	s.files.splice(0, 1);
	await tick();
	assert.equal(itemText("alpha"), undefined, "list() removes items reactively");
	itemText("beta").click();
	assert.deepEqual(picked, ["beta"]);
	await cleanup();
});

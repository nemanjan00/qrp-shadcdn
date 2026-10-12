import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state } from "@nemanjan00/qrp";
import {
	Button, Dialog, DialogContent, DialogTitle,
	Popover, PopoverTrigger, PopoverContent, PopoverClose, Tooltip, TooltipTrigger, TooltipContent,
	TooltipProvider, HoverCard, HoverCardTrigger, HoverCardContent
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const key = (name) => document.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
const pointer = (target) => target.dispatchEvent(new Event("pointerdown", { bubbles: true }));
const slot = (name) => document.querySelector(`[data-slot=${name}]`);

test("Popover: toggles from the trigger, positions with side/align, closes on outside click", async () => {
	document.body.append(Popover(
		PopoverTrigger(Button("Open")),
		PopoverContent({ side: "right", align: "start" }, "Dimensions", PopoverClose(Button("x")))
	));

	const trigger = document.querySelector("button");

	trigger.click();

	const content = slot("popover-content");

	assert.ok(content);
	assert.equal(content.style.position, "fixed");
	assert.equal(content.dataset.side, "right");
	assert.equal(content.dataset.align, "start");
	assert.equal(trigger.getAttribute("aria-expanded"), "true");

	await tick();
	pointer(content);
	assert.ok(content.isConnected, "inside click keeps it open");
	pointer(document.body);
	await tick();
	assert.equal(content.isConnected, false);

	trigger.click();
	trigger.click();
	await tick();
	assert.equal(slot("popover-content"), null, "a second trigger click closes");

	trigger.click();
	content.querySelector("[data-qs-role=popover-close]").click();
	await tick();
	assert.equal(slot("popover-content"), null);
	document.body.replaceChildren();
});

test("Popover inside a Dialog: inside-popover click keeps both; Escape closes only the popover", async () => {
	const s = state({ dialog: true, popover: false });

	document.body.append(Dialog({ open: [s, "dialog"] },
		DialogContent(DialogTitle("T"), Popover({ open: [s, "popover"] }, PopoverTrigger(Button("Pick")), PopoverContent("menu")))
	));
	await tick();
	s.popover = true;
	await tick();

	pointer(slot("popover-content"));
	assert.equal(s.popover, true);
	assert.equal(s.dialog, true);

	pointer(slot("dialog-title"));
	assert.equal(s.popover, false, "clicking the dialog closes the popover above it");
	assert.equal(s.dialog, true);

	s.popover = true;
	await tick();
	key("Escape");
	assert.equal(s.popover, false);
	assert.equal(s.dialog, true);
	key("Escape");
	assert.equal(s.dialog, false);
	await tick();
	document.body.replaceChildren();
});

test("Tooltip: opens on hover after the delay, closes on leave, describes the trigger", async () => {
	document.body.append(TooltipProvider(Tooltip({ delayDuration: 10 }, TooltipTrigger(Button("Hover")), TooltipContent("Add to library"))));

	const trigger = document.querySelector("button");

	trigger.dispatchEvent(new Event("pointerenter"));
	assert.equal(slot("tooltip-content"), null);
	await tick(20);

	const content = slot("tooltip-content");

	assert.ok(content);
	assert.equal(content.getAttribute("role"), "tooltip");
	assert.equal(trigger.getAttribute("aria-describedby"), content.id);
	// Preferred side is top, but the trigger sits at y=0 here, so it flips.
	assert.equal(content.dataset.side, "bottom");
	assert.ok(content.querySelector("[data-slot=tooltip-arrow]"));

	trigger.dispatchEvent(new Event("pointerleave"));
	await tick(20);
	assert.equal(slot("tooltip-content"), null);
	document.body.replaceChildren();
});

test("HoverCard: stays open while the pointer is over the card", async () => {
	document.body.append(HoverCard({ openDelay: 0, closeDelay: 15 }, HoverCardTrigger({ href: "#" }, "@nextjs"), HoverCardContent("card")));

	const trigger = document.querySelector("a");

	trigger.dispatchEvent(new Event("pointerenter"));
	await tick();

	const content = slot("hover-card-content");

	assert.ok(content);
	trigger.dispatchEvent(new Event("pointerleave"));
	content.dispatchEvent(new Event("pointerenter"));
	await tick(30);
	assert.ok(content.isConnected);
	content.dispatchEvent(new Event("pointerleave"));
	await tick(30);
	assert.equal(content.isConnected, false);
	document.body.replaceChildren();
});

test("layerWhen: re-entering the open effect while a layer opens opens it once", async () => {
	const { layerWhen } = await import("../utils/layer.js");
	const { controllable } = await import("../utils/index.js");
	const { effect: run } = await import("@nemanjan00/qrp");
	const pokes = state({ n: 0 });
	const open = controllable(undefined, false);
	let builds = 0;

	// An effect that also reads `pokes`, and a build() that writes it — the
	// synchronous re-entry the portal → setOwner → context path produces.
	run(() => {
		pokes.n;
	});

	layerWhen({ get: () => (pokes.n, open.get()), set: open.set }, () => {
		builds += 1;
		pokes.n += 1;

		return { content: document.createElement("div") };
	});

	open.set(true);
	assert.equal(builds, 1, "one layer, not one per re-entry");
	open.set(false);
	await tick();
	document.body.replaceChildren();
});

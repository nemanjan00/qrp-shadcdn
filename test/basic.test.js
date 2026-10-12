import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state } from "@nemanjan00/qrp";
import {
	Button, buttonVariants, Badge, Card, CardHeader, CardTitle, CardAction, CardContent,
	Alert, AlertTitle, Input, Textarea, Label, Separator, Skeleton, Kbd, KbdGroup, Spinner,
	AspectRatio, Table, TableBody, TableRow, TableCell, Progress,
	Avatar, AvatarImage, AvatarFallback
} from "../index.js";

test("Button: slot, variant data, default type, children", () => {
	const button = Button({ variant: "outline", size: "sm" }, "Save");

	assert.equal(button.tagName, "BUTTON");
	assert.equal(button.dataset.slot, "button");
	assert.equal(button.dataset.variant, "outline");
	assert.equal(button.dataset.size, "sm");
	assert.equal(button.getAttribute("type"), "button");
	assert.equal(button.textContent, "Save");
	assert.ok(button.className.includes("border bg-background"));
	assert.ok(button.className.includes("h-8"));
});

test("Button: shorthand, class merge, events, `as` tag, explicit submit", () => {
	let clicks = 0;
	const plain = Button("Go");
	const custom = Button({ class: "w-full", onclick: () => { clicks += 1; } }, "Go");
	const link = Button({ as: "a", href: "/x", variant: "link" }, "Link");
	const submit = Button({ type: "submit" }, "Send");

	assert.equal(plain.dataset.variant, "default");
	assert.ok(custom.className.endsWith("w-full"));
	custom.click();
	assert.equal(clicks, 1);
	assert.equal(link.tagName, "A");
	assert.equal(link.getAttribute("href"), "/x");
	assert.equal(link.hasAttribute("type"), false);
	assert.equal(submit.getAttribute("type"), "submit");
	assert.equal(buttonVariants({ variant: "ghost" }).includes("hover:bg-accent"), true);
});

test("Button: reactive variant and disabled", () => {
	const s = state({ busy: false });
	const button = Button({ variant: () => (s.busy ? "secondary" : "default"), disabled: () => s.busy }, "Run");

	assert.ok(button.className.includes("bg-primary"));
	s.busy = true;
	assert.ok(button.className.includes("bg-secondary"));
	assert.equal(button.disabled, true);
});

test("Badge and Card compose with data-slots", () => {
	const card = Card(CardHeader(CardTitle("Title"), CardAction(Badge({ variant: "secondary" }, "New"))), CardContent("Body"));

	assert.equal(card.dataset.slot, "card");
	assert.equal(card.querySelector("[data-slot=card-title]").textContent, "Title");
	assert.equal(card.querySelector("[data-slot=badge]").dataset.variant, "secondary");
	assert.equal(card.querySelector("[data-slot=card-content]").textContent, "Body");
});

test("Alert has role=alert and variant classes", () => {
	const alert = Alert({ variant: "destructive" }, AlertTitle("Oops"));

	assert.equal(alert.getAttribute("role"), "alert");
	assert.ok(alert.className.includes("text-destructive"));
});

test("Input and Textarea bind two-way", () => {
	const s = state({ name: "Ada", bio: "" });
	const input = Input({ bind: [s, "name"], placeholder: "Name" });
	const area = Textarea({ bind: [s, "bio"] });

	assert.equal(input.value, "Ada");
	input.value = "Grace";
	input.dispatchEvent(new Event("input"));
	assert.equal(s.name, "Grace");
	s.bio = "hi";
	assert.equal(area.value, "hi");
	assert.equal(input.getAttribute("placeholder"), "Name");
});

test("Label, Separator, Skeleton, Kbd, Spinner", () => {
	assert.equal(Label({ for: "x" }, "Name").getAttribute("for"), "x");
	assert.equal(Separator().getAttribute("role"), "none");

	const vertical = Separator({ orientation: "vertical", decorative: false });

	assert.equal(vertical.dataset.orientation, "vertical");
	assert.equal(vertical.getAttribute("role"), "separator");
	assert.ok(Skeleton({ class: "h-4" }).className.includes("animate-pulse"));
	assert.equal(KbdGroup(Kbd("⌘"), Kbd("K")).querySelectorAll("kbd").length, 2);

	const spinner = Spinner({ class: "size-6" });

	assert.equal(spinner.getAttribute("role"), "status");
	assert.ok(spinner.getAttribute("class").includes("animate-spin size-6"));
});

test("AspectRatio sets the ratio", () => {
	const box = AspectRatio({ ratio: 16 / 9 }, document.createElement("img"));

	assert.ok(box.style.aspectRatio.startsWith(String(16 / 9)));
});

test("Table wraps in a scroll container", () => {
	const table = Table(TableBody(TableRow(TableCell("a"))));

	assert.equal(table.dataset.slot, "table-container");
	assert.equal(table.querySelector("table").dataset.slot, "table");
	assert.equal(table.querySelector("td").textContent, "a");
});

test("Progress reflects a reactive value", () => {
	const s = state({ v: 25 });
	const bar = Progress({ value: () => s.v });
	const indicator = bar.firstChild;

	assert.equal(bar.getAttribute("aria-valuenow"), "25");
	assert.equal(indicator.style.transform, "translateX(-75%)");
	s.v = 100;
	assert.equal(bar.dataset.state, "complete");
	assert.equal(Progress().dataset.state, "indeterminate");
});

test("Avatar swaps fallback for image on load", () => {
	const avatar = Avatar(AvatarImage({ src: "x.png", alt: "" }), AvatarFallback("CN"));
	const img = avatar.querySelector("img");
	const fallback = avatar.querySelector("[data-slot=avatar-fallback]");

	assert.equal(img.hidden, true);
	img.dispatchEvent(new Event("load"));
	assert.equal(img.hidden, false);
	assert.equal(fallback.hidden, true);
});

test("a11y: AvatarImage defaults alt to \"\" (decorative); caller alt wins", async () => {
	const { AvatarImage: Img } = await import("../index.js");

	assert.equal(Img({ src: "x.png" }).getAttribute("alt"), "");
	assert.equal(Img({ src: "x.png", alt: "Ada" }).getAttribute("alt"), "Ada");
});

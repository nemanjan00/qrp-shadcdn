import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, el } from "@nemanjan00/qrp";
import { cn, variants, parseArgs, pick, controllable, setClassMerge } from "../utils/index.js";

test("cn joins strings, arrays and object maps, dropping falsy", () => {
	assert.equal(cn("a", ["b", null, ["c"]], { d: true, e: false }, undefined, ""), "a b c d");
});

test("cn with a thunk input returns a reactive thunk", () => {
	const s = state({ on: false });
	const classes = cn("base", () => (s.on ? "on" : "off"));

	assert.equal(typeof classes, "function");

	const node = el("div", { class: classes });

	assert.equal(node.className, "base off");
	s.on = true;
	assert.equal(node.className, "base on");
});

test("setClassMerge plugs in a conflict resolver", () => {
	setClassMerge((classes) => classes.split(" ").reverse().join(" "));
	assert.equal(cn("a", "b"), "b a");
	setClassMerge(null);
	assert.equal(cn("a", "b"), "a b");
});

test("variants applies defaults, overrides, compounds and class", () => {
	const v = variants("base", {
		variants: { size: { sm: "s", lg: "l" }, tone: { a: "ta", b: "tb" } },
		defaultVariants: { size: "sm", tone: "a" },
		compoundVariants: [{ size: "lg", tone: "b", class: "combo" }]
	});

	assert.equal(v(), "base s ta");
	assert.equal(v({ size: "lg", tone: "b", class: "x" }), "base l tb combo x");
});

test("variants returns a thunk when a variant prop is reactive", () => {
	const s = state({ size: "sm" });
	const v = variants("base", { variants: { size: { sm: "s", lg: "l" } } });
	const node = el("div", { class: v({ size: () => s.size }) });

	assert.equal(node.className, "base s");
	s.size = "lg";
	assert.equal(node.className, "base l");
});

test("parseArgs separates props from children and aliases className", () => {
	const child = document.createElement("span");

	assert.deepEqual(parseArgs(["text", child]), { props: {}, children: ["text", child] });

	const parsed = parseArgs([{ className: "x", id: "a" }, "kid"]);

	assert.equal(parsed.props.class, "x");
	assert.equal(parsed.props.id, "a");
	assert.equal(parsed.props.className, undefined);
	assert.deepEqual(parsed.children, ["kid"]);
});

test("pick drops undefined values from the rest", () => {
	const [own, rest] = pick({ variant: "x", id: undefined, title: "t" }, ["variant"]);

	assert.deepEqual(own, { variant: "x" });
	assert.deepEqual(rest, { title: "t" });
});

test("controllable: internal, bound tuple, and driven thunk", () => {
	const local = controllable(undefined, false);

	local.set(true);
	assert.equal(local.get(), true);

	const s = state({ open: false });
	const changes = [];
	const bound = controllable([s, "open"], false, (v) => changes.push(v));

	bound.set(true);
	assert.equal(s.open, true);
	assert.deepEqual(changes, [true]);

	const driven = controllable(() => s.open, false, (v) => changes.push(v));

	assert.equal(driven.get(), true);
	driven.set(false);
	assert.equal(s.open, true, "a driven value is only changed by its owner");
	assert.deepEqual(changes, [true, false]);
});

test("cn resolves Tailwind conflicts last-wins, per variant prefix", () => {
	assert.equal(cn("h-9 w-full px-4", "h-8 w-[200px]"), "px-4 h-8 w-[200px]");
	assert.equal(cn("bg-primary hover:bg-primary/90", "bg-red-500"), "hover:bg-primary/90 bg-red-500");
	assert.equal(cn("text-sm text-muted-foreground", "text-lg"), "text-muted-foreground text-lg", "size and color are different groups");
	assert.equal(cn("text-muted-foreground", "text-center"), "text-muted-foreground text-center");
	assert.equal(cn("border border-input", "border-2 border-destructive"), "border-2 border-destructive");
	assert.equal(cn("rounded-md", "rounded-t-none"), "rounded-md rounded-t-none", "a longhand after a shorthand refines it");
	assert.equal(cn("px-4 py-2", "p-0"), "p-0", "a shorthand after longhands replaces them");
	assert.equal(cn("p-2", "px-4"), "p-2 px-4");
	assert.equal(cn("flex", "hidden md:flex"), "hidden md:flex");
	assert.equal(cn("data-[state=open]:bg-accent", "data-[state=open]:bg-muted"), "data-[state=open]:bg-muted");
	assert.equal(cn("[&_svg:not([class*='size-'])]:size-4", "size-6"), "[&_svg:not([class*='size-'])]:size-4 size-6", "colons inside [] are not variant separators");
	assert.equal(cn("size-9", "w-12"), "size-9 w-12");
	assert.equal(cn("w-4 h-4", "size-6"), "size-6");
	assert.equal(cn("-mt-2", "mt-4"), "mt-4");
	assert.equal(cn("foo bar", "foo"), "bar foo", "duplicates collapse, unknown classes kept");
});

test("merge: corners, arbitrary values, shadow color, inset-shadow, important and variant order", () => {
	[
		["rounded-md rounded-tl-none", "rounded-md rounded-tl-none"],
		["rounded-tl-none rounded-md", "rounded-md"],
		["rounded-tl-none rounded-t-lg", "rounded-t-lg"],
		["text-[13px] text-muted-foreground", "text-[13px] text-muted-foreground"],
		["text-sm text-[13px]", "text-[13px]"],
		["text-[#fff] text-red-500", "text-red-500"],
		["font-[500] font-mono", "font-[500] font-mono"],
		["border-[3px] border-input", "border-[3px] border-input"],
		["shadow-sm shadow-black/10", "shadow-sm shadow-black/10"],
		["shadow-sm shadow-lg", "shadow-lg"],
		["inset-0 inset-shadow-sm", "inset-0 inset-shadow-sm"],
		["p-4! p-2", "p-4! p-2"],
		["p-4! p-2!", "p-2!"],
		["hover:md:p-2 md:hover:p-4", "md:hover:p-4"],
		["[&>svg]:hover:p-2 hover:[&>svg]:p-4", "[&>svg]:hover:p-2 hover:[&>svg]:p-4"]
	].forEach(([input, expected]) => assert.equal(cn(input), expected, input));
});

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

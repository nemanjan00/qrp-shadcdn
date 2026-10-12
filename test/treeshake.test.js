import test from "node:test";
import assert from "node:assert/strict";
import esbuild from "esbuild";
import path from "node:path";

// The package entry is the unbundled source with `sideEffects` limited to CSS,
// so a bundler must drop every component an app doesn't import.
const bundle = (code) => esbuild.build({
	stdin: { contents: code, resolveDir: path.resolve("test"), loader: "js" },
	bundle: true,
	write: false,
	format: "esm",
	minify: true,
	logLevel: "silent"
}).then((result) => result.outputFiles[0].text);

test("importing Button alone leaves every other component out", () => bundle(
	"import { Button } from \"../index.js\"; document.body.append(Button(\"Hi\"));"
).then((code) => {
	assert.ok(code.includes("data-variant") || code.includes("button"), "Button is in");
	["dialog-content", "popover-content", "tooltip-content", "card-header", "sheet-content"].forEach((slot) => {
		assert.equal(code.includes(slot), false, `${slot} should be tree-shaken`);
	});
}));

test("importing Dialog leaves popups out", () => bundle(
	"import { Dialog, DialogContent } from \"../index.js\"; document.body.append(Dialog(DialogContent(\"x\")));"
).then((code) => {
	assert.ok(code.includes("dialog-content"));
	["popover-content", "tooltip-content", "hover-card-content"].forEach((slot) => {
		assert.equal(code.includes(slot), false, `${slot} should be tree-shaken`);
	});
}));

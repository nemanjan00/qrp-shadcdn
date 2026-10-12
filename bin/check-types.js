// Check that index.d.ts declares every runtime export of index.js, and that
// every value it declares (const/function) really exists at runtime.
//
// Run: npm run check:types
//
// Modules still in progress are allowlisted by file; their exports are listed
// as "pending" instead of failing the check.

import "../test/setup.js";
import fs from "node:fs";
import process from "node:process";

const DTS = "index.d.ts";
const PENDING = [];

// `export const|function|let|class Name` and `export { a, b as c } from …`.
const declaredValues = (source) => {
	const direct = [...source.matchAll(/^export\s+(?:declare\s+)?(?:const|function|let|class)\s+([A-Za-z_$][\w$]*)/gm)]
		.map((match) => match[1]);
	const named = [...source.matchAll(/^export\s*\{([^}]*)\}\s*from/gm)]
		.flatMap((match) => match[1].split(","))
		.map((entry) => entry.trim().split(/\s+as\s+/).pop())
		.filter(Boolean);

	return new Set(direct.concat(named));
};

// `export * from "<specifier>"` in the .d.ts: those names come from qrp.
const starSources = (source) => [...source.matchAll(/^export\s*\*\s*from\s*"([^"]+)"/gm)].map((match) => match[1]);

const RESOLVE = {
	"@nemanjan00/qrp": "../node_modules/@nemanjan00/qrp/dist/qrp.js"
};

const run = () => {
	const source = fs.readFileSync(DTS, "utf8");
	const declared = declaredValues(source);

	return Promise.all([
		import("../index.js"),
		Promise.all(starSources(source).map((spec) => import(RESOLVE[spec] || spec))),
		Promise.all(PENDING.map((file) => import(file)))
	]).then(([runtime, stars, pending]) => {
		stars.forEach((mod) => Object.keys(mod).forEach((name) => declared.add(name)));

		const pendingNames = new Set(pending.flatMap((mod) => Object.keys(mod)));
		const exported = Object.keys(runtime);
		const missing = exported.filter((name) => !declared.has(name) && !pendingNames.has(name));
		const waiting = exported.filter((name) => !declared.has(name) && pendingNames.has(name));
		const phantom = [...declared].filter((name) => !(name in runtime));

		console.log(`runtime exports: ${exported.length}, declared values: ${declared.size}`);

		if(waiting.length > 0) {
			console.log(`pending (allowlisted, not yet declared): ${waiting.join(", ")}`);
		}

		if(phantom.length > 0) {
			console.log(`declared but not exported at runtime: ${phantom.join(", ")}`);
		}

		if(missing.length > 0) {
			console.log(`MISSING declarations: ${missing.join(", ")}`);
		}

		return missing.length === 0 && phantom.length === 0;
	});
};

run()
	.then((ok) => {
		process.exit(ok ? 0 : 1);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

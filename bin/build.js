// Build the distribution shipped on npm and served by jsDelivr.
//
// Like shadcdn, everything lands in ONE ES module — dist/qrp-shadcdn.js — so a
// page needs a single import:
//
//   import { Button, state, mount } from "https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/+esm";
//
// qrp itself stays EXTERNAL (a bare `@nemanjan00/qrp` import). That is not an
// optimization, it is a correctness requirement: reactivity lives in qrp's
// module state, so the components and the app must share one copy of the core.
// jsDelivr's +esm rewrites the bare import to its own qrp URL; bundlers dedupe it.
//
// dist/qrp-shadcdn.css is compiled by Tailwind from the component sources: the
// theme tokens, preflight, and exactly the utilities the components use.
//
// Run: npm run build   (also runs automatically on `npm pack` / `npm publish`)

import esbuild from "esbuild";
import fs from "node:fs";
import zlib from "node:zlib";
import process from "node:process";
import { execFileSync } from "node:child_process";

const OUTDIR = "dist";
const ENTRY = "index.js";
const JS_OUT = `${OUTDIR}/qrp-shadcdn.js`;
const CSS_IN = "styles/qrp-shadcdn.css";
const CSS_OUT = `${OUTDIR}/qrp-shadcdn.css`;
const TAILWIND = "node_modules/.bin/tailwindcss";

const kb = (bytes) => (bytes / 1024).toFixed(1) + " KB";
const gzip = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

const report = (file) => {
	const buf = fs.readFileSync(file);

	console.log(`  ${file.padEnd(26)} ${kb(buf.length).padStart(9)}  ${kb(gzip(buf)).padStart(9)} gzip`);
};

const buildJs = () => esbuild.build({
	entryPoints: [ENTRY],
	outfile: JS_OUT,
	bundle: true,
	format: "esm",
	target: "es2020",
	minify: true,
	sourcemap: true,
	sourcesContent: true,
	legalComments: "inline",
	external: ["@nemanjan00/qrp", "@nemanjan00/qrp/*"]
});

const buildCss = () => {
	execFileSync(TAILWIND, ["-i", CSS_IN, "-o", CSS_OUT, "--minify"], { stdio: ["ignore", "ignore", "inherit"] });
};

fs.rmSync(OUTDIR, { recursive: true, force: true });
fs.mkdirSync(OUTDIR, { recursive: true });

buildJs()
	.then(() => {
		buildCss();

		console.log("built:");
		report(JS_OUT);
		report(CSS_OUT);
	})
	.catch((error) => {
		console.error(error);
		process.exit(1);
	});

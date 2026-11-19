// Build the demo as a self-contained static site in site/ — what render.com
// (or any static host) serves. render.yaml runs this as the build command.
//
// The repo's demo/index.html loads ../dist and ../node_modules through an
// import map, which only exists in a dev checkout — and as unbundled modules
// it is a four-deep request chain (page → app.js → demos/*.js → bundle → qrp
// core) before anything paints. The deployed page is built for first paint:
//
//   site/index.html   demo page, the Tailwind CSS inlined (no render-blocking
//                     stylesheet request), no import map
//   site/app.js       the demo + components + qrp in ONE minified module
//                     (+ app.js.map), tree-shaken from the npm source entry
//   site/qrp-logo.svg
//
// The dev demo (npm run demo) is unchanged: unbundled, edit-and-reload.
//
// Run: npm run build:site

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { execFileSync } from "node:child_process";
import esbuild from "esbuild";

const SITE = "site";
const TAILWIND = "node_modules/.bin/tailwindcss";

// demo/index.html lines the site build replaces
const STYLESHEET = /<link rel="stylesheet" href="\.\/demo\.built\.css">/;
const IMPORT_MAP = /\s*<script type="importmap">[\s\S]*?<\/script>/;

const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
const gzip = (buf) => zlib.gzipSync(buf, { level: 9 }).length;

const report = (file) => {
	const buf = fs.readFileSync(file);

	console.log(`  ${file.padEnd(22)} ${kb(buf.length).padStart(9)}  ${kb(gzip(buf)).padStart(9)} gzip`);
};

const copy = (from, to) => {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
};

const buildCss = () => {
	const out = path.join(SITE, "demo.css.tmp");

	execFileSync(TAILWIND, ["-i", "demo/demo.css", "-o", out, "--minify"], { stdio: ["ignore", "ignore", "inherit"] });

	const css = fs.readFileSync(out, "utf8");

	fs.rmSync(out);

	return css;
};

// The package's sideEffects list is CSS-only (so apps tree-shake components),
// which would also drop the demo's `import "./demos/x.js"` registrations.
// Demo files do register themselves on import: mark them as side-effectful.
const demoHasSideEffects = {
	name: "demo-has-side-effects",
	setup: (build) => {
		build.onResolve({ filter: /^\.\/(demos\/)?[\w-]+\.js$/ }, (args) => {
			if(!args.importer.includes(`${path.sep}demo${path.sep}`)) {
				return undefined;
			}

			return { path: path.join(args.resolveDir, args.path), sideEffects: true };
		});
	}
};

// One module for the whole page. The package's own name resolves to its
// source entry (index.js), so unused components tree-shake away; qrp's
// subpaths all import the same node_modules/@nemanjan00/qrp/dist/qrp.js, so the
// bundle holds exactly one reactive core.
const buildJs = () => esbuild.build({
	entryPoints: ["demo/app.js"],
	outfile: path.join(SITE, "app.js"),
	bundle: true,
	format: "esm",
	target: "es2020",
	minify: true,
	sourcemap: true,
	legalComments: "none",
	alias: { "@nemanjan00/qrp-shadcdn": "./index.js" },
	plugins: [demoHasSideEffects],
	logLevel: "warning"
});

const writeIndex = (css) => {
	const source = fs.readFileSync("demo/index.html", "utf8");

	[STYLESHEET, IMPORT_MAP].forEach((pattern) => {
		if(!pattern.test(source)) {
			throw new Error(`demo/index.html no longer matches ${pattern} — update bin/build-site.js`);
		}
	});

	// a function replacement: CSS may contain "$&"-style sequences
	const html = source
		.replace(STYLESHEET, () => `<style>${css}</style>`)
		.replace(IMPORT_MAP, "");

	fs.writeFileSync(path.join(SITE, "index.html"), html);
};

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });

buildJs().then(() => {
	writeIndex(buildCss());
	copy("demo/qrp-logo.svg", path.join(SITE, "qrp-logo.svg"));

	console.log(`site built: ${SITE}/`);
	["index.html", "app.js"].forEach((file) => report(path.join(SITE, file)));
});

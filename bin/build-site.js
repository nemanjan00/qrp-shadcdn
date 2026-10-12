// Build the demo as a self-contained static site in site/ — what render.com
// (or any static host) serves. render.yaml runs this as the build command.
//
// The repo's demo/index.html loads ../dist and ../node_modules, which only
// exist in a dev checkout. Here everything the page needs is copied into
// site/ and the import map is rewritten to point at those copies:
//
//   site/index.html           demo page (import map → ./vendor/…)
//   site/app.js, hero.js, demos/*.js   the demo code (+ qrp-logo.svg)
//   site/demo.css             Tailwind build of the library + demo utilities
//   site/vendor/qrp-shadcdn.js  our CDN bundle (imports only the bare qrp core)
//   site/vendor/qrp/qrp.js      qrp's core — the one module the bundle needs
//
// Run: npm run build:site

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const SITE = "site";
const QRP_DIST = "node_modules/@nemanjan00/qrp/dist";
const TAILWIND = "node_modules/.bin/tailwindcss";

const IMPORT_MAP_FROM = {
	"../node_modules/@nemanjan00/qrp/dist/qrp.js": "./vendor/qrp/qrp.js",
	"../dist/qrp-shadcdn.js": "./vendor/qrp-shadcdn.js",
	"./demo.built.css": "./demo.css"
};

const copy = (from, to) => {
	fs.mkdirSync(path.dirname(to), { recursive: true });
	fs.copyFileSync(from, to);
};

const copyWithMap = (from, to) => {
	copy(from, to);

	if(fs.existsSync(`${from}.map`)) {
		copy(`${from}.map`, `${to}.map`);
	}
};

const rewriteIndex = () => {
	const html = Object.entries(IMPORT_MAP_FROM).reduce(
		(page, [from, to]) => page.split(from).join(to),
		fs.readFileSync("demo/index.html", "utf8")
	);

	const missing = Object.keys(IMPORT_MAP_FROM).filter((from) => html.includes(from));

	if(missing.length > 0) {
		throw new Error(`site/index.html still references ${missing.join(", ")}`);
	}

	fs.writeFileSync(path.join(SITE, "index.html"), html);
};

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });

execFileSync(process.execPath, ["bin/build.js"], { stdio: "inherit" });
execFileSync(TAILWIND, ["-i", "demo/demo.css", "-o", path.join(SITE, "demo.css"), "--minify"], { stdio: ["ignore", "ignore", "inherit"] });

copyWithMap("dist/qrp-shadcdn.js", path.join(SITE, "vendor/qrp-shadcdn.js"));
copyWithMap(path.join(QRP_DIST, "qrp.js"), path.join(SITE, "vendor/qrp/qrp.js"));

copy("demo/app.js", path.join(SITE, "app.js"));
copy("demo/hero.js", path.join(SITE, "hero.js"));
copy("demo/qrp-logo.svg", path.join(SITE, "qrp-logo.svg"));
fs.readdirSync("demo/demos")
	.filter((file) => file.endsWith(".js"))
	.forEach((file) => copy(path.join("demo/demos", file), path.join(SITE, "demos", file)));

rewriteIndex();

console.log(`site built: ${SITE}/ (${fs.readdirSync(SITE).length} entries)`);

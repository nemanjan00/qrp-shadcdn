// qrp-shadcdn demo — every component, the way ui.shadcn.com shows them.
// Demos live in ./demos/*.js (one file per batch) and register themselves.

import { state, el, mount, effect } from "@nemanjan00/qrp-shadcdn";
import { demos } from "./demos/registry.js";
import { header, hero, componentIndex, footer } from "./hero.js";
import "./demos/basics.js";
import "./demos/overlays.js";
import "./demos/inputs.js";
import "./demos/menus.js";
import "./demos/selects.js";
import "./demos/misc.js";
import "./demos/data.js";
import "./demos/layout.js";

const theme = state({ dark: window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches });

const slug = (name) => name.toLowerCase().replace(/\s+/g, "-");

const section = (entry) => el("section", { id: slug(entry.name), class: "scroll-mt-20 space-y-3" },
	el("h2", { class: "text-xl font-semibold tracking-tight" }, entry.name),
	el("div", { class: "flex min-h-[200px] w-full min-w-0 items-center justify-center rounded-lg border p-4 sm:p-10" }, entry.build())
);

effect(() => document.documentElement.classList.toggle("dark", theme.dark));

const anchors = { components: "#components" };

mount(document.getElementById("app"), () => el("div", {},
	header(theme, anchors),
	el("main", { class: "mx-auto max-w-5xl space-y-12 px-4 py-10" },
		hero(anchors),
		componentIndex(demos, slug),
		...demos.map(section)),
	footer()
));

// The top of the demo page: what qrp is and why this exists. Built from the
// library's own components, so the pitch is also a demo. Numbers are qrp's
// published measurements (README / benchmarks) — keep them in sync.

import {
	el, state,
	Badge, Button, Card, CardHeader, CardTitle, CardDescription, CardContent,
	Tabs, TabsList, TabsTrigger, TabsContent, CheckIcon, ArrowRightIcon
} from "@nemanjan00/qrp-shadcdn";

const QRP_SITE = "https://qrp.nemanja.top/";
const QRP_REPO = "https://github.com/nemanjan00/qrp";
const REPO = "https://github.com/nemanjan00/qrp-shadcdn";
const NPM = "https://www.npmjs.com/package/@nemanjan00/qrp-shadcdn";

const external = (href, label, props = {}) => el("a", Object.assign({ href, target: "_blank", rel: "noopener" }, props), label);

const STATS = [
	["5.0 KB", "qrp core, min+gzip — next to Solid's ~7 KB and React's ~45 KB"],
	["1 of 40,002", "DOM nodes touched when one cell of a 10,000-row table changes"],
	["~0.8 µs", "per update — React 18 spends ~800 µs reconciling the same change"],
	["50+", "shadcn/ui components, one import, zero runtime dependencies"]
];

const WHY = [
	{
		title: "Data first",
		text: "State is a Proxy. Mutate it and exactly the bindings that read it update — no setState, no re-render, no diff.",
		code: "const s = state({ name: \"\" });\nInput({ bind: [s, \"name\"] });\nBadge(() => s.name || \"stranger\");"
	},
	{
		title: "The DOM is real",
		text: "Components return real elements. No virtual DOM, no hydration, no compiler — and every component here is built on qrp's own forms, table, toasts and behaviors.",
		code: "const dialog = Dialog(\n  DialogTrigger(Button(\"Open\")),\n  DialogContent(\"Hello\"));\ndocument.body.append(dialog);"
	},
	{
		title: "Small enough for a microcontroller",
		text: "All of qrp is ~27 KB gzipped. A live dashboard built with it is served straight from an ESP32's flash — the page, the app and the framework in ~7 KB.",
		code: "// no build step required\nimport { state, mount }\n  from \"@nemanjan00/qrp\";"
	}
];

const INSTALL = {
	cdn: [
		"<link rel=\"stylesheet\" href=\"https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/dist/qrp-shadcdn.css\">",
		"<script type=\"module\">",
		"  import { state, mount, Card, Input, Button }",
		"    from \"https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/dist/qrp-shadcdn.js/+esm\";",
		"",
		"  const s = state({ name: \"\" });",
		"  mount(document.body, () => Card({ class: \"m-8 max-w-sm p-6\" },",
		"    Input({ placeholder: \"Your name\", bind: [s, \"name\"] }),",
		"    Button({ onclick: () => alert(`Hi ${s.name}`) }, \"Greet\")));",
		"</script>"
	].join("\n"),
	npm: [
		"npm i @nemanjan00/qrp @nemanjan00/qrp-shadcdn",
		"",
		"import { state, mount } from \"@nemanjan00/qrp\";",
		"import { Button, Dialog } from \"@nemanjan00/qrp-shadcdn\";",
		"import \"@nemanjan00/qrp-shadcdn/qrp-shadcdn.css\";",
		"",
		"// your bundler keeps only what you import:",
		"// Button alone ≈ 5.5 KB gzipped, qrp included"
	].join("\n")
};

const codeBlock = (label, code) => {
	const copied = state({ on: false });
	const copy = () => {
		if(!navigator.clipboard) {
			return;
		}

		navigator.clipboard.writeText(code).then(() => {
			copied.on = true;
			setTimeout(() => { copied.on = false; }, 1500);
		}, () => {});
	};

	// Copy lives in a header bar, not over the code: long lines scroll freely
	// and nothing shows through the button in dark mode.
	return el("figure", { class: "overflow-hidden rounded-lg border bg-muted/50 text-left" },
		el("figcaption", { class: "flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground" },
			el("span", { class: "font-mono" }, label),
			Button({ variant: "ghost", size: "xs", "aria-label": `Copy ${label}`, onclick: copy },
				() => (copied.on ? [CheckIcon(), "Copied"] : "Copy"))),
		el("pre", { class: "overflow-x-auto p-4 font-mono text-[13px] leading-relaxed" }, el("code", {}, code))
	);
};

/** The sticky top bar. */
export const header = (theme, anchors) => el("header", { class: "sticky top-0 z-40 border-b bg-background/95 backdrop-blur" },
	el("div", { class: "mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4" },
		el("a", { href: "#top", class: "flex items-center gap-2 font-semibold" },
			el("img", { src: "./qrp-logo.svg", alt: "", width: "52", height: "16", class: "h-5 w-auto" }),
			el("span", {}, "shadcdn")),
		el("nav", { class: "flex items-center gap-1 text-sm", "aria-label": "Site" },
			el("a", { href: anchors.components, class: "hidden rounded-md px-2 py-1 text-muted-foreground hover:text-foreground sm:block" }, "Components"),
			external(QRP_SITE, "qrp", { class: "hidden rounded-md px-2 py-1 text-muted-foreground hover:text-foreground sm:block" }),
			external(REPO, "GitHub", { class: "rounded-md px-2 py-1 text-muted-foreground hover:text-foreground" }),
			Button({ variant: "ghost", size: "sm", onclick: () => { theme.dark = !theme.dark; } }, () => (theme.dark ? "Light" : "Dark"))
		)
	)
);

/** The landing block above the component demos. */
export const hero = (anchors) => el("section", { id: "top", class: "scroll-mt-20 space-y-16 pb-4", "aria-labelledby": "hero-title" },
	el("div", { class: "space-y-6 pt-6 text-center sm:pt-12" },
		external(QRP_SITE, [Badge({ variant: "outline", class: "gap-1.5 px-3 py-1" },
			el("span", { class: "size-2 rounded-full bg-[#ffb23e]", "aria-hidden": "true" }), "Built on qrp — the 5 KB dashboard framework")], { class: "inline-block" }),
		el("h1", { id: "hero-title", class: "mx-auto max-w-3xl text-4xl font-bold tracking-tight text-balance sm:text-6xl" },
			"shadcn/ui, ", el("span", { class: "underline decoration-[#ffb23e] decoration-4 underline-offset-8" }, "without React"), "."),
		el("p", { class: "mx-auto max-w-2xl text-lg text-balance text-muted-foreground" },
			"Every shadcn component, rebuilt on qrp: reactivity is a Proxy, the DOM is real, and there's no virtual DOM, no hydration and no build step required. Drop it in with one import, or let your bundler tree-shake it."),
		el("div", { class: "flex flex-wrap items-center justify-center gap-3" },
			Button({ as: "a", href: anchors.components, size: "lg" }, "Browse components", ArrowRightIcon()),
			Button({ as: "a", href: QRP_SITE, target: "_blank", rel: "noopener", size: "lg", variant: "outline" }, "Meet qrp"),
			Button({ as: "a", href: NPM, target: "_blank", rel: "noopener", size: "lg", variant: "ghost" }, "npm")
		)
	),
	el("dl", { class: "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" },
		...STATS.map(([value, label]) => el("div", { class: "rounded-xl border bg-card p-5 text-left" },
			el("dt", { class: "sr-only" }, label),
			el("dd", { class: "text-3xl font-bold tracking-tight" }, value),
			el("dd", { class: "mt-1 text-sm text-muted-foreground" }, label)))),
	el("div", { class: "mx-auto max-w-3xl space-y-4" },
		el("h2", { class: "text-center text-2xl font-semibold tracking-tight" }, "Start in ten seconds"),
		Tabs({ defaultValue: "cdn", class: "w-full" },
			TabsList({ class: "mx-auto" }, TabsTrigger({ value: "cdn" }, "CDN — prototype"), TabsTrigger({ value: "npm" }, "npm — real apps")),
			TabsContent({ value: "cdn" }, codeBlock("index.html", INSTALL.cdn)),
			TabsContent({ value: "npm" }, codeBlock("terminal + app.js", INSTALL.npm))
		)
	),
	el("div", { class: "space-y-6" },
		el("h2", { class: "text-center text-2xl font-semibold tracking-tight" }, "Why qrp"),
		el("div", { class: "grid gap-4 md:grid-cols-3" },
			...WHY.map((item) => Card({ class: "min-w-0" },
				CardHeader(CardTitle(item.title), CardDescription(item.text)),
				CardContent(el("pre", { class: "overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed" }, el("code", {}, item.code)))))),
		el("p", { class: "text-center text-sm text-muted-foreground" },
			"qrp turns data into a dashboard — settings panels, forms, tables, control UIs — with the least machinery possible. ",
			external(QRP_SITE, "Read the qrp docs →", { class: "font-medium text-foreground underline underline-offset-4" }))
	)
);

/** A chip index of every demo section. */
export const componentIndex = (demos, slug) => el("nav", { id: "components", class: "scroll-mt-20 space-y-4", "aria-labelledby": "components-title" },
	el("h2", { id: "components-title", class: "text-2xl font-semibold tracking-tight" }, `Components (${demos.length})`),
	el("ul", { class: "flex flex-wrap gap-2" },
		...demos.map((entry) => el("li", {},
			el("a", { href: `#${slug(entry.name)}`, class: "inline-flex rounded-full border px-3 py-1 text-sm hover:bg-accent" }, entry.name))))
);

/** Page footer. */
export const footer = () => el("footer", { class: "border-t" },
	el("div", { class: "mx-auto flex max-w-5xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-muted-foreground sm:flex-row" },
		el("p", {}, "MIT licensed. Components ported from ", external("https://ui.shadcn.com", "shadcn/ui", { class: "underline underline-offset-4" }), ", icons from ", external("https://lucide.dev", "lucide", { class: "underline underline-offset-4" }), "."),
		el("p", {}, "Built with ", external(QRP_REPO, "qrp", { class: "font-medium text-foreground underline underline-offset-4" }), ".")
	)
);

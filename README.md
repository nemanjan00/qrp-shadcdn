# qrp-shadcdn

[shadcn/ui](https://ui.shadcn.com) components for [qrp](https://github.com/nemanjan00/qrp),
bundled as **one ES module** and served over a CDN — the qrp take on
[shadcdn](https://github.com/magicpatterns/shadcdn).

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/dist/qrp-shadcdn.css">

<script type="module">
	import { state, mount, el, Button, Card, CardHeader, CardTitle, CardContent, Input }
		from "https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/+esm";

	const s = state({ name: "" });

	mount(document.body, () => Card({ class: "m-8 max-w-sm" },
		CardHeader(CardTitle("Hello")),
		CardContent({ class: "grid gap-3" },
			Input({ placeholder: "Your name", bind: [s, "name"] }),
			Button({ onclick: () => alert(`Hi ${s.name}`) }, "Greet")
		)
	));
</script>
```

No build step, no React, no Tailwind setup. Real DOM, fine-grained reactivity,
the shadcn look.

## Install

### CDN (like shadcdn)

One script import, one stylesheet:

```
https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/+esm
https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/dist/qrp-shadcdn.css
```

**Import qrp from the same URL.** The bundle re-exports qrp's core (`state`,
`effect`, `el`, `mount`, `list`, `when`, `router`, …) and `html`, so a page can
take everything from this one module. That matters: reactivity lives in qrp's
module state, and a second copy of qrp (from another CDN URL) would not see the
components' bindings. Pin a version in production
(`…/qrp-shadcdn@0.1.0/+esm`).

### npm + a bundler

```sh
npm i @nemanjan00/qrp @nemanjan00/qrp-shadcdn
```

```js
import { state, mount } from "@nemanjan00/qrp";
import { Button, Dialog } from "@nemanjan00/qrp-shadcdn";
import "@nemanjan00/qrp-shadcdn/qrp-shadcdn.css";
```

qrp is a peer dependency, so your app and the components share one copy.

### Self-hosted, no tooling

Copy `dist/qrp-shadcdn.js` and qrp's `dist/` next to your page and map the names:

```html
<script type="importmap">
{ "imports": {
	"@nemanjan00/qrp": "/vendor/qrp/qrp.js",
	"@nemanjan00/qrp-shadcdn": "/vendor/qrp-shadcdn.js"
} }
</script>
```

The bundle imports nothing but the bare `@nemanjan00/qrp` specifier (the build
enforces it), so that single mapping is all it needs.

## Styling

`qrp-shadcdn.css` contains Tailwind's preflight, the shadcn theme tokens, and the
utilities the components use — nothing else. Three ways to go from there:

- **Just the components.** Link the CSS and write your own layout CSS.
- **Tailwind classes in your page, no build.** Use Tailwind's browser build
  instead of the prebuilt CSS, plus our theme script (the browser build can't
  `@import` files, so the theme and tw-animate-css ship as a script that injects
  them). Then any utility works in `class`:

  ```html
  <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
  <script src="https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/dist/tailwind-theme.js"></script>
  ```

- **Your own Tailwind v4 build.** Skip the prebuilt CSS and import the theme:

  ```css
  @import "tailwindcss";
  @import "tw-animate-css";
  @import "@nemanjan00/qrp-shadcdn/theme.css";
  @source "../node_modules/@nemanjan00/qrp-shadcdn/dist";
  ```

**Theming** is shadcn's: override the CSS variables (`--primary`, `--radius`, …)
— any theme from [ui.shadcn.com/themes](https://ui.shadcn.com/themes) pastes
straight in. **Dark mode:** add `class="dark"` to `<html>`.

## Usage

Every component is a function with qrp's `el()` signature:

```js
Component(props?, ...children)
```

- `props` is optional — `Button("Save")` works.
- Everything `el()` accepts works: attributes, `on*` listeners, `bind: [state, "key"]`,
  and **thunks** (`() => …`) for reactive values — `disabled: () => s.busy`,
  `variant: () => s.dirty ? "default" : "outline"`.
- `class` merges with the component's classes (`className` is accepted too, for
  copy-paste from shadcn).
- `as` swaps the tag — the stand-in for shadcn's `asChild`:
  `Button({ as: "a", href: "/docs" }, "Docs")`.
- Each component returns a real DOM element (or a fragment for overlay roots).

### Composition mirrors shadcn

```js
Dialog(
	DialogTrigger(Button({ variant: "outline" }, "Edit profile")),
	DialogContent(
		DialogHeader(DialogTitle("Edit profile"), DialogDescription("Make changes here.")),
		Input({ bind: [profile, "name"] }),
		DialogFooter(DialogClose(Button({ variant: "outline" }, "Cancel")), Button("Save"))
	)
);
```

Triggers and close buttons wrap their child the way `asChild` does:
`DialogTrigger(Button("Open"))` returns that very Button, wired up.

### Open state and values

Overlays take `open`, inputs take `value` / `checked`. Each accepts:

| form | meaning |
|---|---|
| omitted / `defaultOpen` | uncontrolled, internal state |
| `[state, "key"]` | two-way bound to a reactive state key |
| `() => s.open` | driven by a thunk; changes are reported via `onOpenChange` |

```js
const ui = state({ confirm: false });

AlertDialog({ open: [ui, "confirm"] }, AlertDialogContent(…));
ui.confirm = true;   // opens it; Escape / Cancel sets it back to false
```

### Variants

`buttonVariants`, `badgeVariants`, … are exported like in shadcn, and
`variants()` is the `cva` equivalent for your own:

```js
const pill = variants("rounded-full px-3", {
	variants: { tone: { info: "bg-blue-100", warn: "bg-amber-100" } },
	defaultVariants: { tone: "info" }
});

el("span", { class: pill({ tone: () => s.level }) }, "Status");
```

`cn()` joins classes like clsx. It does not resolve Tailwind conflicts — to let a
`class` override a component default, use Tailwind's important modifier
(`w-full!`) or plug in tailwind-merge: `setClassMerge(twMerge)`.

## Components

See [TODO.md](TODO.md) for the full list and status — every component shadcdn
ships, plus the newer shadcn ones. The demo page (`npm run demo`, then open
<http://localhost:8000/demo/>) renders each of them.

## Development

```sh
npm install
npm test             # node --test + happy-dom
npm run lint
npm run build        # dist/qrp-shadcdn.js + dist/qrp-shadcdn.css
npm run demo         # build + serve the demo page
```

Components are ported from the shadcn/ui v4 sources: class strings verbatim,
Radix behavior (keyboard, focus, ARIA, `data-state`) reimplemented on qrp. Icons
are from [lucide](https://lucide.dev) (ISC).

## License

[MIT](LICENSE)

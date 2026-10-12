# qrp-shadcdn — project guide for Claude

shadcn/ui components for [qrp](https://github.com/nemanjan00/qrp) (source at
`/home/nemanjan00/rfe` on this machine), shipped like
[shadcdn](https://github.com/magicpatterns/shadcdn): one ES module + one
stylesheet on jsDelivr for prototyping, and an unbundled, tree-shakeable npm
entry for real apps. The shadcn/ui v4 sources are the visual + API reference.

## Always use the implement-js skill

When writing JavaScript here, follow `/implement-js`, with qrp's two approved
deviations: **ES modules** (not CommonJS) and **`node --test` + happy-dom**
(not jest). Tabs, double quotes, semicolons, `const`, never reassign params,
functional array methods, JSDoc on option-heavy APIs, no `class` keyword.

## Rules that are not obvious from the code

- **One qrp core, always.** Reactivity lives in qrp's module state; two copies
  silently stop tracking each other. The CDN bundle must import ONLY the bare
  `@nemanjan00/qrp` — `bin/build.js` inlines qrp subpaths (html, behaviors,
  forms…) with their `./qrp.js` redirected to the external core and fails the
  build on any other specifier. jsDelivr's `+esm` gives every qrp subpath its
  own private core, so never make the bundle depend on a qrp subpath URL.
- **The npm entry is the source** (`index.js`, one module per component,
  `sideEffects` = CSS only) so bundlers tree-shake. `test/treeshake.test.js`
  guards it — no module-level side effects in components.
- **Build on qrp concepts, don't reinvent them.** Tables → `table()`/`datagrid`,
  forms → `forms` + `utils/validate` (+ a `*Input` adapter per control for
  `registerInput`), toasts → `toasts`/`notify` on the bus, open state →
  `disclosure`/`controllable`, dynamic children → `list()`/`when()`. If qrp is
  missing something, propose a qrp patch rather than a parallel engine.
- **Component signature** is `Comp(props?, ...children)` like `el()`. Props are
  el() props plus the component's own (removed with `pick`). `as` swaps the tag
  (our `asChild`); trigger/close parts mark a single element child via
  `roleMarker` (`data-qs-role`) and keep its `data-slot`.
- **Controlled values** go through `controllable()`: plain value, `[state,
  "key"]`, or thunk, plus `default*` / `on*Change`. Keep names consistent across
  components (`onValueChange`, `onCheckedChange`, `onOpenChange`).
- **Class strings are shadcn's, verbatim**, with `--radix-*` CSS vars renamed to
  the `--qrp-*` ones qrp's `anchored` sets (accordion keeps
  `--radix-accordion-content-height`, used by the keyframes). Tailwind scans
  `components/`, `icons/`, `utils/` (`source(none)` — nothing else).
- **`cn`/`variants` resolve conflicts** via `utils/merge.js` (tailwind-merge
  semantics for the common groups). Don't hand-order classes to win the cascade.
- **Overlays** go through `utils/layer.js`, on qrp's behaviors: `dismissable`
  (layer stack — Escape/outside-click hit the right layer), `anchored`
  (positioning), `portal(…, { owner: trigger })` (so qrp contexts resolve from
  inside overlays). Each node leaves on its own `animationend` — waiting for all
  nodes made the finished backdrop flash back. Popups use `popupRoot` /
  `contentPart` (`utils/popup.js`), modals `modalRoot` (`components/dialog.js`).
- **Tests:** compare DOM nodes with `assert.ok(a === b)`, never
  `assert.equal` — a failing equal diffs two happy-dom objects and can eat
  gigabytes (`npm test` caps the heap). MutationObserver callbacks (`watchTree`)
  must only touch attributes, never the child list.
- **Every export is declared** in `index.d.ts`; `npm run check:types` fails on a
  missing or stale declaration, `npm run typecheck` runs `tsc` over
  `test/types.ts`.

## Commands

- `npm test` · `npm run lint` · `npm run typecheck` · `npm run check:types`
- `npm run build` — `dist/qrp-shadcdn.js` (CDN bundle), `dist/qrp-shadcdn.css`,
  `dist/tailwind-theme.js`
- `npm run demo` — build + serve; open `/demo/` (each batch's demos live in
  `demo/demos/*.js`). Verify visual changes in a real browser.

## Releasing

Commit + push as you go (public repo — nothing private in commits). For a
release: move CHANGELOG `Unreleased` into a version section, `npm version X.Y.Z
--no-git-tag-version`, commit `X.Y.Z`, tag `vX.Y.Z`, push with tags, `npm
publish` (the user has authorized publishing). Gate first: test, lint,
typecheck, check:types, build, demo page loads with no errors.

Keep this file and README.md in sync when conventions change.

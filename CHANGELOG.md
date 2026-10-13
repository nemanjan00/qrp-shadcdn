# Changelog

All notable changes to `@nemanjan00/qrp-shadcdn`. Pre-1.0, so breaking changes
can land in a minor — they're marked ⚠️ **BREAKING**. Newest first.

## Unreleased

_(nothing yet)_

## 0.3.0

- ⚠️ **BREAKING: requires `@nemanjan00/qrp` `^0.13.0`** (peer dependency, was
  `^0.12.2`). 0.13.0 is a batch of qrp fixes that components get for free: lists
  follow in-place `sort`/`splice`/`unshift`, `el()` removes attributes set to
  `null`/`false` instead of writing `"null"`/`"false"`, `trapFocus` skips
  untabbable elements, `busyWhile` no longer loops when run inside an effect,
  and more — see qrp's CHANGELOG.
- **`DataTable` sorting follows qrp 0.13's comparator:** empty values sort last
  in both directions, and strings sort in natural, locale-aware order
  (`"item 2"` before `"item 10"`, `"a"` before `"B"`). Pagers and summaries show
  the clamped page when a filter shrinks the data.

## 0.2.3

- Docs and package metadata only: the README leads with "shadcn/ui, without
  React" and compares with shadcn on React; the package description, homepage
  (the live demo) and keywords match. No code changes.

## 0.2.2

Fixes for regressions in 0.2.1's modal changes:

- **Popups inside a modal scroll again.** A Select (or any popup) opened in a
  Dialog is portaled to `<body>`, outside the dialog, and 0.2.1's scroll lock
  blocked wheel/touch over it — a long Select list in a Dialog couldn't scroll.
  Scrolling is now allowed over every open layer's content (Radix's "shards");
  the backdrop and the page behind stay locked.
- **Toasts stay usable while a modal is open.** 0.2.1 made the Toaster inert
  with the rest of the page, so a "Saved" toast fired from a dialog couldn't be
  clicked or announced. The inert sweep now walks the tree like Radix's
  `hideOthers` and keeps `[data-qs-keep]` regions (Sonner's region and the
  legacy viewport carry it; add it to anything that must stay live).
- **Clicking a toast no longer dismisses the dialog** it came from.

## 0.2.1

- **Fix: reopening an overlay during its exit animation broke the page.** The
  stale close's portal-undo removed the reused content node after the reopen —
  open state true, no dialog, backdrop and scroll lock left behind. Affected
  every overlay (dialogs, sheets, popovers, menus, selects). A close still in
  flight is now finished before the same content opens again.
- **Modals make the page behind them inert** (focus, clicks and the screen
  reader's virtual cursor stay in the dialog), reference-counted for nested
  modals, restored before focus returns to the trigger — like Radix's
  `hideOthers`. Overlays opened from inside the modal stay interactive.
- **Scroll lock without layout shift, and on iOS.** The body is padded by the
  scrollbar width, and wheel/touch scrolling outside the open modal is blocked
  (iOS Safari ignores `overflow: hidden`).
- **Class merge fixes** (tailwind-merge semantics): corner radii no longer wipe
  the base radius (`rounded-md rounded-tl-none`); arbitrary values are
  classified by content (`text-[13px]` is a size, `font-[500]` a weight,
  `border-[3px]` a width); shadow color is separate from shadow size;
  `inset-shadow-*` isn't an inset; `!important` classes don't override plain
  ones; `hover:md:` equals `md:hover:`.
- **Accessibility** (Lighthouse/axe clean apart from shadcn's palette
  contrast): Slider thumbs are named (root label, or Minimum/Maximum); Select
  triggers fall back to their value text as name; InputOTP's input is named
  "One-time code"; Chart surfaces get an `aria-label` from the config;
  AvatarImage defaults `alt=""`; ItemGroup's Items are list items;
  CommandSeparator is `role="none"`; Resizable groups drop an invalid
  `aria-orientation`. A caller's `aria-label`/`alt` always wins.
- **Small screens:** charts shrink with their container; the DataTable footer
  wraps. The demo has no horizontal overflow down to 320px.
- `npm run build:site` builds the demo as a static site (`render.yaml`).

## 0.2.0

Built further on qrp (then `^0.12.2`): the pieces this package had to write for
itself in 0.1.0 moved into qrp, and the components now use them.

- **Overlays run on qrp's own behaviors.** Dismissal (one Escape / outside-click
  stack, shared with any qrp `dismissable` in your app), positioning (`anchored`,
  `pointAt` for context menus) and portaling come from qrp; our private
  positioner and dismiss stack are gone. Overlay content records its trigger as
  owner, so qrp contexts resolve from inside dialogs, popovers and menus.
  ⚠️ **BREAKING:** the popup CSS variables are qrp's — `--qrp-transform-origin`,
  `--qrp-anchor-width`/`-height`, `--qrp-available-width`/`-height` (were
  `--qs-*`). Positions and animations are unchanged.
- **Compound components on qrp `context`.** Tabs, ToggleGroup, Accordion,
  RadioGroup and Sidebar find their root through `@nemanjan00/qrp/context`
  instead of DOM queries, MutationObserver re-syncs and per-item state
  hand-offs. Nested instances never steal each other's items; items rendered by
  `list()`/`when()` join when they appear and leave when removed (the tab stop
  follows). ⚠️ The internal `owned()` helper is no longer exported.
- **Toasts sit on qrp 0.12's toasts.** qrp's controller owns ids,
  update-in-place, countdowns, pause/resume and the exit phase; the sonner
  layer only maps sonner's API. `toastLayer` / `toastApi` are exported for custom
  stacks (`Toaster({ toaster })`). ⚠️ `sonner.configure()` takes
  `{ duration, limit }` only — the exit time is the controller's `exitMs`.
- **DataTable: one pipeline, real selected rows.** The `dataGrid` is the
  `table()`'s `view` (toolbar, counts and rows share one sort/filter/page pass),
  and selected rows get `data-state="selected"` / `aria-selected`, styled by
  shadcn's TableRow.
- **Chart draws through qrp spark.** Line and area series are responsive sparks
  on a shared y domain (stack baselines, curve types, non-scaling strokes);
  bars, dots and the tooltip use spark's `project()`, ticks `scale.nice()`.
- **Fix:** an overlay whose open state was read by an effect that also read a
  context could open itself recursively; `layerWhen` now guards re-entry.

## 0.1.0

First release: every component [shadcdn](https://github.com/magicpatterns/shadcdn)
ships, plus the newer shadcn/ui ones, ported to qrp in the shadcn v4 look.

- **Install like shadcdn.** One ES module + one stylesheet from jsDelivr for
  prototyping (`dist/qrp-shadcdn.js/+esm`); the npm entry is the unbundled,
  side-effect-free source, so bundlers tree-shake to what you import (Button
  alone ≈ 5 KB gzip including qrp).
- **One reactive core.** The CDN bundle imports only the bare `@nemanjan00/qrp`
  and re-exports qrp's core, so the app and the components can't end up on two
  copies.
- **Built on qrp, not beside it.** Forms on `forms` + `utils/validate`
  (`registerShadcnInputs()` renders shadcn controls from plain qrp `form()`),
  toasts on `toasts`/`notify` and the events bus, DataTable on `table()` +
  `datagrid`, Collapsible/Accordion on `disclosure`, Chart on `scale`/
  `timeseries`/`format`, Combobox filtering on `collection`, useIsMobile on
  `media()`. Every control takes `bind: [state, "key"]`; list()/when() items are
  wired as they appear.
- **Overlay layer stack** (dialogs, sheets, popovers, menus, selects, tooltips):
  Escape and outside clicks hit the right layer when nested, focus is moved /
  trapped and restored, exit animations finish before removal.
- **Class conflicts resolve like shadcn's tailwind-merge** with a built-in ~1 KB
  resolver; `setClassMerge(twMerge)` plugs in tailwind-merge itself.
- **Styling:** prebuilt `qrp-shadcdn.css`, `theme.css` for your own Tailwind v4
  build, or `dist/tailwind-theme.js` for Tailwind's browser build.
- **Types** for every export, checked with `tsc` and an export-coverage check.

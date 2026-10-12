# Changelog

All notable changes to `@nemanjan00/qrp-shadcdn`. Pre-1.0, so breaking changes
can land in a minor — they're marked ⚠️ **BREAKING**. Newest first.

## Unreleased

_(nothing yet)_

## 0.2.0

Built further on qrp (now `^0.12.2`): the pieces this package had to write for
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

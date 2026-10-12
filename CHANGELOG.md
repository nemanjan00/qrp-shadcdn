# Changelog

All notable changes to `@nemanjan00/qrp-shadcdn`. Pre-1.0, so breaking changes
can land in a minor — they're marked ⚠️ **BREAKING**. Newest first.

## Unreleased

_(nothing yet)_

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

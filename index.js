/**
 * @nemanjan00/qrp-shadcdn — shadcn/ui components for qrp, as one ES module.
 *
 * qrp's core (and `html`) is re-exported, so a CDN page needs a single import
 * and is guaranteed to share one reactive core with the components:
 *
 *   import { state, mount, Button, Card } from "https://cdn.jsdelivr.net/npm/@nemanjan00/qrp-shadcdn/+esm";
 */

export * from "@nemanjan00/qrp";
export { html, ref } from "@nemanjan00/qrp/html";

export * from "./utils/index.js";
export * from "./icons/index.js";

export * from "./components/alert.js";
export * from "./components/aspect-ratio.js";
export * from "./components/avatar.js";
export * from "./components/badge.js";
export * from "./components/button.js";
export * from "./components/card.js";
export * from "./components/input.js";
export * from "./components/kbd.js";
export * from "./components/label.js";
export * from "./components/progress.js";
export * from "./components/separator.js";
export * from "./components/skeleton.js";
export * from "./components/spinner.js";
export * from "./components/table.js";
export * from "./components/textarea.js";

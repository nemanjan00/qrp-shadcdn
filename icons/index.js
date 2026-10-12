/**
 * icons/index.js — the handful of lucide icons the components draw.
 *
 * Path data from lucide (https://lucide.dev, ISC License, Copyright (c) Lucide
 * Contributors). Each export is a factory `Icon(props?)` returning an <svg>;
 * pass `class` to size it (`size-4` is the shadcn default inside buttons).
 * For other icons, pass any SVG node — components accept any renderable.
 */

import { el } from "@nemanjan00/qrp";
import { parseArgs, cn } from "../utils/index.js";

const icon = (name, shapes) => (...args) => {
	const { props } = parseArgs(args);
	const rest = Object.assign({}, props);

	delete rest.class;

	return el("svg", Object.assign({
		xmlns: "http://www.w3.org/2000/svg",
		width: "24",
		height: "24",
		viewBox: "0 0 24 24",
		fill: "none",
		stroke: "currentColor",
		"stroke-width": "2",
		"stroke-linecap": "round",
		"stroke-linejoin": "round",
		"aria-hidden": "true",
		class: cn(`lucide lucide-${name}`, props.class)
	}, rest), ...shapes.map(([tag, attrs]) => el(tag, attrs)));
};

const path = (d) => ["path", { d }];
const circle = (cx, cy, r) => ["circle", { cx, cy, r }];

export const CheckIcon = icon("check", [path("M20 6 9 17l-5-5")]);
export const ChevronDownIcon = icon("chevron-down", [path("m6 9 6 6 6-6")]);
export const ChevronUpIcon = icon("chevron-up", [path("m18 15-6-6-6 6")]);
export const ChevronRightIcon = icon("chevron-right", [path("m9 18 6-6-6-6")]);
export const ChevronLeftIcon = icon("chevron-left", [path("m15 18-6-6 6-6")]);
export const ChevronsUpDownIcon = icon("chevrons-up-down", [path("m7 15 5 5 5-5"), path("m7 9 5-5 5 5")]);
export const XIcon = icon("x", [path("M18 6 6 18"), path("m6 6 12 12")]);
export const CircleIcon = icon("circle", [circle("12", "12", "10")]);
export const DotIcon = icon("dot", [circle("12", "12", "1")]);
export const MoreHorizontalIcon = icon("ellipsis", [circle("12", "12", "1"), circle("19", "12", "1"), circle("5", "12", "1")]);
export const SearchIcon = icon("search", [path("m21 21-4.34-4.34"), circle("11", "11", "8")]);
export const MinusIcon = icon("minus", [path("M5 12h14")]);
export const GripVerticalIcon = icon("grip-vertical", [
	circle("9", "12", "1"), circle("9", "5", "1"), circle("9", "19", "1"),
	circle("15", "12", "1"), circle("15", "5", "1"), circle("15", "19", "1")
]);
export const Loader2Icon = icon("loader-circle", [path("M21 12a9 9 0 1 1-6.219-8.56")]);
export const PanelLeftIcon = icon("panel-left", [["rect", { width: "18", height: "18", x: "3", y: "3", rx: "2" }], path("M9 3v18")]);
export const ArrowLeftIcon = icon("arrow-left", [path("m12 19-7-7 7-7"), path("M19 12H5")]);
export const ArrowRightIcon = icon("arrow-right", [path("M5 12h14"), path("m12 5 7 7-7 7")]);
export const CalendarIcon = icon("calendar", [
	path("M8 2v3"), path("M16 2v3"), ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "2" }], path("M3 9h18")
]);
export const ArrowUpIcon = icon("arrow-up", [path("m5 12 7-7 7 7"), path("M12 19V5")]);
export const ArrowDownIcon = icon("arrow-down", [path("M12 5v14"), path("m19 12-7 7-7-7")]);
export const ArrowUpDownIcon = icon("arrow-up-down", [path("m21 16-4 4-4-4"), path("M17 20V4"), path("m3 8 4-4 4 4"), path("M7 4v16")]);
export const ChevronsLeftIcon = icon("chevrons-left", [path("m11 17-5-5 5-5"), path("m18 17-5-5 5-5")]);
export const ChevronsRightIcon = icon("chevrons-right", [path("m6 17 5-5-5-5"), path("m13 17 5-5-5-5")]);

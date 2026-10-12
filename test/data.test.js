import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state } from "@nemanjan00/qrp";
import {
	Calendar, DatePicker, InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_DIGITS,
	ResizablePanelGroup, ResizablePanel, ResizableHandle, ScrollArea, ScrollBar,
	Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
	ChartContainer, BarChart, LineChart, AreaChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
	ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartSparkline
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const day = (root, iso) => root.querySelector(`[data-date="${iso}"]`);

test("Calendar: renders the month grid with weekday headers and today", () => {
	const cal = Calendar({ defaultMonth: new Date(2025, 5, 1), today: new Date(2025, 5, 12) });

	assert.equal(cal.dataset.slot, "calendar");
	assert.equal(cal.querySelectorAll("th").length, 7);
	assert.equal(cal.querySelector("[role=status]").textContent, "June 2025");
	assert.ok(day(cal, "2025-06-01"));
	assert.equal(day(cal, "2025-06-12").closest("td").dataset.today, "true");
	assert.equal(day(cal, "2025-07-05").closest("td").dataset.outside, "true", "outside days shown by default");
	assert.equal(day(cal, "2025-06-12").getAttribute("tabindex"), "0", "today is the tab stop");
});

test("Calendar: single selection binds to [state, key] and toggles off", () => {
	const s = state({ date: undefined });
	const cal = Calendar({ mode: "single", selected: [s, "date"], defaultMonth: new Date(2025, 5, 1) });

	day(cal, "2025-06-10").click();
	assert.equal(s.date.getDate(), 10);
	assert.equal(day(cal, "2025-06-10").dataset.selectedSingle, "true");
	assert.equal(day(cal, "2025-06-10").closest("td").getAttribute("aria-selected"), "true");
	day(cal, "2025-06-10").click();
	assert.equal(s.date, undefined);
});

test("Calendar: range selection marks start, middle and end", () => {
	const s = state({ range: undefined });
	const cal = Calendar({ mode: "range", selected: [s, "range"], defaultMonth: new Date(2025, 5, 1) });

	day(cal, "2025-06-20").click();
	day(cal, "2025-06-10").click();
	assert.equal(s.range.from.getDate(), 10, "an earlier second click becomes the start");
	assert.equal(s.range.to.getDate(), 20);
	assert.equal(day(cal, "2025-06-10").dataset.rangeStart, "true");
	assert.equal(day(cal, "2025-06-15").dataset.rangeMiddle, "true");
	assert.equal(day(cal, "2025-06-20").dataset.rangeEnd, "true");
	assert.equal(day(cal, "2025-06-21").dataset.rangeMiddle, "false");
});

test("Calendar: multiple mode, disabled matcher, onSelect", () => {
	const picked = [];
	const cal = Calendar({
		mode: "multiple",
		defaultMonth: new Date(2025, 5, 1),
		disabled: { dayOfWeek: [0, 6] },
		onSelect: (value) => picked.push(value.length)
	});

	assert.equal(day(cal, "2025-06-07").disabled, true, "Saturday disabled");
	day(cal, "2025-06-09").click();
	day(cal, "2025-06-10").click();
	day(cal, "2025-06-09").click();
	assert.deepEqual(picked, [1, 2, 1]);
});

test("Calendar: navigation, numberOfMonths, dropdown caption, startMonth bound", () => {
	const cal = Calendar({ defaultMonth: new Date(2025, 0, 1), numberOfMonths: 2, startMonth: new Date(2025, 0, 1) });

	assert.equal(cal.querySelectorAll("table").length, 2);

	const [prev, next] = cal.querySelectorAll("nav button");

	assert.equal(prev.getAttribute("aria-disabled"), "true");
	next.click();
	assert.ok(day(cal, "2025-03-15"), "now showing February + March");

	const dropdowns = Calendar({ captionLayout: "dropdown", defaultMonth: new Date(2025, 5, 1) });
	const selects = dropdowns.querySelectorAll("select");

	assert.equal(selects.length, 2);
	selects[1].value = "2020";
	selects[1].dispatchEvent(new Event("change"));
	assert.ok(day(dropdowns, "2020-06-15"));
});

test("Calendar: arrow keys move focus, crossing into the next month", () => {
	const cal = Calendar({ defaultMonth: new Date(2025, 5, 1), today: new Date(2025, 5, 30) });

	document.body.append(cal);
	day(cal, "2025-06-30").focus();
	day(cal, "2025-06-30").dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
	assert.equal(document.activeElement.getAttribute("data-date"), "2025-07-01");
	assert.equal(cal.querySelector("[role=status]").textContent, "July 2025");
	document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }));
	assert.equal(document.activeElement.getAttribute("data-date"), "2025-06-24");
	cal.remove();
});

test("DatePicker: shows the placeholder, picks a date and closes", async () => {
	const s = state({ date: undefined });

	document.body.append(DatePicker({ value: [s, "date"], calendar: { defaultMonth: new Date(2025, 5, 1) } }));

	const trigger = document.querySelector("[data-slot=date-picker-trigger]");

	assert.equal(trigger.dataset.empty, "true");
	assert.ok(trigger.textContent.includes("Pick a date"));
	trigger.click();
	day(document, "2025-06-03").click();
	assert.equal(s.date.getDate(), 3);
	assert.equal(trigger.dataset.empty, "false");
	assert.ok(trigger.textContent.includes("2025"));
	await tick();
	assert.equal(document.querySelector("[data-slot=calendar]"), null, "popover closed");
	document.body.replaceChildren();
});

test("InputOTP: fills slots, enforces the pattern, reports completion", () => {
	const s = state({ code: "" });
	let done = null;
	const otp = InputOTP({ maxLength: 4, value: [s, "code"], pattern: REGEXP_ONLY_DIGITS, onComplete: (v) => { done = v; } },
		InputOTPGroup(InputOTPSlot({ index: 0 }), InputOTPSlot({ index: 1 })),
		InputOTPSeparator(),
		InputOTPGroup(InputOTPSlot({ index: 2 }), InputOTPSlot({ index: 3 })));
	const input = otp.querySelector("input");
	const slots = otp.querySelectorAll("[data-slot=input-otp-slot]");
	const type = (value) => {
		input.value = value;
		input.dispatchEvent(new Event("input"));
	};

	document.body.append(otp);
	assert.equal(input.getAttribute("autocomplete"), "one-time-code");
	input.dispatchEvent(new Event("focus"));
	assert.equal(slots[0].dataset.active, "true");
	type("12");
	assert.equal(s.code, "12");
	assert.equal(slots[1].textContent, "2");
	assert.equal(slots[2].dataset.active, "true");
	type("12a");
	assert.equal(s.code, "12", "non-digit rejected");
	assert.equal(input.value, "12");
	type("1234");
	assert.equal(done, "1234");
	s.code = "";
	assert.equal(slots[0].textContent, "", "state writes flow back into the slots");
	otp.remove();
});

test("Resizable: initial sizes, keyboard resize within limits, aria", () => {
	const sizes = [];
	const group = ResizablePanelGroup({ orientation: "horizontal", onLayout: (s) => sizes.push(s) },
		ResizablePanel({ defaultSize: 30, minSize: 20 }, "a"),
		ResizableHandle({ withHandle: true }),
		ResizablePanel("b"));
	const [a, b] = group.querySelectorAll("[data-slot=resizable-panel]");
	const handle = group.querySelector("[data-slot=resizable-handle]");

	assert.equal(a.style.flex, "30 1 0px");
	assert.equal(b.style.flex, "70 1 0px");
	assert.equal(handle.getAttribute("aria-orientation"), "vertical");
	assert.equal(handle.getAttribute("aria-valuenow"), "30");
	handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
	assert.equal(a.style.flex, "20 1 0px");
	handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }));
	assert.equal(a.style.flex, "20 1 0px", "clamped at minSize");
	handle.dispatchEvent(new KeyboardEvent("keydown", { key: "End" }));
	assert.equal(a.style.flex, "100 1 0px");
	assert.deepEqual(sizes.at(-1), [100, 0]);
});

test("ScrollArea: viewport, default vertical bar, optional horizontal bar", () => {
	const area = ScrollArea({ class: "h-72 w-48" }, "content", ScrollBar({ orientation: "horizontal" }));
	const bars = area.querySelectorAll("[data-slot=scroll-area-scrollbar]");

	assert.equal(area.dataset.slot, "scroll-area");
	assert.equal(area.querySelector("[data-slot=scroll-area-viewport]").textContent, "content");
	assert.deepEqual([...bars].map((bar) => bar.dataset.orientation).sort(), ["horizontal", "vertical"]);
	assert.equal(area.querySelector("[data-slot=scroll-area-viewport]").style.overflowX, "scroll");
});

test("Carousel: structure, orientation classes, api", () => {
	let api = null;
	const carousel = Carousel({ setApi: (value) => { api = value; }, opts: { loop: true } },
		CarouselContent(...[1, 2, 3].map((n) => CarouselItem({ class: "basis-1/3" }, String(n)))),
		CarouselPrevious(), CarouselNext());

	assert.equal(carousel.getAttribute("aria-roledescription"), "carousel");
	assert.ok(carousel.querySelector("[data-slot=carousel-track]").className.includes("-ml-4"));

	const item = carousel.querySelector("[data-slot=carousel-item]");

	assert.ok(item.className.includes("basis-1/3"));
	assert.ok(!item.className.includes("basis-full"), "caller basis replaces the default");
	assert.ok(item.className.includes("pl-4"));
	assert.ok(carousel.querySelector("[data-slot=carousel-previous]").className.includes("-left-12"));
	assert.equal(api.state.count, 3);
	assert.equal(api.canScrollNext(), true, "loop always allows next");

	const vertical = Carousel({ orientation: "vertical" }, CarouselContent(CarouselItem("x")));

	assert.ok(vertical.querySelector("[data-slot=carousel-track]").className.includes("flex-col"));
});

const CONFIG = {
	desktop: { label: "Desktop", color: "#2563eb" },
	mobile: { label: "Mobile", theme: { light: "#60a5fa", dark: "#1d4ed8" } }
};

const ROWS = [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 }
];

test("ChartContainer: publishes config colors per theme", () => {
	const container = ChartContainer({ config: CONFIG, id: "t" }, BarChart({ data: ROWS }));
	const css = container.querySelector("style").textContent;

	assert.equal(container.dataset.chart, "chart-t");
	assert.ok(css.includes("[data-chart=chart-t] {\n  --color-desktop: #2563eb;\n  --color-mobile: #60a5fa;"));
	assert.ok(css.includes(".dark [data-chart=chart-t]"));
	assert.ok(css.includes("--color-mobile: #1d4ed8"));
});

test("BarChart: one bar per row and series, reactive data, axis labels", () => {
	const s = state({ rows: ROWS.slice() });
	const container = ChartContainer({ config: CONFIG },
		BarChart({ data: () => s.rows },
			CartesianGrid({ vertical: false }),
			XAxis({ dataKey: "month", tickFormatter: (v) => v.slice(0, 3) }),
			YAxis({}),
			Bar({ dataKey: "desktop", fill: "var(--color-desktop)", radius: 4 }),
			Bar({ dataKey: "mobile", fill: "var(--color-mobile)", radius: 4 })));
	const bars = () => container.querySelectorAll("[data-slot=chart-bar] path");

	assert.equal(bars().length, 6);
	assert.ok(bars()[0].getAttribute("d").startsWith("M"));
	assert.equal(bars()[0].getAttribute("fill"), "var(--color-desktop)");
	assert.deepEqual([...container.querySelectorAll("[data-slot=chart-x-axis] text")].map((t) => t.textContent), ["Jan", "Feb", "Mar"]);
	assert.ok(container.querySelectorAll("[data-slot=chart-y-axis] text").length >= 3);
	assert.ok(container.querySelectorAll("[data-slot=chart-grid] line").length >= 3);

	const before = bars()[0].getAttribute("d");

	s.rows.push({ month: "April", desktop: 73, mobile: 190 });
	assert.equal(bars().length, 8, "push adds a bar per series");
	assert.notEqual(bars()[0].getAttribute("d"), before, "existing bars re-laid out");
});

test("Stacked bars share a slot; line and area charts draw paths", () => {
	const stacked = BarChart({ data: ROWS }, Bar({ dataKey: "desktop", stackId: "a" }), Bar({ dataKey: "mobile", stackId: "a" }));
	const [first, second] = stacked.querySelectorAll("[data-slot=chart-bar]");
	const x = (path) => path.getAttribute("d").match(/^M([\d.]+)/)[1];

	assert.equal(x(first.querySelector("path")) === x(second.querySelector("path")), true);

	const line = LineChart({ data: ROWS }, Line({ dataKey: "desktop", type: "natural", dot: false }));

	assert.ok(line.querySelector("[data-slot=chart-line] path").getAttribute("d").includes("C"), "natural curve");
	assert.equal(line.querySelectorAll("[data-slot=chart-line] circle").length, 0);

	const area = AreaChart({ data: ROWS }, Area({ dataKey: "desktop", type: "monotone" }));

	assert.ok(area.querySelector("[data-slot=chart-area] path").getAttribute("d").endsWith("Z"));
});

test("Chart tooltip and legend use the config labels", () => {
	const container = ChartContainer({ config: CONFIG },
		LineChart({ data: ROWS, accessibilityLayer: true },
			XAxis({ dataKey: "month" }),
			ChartTooltip({ content: ChartTooltipContent({ indicator: "line" }) }),
			ChartLegend({ content: ChartLegendContent() }),
			Line({ dataKey: "desktop" }), Line({ dataKey: "mobile" })));
	const svg = container.querySelector("svg");
	const legend = container.querySelector("[data-slot=chart-legend-content]");

	assert.deepEqual([...legend.children].map((item) => item.textContent), ["Desktop", "Mobile"]);
	svg.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));

	const tip = container.querySelector("[data-slot=chart-tooltip-content]");

	assert.ok(tip, "keyboard focus shows the tooltip");
	assert.ok(tip.textContent.includes("January"));
	assert.ok(tip.textContent.includes("Desktop"));
	assert.ok(tip.textContent.includes("186"));
	assert.equal(container.querySelectorAll("[data-slot=chart-active-dots] circle").length, 2);
	svg.dispatchEvent(new Event("pointerleave"));
	assert.equal(container.querySelector("[data-slot=chart-tooltip-content]"), null);
});

test("ChartSparkline wraps qrp spark", () => {
	const svg = ChartSparkline({ data: ROWS, dataKey: "desktop" });

	assert.equal(svg.tagName.toLowerCase(), "svg");
	assert.equal(svg.querySelector("path").getAttribute("stroke"), "var(--color-desktop)");
});

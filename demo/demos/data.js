// Demos for the data batch: Calendar, Date Picker, Chart, Carousel,
// Resizable, Scroll Area, Input OTP — mirroring the ui.shadcn.com examples.

import {
	state, el,
	Calendar, DatePicker, Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter,
	ChartContainer, BarChart, LineChart, AreaChart, Bar, Line, Area, XAxis, CartesianGrid,
	ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent, ChartSparkline,
	Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
	ResizablePanelGroup, ResizablePanel, ResizableHandle, ScrollArea, ScrollBar, Separator,
	InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator, REGEXP_ONLY_DIGITS, Button
} from "@nemanjan00/qrp-shadcdn";
import { demo } from "./registry.js";

demo("Calendar", () => {
	const single = state({ date: new Date() });
	const range = state({ value: { from: new Date(new Date().getFullYear(), new Date().getMonth(), 12), to: undefined } });

	return el("div", { class: "flex flex-wrap items-start justify-center gap-6" },
		Calendar({ mode: "single", selected: [single, "date"], class: "rounded-md border shadow-sm", captionLayout: "dropdown" }),
		Calendar({ mode: "range", selected: [range, "value"], numberOfMonths: 2, class: "rounded-lg border shadow-sm" }));
});

demo("Date Picker", () => {
	const s = state({ date: undefined, range: undefined });

	return el("div", { class: "flex flex-wrap gap-4" },
		DatePicker({ value: [s, "date"] }),
		DatePicker({ mode: "range", value: [s, "range"], placeholder: "Pick a date range", class: "w-[300px]" }));
});

const chartData = state({ rows: [
	{ month: "January", desktop: 186, mobile: 80 },
	{ month: "February", desktop: 305, mobile: 200 },
	{ month: "March", desktop: 237, mobile: 120 },
	{ month: "April", desktop: 73, mobile: 190 },
	{ month: "May", desktop: 209, mobile: 130 },
	{ month: "June", desktop: 214, mobile: 140 }
] });

const chartConfig = {
	desktop: { label: "Desktop", color: "var(--chart-1)" },
	mobile: { label: "Mobile", color: "var(--chart-2)" }
};

const chartCard = (title, description, chart) => Card({ class: "w-full min-w-0 max-w-md" },
	CardHeader(CardTitle(title), CardDescription(description)),
	CardContent(chart));

demo("Chart", () => el("div", { class: "grid w-full gap-6 md:grid-cols-2" },
	chartCard("Bar Chart - Multiple", "January - June 2024", ChartContainer({ config: chartConfig },
		BarChart({ data: () => chartData.rows, accessibilityLayer: true },
			CartesianGrid({ vertical: false }),
			XAxis({ dataKey: "month", tickLine: false, tickMargin: 10, axisLine: false, tickFormatter: (value) => value.slice(0, 3) }),
			ChartTooltip({ content: ChartTooltipContent({ indicator: "dashed" }) }),
			ChartLegend({ content: ChartLegendContent() }),
			Bar({ dataKey: "desktop", fill: "var(--color-desktop)", radius: 4 }),
			Bar({ dataKey: "mobile", fill: "var(--color-mobile)", radius: 4 })))),
	chartCard("Area Chart - Stacked", "Showing total visitors for the last 6 months", ChartContainer({ config: chartConfig },
		AreaChart({ data: () => chartData.rows, accessibilityLayer: true, margin: { left: 12, right: 12 } },
			CartesianGrid({ vertical: false }),
			XAxis({ dataKey: "month", tickLine: false, axisLine: false, tickMargin: 8, tickFormatter: (value) => value.slice(0, 3) }),
			ChartTooltip({ cursor: false, content: ChartTooltipContent({ indicator: "dot" }) }),
			Area({ dataKey: "mobile", type: "natural", fill: "var(--color-mobile)", fillOpacity: 0.4, stroke: "var(--color-mobile)", stackId: "a" }),
			Area({ dataKey: "desktop", type: "natural", fill: "var(--color-desktop)", fillOpacity: 0.4, stroke: "var(--color-desktop)", stackId: "a" })))),
	chartCard("Line Chart - Multiple", "January - June 2024", ChartContainer({ config: chartConfig },
		LineChart({ data: () => chartData.rows, accessibilityLayer: true, margin: { left: 12, right: 12 } },
			CartesianGrid({ vertical: false }),
			XAxis({ dataKey: "month", tickLine: false, axisLine: false, tickMargin: 8, tickFormatter: (value) => value.slice(0, 3) }),
			ChartTooltip({ cursor: false, content: ChartTooltipContent() }),
			Line({ dataKey: "desktop", type: "monotone", stroke: "var(--color-desktop)", strokeWidth: 2, dot: false }),
			Line({ dataKey: "mobile", type: "monotone", stroke: "var(--color-mobile)", strokeWidth: 2, dot: false })))),
	Card({ class: "w-full max-w-md" },
		CardHeader(CardTitle("Live data"), CardDescription("The charts above share this data — they update in place.")),
		CardContent(el("div", { "data-chart": "spark", class: "flex items-center gap-4 [--color-desktop:var(--chart-1)]" },
			ChartSparkline({ data: () => chartData.rows, dataKey: "desktop", width: 160, height: 40 }),
			el("span", { class: "text-2xl font-bold tabular-nums" }, () => chartData.rows.at(-1).desktop))),
		CardFooter({ class: "gap-2" },
			Button({ variant: "outline", size: "sm", onclick: () => {
				chartData.rows = chartData.rows.map((row) => Object.assign({}, row, {
					desktop: Math.round(60 + Math.random() * 260),
					mobile: Math.round(60 + Math.random() * 200)
				}));
			} }, "Randomize"),
			Button({ variant: "outline", size: "sm", onclick: () => {
				const names = ["July", "August", "September", "October", "November", "December"];

				if(chartData.rows.length < 12) {
					chartData.rows.push({ month: names[chartData.rows.length - 6], desktop: 150, mobile: 120 });
				}
			} }, "Add month")))
));

demo("Carousel", () => el("div", { class: "flex w-full min-w-0 flex-col items-center gap-16 px-12" },
	Carousel({ class: "w-full max-w-xs" },
		CarouselContent(...[1, 2, 3, 4, 5].map((n) => CarouselItem(el("div", { class: "p-1" },
			Card(CardContent({ class: "flex aspect-square items-center justify-center p-6" }, el("span", { class: "text-4xl font-semibold" }, String(n)))))))),
		CarouselPrevious(), CarouselNext()),
	Carousel({ opts: { align: "start" }, class: "w-full max-w-sm" },
		CarouselContent(...[1, 2, 3, 4, 5].map((n) => CarouselItem({ class: "md:basis-1/2 lg:basis-1/3" }, el("div", { class: "p-1" },
			Card(CardContent({ class: "flex aspect-square items-center justify-center p-6" }, el("span", { class: "text-3xl font-semibold" }, String(n)))))))),
		CarouselPrevious(), CarouselNext())
));

demo("Resizable", () => ResizablePanelGroup({ orientation: "horizontal", class: "max-w-md rounded-lg border md:min-w-[450px]" },
	ResizablePanel({ defaultSize: 50 }, el("div", { class: "flex h-[200px] items-center justify-center p-6" }, el("span", { class: "font-semibold" }, "One"))),
	ResizableHandle({ withHandle: true }),
	ResizablePanel({ defaultSize: 50 }, ResizablePanelGroup({ orientation: "vertical" },
		ResizablePanel({ defaultSize: 25 }, el("div", { class: "flex h-full items-center justify-center p-6" }, el("span", { class: "font-semibold" }, "Two"))),
		ResizableHandle(),
		ResizablePanel({ defaultSize: 75 }, el("div", { class: "flex h-full items-center justify-center p-6" }, el("span", { class: "font-semibold" }, "Three")))))
));

demo("Scroll Area", () => {
	const tags = Array.from({ length: 50 }, (_, i) => `v1.2.0-beta.${50 - i}`);
	const works = ["Ornella Binni", "Tom Byrom", "Vladimir Malyavko"];

	return el("div", { class: "flex w-full min-w-0 flex-wrap items-start justify-center gap-8" },
		ScrollArea({ class: "h-72 w-48 rounded-md border" }, el("div", { class: "p-4" },
			el("h3", { class: "mb-4 text-sm leading-none font-medium" }, "Tags"),
			...tags.flatMap((tag) => [el("div", { class: "text-sm" }, tag), Separator({ class: "my-2" })]))),
		ScrollArea({ class: "w-full max-w-96 rounded-md border whitespace-nowrap" },
			el("div", { class: "flex w-max space-x-4 p-4" }, ...works.map((artist) => el("figure", { class: "shrink-0" },
				el("div", { class: "flex h-[200px] w-[150px] items-center justify-center overflow-hidden rounded-md bg-muted text-muted-foreground" }, "Photo"),
				el("figcaption", { class: "pt-2 text-xs text-muted-foreground" }, "Photo by ", el("span", { class: "font-semibold text-foreground" }, artist))))),
			ScrollBar({ orientation: "horizontal" })));
});

demo("Input OTP", () => {
	const s = state({ code: "" });

	return el("div", { class: "flex flex-col items-center gap-4" },
		InputOTP({ maxLength: 6, value: [s, "code"], pattern: REGEXP_ONLY_DIGITS },
			InputOTPGroup(InputOTPSlot({ index: 0 }), InputOTPSlot({ index: 1 }), InputOTPSlot({ index: 2 })),
			InputOTPSeparator(),
			InputOTPGroup(InputOTPSlot({ index: 3 }), InputOTPSlot({ index: 4 }), InputOTPSlot({ index: 5 }))),
		el("div", { class: "text-center text-sm" }, () => (s.code === "" ? "Enter your one-time password." : `You entered: ${s.code}`)));
});

/**
 * components/chart.js — Chart: shadcn's chart kit without recharts.
 *
 * Same composition as shadcn (recharts-style parts, a config that names and
 * colors each series, the shadcn tooltip and legend):
 *
 *   const config = { desktop: { label: "Desktop", color: "var(--chart-1)" },
 *                    mobile: { label: "Mobile", theme: { light: "#2563eb", dark: "#60a5fa" } } };
 *
 *   ChartContainer({ config, class: "min-h-[200px] w-full" },
 *     BarChart({ data: () => store.rows, accessibilityLayer: true },
 *       CartesianGrid({ vertical: false }),
 *       XAxis({ dataKey: "month", tickLine: false, axisLine: false, tickFormatter: (v) => v.slice(0, 3) }),
 *       ChartTooltip({ content: ChartTooltipContent({ indicator: "dashed" }) }),
 *       ChartLegend({ content: ChartLegendContent() }),
 *       Bar({ dataKey: "desktop", fill: "var(--color-desktop)", radius: 4 }),
 *       Bar({ dataKey: "mobile", fill: "var(--color-mobile)", radius: 4 })))
 *
 * Charts: BarChart, LineChart, AreaChart. Series: Bar, Line, Area (`stackId`
 * stacks; Line/Area `type`: linear | natural | monotone | step). Parts:
 * XAxis, YAxis, CartesianGrid, ChartTooltip(+Content), ChartLegend(+Content).
 * `data` may be an array or a thunk — the chart is live. ChartSparkline wraps
 * qrp's `spark` for KPI cards.
 *
 * Built on qrp: `spark` draws every line/area series (one responsive spark per
 * series on a shared y domain, `stack` baselines, `curve` types), `project()`
 * gives the bar/dot/tooltip geometry from the same options, `scale.nice` the
 * y ticks, `derive` + keyed `list()` the bars and dots (a data change moves
 * marks, it doesn't rebuild the SVG), `timeseries.downsample` (LTTB) thins
 * lines denser than the pixels, `format.num` the default labels.
 * https://ui.shadcn.com/docs/components/chart
 */

import { el, state, derive, list, when, effect, untracked, onDispose } from "@nemanjan00/qrp";
import { linear, ticks, nice } from "@nemanjan00/qrp/scale";
import { spark, project } from "@nemanjan00/qrp/spark";
import { downsample } from "@nemanjan00/qrp/timeseries";
import { num } from "@nemanjan00/qrp/format";
import { parseArgs, pick, cn, uid, read } from "../utils/index.js";

const THEMES = { light: "", dark: ".dark" };
const INITIAL = { width: 320, height: 200 };
const MARGIN = { top: 5, right: 5, bottom: 5, left: 5 };
const X_AXIS_HEIGHT = 30;
const Y_AXIS_WIDTH = 60;
const TICK_SIZE = 6;
const CHAR_WIDTH = 6.5;
// Fraction of each category band left empty around its bars (spark's `gap`).
const CATEGORY_GAP = 0.2;
// px between grouped bars (recharts' barGap); spark packs group slots edge to edge.
const BAR_GAP = 4;
const TOOLTIP_OFFSET = 10;
// Line/area sparks draw in this viewBox and stretch to the plot box
// (`responsive`: strokes keep their width), so a resize never rebuilds them.
const NOMINAL = 1000;

// --- descriptors -----------------------------------------------------------
// Chart parts are plain descriptions read by the chart, like recharts children.
// A dedicated prototype keeps parseArgs from mistaking them for props.

const DESCRIPTOR = Object.freeze({});

const describe = (kind) => (props = {}) => Object.assign(Object.create(DESCRIPTOR), { kind, props });

const isDescriptor = (value) => value !== null && typeof value === "object" && Object.getPrototypeOf(value) === DESCRIPTOR;

export const Bar = describe("bar");
export const Line = describe("line");
export const Area = describe("area");
export const XAxis = describe("xaxis");
export const YAxis = describe("yaxis");
export const CartesianGrid = describe("grid");
export const ChartTooltip = describe("tooltip");
export const ChartLegend = describe("legend");

/**
 * Tooltip body options (shadcn's ChartTooltipContent props).
 *
 * @param {object} [props]
 * @param {("dot"|"line"|"dashed")} [props.indicator] default "dot"
 * @param {boolean} [props.hideLabel]
 * @param {boolean} [props.hideIndicator]
 * @param {string} [props.nameKey] payload field naming each row's config key
 * @param {string} [props.labelKey] config key for the label
 * @param {Function} [props.labelFormatter] (label, payload) => Renderable
 * @param {Function} [props.formatter] (value, name, item, index, payload) => Renderable
 * @param {string} [props.color] override every indicator color
 * @param {string} [props.class]
 */
export const ChartTooltipContent = describe("tooltip-content");

/**
 * Legend body options (shadcn's ChartLegendContent props).
 *
 * @param {object} [props]
 * @param {boolean} [props.hideIcon]
 * @param {string} [props.nameKey]
 * @param {string} [props.class]
 */
export const ChartLegendContent = describe("legend-content");

// --- config ----------------------------------------------------------------

const configs = new WeakMap();
const refreshers = new WeakMap();

const configOf = (node) => {
	const container = node ? node.closest("[data-slot=chart]") : null;

	return (container && configs.get(container)) || {};
};

/** `--color-<key>` declarations per theme, as shadcn's ChartStyle emits. */
export const ChartStyle = ({ id, config }) => {
	const entries = Object.entries(config || {}).filter(([, item]) => item.theme || item.color);

	if(entries.length === 0) {
		return null;
	}

	const css = Object.entries(THEMES).map(([theme, prefix]) => {
		const lines = entries
			.map(([key, item]) => {
				const color = (item.theme && item.theme[theme]) || item.color;

				return color ? `  --color-${key}: ${color};` : null;
			})
			.filter(Boolean)
			.join("\n");

		return `${prefix} [data-chart=${id}] {\n${lines}\n}`;
	}).join("\n");

	return el("style", {}, css);
};

/**
 * `ChartContainer({ config, id }, chart)` — sizes the chart (aspect-video by
 * default) and publishes the config's colors as `--color-<key>`.
 *
 * @param {object} props
 * @param {object} props.config `{ key: { label, icon?, color? | theme?: { light, dark } } }`
 * @param {string} [props.id]
 * @returns {HTMLElement}
 */
export const ChartContainer = (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["config", "id", "class"]);
	const chartId = `chart-${own.id || uid("c").replace(/[^a-z0-9-]/gi, "")}`;

	const container = el("div", Object.assign({ "data-slot": "chart", "data-chart": chartId }, rest, {
		class: cn("flex aspect-video justify-center text-xs", own.class)
	}), ChartStyle({ id: chartId, config: own.config }), ...children);

	configs.set(container, own.config || {});

	// Charts are built before their container: let them re-read the config.
	[...container.querySelectorAll("[data-slot=chart-root]")].forEach((root) => {
		const refresh = refreshers.get(root);

		if(refresh) {
			refresh();
		}
	});

	return container;
};

// --- geometry ---------------------------------------------------------------

/** The y axis: a forced domain, or the data's range (always incl. 0) rounded out by scale.nice. */
const yAxisFor = (values, axis) => {
	const count = (axis && axis.tickCount) || 5;

	if(axis && axis.domain) {
		return { domain: axis.domain, ticks: ticks(axis.domain, count) };
	}

	const low = Math.min(0, ...values);
	const high = Math.max(0, ...values);
	const range = nice([low, high > low ? high : low + 1], count);

	return { domain: range.domain, ticks: range.ticks };
};

/** Bar outline with per-corner radii `[tl, tr, br, bl]`. */
const barPath = (x, y, w, h, radius) => {
	if(w <= 0 || h <= 0) {
		return "";
	}

	const r = (Array.isArray(radius) ? radius : [radius, radius, radius, radius])
		.map((value) => Math.max(0, Math.min(value || 0, w / 2, h / 2)));

	return [
		`M${x + r[0]},${y}`,
		`H${x + w - r[1]}`, r[1] ? `A${r[1]},${r[1]} 0 0 1 ${x + w},${y + r[1]}` : "",
		`V${y + h - r[2]}`, r[2] ? `A${r[2]},${r[2]} 0 0 1 ${x + w - r[2]},${y + h}` : "",
		`H${x + r[3]}`, r[3] ? `A${r[3]},${r[3]} 0 0 1 ${x},${y + h - r[3]}` : "",
		`V${y + r[0]}`, r[0] ? `A${r[0]},${r[0]} 0 0 1 ${x + r[0]},${y}` : "",
		"Z"
	].join("");
};

const seriesColor = (series) => series.props.color || series.props.fill || series.props.stroke || `var(--color-${series.props.dataKey})`;

const valueOf = (row, key) => {
	const value = Number(row && row[key]);

	return Number.isFinite(value) ? value : 0;
};

/**
 * Everything the marks bind to, recomputed (via derive) when data or size
 * change: plot box, the shared y axis, and per-series geometry from qrp spark's
 * `project()` — the same points the line/area sparks draw, so dots, the cursor
 * and the tooltip line up with the paths.
 */
const computeLayout = (kind, rows, size, parts, margin) => {
	const x = parts.xaxis ? parts.xaxis.props : null;
	const y = parts.yaxis ? parts.yaxis.props : null;
	const showX = Boolean(x) && !x.hide;
	const showY = Boolean(y) && !y.hide;
	const plot = {
		left: margin.left + (showY ? (y.width || Y_AXIS_WIDTH) : 0),
		right: size.width - margin.right,
		top: margin.top,
		bottom: size.height - margin.bottom - (showX ? (x.height || X_AXIS_HEIGHT) : 0)
	};
	const n = rows.length;
	const width = Math.max(0, plot.right - plot.left);
	const height = Math.max(0, plot.bottom - plot.top);

	// Stack offsets: series sharing a stackId sit on top of each other.
	const stackTops = {};
	const stacked = parts.series.map((series) => {
		const id = series.props.stackId;
		const bases = rows.map((row, i) => (id === undefined ? 0 : (stackTops[`${id}:${i}`] || 0)));
		const tops = rows.map((row, i) => bases[i] + valueOf(row, series.props.dataKey));

		if(id !== undefined) {
			tops.forEach((top, i) => { stackTops[`${id}:${i}`] = top; });
		}

		return { series, bases, tops };
	});

	const axisY = yAxisFor(stacked.flatMap((s) => s.tops.concat(s.bases)), y);
	const toY = linear(axisY.domain, [plot.bottom, plot.top]);
	const band = n > 0 ? width / n : width;
	const isBand = kind === "bar";
	const center = (i) => (isBand ? plot.left + band * (i + 0.5) : plot.left + (n > 1 ? (width * i) / (n - 1) : width / 2));

	// Bar slots: each unstacked bar gets one, each stack shares one (spark `group`).
	const slotKeys = [...new Set(parts.series.map((series, i) => (series.props.stackId === undefined ? `#${i}` : `s:${series.props.stackId}`)))];

	const geometry = stacked.map((s, seriesIndex) => {
		const stackId = s.series.props.stackId;
		const shared = {
			y: (row) => valueOf(row, s.series.props.dataKey),
			stack: stackId === undefined ? undefined : s.bases,
			base: 0,
			yDomain: axisY.domain,
			width,
			height,
			padding: 0
		};

		if(isBand) {
			const slot = slotKeys.indexOf(stackId === undefined ? `#${seriesIndex}` : `s:${stackId}`);
			const maxBar = s.series.props.maxBarSize;
			const slots = slotKeys.length;
			const bars = project(rows, Object.assign({ kind: "bar", group: [slot, slots], gap: CATEGORY_GAP }, shared)).map((p) => {
				// Re-split spark's slot row with recharts' gap between the bars.
				const groupLeft = p.left - slot * p.width;
				const slotWidth = Math.max(1, (p.width * slots - BAR_GAP * (slots - 1)) / slots);
				const barWidth = maxBar ? Math.min(maxBar, slotWidth) : slotWidth;

				return {
					x: plot.left + groupLeft + slot * (slotWidth + BAR_GAP) + (slotWidth - barWidth) / 2,
					y: plot.top + Math.min(p.y, p.y0),
					width: barWidth,
					height: Math.abs(p.y0 - p.y)
				};
			});

			return { series: s.series, bases: s.bases, bars, points: bars.map((bar) => [bar.x + bar.width / 2, bar.y]) };
		}

		const points = project(rows, Object.assign({ kind, xDomain: [0, Math.max(0, n - 1)] }, shared))
			.map((p) => [plot.left + p.x, plot.top + p.y]);

		return { series: s.series, bases: s.bases, points, bars: [] };
	});

	return { plot, band, center, toY, yDomain: axisY.domain, yTicks: axisY.ticks, geometry, n, isBand };
};

/** Category labels that fit: skip one that would collide with the previous. */
const visibleTicks = (rows, axis, center) => {
	const gap = axis.minTickGap === undefined ? 5 : axis.minTickGap;
	const format = axis.tickFormatter || ((value) => (typeof value === "number" ? num(value) : String(value === undefined ? "" : value)));

	return rows.reduce((acc, row, i) => {
		const label = String(format(row[axis.dataKey], i));
		const half = (label.length * CHAR_WIDTH) / 2;
		const left = center(i) - half;

		if(acc.right !== null && left < acc.right + gap) {
			return acc;
		}

		return { right: center(i) + half, shown: acc.shown.concat([{ i, label }]) };
	}, { right: null, shown: [] }).shown;
};

// --- tooltip & legend bodies ------------------------------------------------

const itemConfig = (config, item, key) => {
	const fromPayload = item.payload && typeof item.payload[key] === "string" ? item.payload[key] : null;

	return config[fromPayload || key] || config[item.dataKey] || config[item.name];
};

const tooltipBody = (options, label, payload, config) => {
	const indicator = options.indicator || "dot";
	const nestLabel = payload.length === 1 && indicator !== "dot";
	const labelNode = () => {
		if(options.hideLabel || payload.length === 0) {
			return null;
		}

		const first = payload[0];
		const key = options.labelKey || first.dataKey || first.name || "value";
		const conf = itemConfig(config, first, key);
		const value = !options.labelKey && typeof label === "string" ? (config[label] && config[label].label) || label : conf && conf.label;

		if(options.labelFormatter) {
			return el("div", { class: "font-medium" }, options.labelFormatter(value, payload));
		}

		return value ? el("div", { class: "font-medium" }, value) : null;
	};

	const rows = payload.map((item, index) => {
		const key = options.nameKey || item.name || item.dataKey || "value";
		const conf = itemConfig(config, item, key);
		const color = options.color || item.color;

		if(options.formatter && item.value !== undefined) {
			return el("div", { class: cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center") },
				options.formatter(item.value, item.name, item, index, item.payload));
		}

		const marker = conf && conf.icon ? conf.icon() : (options.hideIndicator ? null : el("div", {
			class: cn("shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)", {
				"h-2.5 w-2.5": indicator === "dot",
				"w-1": indicator === "line",
				"w-0 border-[1.5px] border-dashed bg-transparent": indicator === "dashed",
				"my-0.5": nestLabel && indicator === "dashed"
			}),
			style: `--color-bg: ${color}; --color-border: ${color}`
		}));

		return el("div", { class: cn("flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground", indicator === "dot" && "items-center") },
			marker,
			el("div", { class: cn("flex flex-1 justify-between leading-none", nestLabel ? "items-end" : "items-center") },
				el("div", { class: "grid gap-1.5" }, nestLabel ? labelNode() : null,
					el("span", { class: "text-muted-foreground" }, (conf && conf.label) || item.name)),
				item.value !== undefined ? el("span", { class: "font-mono font-medium text-foreground tabular-nums" }, num(item.value)) : null));
	});

	return el("div", {
		"data-slot": "chart-tooltip-content",
		class: cn("grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl", options.class)
	}, nestLabel ? null : labelNode(), el("div", { class: "grid gap-1.5" }, ...rows));
};

const legendBody = (options, payload, config, verticalAlign) => el("div", {
	"data-slot": "chart-legend-content",
	class: cn("flex items-center justify-center gap-4", verticalAlign === "top" ? "pb-3" : "pt-3", options.class)
}, ...payload.map((item) => {
	const conf = itemConfig(config, item, options.nameKey || item.dataKey || "value");

	return el("div", { class: "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground" },
		conf && conf.icon && !options.hideIcon ? conf.icon() : el("div", { class: "h-2 w-2 shrink-0 rounded-[2px]", style: { backgroundColor: item.color } }),
		(conf && conf.label) || item.dataKey);
}));

// --- the chart ---------------------------------------------------------------

const collect = (children) => children.reduce((acc, child) => {
	if(!isDescriptor(child)) {
		return acc;
	}

	if(["bar", "line", "area"].includes(child.kind)) {
		acc.series.push(child);
	} else {
		acc[child.kind] = child;
	}

	return acc;
}, { series: [] });

/** The rows a line/area spark draws, LTTB-downsampled when denser than one per 2px. */
const thinned = (rows, key, width, stacked) => {
	const points = rows.map((row, i) => ({ x: i, y: valueOf(row, key) }));
	const budget = Math.max(3, Math.floor(width / 2));

	if(stacked || points.length <= budget) {
		return points;
	}

	return downsample(points, budget);
};

const dotProps = (spec, color) => Object.assign({ r: 3, fill: "var(--background)", stroke: color, "stroke-width": 2 }, typeof spec === "object" ? spec : {});

/**
 * A line/area series drawn by qrp's spark: a responsive spark per series
 * stretched over the plot box, sharing the chart's y domain and the stack
 * baseline. Its paths update in place when the data changes.
 */
const sparkSeries = (layout, rows, kind, entry, index) => {
	const series = entry.props;
	const color = seriesColor(entry);
	const stacked = series.stackId !== undefined;
	const plot = () => layout.value.plot;
	const node = spark(() => thinned(rows(), series.dataKey, plot().right - plot().left, stacked), {
		kind,
		x: "x",
		y: "y",
		xDomain: () => [0, Math.max(0, layout.value.n - 1)],
		yDomain: () => layout.value.yDomain,
		base: 0,
		stack: stacked ? (d) => layout.value.geometry[index].bases[d.x] || 0 : undefined,
		curve: series.type || "linear",
		responsive: true,
		width: NOMINAL,
		height: NOMINAL,
		padding: 0,
		stroke: series.stroke || color,
		fill: kind === "area" ? series.fill || color : "none",
		strokeWidth: series.strokeWidth || (kind === "area" ? 1 : 2)
	});

	// Place the spark on the plot box; let a stroke on the edge overflow it.
	effect(() => {
		const box = plot();

		node.setAttribute("x", String(box.left));
		node.setAttribute("y", String(box.top));
		node.setAttribute("width", String(Math.max(0, box.right - box.left)));
		node.setAttribute("height", String(Math.max(0, box.bottom - box.top)));
	});
	node.setAttribute("overflow", "visible");

	// spark's own mark styling, adjusted to recharts' (styles beat attributes).
	const paths = [...node.querySelectorAll("path")];
	const line = paths[paths.length - 1];

	if(kind === "area") {
		paths[0].style.fillOpacity = String(series.fillOpacity === undefined ? 0.6 : series.fillOpacity);
	}

	if(series.strokeDasharray) {
		line.style.strokeDasharray = String(series.strokeDasharray);
	}

	return node;
};

const seriesMarks = (layout, rows, kind, entry, index) => {
	const series = entry.props;
	const color = seriesColor(entry);
	const geometry = () => layout.value.geometry[index];

	if(kind === "bar") {
		// Keyed paths (not spark's rebuilt rects): a data change moves the bars
		// in place, and recharts' per-corner radius ([4, 4, 0, 0]) still works.
		return el("g", { "data-slot": "chart-bar", "data-key": series.dataKey },
			list(() => geometry().bars.map((_, i) => i), (i) => i, (i) => el("path", {
				d: () => {
					const bar = geometry().bars[i];

					return bar ? barPath(bar.x, bar.y, bar.width, bar.height, series.radius || 0) : "";
				},
				fill: series.fill || color,
				"fill-opacity": series.fillOpacity
			})));
	}

	const marks = [sparkSeries(layout, rows, kind, entry, index)];
	const showDots = kind === "line" ? series.dot !== false : Boolean(series.dot);

	if(showDots) {
		marks.push(list(() => geometry().points.map((_, i) => i), (i) => i, (i) => el("circle", Object.assign(dotProps(series.dot, series.stroke || color), {
			cx: () => (geometry().points[i] || [0])[0],
			cy: () => (geometry().points[i] || [0, 0])[1]
		}))));
	}

	return el("g", { "data-slot": `chart-${kind}`, "data-key": series.dataKey }, ...marks);
};

const makeChart = (kind) => (...args) => {
	const { props, children } = parseArgs(args);
	const [own, rest] = pick(props, ["data", "margin", "class", "accessibilityLayer", "title"]);
	const parts = collect(children);
	const margin = Object.assign({}, MARGIN, own.margin);
	const rows = () => read(own.data) || [];
	const size = state(Object.assign({}, INITIAL));
	const meta = state({ version: 0 });
	const hover = state({ index: -1, x: 0, y: 0 });
	const layout = derive(() => computeLayout(kind, rows(), { width: size.width, height: size.height }, parts, margin));
	const plot = () => layout.value.plot;
	const tooltip = parts.tooltip ? parts.tooltip.props : null;
	const legend = parts.legend ? parts.legend.props : null;
	let root = null;
	const gridProps = parts.grid ? parts.grid.props : null;
	const xProps = parts.xaxis ? parts.xaxis.props : null;
	const yProps = parts.yaxis ? parts.yaxis.props : null;

	const payloadAt = (index) => {
		const row = rows()[index];

		return parts.series.map((entry) => ({
			dataKey: entry.props.dataKey,
			name: entry.props.name || entry.props.dataKey,
			value: row ? row[entry.props.dataKey] : undefined,
			color: seriesColor(entry),
			payload: row
		}));
	};

	const grid = gridProps ? el("g", { "data-slot": "chart-grid", class: "stroke-border/50", "stroke-dasharray": gridProps.strokeDasharray },
		gridProps.horizontal === false ? null : list(() => layout.value.yTicks, (t) => t, (t) => el("line", {
			x1: () => plot().left, x2: () => plot().right, y1: () => layout.value.toY(t), y2: () => layout.value.toY(t)
		})),
		gridProps.vertical === false ? null : list(() => Array.from({ length: layout.value.n }, (_, i) => i), (i) => i, (i) => el("line", {
			y1: () => plot().top, y2: () => plot().bottom, x1: () => layout.value.center(i), x2: () => layout.value.center(i)
		}))) : null;

	const xAxis = xProps && !xProps.hide ? el("g", { "data-slot": "chart-x-axis", class: "fill-muted-foreground" },
		xProps.axisLine === false ? null : el("line", { class: "stroke-border", x1: () => plot().left, x2: () => plot().right, y1: () => plot().bottom, y2: () => plot().bottom }),
		list(() => visibleTicks(rows(), xProps, layout.value.center), (tick) => `${tick.i}:${tick.label}`, (tick) => el("g", {},
			xProps.tickLine === false ? null : el("line", { class: "stroke-border", x1: () => layout.value.center(tick.i), x2: () => layout.value.center(tick.i), y1: () => plot().bottom, y2: () => plot().bottom + TICK_SIZE }),
			el("text", {
				x: () => layout.value.center(tick.i),
				y: () => plot().bottom + (xProps.tickLine === false ? 0 : TICK_SIZE) + (xProps.tickMargin === undefined ? 2 : xProps.tickMargin),
				dy: "0.71em",
				"text-anchor": "middle"
			}, tick.label)))) : null;

	const yFormat = yProps && yProps.tickFormatter ? yProps.tickFormatter : (value) => num(value);

	const yAxis = yProps && !yProps.hide ? el("g", { "data-slot": "chart-y-axis", class: "fill-muted-foreground" },
		yProps.axisLine === false ? null : el("line", { class: "stroke-border", x1: () => plot().left, x2: () => plot().left, y1: () => plot().top, y2: () => plot().bottom }),
		list(() => layout.value.yTicks, (t) => t, (t) => el("text", {
			x: () => plot().left - (yProps.tickLine === false ? 0 : TICK_SIZE) - (yProps.tickMargin === undefined ? 2 : yProps.tickMargin),
			y: () => layout.value.toY(t),
			dy: "0.355em",
			"text-anchor": "end"
		}, String(yFormat(t))))) : null;

	const cursorOn = tooltip && tooltip.cursor !== false;
	const cursor = cursorOn ? el("g", { "data-slot": "chart-cursor", "pointer-events": "none" }, when(() => hover.index >= 0, () => (layout.value.isBand
		? el("rect", {
			class: "fill-muted",
			x: () => plot().left + layout.value.band * hover.index,
			y: () => plot().top,
			width: () => layout.value.band,
			height: () => Math.max(0, plot().bottom - plot().top)
		})
		: el("line", {
			class: "stroke-border",
			x1: () => layout.value.center(hover.index),
			x2: () => layout.value.center(hover.index),
			y1: () => plot().top,
			y2: () => plot().bottom
		})))) : null;

	const activeDots = tooltip && kind !== "bar" ? el("g", { "data-slot": "chart-active-dots", "pointer-events": "none" },
		...parts.series.map((entry, index) => when(() => hover.index >= 0 && entry.props.activeDot !== false, () => el("circle", {
			r: 4,
			fill: seriesColor(entry),
			stroke: "var(--background)",
			"stroke-width": 2,
			cx: () => (layout.value.geometry[index].points[hover.index] || [0])[0],
			cy: () => (layout.value.geometry[index].points[hover.index] || [0, 0])[1]
		})))) : null;

	const indexAt = (px) => {
		const box = layout.value;

		if(box.n === 0) {
			return -1;
		}

		if(box.isBand) {
			return Math.max(0, Math.min(box.n - 1, Math.floor((px - box.plot.left) / box.band)));
		}

		const step = box.n > 1 ? (box.plot.right - box.plot.left) / (box.n - 1) : 1;

		return Math.max(0, Math.min(box.n - 1, Math.round((px - box.plot.left) / step)));
	};

	const svg = el("svg", {
		"data-slot": "chart-surface",
		role: "img",
		"aria-label": own.title || null,
		tabindex: own.accessibilityLayer ? "0" : null,
		width: () => size.width,
		height: () => size.height,
		class: "overflow-visible outline-hidden",
		onpointermove: (event) => {
			const rect = svg.getBoundingClientRect();
			const px = event.clientX - rect.left;
			const py = event.clientY - rect.top;
			const inside = px >= plot().left && px <= plot().right && py >= plot().top && py <= plot().bottom;

			hover.index = inside ? indexAt(px) : -1;
			hover.x = px;
			hover.y = py;
		},
		onpointerleave: () => { hover.index = -1; },
		onkeydown: (event) => {
			const step = { ArrowLeft: -1, ArrowRight: 1 }[event.key];

			if(step && layout.value.n > 0) {
				event.preventDefault();
				hover.index = Math.max(0, Math.min(layout.value.n - 1, (hover.index < 0 ? 0 : hover.index + step)));
				hover.x = layout.value.center(hover.index);
				hover.y = plot().top;
			}
		},
		onblur: () => { hover.index = -1; }
	}, cursor, grid, xAxis, yAxis, ...parts.series.map((entry, index) => seriesMarks(layout, rows, entry.kind, entry, index)), activeDots);

	const tooltipNode = tooltip ? el("div", {
		"data-slot": "chart-tooltip",
		class: "pointer-events-none absolute top-0 left-0 z-10 transition-transform duration-100 ease-out",
		style: () => {
			if(hover.index < 0) {
				return { visibility: "hidden" };
			}

			const flip = hover.x + TOOLTIP_OFFSET + 160 > size.width;

			return {
				visibility: "visible",
				transform: `translate(${flip ? `calc(${hover.x - TOOLTIP_OFFSET}px - 100%)` : `${hover.x + TOOLTIP_OFFSET}px`}, ${Math.max(0, hover.y - TOOLTIP_OFFSET)}px)`
			};
		}
	}, () => {
		if(hover.index < 0) {
			return null;
		}

		const index = hover.index;

		meta.version;

		return untracked(() => {
			const xKey = xProps && xProps.dataKey;
			const row = rows()[index];
			const label = xKey && row ? row[xKey] : String(index);
			const options = tooltip.content && isDescriptor(tooltip.content) ? tooltip.content.props : {};

			return tooltipBody(options, label, payloadAt(index), configOf(root));
		});
	}) : null;

	const legendNode = legend ? () => {
		meta.version;

		const options = legend.content && isDescriptor(legend.content) ? legend.content.props : {};

		return untracked(() => legendBody(options, payloadAt(0), configOf(root), legend.verticalAlign));
	} : null;

	const surface = el("div", { "data-slot": "chart-plot", class: "relative min-h-0 w-full flex-1" }, svg, tooltipNode);

	// Bound after construction: the legend renders once before root exists and
	// again (via the container's refresh) once it can find its config.
	root = el("div", Object.assign({ "data-slot": "chart-root" }, rest, {
		class: cn("relative flex h-full w-full flex-col", own.class)
	}), legend && legend.verticalAlign === "top" ? legendNode : null, surface, legend && legend.verticalAlign !== "top" ? legendNode : null);

	refreshers.set(root, () => { meta.version += 1; });

	const measure = () => {
		const rect = surface.getBoundingClientRect();

		if(rect.width > 0 && rect.height > 0 && (rect.width !== size.width || rect.height !== size.height)) {
			size.width = rect.width;
			size.height = rect.height;
		}
	};

	if(typeof ResizeObserver !== "undefined") {
		const observer = new ResizeObserver(measure);

		observer.observe(surface);
		onDispose(() => observer.disconnect());
	}

	requestAnimationFrame(measure);

	return root;
};

/** `BarChart({ data, margin, accessibilityLayer }, ...parts)` */
export const BarChart = makeChart("bar");

/** `LineChart({ data, margin, accessibilityLayer }, ...parts)` */
export const LineChart = makeChart("line");

/** `AreaChart({ data, margin, accessibilityLayer }, ...parts)` */
export const AreaChart = makeChart("area");

/**
 * A sparkline for KPI cards — qrp's `spark` colored from the chart config.
 *
 * @param {object} props
 * @param {Array|Function} props.data rows (or a thunk)
 * @param {string} props.dataKey the series to draw
 * @param {("line"|"area"|"bar")} [props.kind] default "line"
 * @param {string} [props.color] default `var(--color-<dataKey>)`
 * @param {number} [props.width] default 120
 * @param {number} [props.height] default 32
 * @param {string} [props.class]
 * @returns {SVGElement}
 */
export const ChartSparkline = (props) => {
	const color = props.color || `var(--color-${props.dataKey})`;

	return spark(typeof props.data === "function" ? props.data : () => props.data, {
		kind: props.kind || "line",
		y: props.dataKey,
		width: props.width || 120,
		height: props.height || 32,
		stroke: color,
		fill: props.kind === "area" ? color : "none",
		strokeWidth: 2,
		class: cn("overflow-visible", props.class)
	});
};

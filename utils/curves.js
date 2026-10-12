/**
 * utils/curves.js — SVG path data through points, for Chart's lines and areas.
 * The interpolations recharts offers via d3-shape: linear, natural (natural
 * cubic spline), monotone (monotone in x — never overshoots), step.
 */

const round = (n) => Math.round(n * 100) / 100;

const pt = (p) => `${round(p[0])},${round(p[1])}`;

const linearPath = (points) => points.map((p, i) => `${i === 0 ? "M" : "L"}${pt(p)}`).join("");

const stepPath = (points) => points.reduce((d, p, i) => {
	if(i === 0) {
		return `M${pt(p)}`;
	}

	const mid = (points[i - 1][0] + p[0]) / 2;

	return `${d}H${round(mid)}V${round(p[1])}H${round(p[0])}`;
}, "");

/**
 * Natural cubic spline control points for one coordinate (d3's curveNatural):
 * a tridiagonal solve, written as a forward sweep and a back substitution.
 */
const naturalControls = (x) => {
	const n = x.length - 1;
	const rows = Array.from({ length: n }, (_, i) => {
		if(i === 0) {
			return { a: 0, b: 2, r: x[0] + 2 * x[1] };
		}

		if(i === n - 1) {
			return { a: 2, b: 7, r: 8 * x[n - 1] + x[n] };
		}

		return { a: 1, b: 4, r: 4 * x[i] + 2 * x[i + 1] };
	});

	const swept = rows.reduce((acc, row, i) => {
		if(i === 0) {
			return [row];
		}

		const prev = acc[i - 1];
		const m = row.a / prev.b;

		return acc.concat([{ a: row.a, b: row.b - m, r: row.r - m * prev.r }]);
	}, []);

	const first = swept.reduceRight((acc, row, i) => {
		const value = i === n - 1 ? row.r / row.b : (row.r - acc[0]) / row.b;

		return [value].concat(acc);
	}, []);

	const second = first.map((_, i) => (i === n - 1 ? (x[n] + first[n - 1]) / 2 : 2 * x[i + 1] - first[i + 1]));

	return [first, second];
};

const naturalPath = (points) => {
	if(points.length < 3) {
		return linearPath(points);
	}

	const [ax, bx] = naturalControls(points.map((p) => p[0]));
	const [ay, by] = naturalControls(points.map((p) => p[1]));

	return points.slice(1).reduce((d, p, i) => `${d}C${pt([ax[i], ay[i]])} ${pt([bx[i], by[i]])} ${pt(p)}`, `M${pt(points[0])}`);
};

const sign = (n) => (n < 0 ? -1 : 1);

/** Tangents for monotone-x interpolation (d3's curveMonotoneX). */
const monotoneTangents = (points) => {
	const n = points.length;
	const secant = (i) => (points[i + 1][1] - points[i][1]) / ((points[i + 1][0] - points[i][0]) || 1);
	const interior = (i) => {
		const h0 = points[i][0] - points[i - 1][0];
		const h1 = points[i + 1][0] - points[i][0];
		const s0 = secant(i - 1);
		const s1 = secant(i);
		const p = (s0 * h1 + s1 * h0) / ((h0 + h1) || 1);

		return (sign(s0) + sign(s1)) * Math.min(Math.abs(s0), Math.abs(s1), 0.5 * Math.abs(p)) || 0;
	};
	const inner = points.map((_, i) => (i === 0 || i === n - 1 ? 0 : interior(i)));

	return inner.map((t, i) => {
		if(i === 0) {
			return n > 2 ? (3 * secant(0) - inner[1]) / 2 : secant(0);
		}

		if(i === n - 1) {
			return n > 2 ? (3 * secant(n - 2) - inner[n - 2]) / 2 : secant(n - 2);
		}

		return t;
	});
};

const monotonePath = (points) => {
	if(points.length < 3) {
		return linearPath(points);
	}

	const t = monotoneTangents(points);

	return points.slice(1).reduce((d, p, i) => {
		const p0 = points[i];
		const dx = (p[0] - p0[0]) / 3;

		return `${d}C${pt([p0[0] + dx, p0[1] + dx * t[i]])} ${pt([p[0] - dx, p[1] - dx * t[i + 1]])} ${pt(p)}`;
	}, `M${pt(points[0])}`);
};

const CURVES = {
	linear: linearPath,
	natural: naturalPath,
	monotone: monotonePath,
	monotoneX: monotonePath,
	step: stepPath
};

/**
 * Path data through `points` with the named interpolation.
 *
 * @param {Array<[number, number]>} points
 * @param {string} [type] linear | natural | monotone | step (default linear)
 * @returns {string} SVG path `d` ("" for no points)
 */
export const curve = (points, type = "linear") => {
	if(points.length === 0) {
		return "";
	}

	if(points.length === 1) {
		return `M${pt(points[0])}`;
	}

	return (CURVES[type] || linearPath)(points);
};

/**
 * Closed area between a top line and a baseline (both left → right).
 *
 * @param {Array<[number, number]>} top
 * @param {Array<[number, number]>} base
 * @param {string} [type]
 * @returns {string}
 */
export const areaPath = (top, base, type = "linear") => {
	if(top.length === 0) {
		return "";
	}

	const back = curve(base.slice().reverse(), type).replace(/^M/, "L");

	return `${curve(top, type)}${back}Z`;
};

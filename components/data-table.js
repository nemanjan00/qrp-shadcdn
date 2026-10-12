/**
 * components/data-table.js — DataTable: shadcn's data table, built on qrp.
 *
 * shadcn builds it from TanStack Table; here every piece of state is qrp's:
 *
 * - rendering, keyed rows, sorting, filtering, paging, reactive cells → `table()`
 * - selection (select-all + indeterminate), column visibility, page size, pager
 *   → `dataGrid()`
 *
 * Both run over the SAME `sort` / `filter` / `page` state objects, so the grid's
 * counts and the rendered rows always agree. The UI is our own components
 * (Checkbox, Input, DropdownMenu, Select, Button) skinned onto `table()` through
 * its `classes` hooks.
 *
 *   DataTable({
 *     data: () => store.payments,
 *     key: (p) => p.id,
 *     selectable: true,
 *     filterColumns: ["email"], filterPlaceholder: "Filter emails...",
 *     columns: [
 *       { key: "status", title: "Status" },
 *       { key: "email", title: "Email", sortable: true },
 *       { key: "amount", title: "Amount", formatter: usd, thClass: "text-right", tdClass: "text-right" },
 *       { key: "actions", hideable: false, render: (p) => RowActions(p) }
 *     ]
 *   });
 *
 * Columns are qrp table columns (`key`, `title`/`label`, `accessor`, `formatter`,
 * `render`, `header`, `sortable`, `thClass`, `tdClass`) plus `hideable` (listed
 * in the Columns menu, default true) and `hidden` (start hidden).
 *
 * For a custom layout, compose the blocks shadcn's docs build: `useDataTable()`
 * returns the controller, then `DataTableFilter`, `DataTableViewOptions`,
 * `DataTableView`, `DataTablePagination`, `DataTableColumnHeader({ table, column })`
 * all take it as their `table` prop.
 * https://ui.shadcn.com/docs/components/data-table
 */

import { el, state, effect, untracked, when, batch } from "@nemanjan00/qrp";
import { table as qrpTable } from "@nemanjan00/qrp/table";
import { dataGrid } from "@nemanjan00/qrp/datagrid";
import { parseArgs, pick, cn, read } from "../utils/index.js";
import { Button } from "./button.js";
import { Checkbox } from "./checkbox.js";
import { Input } from "./input.js";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem } from "./dropdown-menu.js";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "./select.js";
import {
	ArrowUpDownIcon, ArrowUpIcon, ArrowDownIcon, ChevronDownIcon,
	ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon
} from "../icons/index.js";

const PAGE_SIZES = [10, 20, 30, 40, 50];
const SELECT_KEY = "__select";

// The Table component's classes, applied to qrp table() parts.
const CLASSES = {
	table: "w-full caption-bottom text-sm",
	thead: "[&_tr]:border-b",
	tbody: "[&_tr:last-child]:border-0",
	row: "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50",
	th: "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
	td: "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]"
};

const titleOf = (column) => column.title || column.label || column.key;

const valueOf = (column, item) => (column.accessor ? column.accessor(item) : item[column.key]);

/**
 * Default filter: case-insensitive substring of `filter.query` over the
 * searchable columns' raw values.
 */
const queryFilter = (columns) => (item, filter) => {
	const query = String(filter.query || "").trim().toLowerCase();

	if(!query) {
		return true;
	}

	return columns.some((column) => String(valueOf(column, item) ?? "").toLowerCase().includes(query));
};

/**
 * The data-table controller: shared state, the qrp grid, and the table fields.
 *
 * @param {object} options
 * @param {Function|Array} options.data rows, or a thunk returning them (reactive)
 * @param {object[]} options.columns column specs (see the file header)
 * @param {Function} [options.key] row => stable id (default row.id)
 * @param {boolean} [options.selectable] prepend a row-selection checkbox column
 * @param {number} [options.pageSize] initial page size (default the first of pageSizes)
 * @param {number[]} [options.pageSizes] page-size choices (default 10–50)
 * @param {object} [options.sort] initial sort `{ key, dir }` (dir 1 asc, -1 desc)
 * @param {string[]} [options.filterColumns] keys the filter query searches (default all data columns)
 * @param {Function} [options.filterFn] (row, filter) => boolean, replaces the query filter
 * @param {Function} [options.onSelectionChange] (selectedRows) => void
 * @returns {object} `{ grid, sort, filter, page, columns, fields, pageSizes, rows }`
 */
export const useDataTable = (options) => {
	const rows = typeof options.data === "function" ? options.data : () => options.data || [];
	const keyOf = options.key || ((item) => item.id);
	const pageSizes = options.pageSizes || PAGE_SIZES;
	const sort = state(Object.assign({ key: null, dir: 1 }, options.sort));
	const filter = state({ query: "" });
	const page = state({ index: 0, size: options.pageSize || pageSizes[0] });
	const dataColumns = options.columns || [];
	const searchable = options.filterColumns
		? dataColumns.filter((column) => options.filterColumns.includes(column.key))
		: dataColumns.filter((column) => !column.render || column.accessor);
	const filterFn = options.filterFn || queryFilter(searchable);

	const columns = (options.selectable ? [{ key: SELECT_KEY, hideable: false, select: true }] : []).concat(dataColumns);

	const grid = dataGrid(rows, {
		key: keyOf,
		sort,
		filter,
		page,
		filterFn,
		pageSizes,
		columns: columns.map((column) => ({ key: column.key, label: titleOf(column), hidden: Boolean(column.hidden) }))
	});

	const dt = { grid, sort, filter, page, columns, pageSizes, rows, key: keyOf, filterFn };

	// One qrp table field per column, built once; fields() only filters them, so
	// toggling a column re-renders cells without rebuilding the field objects.
	const fieldFor = (column) => {
		if(column.select) {
			return {
				key: SELECT_KEY,
				header: () => untracked(() => Checkbox({
					"aria-label": "Select all",
					checked: () => {
						if(grid.allSelected()) {
							return true;
						}

						return grid.someSelected() ? "indeterminate" : false;
					},
					// One update, not one per row (datagrid writes ids individually).
					onCheckedChange: () => batch(() => grid.toggleAll())
				})),
				// The checkbox binds to the selection itself; untracked keeps the
				// cell from rebuilding (and losing focus) on every toggle.
				render: (item) => untracked(() => Checkbox({
					"aria-label": "Select row",
					checked: () => grid.isSelected(item),
					onCheckedChange: (on) => (on ? grid.select(item) : grid.deselect(item))
				}))
			};
		}

		return Object.assign({}, column, {
			label: titleOf(column),
			header: column.header || (column.sortable ? () => untracked(() => DataTableColumnHeader({ table: dt, column })) : undefined)
		});
	};

	const fieldsByKey = new Map(columns.map((column) => [column.key, fieldFor(column)]));

	dt.fields = () => columns.filter((column) => grid.isVisible(column.key)).map((column) => fieldsByKey.get(column.key));

	if(options.onSelectionChange) {
		let first = true;

		effect(() => {
			const selected = grid.selectedItems();

			if(first) {
				first = false;
				return;
			}

			untracked(() => options.onSelectionChange(selected));
		});
	}

	return dt;
};

/**
 * Sortable header: a ghost button that toggles the column's sort, with an
 * arrow showing the direction. Non-sortable columns render the plain title.
 */
export const DataTableColumnHeader = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["table", "column", "title", "class"]);
	const column = own.column;
	const title = own.title || titleOf(column);

	if(!column.sortable) {
		return el("div", Object.assign({}, rest, { class: cn(own.class) }), title);
	}

	const dt = own.table;
	const direction = () => (dt.sort.key === column.key ? dt.sort.dir || 1 : 0);

	return Button(Object.assign({}, rest, {
		variant: "ghost",
		size: "sm",
		class: cn("-ml-3 h-8 data-[state=open]:bg-accent", own.class),
		onclick: () => dt.grid.toggleSort(column.key)
	}), title, () => {
		const dir = direction();

		if(dir === 1) {
			return ArrowUpIcon();
		}

		return dir === -1 ? ArrowDownIcon() : ArrowUpDownIcon();
	});
};

/** The bordered table itself: qrp table() in the shadcn Table look. */
export const DataTableView = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["table", "class", "empty"]);
	const dt = own.table;
	const grid = dt.grid;

	const node = qrpTable({
		rows: dt.rows,
		key: dt.key,
		fields: dt.fields,
		sort: dt.sort,
		page: dt.page,
		filter: dt.filter,
		filterFn: dt.filterFn,
		class: CLASSES.table,
		classes: {
			thead: CLASSES.thead,
			headRow: CLASSES.row,
			th: CLASSES.th,
			tbody: CLASSES.tbody,
			tr: (item) => cn(CLASSES.row, grid.isSelected(item) ? "bg-muted" : null),
			td: CLASSES.td
		},
		// The header button draws the arrow; no extra indicator.
		sortIndicator: () => null
	});

	node.setAttribute("data-slot", "table");

	// "No results." — a row spanning the visible columns when nothing matches.
	node.append(el("tbody", { "data-slot": "table-body" }, when(() => grid.total() === 0, () => el("tr", { class: CLASSES.row },
		el("td", { colspan: () => String(dt.fields().length), class: cn(CLASSES.td, "h-24 text-center") }, own.empty || "No results.")))));

	return el("div", Object.assign({ "data-slot": "data-table" }, rest, { class: cn("overflow-hidden rounded-md border", own.class) }),
		el("div", { "data-slot": "table-container", class: "relative w-full overflow-x-auto" }, node));
};

/** The filter input, bound to the table's query. */
export const DataTableFilter = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["table", "class"]);

	return Input(Object.assign({ placeholder: "Filter...", "aria-label": "Filter rows" }, rest, {
		bind: [own.table.filter, "query"],
		class: cn("max-w-sm", own.class)
	}));
};

/** The "Columns" menu: a checkbox per hideable column. */
export const DataTableViewOptions = (...args) => {
	const { props } = parseArgs(args);
	const [own] = pick(props, ["table", "class", "label"]);
	const dt = own.table;
	const hideable = dt.columns.filter((column) => column.hideable !== false && !column.select);

	return DropdownMenu(
		DropdownMenuTrigger(Button({ variant: "outline", class: cn("ml-auto", own.class) }, own.label || "Columns", ChevronDownIcon())),
		DropdownMenuContent({ align: "end" }, ...hideable.map((column) => DropdownMenuCheckboxItem({
			class: "capitalize",
			checked: () => dt.grid.isVisible(column.key),
			onCheckedChange: () => dt.grid.toggleColumn(column.key)
		}, titleOf(column))))
	);
};

const pagerButton = (label, icon, onclick, disabled, extra) => Button({
	variant: "outline",
	size: "icon",
	class: cn("size-8", extra),
	onclick,
	disabled
}, el("span", { class: "sr-only" }, label), icon);

/**
 * Footer: selection count, rows-per-page, "Page x of y", first/prev/next/last.
 * `selection: false` hides the count; `pageSizes` overrides the choices.
 */
export const DataTablePagination = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["table", "class", "pageSizes", "selection"]);
	const dt = own.table;
	const grid = dt.grid;
	const sizes = own.pageSizes || dt.pageSizes;
	const pages = () => Math.max(1, grid.pageCount());

	return el("div", Object.assign({ "data-slot": "data-table-pagination" }, rest, { class: cn("flex items-center justify-between px-2", own.class) }),
		el("div", { class: "flex-1 text-sm text-muted-foreground" },
			own.selection === false ? null : () => `${grid.selectedItems().length} of ${grid.total()} row(s) selected.`),
		el("div", { class: "flex items-center space-x-6 lg:space-x-8" },
			el("div", { class: "flex items-center space-x-2" },
				el("p", { class: "text-sm font-medium" }, "Rows per page"),
				Select({ value: () => String(dt.page.size), onValueChange: (value) => grid.setPageSize(Number(value)) },
					SelectTrigger({ class: "h-8 w-[70px]", "aria-label": "Rows per page" }, SelectValue()),
					SelectContent({ side: "top" }, ...sizes.map((size) => SelectItem({ value: String(size) }, String(size)))))),
			el("div", { class: "flex w-[100px] items-center justify-center text-sm font-medium" },
				() => `Page ${Math.min(dt.page.index + 1, pages())} of ${pages()}`),
			el("div", { class: "flex items-center space-x-2" },
				pagerButton("Go to first page", ChevronsLeftIcon(), () => grid.goto(0), () => !grid.hasPrev(), "hidden lg:flex"),
				pagerButton("Go to previous page", ChevronLeftIcon(), () => grid.prev(), () => !grid.hasPrev()),
				pagerButton("Go to next page", ChevronRightIcon(), () => grid.next(), () => !grid.hasNext()),
				pagerButton("Go to last page", ChevronsRightIcon(), () => grid.goto(grid.pageCount() - 1), () => !grid.hasNext(), "hidden lg:flex"))));
};

/**
 * The whole data table: filter + Columns menu, the table, and the pagination
 * footer. Takes every useDataTable() option plus `filterPlaceholder`,
 * `toolbar` (false hides it), `empty` (no-results content) and `class`.
 * The controller is on the returned node as `.dataTable`.
 */
export const DataTable = (...args) => {
	const { props } = parseArgs(args);
	const [own, rest] = pick(props, ["class", "filterPlaceholder", "toolbar", "empty", "data", "columns", "key", "selectable", "pageSize", "pageSizes", "sort", "filterColumns", "filterFn", "onSelectionChange"]);
	const dt = useDataTable(own);
	const toolbar = own.toolbar === false ? null : el("div", { class: "flex items-center gap-2 py-4" },
		DataTableFilter({ table: dt, placeholder: read(own.filterPlaceholder) || "Filter..." }),
		DataTableViewOptions({ table: dt }));

	const node = el("div", Object.assign({ "data-slot": "data-table-root" }, rest, { class: cn("w-full", own.class) }),
		toolbar,
		DataTableView({ table: dt, empty: own.empty }),
		DataTablePagination({ table: dt, class: "py-4", selection: own.selectable ? undefined : false }));

	node.dataTable = dt;

	return node;
};

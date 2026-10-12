import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state } from "@nemanjan00/qrp";
import { DataTable, useDataTable, DataTableView, DataTableColumnHeader } from "../index.js";

const PAYMENTS = [
	{ id: "a", status: "success", email: "ken99@example.com", amount: 316 },
	{ id: "b", status: "success", email: "abe45@example.com", amount: 242 },
	{ id: "c", status: "processing", email: "monserrat44@example.com", amount: 837 },
	{ id: "d", status: "success", email: "silas22@example.com", amount: 874 },
	{ id: "e", status: "failed", email: "carmella@example.com", amount: 721 }
];

const columns = () => [
	{ key: "status", title: "Status" },
	{ key: "email", title: "Email", sortable: true },
	{ key: "amount", title: "Amount", sortable: true, formatter: (value) => `$${value}` }
];

const build = (extra = {}) => {
	const store = state({ rows: PAYMENTS.slice() });
	const node = DataTable(Object.assign({ data: () => store.rows, columns: columns(), selectable: true, filterColumns: ["email"], pageSize: 10 }, extra));

	document.body.append(node);

	return { node, store, dt: node.dataTable };
};

const emails = (node) => [...node.querySelectorAll("table tbody tr")].map((tr) => tr.children[2] && tr.children[2].textContent).filter(Boolean);

test("renders a shadcn-styled qrp table with toolbar, header checkbox and footer", () => {
	const { node } = build();
	const tableEl = node.querySelector("table");

	assert.equal(tableEl.dataset.slot, "table");
	assert.ok(tableEl.classList.contains("qrp-table"), "it is qrp's table()");
	assert.ok(tableEl.className.includes("caption-bottom"));
	assert.ok(node.querySelector("thead tr").className.includes("border-b"));
	assert.ok(node.querySelector("th").className.includes("h-10 px-2"));
	assert.equal(emails(node).length, 5);
	assert.ok(node.querySelector("input[aria-label='Filter rows']"));
	assert.ok(node.textContent.includes("0 of 5 row(s) selected."));
	assert.ok(node.textContent.includes("Page 1 of 1"));
	node.remove();
});

test("sortable header button toggles qrp's sort (asc, then desc) and sets aria-sort", () => {
	const { node } = build();
	const emailHeader = [...node.querySelectorAll("th button")].find((b) => b.textContent.includes("Email"));

	emailHeader.click();
	assert.deepEqual(emails(node), [...PAYMENTS].map((p) => p.email).sort());
	assert.ok(emailHeader.querySelector("svg.lucide-arrow-up"));
	assert.equal(emailHeader.closest("th").getAttribute("aria-sort"), "ascending");

	emailHeader.click();
	assert.deepEqual(emails(node), [...PAYMENTS].map((p) => p.email).sort().reverse());
	assert.ok(emailHeader.querySelector("svg.lucide-arrow-down"));
	node.remove();
});

test("filter input narrows rows through the shared filter state; no-results row", () => {
	const { node, dt } = build();
	const input = node.querySelector("input[aria-label='Filter rows']");

	input.value = "SILAS";
	input.dispatchEvent(new Event("input"));
	assert.equal(dt.filter.query, "SILAS");
	assert.deepEqual(emails(node), ["silas22@example.com"]);
	assert.equal(dt.grid.total(), 1);

	input.value = "nobody";
	input.dispatchEvent(new Event("input"));
	assert.ok(node.textContent.includes("No results."));
	node.remove();
});

test("select-all goes indeterminate on a partial selection; rows highlight; count updates", () => {
	const seen = [];
	const { node, dt } = build({ onSelectionChange: (rows) => seen.push(rows.length) });
	const all = node.querySelector("thead [role=checkbox]");
	const firstRow = node.querySelector("table tbody tr");

	firstRow.querySelector("[role=checkbox]").click();
	assert.equal(dt.grid.selectedIds().length, 1);
	assert.equal(all.getAttribute("data-state"), "indeterminate");
	assert.ok(firstRow.className.includes("bg-muted"));
	assert.ok(node.textContent.includes("1 of 5 row(s) selected."));

	all.click();
	assert.equal(dt.grid.selectedIds().length, 5);
	assert.equal(all.getAttribute("data-state"), "checked");

	all.click();
	assert.equal(dt.grid.selectedIds().length, 0);
	assert.deepEqual(seen, [1, 5, 0]);
	node.remove();
});

test("column visibility comes from qrp datagrid; hiding a column removes header + cells", () => {
	const { node, dt } = build();

	assert.equal(node.querySelectorAll("thead th").length, 4);
	dt.grid.toggleColumn("amount");
	assert.equal(node.querySelectorAll("thead th").length, 3);
	assert.ok(!node.querySelector("table tbody tr").textContent.includes("$"));
	dt.grid.toggleColumn("amount");
	assert.equal(node.querySelectorAll("thead th").length, 4);
	node.remove();
});

test("paging: page size and next/prev drive both the grid and the rendered rows", () => {
	const { node, dt } = build({ pageSize: 2, pageSizes: [2, 4] });

	assert.equal(emails(node).length, 2);
	assert.ok(node.textContent.includes("Page 1 of 3"));

	const byLabel = (label) => [...node.querySelectorAll("[data-slot=data-table-pagination] button")].find((b) => b.textContent.includes(label));

	byLabel("Go to next page").click();
	assert.ok(node.textContent.includes("Page 2 of 3"));
	assert.equal(byLabel("Go to previous page").disabled, false);
	byLabel("Go to last page").click();
	assert.equal(emails(node).length, 1);
	assert.equal(byLabel("Go to next page").disabled, true);

	dt.grid.setPageSize(4);
	assert.equal(emails(node).length, 4);
	assert.ok(node.textContent.includes("Page 1 of 2"));
	node.remove();
});

test("reactive data: rows added to the source appear, keyed rows are reused", () => {
	const { node, store } = build();
	const first = node.querySelector("table tbody tr");

	store.rows = store.rows.concat([{ id: "f", status: "success", email: "new@example.com", amount: 1 }]);
	assert.equal(emails(node).length, 6);
	assert.ok(node.querySelector("table tbody tr") === first, "existing row element reused");
	node.remove();
});

test("building blocks compose: useDataTable + DataTableView + DataTableColumnHeader", () => {
	const dt = useDataTable({ data: PAYMENTS, columns: columns() });
	const view = DataTableView({ table: dt });
	const header = DataTableColumnHeader({ table: dt, column: dt.columns[1] });

	assert.equal(view.dataset.slot, "data-table");
	assert.equal(view.querySelectorAll("table tbody tr").length, 5);
	header.click();
	assert.equal(dt.sort.key, "email");
});

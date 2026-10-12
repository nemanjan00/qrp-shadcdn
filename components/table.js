/**
 * components/table.js — Table and its parts (markup only). Feed TableBody a
 * qrp `list()` for keyed, reactive rows; see DataTable for sort/filter/paging.
 * https://ui.shadcn.com/docs/components/table
 */

import { el } from "@nemanjan00/qrp";
import { part } from "../utils/index.js";

const TableElement = part("table", "table", "w-full caption-bottom text-sm");

export const Table = (...args) => el("div", {
	"data-slot": "table-container",
	class: "relative w-full overflow-x-auto"
}, TableElement(...args));

export const TableHeader = part("thead", "table-header", "[&_tr]:border-b");
export const TableBody = part("tbody", "table-body", "[&_tr:last-child]:border-0");
export const TableFooter = part("tfoot", "table-footer", "border-t bg-muted/50 font-medium [&>tr]:last:border-b-0");
export const TableRow = part("tr", "table-row", "border-b transition-colors hover:bg-muted/50 has-aria-expanded:bg-muted/50 data-[state=selected]:bg-muted");
export const TableHead = part("th", "table-head", "h-10 px-2 text-left align-middle font-medium whitespace-nowrap text-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]");
export const TableCell = part("td", "table-cell", "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]");
export const TableCaption = part("caption", "table-caption", "mt-4 text-sm text-muted-foreground");

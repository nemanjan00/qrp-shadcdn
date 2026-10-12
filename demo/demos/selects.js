// Demos for the selects batch: Select, Command, Combobox, NativeSelect.

import {
	state, el, list,
	Button, Popover, PopoverTrigger, PopoverContent,
	Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator,
	Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut,
	CommandDialog, Kbd,
	Combobox, ComboboxInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem,
	ComboboxChips, ComboboxChip, ComboboxChipsInput, ComboboxValue,
	NativeSelect, NativeSelectOption, NativeSelectOptGroup,
	CalendarIcon, CheckIcon, ChevronsUpDownIcon
} from "@nemanjan00/qrp-shadcdn";
import { demo } from "./registry.js";

const FRAMEWORKS = [
	{ value: "next.js", label: "Next.js" },
	{ value: "sveltekit", label: "SvelteKit" },
	{ value: "nuxt.js", label: "Nuxt.js" },
	{ value: "remix", label: "Remix" },
	{ value: "astro", label: "Astro" }
];

demo("Select", () => {
	const s = state({ fruit: undefined, zone: "est" });

	return el("div", { class: "flex flex-col items-center gap-4" },
		Select({ bind: [s, "fruit"] },
			SelectTrigger({ class: "w-[180px]" }, SelectValue({ placeholder: "Select a fruit" })),
			SelectContent(SelectGroup(
				SelectLabel("Fruits"),
				SelectItem({ value: "apple" }, "Apple"),
				SelectItem({ value: "banana" }, "Banana"),
				SelectItem({ value: "blueberry" }, "Blueberry"),
				SelectItem({ value: "grapes", disabled: true }, "Grapes"),
				SelectItem({ value: "pineapple" }, "Pineapple")
			))
		),
		el("p", { class: "text-sm text-muted-foreground" }, () => `Selected: ${s.fruit || "nothing"}`),
		Select({ bind: [s, "zone"] },
			SelectTrigger({ class: "w-[280px]", size: "sm" }, SelectValue({ placeholder: "Select a timezone" })),
			SelectContent(
				SelectGroup(SelectLabel("North America"), ...[["est", "Eastern Standard Time (EST)"], ["cst", "Central Standard Time (CST)"], ["mst", "Mountain Standard Time (MST)"], ["pst", "Pacific Standard Time (PST)"], ["akst", "Alaska Standard Time (AKST)"], ["hst", "Hawaii Standard Time (HST)"]].map(([value, label]) => SelectItem({ value }, label))),
				SelectSeparator(),
				SelectGroup(SelectLabel("Europe & Africa"), ...[["gmt", "Greenwich Mean Time (GMT)"], ["cet", "Central European Time (CET)"], ["eet", "Eastern European Time (EET)"], ["west", "Western European Summer Time (WEST)"], ["cat", "Central Africa Time (CAT)"], ["eat", "East Africa Time (EAT)"]].map(([value, label]) => SelectItem({ value }, label))),
				SelectSeparator(),
				SelectGroup(SelectLabel("Asia"), ...[["msk", "Moscow Time (MSK)"], ["ist", "India Standard Time (IST)"], ["cst_china", "China Standard Time (CST)"], ["jst", "Japan Standard Time (JST)"], ["kst", "Korea Standard Time (KST)"]].map(([value, label]) => SelectItem({ value }, label)))
			)
		)
	);
});

const commandItems = () => [
	CommandGroup({ heading: "Suggestions" },
		CommandItem(CalendarIcon(), el("span", {}, "Calendar")),
		CommandItem(el("span", {}, "Search Emoji")),
		CommandItem({ disabled: true }, el("span", {}, "Calculator"))),
	CommandSeparator(),
	CommandGroup({ heading: "Settings" },
		CommandItem(el("span", {}, "Profile"), CommandShortcut("⌘P")),
		CommandItem(el("span", {}, "Billing"), CommandShortcut("⌘B")),
		CommandItem(el("span", {}, "Settings"), CommandShortcut("⌘S")))
];

demo("Command", () => {
	const s = state({ open: false });

	document.addEventListener("keydown", (event) => {
		if(event.key === "j" && (event.metaKey || event.ctrlKey)) {
			event.preventDefault();
			s.open = !s.open;
		}
	});

	return el("div", { class: "flex w-full flex-col items-center gap-6" },
		Command({ class: "rounded-lg border shadow-md md:min-w-[450px]" },
			CommandInput({ placeholder: "Type a command or search..." }),
			CommandList(CommandEmpty("No results found."), ...commandItems())),
		el("p", { class: "text-sm text-muted-foreground" }, "Press ", Kbd("Ctrl"), " + ", Kbd("J"), " or ",
			Button({ variant: "outline", size: "sm", onclick: () => { s.open = true; } }, "open the palette")),
		CommandDialog({ open: [s, "open"] },
			CommandInput({ placeholder: "Type a command or search..." }),
			CommandList(CommandEmpty("No results found."), ...commandItems()))
	);
});

demo("Combobox", () => {
	const s = state({ open: false, value: "", framework: null, many: ["Next.js"] });
	const labelOf = (value) => (FRAMEWORKS.find((f) => f.value === value) || {}).label;

	// The classic shadcn combobox: Popover + Command.
	const classic = Popover({ open: [s, "open"] },
		PopoverTrigger(Button({ variant: "outline", role: "combobox", "aria-label": "Select framework", class: "w-[200px] justify-between" },
			el("span", {}, () => labelOf(s.value) || "Select framework..."),
			ChevronsUpDownIcon({ class: "opacity-50" }))),
		PopoverContent({ class: "w-[200px] p-0" }, Command(
			CommandInput({ placeholder: "Search framework...", class: "h-9" }),
			CommandList(CommandEmpty("No framework found."), CommandGroup(list(() => FRAMEWORKS, (f) => f.value, (f) => CommandItem({
				value: f.value,
				onSelect: (current) => {
					s.value = current === s.value ? "" : current;
					s.open = false;
				}
			}, f.label, CheckIcon({ class: () => (s.value === f.value ? "ml-auto opacity-100" : "ml-auto opacity-0") })))))
		))
	);

	const single = Combobox({ items: FRAMEWORKS.map((f) => f.label), bind: [s, "framework"], autoHighlight: true },
		ComboboxInput({ placeholder: "Select a framework", showClear: true }),
		ComboboxContent(ComboboxEmpty("No items found."), ComboboxList((item) => ComboboxItem({ value: item }, item))));

	const multiple = Combobox({ multiple: true, autoHighlight: true, items: FRAMEWORKS.map((f) => f.label), bind: [s, "many"] },
		ComboboxChips({ class: "w-full max-w-xs" },
			ComboboxValue((values) => values.map((value) => ComboboxChip({ value }, value))),
			ComboboxChipsInput({ placeholder: "Add framework" })),
		ComboboxContent(ComboboxEmpty("No items found."), ComboboxList((item) => ComboboxItem({ value: item }, item))));

	return el("div", { class: "flex w-full flex-col items-center gap-6" }, classic, single, multiple,
		el("p", { class: "text-sm text-muted-foreground" }, () => `framework: ${s.framework || "—"} · many: ${s.many.join(", ") || "—"}`));
});

demo("Native Select", () => {
	const s = state({ status: "" });

	return el("div", { class: "flex flex-col items-center gap-4" },
		NativeSelect({ bind: [s, "status"], "aria-label": "Status" },
			NativeSelectOption({ value: "" }, "Select status"),
			NativeSelectOption({ value: "todo" }, "Todo"),
			NativeSelectOption({ value: "in-progress" }, "In Progress"),
			NativeSelectOption({ value: "done" }, "Done"),
			NativeSelectOption({ value: "cancelled" }, "Cancelled")),
		NativeSelect({ size: "sm", "aria-label": "Priority" },
			NativeSelectOptGroup({ label: "Engineering" }, NativeSelectOption({ value: "frontend" }, "Frontend"), NativeSelectOption({ value: "backend" }, "Backend")),
			NativeSelectOptGroup({ label: "Sales" }, NativeSelectOption({ value: "sales-rep" }, "Sales Rep"))),
		el("p", { class: "text-sm text-muted-foreground" }, () => `status: ${s.status || "—"}`)
	);
});

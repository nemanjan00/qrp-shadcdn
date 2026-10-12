import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, list, when, el } from "@nemanjan00/qrp";
import { field } from "@nemanjan00/qrp/forms";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectGroup, SelectLabel, SelectItem, SelectSeparator, selectInput } from "../components/select.js";
import {
	Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut, CommandDialog
} from "../components/command.js";
import {
	Combobox, ComboboxInput, ComboboxContent, ComboboxEmpty, ComboboxList, ComboboxItem, ComboboxChips, ComboboxChip,
	ComboboxChipsInput, ComboboxValue, ComboboxGroup, ComboboxLabel, ComboboxCollection, comboboxInput
} from "../components/combobox.js";
import { NativeSelect, NativeSelectOption, NativeSelectOptGroup, nativeSelectInput } from "../components/native-select.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const keydown = (target, key, extra = {}) => target.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
const slot = (name) => document.querySelector(`[data-slot=${name}]`);
const slots = (name) => [...document.querySelectorAll(`[data-slot=${name}]`)];
const type = (input, text) => {
	input.value = text;
	input.dispatchEvent(new Event("input", { bubbles: true }));
};

const fruits = (props = {}) => Select(props,
	SelectTrigger({ class: "w-[180px]" }, SelectValue({ placeholder: "Select a fruit" })),
	SelectContent(SelectGroup(
		SelectLabel("Fruits"),
		SelectItem({ value: "apple" }, "Apple"),
		SelectItem({ value: "banana" }, "Banana"),
		SelectItem({ value: "blueberry", disabled: true }, "Blueberry"),
		SelectSeparator(),
		SelectItem({ value: "grapes" }, "Grapes")
	))
);

test("Select: placeholder, open on click, pick an option, value text shows, focus returns", async () => {
	const s = state({ fruit: undefined });
	const changes = [];

	document.body.append(fruits({ value: [s, "fruit"], onValueChange: (v) => changes.push(v) }));

	const trigger = slot("select-trigger");

	assert.equal(trigger.getAttribute("role"), "combobox");
	assert.ok(trigger.hasAttribute("data-placeholder"));
	assert.equal(slot("select-value").textContent, "Select a fruit");

	trigger.click();

	const content = slot("select-content");

	assert.ok(content);
	assert.equal(content.getAttribute("role"), "listbox");
	assert.ok(document.activeElement === slots("select-item")[0], "first option focused when nothing is selected");

	slots("select-item")[1].click();
	assert.equal(s.fruit, "banana");
	assert.deepEqual(changes, ["banana"]);
	assert.equal(slot("select-value").textContent, "Banana");
	assert.equal(trigger.hasAttribute("data-placeholder"), false);
	await tick();
	assert.ok(!slot("select-content"), "gone");
	assert.ok(document.activeElement === trigger, "focus");

	s.fruit = "grapes";
	assert.equal(slot("select-value").textContent, "Grapes");
	document.body.replaceChildren();
});

test("Select: keyboard — ArrowDown opens on selection, arrows skip disabled, Enter picks, typeahead", async () => {
	const s = state({ fruit: "banana" });

	document.body.append(fruits({ value: [s, "fruit"] }));

	const trigger = slot("select-trigger");

	keydown(trigger, "ArrowDown");

	const items = slots("select-item");

	assert.ok(document.activeElement === items[1], "opens focused on the selected option");
	assert.equal(items[1].getAttribute("aria-selected"), "true");
	assert.ok(items[1].querySelector("[data-slot=select-item-indicator]").style.visibility !== "hidden", "indicator shown");

	keydown(document.activeElement, "ArrowDown");
	assert.ok(document.activeElement === items[3], "disabled Blueberry is skipped");
	keydown(document.activeElement, "Home");
	assert.ok(document.activeElement === items[0], "focus");
	keydown(document.activeElement, "g");
	assert.ok(document.activeElement === items[3], "typeahead finds Grapes");
	keydown(document.activeElement, "Enter");
	assert.equal(s.fruit, "grapes");
	await tick();

	keydown(trigger, "a");
	assert.equal(s.fruit, "apple", "typing on the closed trigger selects");
	document.body.replaceChildren();
});

test("Select: Escape closes without changing; defaultValue; disabled; form value", async () => {
	const form = document.createElement("form");

	form.append(fruits({ defaultValue: "apple", name: "fruit" }));
	document.body.append(form);

	assert.equal(slot("select-value").textContent, "Apple");
	assert.equal(form.elements.namedItem("fruit").value, "apple", "hidden native select carries the value");

	slot("select-trigger").click();
	document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
	await tick();
	assert.ok(!slot("select-content"), "gone");
	assert.equal(slot("select-value").textContent, "Apple");
	document.body.replaceChildren();

	document.body.append(fruits({ disabled: true }));
	assert.equal(slot("select-trigger").disabled, true);
	document.body.replaceChildren();
});

test("Select: options from a reactive list()", async () => {
	const s = state({ options: [{ id: "a", label: "Alpha" }], value: "b" });

	document.body.append(Select({ value: [s, "value"] },
		SelectTrigger(SelectValue({ placeholder: "Pick" })),
		SelectContent(list(() => s.options, (o) => o.id, (o) => SelectItem({ value: o.id }, o.label)))
	));

	assert.equal(slot("select-value").textContent, "Pick", "value b has no option yet");
	s.options = s.options.concat([{ id: "b", label: "Beta" }]);
	await tick();
	assert.equal(slot("select-value").textContent, "Beta");
	document.body.replaceChildren();
});

const palette = (props = {}, selected = []) => Command(props,
	CommandInput({ placeholder: "Type a command or search..." }),
	CommandList(
		CommandEmpty("No results found."),
		CommandGroup({ heading: "Suggestions" },
			CommandItem({ onSelect: (v) => selected.push(v) }, "Calendar"),
			CommandItem({ keywords: ["emoji"], onSelect: (v) => selected.push(v) }, "Search Emoji"),
			CommandItem({ disabled: true }, "Calculator")),
		CommandSeparator(),
		CommandGroup({ heading: "Settings" },
			CommandItem({ value: "profile", onSelect: (v) => selected.push(v) }, "Profile", CommandShortcut("⌘P")))
	)
);

test("Command: first item highlighted, typing filters and hides empty groups, Empty shows", () => {
	document.body.append(palette());

	const input = slot("command-input");
	const items = slots("command-item");

	assert.equal(items[0].dataset.selected, "true");
	assert.equal(input.getAttribute("aria-activedescendant"), items[0].id);
	assert.equal(slot("command-empty").hidden, true);

	type(input, "prof");
	assert.deepEqual(items.map((i) => i.hidden), [true, true, true, false]);
	assert.equal(slots("command-group")[0].hidden, true);
	assert.equal(slot("command-separator").hidden, true);
	assert.equal(items[3].dataset.selected, "true", "first match is highlighted");

	type(input, "emoji");
	assert.equal(items[1].hidden, false, "keywords match");

	type(input, "zzz");
	assert.equal(slot("command-empty").hidden, false);

	type(input, "");
	assert.ok(items.every((i) => !i.hidden));
	assert.equal(slot("command-separator").hidden, false);
	document.body.replaceChildren();
});

test("Command: arrows skip disabled and Enter / click run onSelect with the value", () => {
	const selected = [];

	document.body.append(palette({}, selected));

	const input = slot("command-input");
	const items = slots("command-item");

	keydown(input, "ArrowDown");
	assert.equal(items[1].dataset.selected, "true");
	keydown(input, "ArrowDown");
	assert.equal(items[3].dataset.selected, "true", "disabled Calculator is skipped");
	keydown(input, "Enter");
	assert.deepEqual(selected, ["profile"]);
	keydown(input, "p", { ctrlKey: true });
	assert.equal(items[1].dataset.selected, "true", "Ctrl+P moves up");
	items[0].click();
	assert.deepEqual(selected, ["profile", "Calendar"]);
	document.body.replaceChildren();
});

test("Command: shouldFilter=false leaves filtering to the caller; bound input value", () => {
	const s = state({ q: "" });

	document.body.append(Command({ shouldFilter: false }, CommandInput({ value: [s, "q"] }), CommandList(CommandItem("A"), CommandItem("B"))));
	s.q = "zzz";
	assert.equal(slot("command-input").value, "zzz");
	assert.ok(slots("command-item").every((i) => !i.hidden));

	type(slot("command-input"), "typed");
	assert.equal(s.q, "typed");
	document.body.replaceChildren();
});

test("CommandDialog: opens a palette in a dialog with sr-only title", async () => {
	const s = state({ open: false });

	document.body.append(CommandDialog({ open: [s, "open"] }, CommandInput(), CommandList(CommandItem("Calendar"))));
	s.open = true;

	const content = slot("dialog-content");

	assert.ok(content.querySelector("[data-slot=command]"));
	assert.equal(document.getElementById(content.getAttribute("aria-labelledby")).textContent, "Command Palette");
	assert.ok(document.activeElement === slot("command-input"), "focus");
	s.open = false;
	await tick();
	document.body.replaceChildren();
});

const frameworks = ["Next.js", "SvelteKit", "Nuxt.js", "Remix", "Astro"];

test("Combobox: typing opens and filters, Enter picks, input shows the label", async () => {
	const s = state({ value: null });

	document.body.append(Combobox({ items: frameworks, value: [s, "value"], autoHighlight: true },
		ComboboxInput({ placeholder: "Select a framework" }),
		ComboboxContent(ComboboxEmpty("No items found."), ComboboxList((item) => ComboboxItem({ value: item }, item)))
	));

	const input = document.querySelector("[data-combobox-input]");

	assert.equal(input.getAttribute("role"), "combobox");
	type(input, "nu");

	const content = slot("combobox-content");

	assert.ok(content);
	assert.equal(input.getAttribute("aria-expanded"), "true");

	const items = slots("combobox-item");

	assert.deepEqual(items.map((i) => i.textContent), ["Nuxt.js"], "the collection filters items out of the list");
	assert.ok(items[0].hasAttribute("data-highlighted"));
	keydown(input, "Enter");
	assert.equal(s.value, "Nuxt.js");
	assert.equal(input.value, "Nuxt.js");
	await tick();
	assert.ok(!slot("combobox-content"), "gone");

	type(input, "zzz");
	assert.ok(slot("combobox-content").hasAttribute("data-empty"));
	document.body.replaceChildren();
});

test("Combobox: trigger toggles, arrows navigate, click picks; clear empties", async () => {
	const s = state({ value: "Remix" });

	document.body.append(Combobox({ items: frameworks, value: [s, "value"] },
		ComboboxInput({ showClear: true }),
		ComboboxContent(ComboboxList((item) => ComboboxItem({ value: item }, item)))
	));

	const input = document.querySelector("[data-combobox-input]");

	assert.equal(input.value, "Remix");
	slot("combobox-trigger").click();

	const items = slots("combobox-item");

	assert.ok(items.every((i) => !i.hidden), "all options show when not typing");
	assert.ok(items[3].hasAttribute("data-highlighted"), "the selection is highlighted");
	keydown(input, "ArrowDown");
	assert.ok(items[4].hasAttribute("data-highlighted"));
	items[0].click();
	assert.equal(s.value, "Next.js");
	await tick();

	slot("combobox-clear").click();
	assert.equal(s.value, null);
	assert.equal(input.value, "");
	document.body.replaceChildren();
});

test("Combobox: multiple with chips — add, remove via chip button and Backspace", async () => {
	const s = state({ values: ["Next.js"] });

	document.body.append(Combobox({ multiple: true, items: frameworks, value: [s, "values"] },
		ComboboxChips(
			ComboboxValue((values) => values.map((value) => ComboboxChip({ value }, value))),
			ComboboxChipsInput({ placeholder: "Add framework" })
		),
		ComboboxContent(ComboboxEmpty("No items found."), ComboboxList((item) => ComboboxItem({ value: item }, item)))
	));

	const input = slot("combobox-chip-input");

	assert.deepEqual(slots("combobox-chip").map((c) => c.firstChild.textContent), ["Next.js"]);
	type(input, "astro");
	slots("combobox-item").find((i) => !i.hidden).click();
	assert.deepEqual([...s.values], ["Next.js", "Astro"]);
	assert.equal(input.value, "");
	assert.ok(slot("combobox-content"), "stays open in multiple mode");
	assert.equal(slots("combobox-chip").length, 2);

	slots("combobox-chip")[0].querySelector("[data-slot=combobox-chip-remove]").click();
	assert.deepEqual([...s.values], ["Astro"]);
	keydown(input, "Backspace");
	assert.deepEqual([...s.values], []);
	await tick();
	document.body.replaceChildren();
});

test("Combobox: groups with collections hide when empty", () => {
	const groups = [{ label: "Fruits", items: ["Apple", "Banana"] }, { label: "Vegetables", items: ["Carrot"] }];

	document.body.append(Combobox({ items: groups, defaultOpen: true },
		ComboboxInput(),
		ComboboxContent(ComboboxList((group) => ComboboxGroup({ items: group.items }, ComboboxLabel(group.label), ComboboxCollection((item) => ComboboxItem({ value: item }, item)))))
	));

	assert.equal(slots("combobox-item").length, 3);
	type(document.querySelector("[data-combobox-input]"), "carr");
	assert.deepEqual(slots("combobox-group").map((g) => g.querySelector("[data-slot=combobox-label]").textContent), ["Vegetables"], "groups without a match leave the list");
	assert.deepEqual(slots("combobox-item").map((i) => i.textContent), ["Carrot"]);
	document.body.replaceChildren();
});

test("NativeSelect: styled select with options, optgroups and bind", () => {
	const s = state({ status: "done" });
	const wrapper = NativeSelect({ bind: [s, "status"], size: "sm" },
		NativeSelectOption({ value: "" }, "Select status"),
		NativeSelectOptGroup({ label: "Open" }, NativeSelectOption({ value: "todo" }, "Todo")),
		NativeSelectOption({ value: "done" }, "Done"));
	const select = wrapper.querySelector("select");

	assert.equal(wrapper.dataset.slot, "native-select-wrapper");
	assert.equal(select.dataset.size, "sm");
	assert.equal(select.value, "done");
	assert.ok(wrapper.querySelector("[data-slot=native-select-icon]"));
	select.value = "todo";
	select.dispatchEvent(new Event("change"));
	select.dispatchEvent(new Event("input"));
	assert.equal(s.status, "todo");
});

test("Command: items from list() and when() are filtered and navigable", async () => {
	const s = state({ items: ["Alpha", "Beta"], extra: false });

	document.body.append(Command(CommandInput(), CommandList(
		CommandEmpty("None"),
		CommandGroup({ heading: "Dynamic" }, list(() => s.items, (i) => i, (i) => CommandItem(i))),
		el("div", {}, when(() => s.extra, () => CommandGroup({ heading: "Extra" }, CommandItem("Gamma"))))
	)));

	s.items = s.items.concat(["Delta"]);
	s.extra = true;
	await tick();
	assert.equal(slots("command-item").length, 4);
	type(slot("command-input"), "ga");
	assert.deepEqual(slots("command-item").filter((i) => !i.hidden).map((i) => i.textContent), ["Gamma"]);
	assert.equal(slots("command-group")[0].hidden, true);
	document.body.replaceChildren();
});

test("Combobox: reactive items thunk feeds the collection; filtered items leave the DOM", () => {
	const store = state({ options: ["Apple", "Banana"] });

	document.body.append(Combobox({ items: () => store.options, defaultOpen: true },
		ComboboxInput(),
		ComboboxContent(ComboboxList((item) => ComboboxItem({ value: item }, item)))
	));

	assert.equal(slots("combobox-item").length, 2);
	store.options = store.options.concat(["Cherry"]);
	assert.equal(slots("combobox-item").length, 3);
	type(document.querySelector("[data-combobox-input]"), "ch");
	assert.deepEqual(slots("combobox-item").map((i) => i.textContent), ["Cherry"], "collection filter removes non-matches");
	document.body.replaceChildren();
});

test("forms adapters: selectInput, nativeSelectInput, comboboxInput bind to settings", async () => {
	const settings = state({ fruit: "apple", status: "todo", framework: "next" });

	document.body.append(
		field(settings, "fruit", { name: "Fruit", input: selectInput, options: { apple: "Apple", pear: "Pear" } }),
		field(settings, "status", { name: "Status", input: nativeSelectInput, options: { todo: "Todo", done: "Done" } }),
		field(settings, "framework", { name: "Framework", input: comboboxInput, options: { next: "Next.js", astro: "Astro" } })
	);

	const trigger = slot("select-trigger");

	assert.equal(slot("select-value").textContent, "Apple");
	// qrp forms only labels INPUT/SELECT/TEXTAREA controls today, so the trigger
	// (a <button>) gets no `for` association yet.
	trigger.click();
	slots("select-item")[1].click();
	assert.equal(settings.fruit, "pear");
	await tick();

	const native = slot("native-select");

	assert.equal(native.value, "todo");
	settings.status = "done";
	assert.equal(native.value, "done");

	const input = document.querySelector("[data-combobox-input]");

	assert.equal(input.value, "Next.js");
	type(input, "ast");
	keydown(input, "Enter");
	assert.equal(settings.framework, "astro");
	await tick();
	document.body.replaceChildren();
});

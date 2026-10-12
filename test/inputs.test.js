import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import { state, el, list } from "@nemanjan00/qrp";
import { form, registerInput } from "@nemanjan00/qrp/forms";
import {
	Tabs, TabsList, TabsTrigger, TabsContent,
	Accordion, AccordionItem, AccordionTrigger, AccordionContent,
	Collapsible, CollapsibleTrigger, CollapsibleContent,
	Toggle, toggleVariants, ToggleGroup, ToggleGroupItem,
	Checkbox, Switch, RadioGroup, RadioGroupItem, Slider, Label, Button,
	checkboxInput, switchInput, toggleInput, radioGroupInput, sliderInput
} from "../index.js";

const tick = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));
const press = (target, key, extra = {}) => target.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key, bubbles: true, cancelable: true }, extra)));
const slots = (root, name) => [...root.querySelectorAll(`[data-slot=${name}]`)];

const buildTabs = (props) => Tabs(props,
	TabsList(TabsTrigger({ value: "account" }, "Account"), TabsTrigger({ value: "password" }, "Password"), TabsTrigger({ value: "off", disabled: true }, "Off")),
	TabsContent({ value: "account" }, "A"),
	TabsContent({ value: "password" }, "P"),
	TabsContent({ value: "off" }, "O")
);

test("Tabs: default value, aria wiring, click selects", () => {
	const tabs = buildTabs({ defaultValue: "account" });
	const [account, password] = slots(tabs, "tabs-trigger");
	const [panelA, panelP] = slots(tabs, "tabs-content");

	assert.equal(tabs.dataset.orientation, "horizontal");
	assert.equal(tabs.querySelector("[role=tablist]").getAttribute("aria-orientation"), "horizontal");
	assert.equal(account.getAttribute("aria-selected"), "true");
	assert.equal(account.dataset.state, "active");
	assert.equal(account.tabIndex, 0);
	assert.equal(password.tabIndex, -1);
	assert.equal(account.getAttribute("aria-controls"), panelA.id);
	assert.equal(panelA.getAttribute("aria-labelledby"), account.id);
	assert.equal(panelA.hidden, false);
	assert.equal(panelP.hidden, true);

	password.click();
	assert.equal(password.dataset.state, "active");
	assert.equal(account.dataset.state, "inactive");
	assert.equal(panelP.hidden, false);
	assert.equal(panelA.hidden, true);
});

test("Tabs: [state, key] binding and arrow keys (automatic, skipping disabled)", () => {
	const s = state({ tab: "account" });
	const tabs = buildTabs({ value: [s, "tab"] });
	const [account, password] = slots(tabs, "tabs-trigger");

	document.body.append(tabs);
	s.tab = "password";
	assert.equal(password.dataset.state, "active");

	password.focus();
	press(password, "ArrowRight");
	assert.equal(s.tab, "account", "loops past the disabled tab");
	assert.equal(document.activeElement, account);
	press(account, "End");
	assert.equal(s.tab, "password");
	tabs.remove();
});

test("Tabs: manual activation only moves focus", () => {
	const tabs = buildTabs({ defaultValue: "account", activationMode: "manual" });
	const [account, password] = slots(tabs, "tabs-trigger");

	document.body.append(tabs);
	press(account, "ArrowRight");
	assert.equal(document.activeElement, password);
	assert.equal(account.dataset.state, "active");
	tabs.remove();
});

test("Tabs: triggers added later through list() are wired", async () => {
	const s = state({ tabs: ["a"] });
	const tabs = Tabs({ defaultValue: "b" },
		TabsList(list(() => s.tabs, (t) => t, (t) => TabsTrigger({ value: t }, t))),
		TabsContent({ value: "b" }, "B"));

	s.tabs.push("b");
	await tick();

	const b = slots(tabs, "tabs-trigger").find((node) => node.textContent === "b");

	assert.equal(b.dataset.state, "active");
});

const buildAccordion = (props) => Accordion(props,
	AccordionItem({ value: "one" }, AccordionTrigger("One"), AccordionContent("1")),
	AccordionItem({ value: "two" }, AccordionTrigger("Two"), AccordionContent("2")),
	AccordionItem({ value: "three", disabled: true }, AccordionTrigger("Three"), AccordionContent("3"))
);

test("Accordion: single collapsible opens one item at a time", async () => {
	const accordion = buildAccordion({ type: "single", collapsible: true, defaultValue: "one" });
	const [one, two] = slots(accordion, "accordion-trigger");
	const [c1, c2] = slots(accordion, "accordion-content");

	assert.equal(one.getAttribute("aria-expanded"), "true");
	assert.equal(c1.hidden, false);
	assert.equal(c2.hidden, true);
	assert.equal(one.getAttribute("aria-controls"), c1.id);
	assert.equal(c1.getAttribute("role"), "region");

	two.click();
	await tick();
	assert.equal(two.getAttribute("aria-expanded"), "true");
	assert.equal(one.getAttribute("aria-expanded"), "false");
	assert.equal(c1.dataset.state, "closed");
	assert.equal(c1.hidden, true, "hidden after the (absent) exit animation");
	assert.equal(c2.hidden, false);

	two.click();
	await tick();
	assert.equal(c2.hidden, true, "collapsible closes the open item");
});

test("Accordion: single non-collapsible keeps the item open; disabled item ignored", () => {
	const changes = [];
	const accordion = buildAccordion({ type: "single", defaultValue: "one", onValueChange: (v) => changes.push(v) });
	const [one, , three] = slots(accordion, "accordion-trigger");

	one.click();
	assert.equal(one.getAttribute("aria-expanded"), "true");
	assert.equal(one.getAttribute("aria-disabled"), "true");
	assert.equal(three.disabled, true);
	three.click();
	assert.deepEqual(changes, []);
});

test("Accordion: multiple with bound array; arrow keys move focus", () => {
	const s = state({ open: ["two"] });
	const accordion = buildAccordion({ type: "multiple", value: [s, "open"] });
	const [one, two] = slots(accordion, "accordion-trigger");

	document.body.append(accordion);
	one.click();
	assert.deepEqual([...s.open], ["two", "one"]);
	assert.equal(two.getAttribute("aria-expanded"), "true");

	one.focus();
	press(one, "ArrowDown");
	assert.equal(document.activeElement, two);
	press(two, "ArrowDown");
	assert.equal(document.activeElement, one, "loops, skipping the disabled trigger");
	accordion.remove();
});

test("Collapsible: trigger child toggles content", async () => {
	const s = state({ open: false });
	const root = Collapsible({ open: [s, "open"] }, CollapsibleTrigger(Button("Toggle")), CollapsibleContent("Body"));
	const trigger = root.querySelector("button");
	const content = root.querySelector("[data-slot=collapsible-content]");

	assert.equal(trigger.dataset.slot, "button", "the child keeps its own slot");
	assert.equal(content.hidden, true);
	assert.equal(trigger.getAttribute("aria-expanded"), "false");
	trigger.click();
	assert.equal(s.open, true);
	assert.equal(content.hidden, false);
	assert.equal(root.dataset.state, "open");
	assert.equal(trigger.getAttribute("aria-controls"), content.id);
	trigger.click();
	await tick();
	assert.equal(content.hidden, true);
});

test("Toggle: pressed state and variants", () => {
	const changes = [];
	const toggle = Toggle({ variant: "outline", "aria-label": "Bold", onPressedChange: (v) => changes.push(v) }, "B");

	assert.equal(toggle.getAttribute("aria-pressed"), "false");
	assert.equal(toggle.dataset.state, "off");
	assert.ok(toggle.className.includes("border-input"));
	toggle.click();
	assert.equal(toggle.dataset.state, "on");
	assert.deepEqual(changes, [true]);
	assert.ok(toggleVariants({ size: "sm" }).includes("h-8"));
});

test("ToggleGroup: single acts like radios; group variant overrides items", () => {
	const group = ToggleGroup({ type: "single", variant: "outline", defaultValue: "b" },
		ToggleGroupItem({ value: "a" }, "A"), ToggleGroupItem({ value: "b" }, "B"), ToggleGroupItem({ value: "c" }, "C"));
	const [a, b, c] = slots(group, "toggle-group-item");

	assert.equal(group.getAttribute("role"), "group");
	assert.equal(a.getAttribute("role"), "radio");
	assert.equal(b.getAttribute("aria-checked"), "true");
	assert.equal(b.tabIndex, 0);
	assert.equal(a.tabIndex, -1);
	assert.equal(a.dataset.variant, "outline");
	assert.ok(a.className.includes("border-input"));
	assert.equal(a.dataset.spacing, "0");

	a.click();
	assert.equal(a.dataset.state, "on");
	assert.equal(b.dataset.state, "off");
	a.click();
	assert.equal(a.dataset.state, "off", "single can be deselected");

	document.body.append(group);
	press(b, "ArrowRight");
	assert.equal(document.activeElement, c);
	group.remove();
});

test("ToggleGroup: multiple uses aria-pressed and an array value", () => {
	const s = state({ marks: [] });
	const group = ToggleGroup({ type: "multiple", value: [s, "marks"] },
		ToggleGroupItem({ value: "bold" }, "B"), ToggleGroupItem({ value: "italic" }, "I"));
	const [bold, italic] = slots(group, "toggle-group-item");

	bold.click();
	italic.click();
	assert.deepEqual([...s.marks], ["bold", "italic"]);
	assert.equal(bold.getAttribute("aria-pressed"), "true");
	assert.equal(bold.hasAttribute("role"), false);
	bold.click();
	assert.deepEqual([...s.marks], ["italic"]);
});

test("Checkbox: toggles, binds, indeterminate, Enter ignored, label click", () => {
	const s = state({ terms: false });
	const box = Checkbox({ id: "terms", checked: [s, "terms"], name: "terms" });
	const label = Label({ for: "terms" }, "Accept");
	const form = el("form", {}, box, label);
	const input = box.querySelector("input");

	document.body.append(form);
	assert.equal(box.getAttribute("role"), "checkbox");
	assert.equal(box.getAttribute("aria-checked"), "false");
	assert.equal(box.querySelector("[data-slot=checkbox-indicator]").hidden, true);
	assert.equal(input.disabled, true, "unchecked boxes don't submit");

	box.click();
	assert.equal(s.terms, true);
	assert.equal(box.dataset.state, "checked");
	assert.equal(input.disabled, false);
	assert.equal(input.value, "on");

	press(box, "Enter");
	assert.equal(s.terms, true);

	s.terms = "indeterminate";
	assert.equal(box.getAttribute("aria-checked"), "mixed");
	assert.equal(box.dataset.state, "indeterminate");
	box.click();
	assert.equal(s.terms, true, "indeterminate → checked");

	label.click();
	assert.equal(s.terms, false);
	form.remove();
});

test("Checkbox: disabled ignores clicks", () => {
	const box = Checkbox({ disabled: true });

	box.click();
	assert.equal(box.dataset.state, "unchecked");
	assert.equal(box.hasAttribute("data-disabled"), true);
});

test("Switch: toggles and mirrors state onto the thumb", () => {
	const s = state({ on: false });
	const sw = Switch({ checked: [s, "on"], size: "sm", name: "airplane" });
	const thumb = sw.querySelector("[data-slot=switch-thumb]");

	assert.equal(sw.getAttribute("role"), "switch");
	assert.equal(sw.dataset.size, "sm");
	sw.click();
	assert.equal(s.on, true);
	assert.equal(sw.getAttribute("aria-checked"), "true");
	assert.equal(thumb.dataset.state, "checked");
	assert.equal(sw.querySelector("input").disabled, false);
});

test("RadioGroup: click and arrow keys select; hidden input submits", () => {
	const s = state({ density: "comfortable" });
	const group = RadioGroup({ value: [s, "density"], name: "density" },
		RadioGroupItem({ value: "default" }), RadioGroupItem({ value: "comfortable" }), RadioGroupItem({ value: "compact" }));
	const [first, second, third] = slots(group, "radio-group-item");
	const input = group.querySelector("input[type=hidden]");

	document.body.append(group);
	assert.equal(group.getAttribute("role"), "radiogroup");
	assert.equal(second.getAttribute("aria-checked"), "true");
	assert.equal(second.tabIndex, 0);
	assert.equal(first.tabIndex, -1);
	assert.equal(second.querySelector("[data-slot=radio-group-indicator]").hidden, false);
	assert.equal(input.value, "comfortable");

	first.click();
	assert.equal(s.density, "default");
	press(first, "ArrowDown");
	assert.equal(s.density, "comfortable");
	assert.equal(document.activeElement, second);
	press(second, "End");
	assert.equal(s.density, "compact");
	assert.equal(third.dataset.state, "checked");
	assert.equal(input.value, "compact");
	group.remove();
});

test("Slider: keyboard steps, clamps, Home/End, commit", () => {
	const commits = [];
	const slider = Slider({ defaultValue: [50], max: 100, step: 10, onValueCommit: (v) => commits.push([...v]), name: "volume" });
	const [thumb] = slots(slider, "slider-thumb");

	assert.equal(thumb.getAttribute("role"), "slider");
	assert.equal(thumb.getAttribute("aria-valuenow"), "50");
	assert.equal(slider.querySelector("[data-slot=slider-range]").style.right, "50%");

	press(thumb, "ArrowRight");
	assert.equal(thumb.getAttribute("aria-valuenow"), "60");
	press(thumb, "PageUp");
	assert.equal(thumb.getAttribute("aria-valuenow"), "100", "clamped to max");
	press(thumb, "Home");
	assert.equal(thumb.getAttribute("aria-valuenow"), "0");
	assert.equal(slider.querySelector("input").value, "0");
	assert.deepEqual(commits, [[60], [100], [0]]);
});

test("Slider: two thumbs bound to state can't cross; pointer picks the closest thumb", () => {
	const s = state({ range: [20, 80] });
	const slider = Slider({ value: [s, "range"], step: 1 });

	slider.getBoundingClientRect = () => ({ left: 0, right: 200, top: 0, bottom: 10, width: 200, height: 10 });

	const [low, high] = slots(slider, "slider-thumb");
	const range = slider.querySelector("[data-slot=slider-range]");

	assert.equal(range.style.left, "20%");
	assert.equal(range.style.right, "20%");

	press(low, "End");
	assert.deepEqual([...s.range], [80, 80], "the low thumb stops at its neighbour");

	s.range = [20, 80];
	slider.dispatchEvent(new PointerEvent("pointerdown", { clientX: 180, bubbles: true }));
	assert.deepEqual([...s.range], [20, 90]);
	slider.dispatchEvent(new PointerEvent("pointermove", { clientX: 100, bubbles: true }));
	assert.deepEqual([...s.range], [20, 50]);
	slider.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
	slider.dispatchEvent(new PointerEvent("pointermove", { clientX: 0, bubbles: true }));
	assert.deepEqual([...s.range], [20, 50], "no drag after release");
	assert.equal(high.getAttribute("aria-valuenow"), "50");
});

test("Slider: vertical orientation and disabled", () => {
	const slider = Slider({ defaultValue: [25], orientation: "vertical", disabled: true });
	const [thumb] = slots(slider, "slider-thumb");

	assert.equal(slider.dataset.orientation, "vertical");
	assert.equal(slider.hasAttribute("data-disabled"), true);
	assert.equal(thumb.getAttribute("aria-orientation"), "vertical");
	press(thumb, "ArrowUp");
	assert.equal(thumb.getAttribute("aria-valuenow"), "25");
});

test("qrp bind: every control binds [state, key] like el() inputs do", () => {
	const s = state({ on: false, tab: "a", open: false, choice: "x", volume: 30, pressed: false, marks: ["b"], panels: "" });

	const box = Checkbox({ bind: [s, "on"] });
	const sw = Switch({ bind: [s, "on"] });
	const tabs = Tabs({ bind: [s, "tab"] }, TabsList(TabsTrigger({ value: "a" }, "A"), TabsTrigger({ value: "b" }, "B")));
	const coll = Collapsible({ bind: [s, "open"] }, CollapsibleTrigger(Button("T")), CollapsibleContent("C"));
	const radios = RadioGroup({ bind: [s, "choice"] }, RadioGroupItem({ value: "x" }), RadioGroupItem({ value: "y" }));
	const toggle = Toggle({ bind: [s, "pressed"] }, "B");
	const group = ToggleGroup({ type: "multiple", bind: [s, "marks"] }, ToggleGroupItem({ value: "a" }, "A"), ToggleGroupItem({ value: "b" }, "B"));
	const accordion = Accordion({ type: "single", collapsible: true, bind: [s, "panels"] }, AccordionItem({ value: "p" }, AccordionTrigger("P"), AccordionContent("1")));

	box.click();
	assert.equal(s.on, true);
	assert.equal(sw.dataset.state, "checked", "both controls share the key");
	slots(tabs, "tabs-trigger")[1].click();
	assert.equal(s.tab, "b");
	coll.querySelector("button").click();
	assert.equal(s.open, true);
	slots(radios, "radio-group-item")[1].click();
	assert.equal(s.choice, "y");
	toggle.click();
	assert.equal(s.pressed, true);
	slots(group, "toggle-group-item")[0].click();
	assert.deepEqual([...s.marks], ["b", "a"]);
	slots(accordion, "accordion-trigger")[0].click();
	assert.equal(s.panels, "p");
	assert.equal(accordion.querySelector("[data-slot=accordion-content]").hidden, false);
});

test("Slider: a bound number stays a number (one thumb)", () => {
	const s = state({ volume: 30 });
	const slider = Slider({ bind: [s, "volume"], step: 5 });
	const thumbs = slots(slider, "slider-thumb");

	assert.equal(thumbs.length, 1);
	assert.equal(thumbs[0].getAttribute("aria-valuenow"), "30");
	press(thumbs[0], "ArrowRight");
	assert.equal(s.volume, 35);
	s.volume = 80;
	assert.equal(thumbs[0].getAttribute("aria-valuenow"), "80");
});

test("Collapsible: a thunk-controlled open only asks the owner (disclosure mirrors it)", () => {
	const s = state({ open: false });
	const asked = [];
	const coll = Collapsible({ open: () => s.open, onOpenChange: (v) => asked.push(v) }, CollapsibleTrigger(Button("T")), CollapsibleContent("C"));
	const content = coll.querySelector("[data-slot=collapsible-content]");

	coll.querySelector("button").click();
	assert.deepEqual(asked, [true]);
	assert.equal(content.hidden, true, "the owner didn't open it");
	s.open = true;
	assert.equal(content.hidden, false);
});

test("forms adapters plug into qrp form()", () => {
	registerInput("qs-checkbox", checkboxInput);
	registerInput("qs-switch", switchInput);
	registerInput("qs-toggle", toggleInput);
	registerInput("qs-radio", radioGroupInput);
	registerInput("qs-slider", sliderInput);

	const settings = state({ terms: false, wifi: true, bold: false, size: "m", level: 4 });
	const node = form({
		settings,
		fields: {
			terms: { name: "Terms", type: "qs-checkbox" },
			wifi: { name: "Wi-Fi", type: "qs-switch" },
			bold: { name: "Bold", type: "qs-toggle" },
			size: { name: "Size", type: "qs-radio", options: { s: "Small", m: "Medium" } },
			level: { name: "Level", type: "qs-slider", min: 0, max: 10, step: 2 }
		}
	});

	assert.equal(node.querySelector("[role=switch]").dataset.state, "checked");
	node.querySelector("[role=checkbox]").click();
	assert.equal(settings.terms, true);
	node.querySelector("[data-slot=toggle]").click();
	assert.equal(settings.bold, true);
	assert.equal(node.querySelector("[data-value=m]").getAttribute("aria-checked"), "true");
	node.querySelector("[data-value=s]").click();
	assert.equal(settings.size, "s");

	const thumb = node.querySelector("[role=slider]");

	assert.equal(thumb.getAttribute("aria-valuemax"), "10");
	press(thumb, "ArrowRight");
	assert.equal(settings.level, 6);
});

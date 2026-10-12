// Demos for the inputs batch — mirroring the ui.shadcn.com examples.

import {
	state, el,
	Button, Input, Label, Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter,
	Tabs, TabsList, TabsTrigger, TabsContent,
	Accordion, AccordionItem, AccordionTrigger, AccordionContent,
	Collapsible, CollapsibleTrigger, CollapsibleContent, ChevronsUpDownIcon,
	Toggle, ToggleGroup, ToggleGroupItem, Checkbox, Switch, RadioGroup, RadioGroupItem, Slider
} from "@nemanjan00/qrp-shadcdn";
import { demo, field } from "./registry.js";

const tabCard = (title, description, rows, action) => Card(
	CardHeader(CardTitle(title), CardDescription(description)),
	CardContent({ class: "grid gap-6" }, ...rows),
	CardFooter(Button(action))
);

demo("Tabs", () => el("div", { class: "flex w-full max-w-sm flex-col gap-6" }, Tabs({ defaultValue: "account" },
	TabsList(TabsTrigger({ value: "account" }, "Account"), TabsTrigger({ value: "password" }, "Password")),
	TabsContent({ value: "account" }, tabCard("Account", "Make changes to your account here. Click save when you're done.", [
		field("tabs-name", "Name", Input({ id: "tabs-name", value: "Pedro Duarte" })),
		field("tabs-username", "Username", Input({ id: "tabs-username", value: "@peduarte" }))
	], "Save changes")),
	TabsContent({ value: "password" }, tabCard("Password", "Change your password here. After saving, you'll be logged out.", [
		field("tabs-current", "Current password", Input({ id: "tabs-current", type: "password" })),
		field("tabs-new", "New password", Input({ id: "tabs-new", type: "password" }))
	], "Save password"))
)));

demo("Accordion", () => Accordion({ type: "single", collapsible: true, defaultValue: "item-1", class: "w-full max-w-md" },
	AccordionItem({ value: "item-1" }, AccordionTrigger("Product Information"), AccordionContent({ class: "flex flex-col gap-4 text-balance" },
		el("p", {}, "Our flagship product combines cutting-edge technology with sleek design. Built with premium materials, it offers unparalleled performance and reliability."),
		el("p", {}, "Key features include advanced processing capabilities, and an intuitive user interface designed for both beginners and experts."))),
	AccordionItem({ value: "item-2" }, AccordionTrigger("Shipping Details"), AccordionContent({ class: "flex flex-col gap-4 text-balance" },
		el("p", {}, "We offer worldwide shipping through trusted courier partners. Standard delivery takes 3-5 business days, while express shipping ensures delivery within 1-2 business days."))),
	AccordionItem({ value: "item-3" }, AccordionTrigger("Return Policy"), AccordionContent({ class: "flex flex-col gap-4 text-balance" },
		el("p", {}, "We stand behind our products with a comprehensive 30-day return policy. If you're not completely satisfied, simply return the item in its original condition.")))
));

demo("Collapsible", () => {
	const repo = (name) => el("div", { class: "rounded-md border px-4 py-2 font-mono text-sm" }, name);

	return Collapsible({ class: "flex w-[350px] flex-col gap-2" },
		el("div", { class: "flex items-center justify-between gap-4 px-4" },
			el("h4", { class: "text-sm font-semibold" }, "@peduarte starred 3 repositories"),
			CollapsibleTrigger(Button({ variant: "ghost", size: "icon", class: "size-8" }, ChevronsUpDownIcon(), el("span", { class: "sr-only" }, "Toggle")))),
		repo("@radix-ui/primitives"),
		CollapsibleContent({ class: "flex flex-col gap-2" }, repo("@radix-ui/colors"), repo("@stitches/react"))
	);
});

demo("Toggle", () => el("div", { class: "flex flex-wrap items-center gap-2" },
	Toggle({ "aria-label": "Toggle bold" }, el("span", { class: "font-bold" }, "B")),
	Toggle({ variant: "outline", "aria-label": "Toggle italic" }, el("span", { class: "italic" }, "I")),
	Toggle({ size: "sm", defaultPressed: true }, "Small"),
	Toggle({ size: "lg" }, "Large"),
	Toggle({ disabled: true }, "Disabled")
));

demo("Toggle Group", () => el("div", { class: "flex flex-col items-center gap-4" },
	ToggleGroup({ type: "multiple", variant: "outline" },
		ToggleGroupItem({ value: "bold", "aria-label": "Toggle bold" }, el("span", { class: "font-bold" }, "B")),
		ToggleGroupItem({ value: "italic", "aria-label": "Toggle italic" }, el("span", { class: "italic" }, "I")),
		ToggleGroupItem({ value: "underline", "aria-label": "Toggle underline" }, el("span", { class: "underline" }, "U"))),
	ToggleGroup({ type: "single", defaultValue: "center", spacing: 2 },
		ToggleGroupItem({ value: "left" }, "Left"), ToggleGroupItem({ value: "center" }, "Center"), ToggleGroupItem({ value: "right" }, "Right"))
));

demo("Checkbox", () => {
	const s = state({ terms: true });

	return el("div", { class: "flex flex-col gap-6" },
		el("div", { class: "flex items-center gap-3" }, Checkbox({ id: "terms", checked: [s, "terms"] }), Label({ for: "terms" }, "Accept terms and conditions")),
		el("div", { class: "flex items-start gap-3" }, Checkbox({ id: "terms-2", defaultChecked: true }),
			el("div", { class: "grid gap-2" }, Label({ for: "terms-2" }, "Accept terms and conditions"),
				el("p", { class: "text-sm text-muted-foreground" }, "By clicking this checkbox, you agree to the terms and conditions."))),
		el("div", { class: "flex items-start gap-3" }, Checkbox({ id: "toggle", disabled: true }), Label({ for: "toggle" }, "Enable notifications")),
		el("div", { class: "flex items-center gap-3" }, Checkbox({ id: "mixed", defaultChecked: "indeterminate" }), Label({ for: "mixed" }, "Select all (indeterminate)")),
		el("p", { class: "text-sm text-muted-foreground" }, () => `terms: ${s.terms}`)
	);
});

demo("Switch", () => el("div", { class: "flex flex-col gap-4" },
	el("div", { class: "flex items-center gap-2" }, Switch({ id: "airplane-mode" }), Label({ for: "airplane-mode" }, "Airplane Mode")),
	el("div", { class: "flex items-center gap-2" }, Switch({ id: "small", size: "sm", defaultChecked: true }), Label({ for: "small" }, "Small"))
));

demo("Radio Group", () => RadioGroup({ defaultValue: "comfortable" },
	...[["default", "Default"], ["comfortable", "Comfortable"], ["compact", "Compact"]].map(([value, label], index) =>
		el("div", { class: "flex items-center gap-3" }, RadioGroupItem({ value, id: `r${index + 1}` }), Label({ for: `r${index + 1}` }, label)))
));

demo("Slider", () => {
	const s = state({ price: [200, 800] });

	return el("div", { class: "flex w-full max-w-md flex-col gap-8" },
		Slider({ defaultValue: [50], max: 100, step: 1, class: "w-[60%]" }),
		el("div", { class: "grid gap-3" },
			el("div", { class: "flex justify-between text-sm" }, Label("Price range"), el("span", { class: "text-muted-foreground" }, () => `$${s.price[0]} – $${s.price[1]}`)),
			Slider({ value: [s, "price"], min: 0, max: 1000, step: 10 })),
		el("div", { class: "flex h-40 gap-8" }, Slider({ defaultValue: [50], orientation: "vertical" }), Slider({ defaultValue: [25, 75], orientation: "vertical" }))
	);
});

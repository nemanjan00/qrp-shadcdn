import "./setup.js";
import test from "node:test";
import assert from "node:assert/strict";
import {
	InputOTP, InputOTPGroup, InputOTPSlot, DatePicker,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem, Button
} from "../index.js";

// API-consistency fixes found while typing the package.

test("InputOTP reports changes via onValueChange (onChange stays as an alias) and takes defaultValue", () => {
	const seen = [];
	const aliased = [];
	const otp = InputOTP({ maxLength: 4, defaultValue: "12", onValueChange: (value) => seen.push(value) },
		InputOTPGroup(InputOTPSlot({ index: 0 }), InputOTPSlot({ index: 1 }), InputOTPSlot({ index: 2 }), InputOTPSlot({ index: 3 })));
	const input = otp.querySelector("input");

	assert.equal(input.value, "12");
	input.value = "123";
	input.dispatchEvent(new Event("input", { bubbles: true }));
	assert.deepEqual(seen, ["123"]);

	const legacy = InputOTP({ maxLength: 2, onChange: (value) => aliased.push(value) }, InputOTPGroup(InputOTPSlot({ index: 0 })));
	const legacyInput = legacy.querySelector("input");

	legacyInput.value = "9";
	legacyInput.dispatchEvent(new Event("input", { bubbles: true }));
	assert.deepEqual(aliased, ["9"]);
});

test("DatePicker takes defaultValue like every other control", () => {
	const picker = DatePicker({ defaultValue: new Date(2026, 0, 15), locale: "en-US" });
	const host = document.createElement("div");

	host.append(picker);
	assert.ok(host.textContent.includes("2026"), `shows the default date, got "${host.textContent}"`);
});

test("menu CheckboxItem draws a minus for indeterminate, a check for checked", () => {
	document.body.append(DropdownMenu({ defaultOpen: true },
		DropdownMenuTrigger(Button("Open")),
		DropdownMenuContent(
			DropdownMenuCheckboxItem({ checked: "indeterminate" }, "Some"),
			DropdownMenuCheckboxItem({ checked: true }, "All")
		)));

	const [some, all] = [...document.querySelectorAll("[role=menuitemcheckbox]")];
	const visible = (item, name) => {
		const svg = item.querySelector(`svg.lucide-${name}`);

		return Boolean(svg) && svg.style.display !== "none";
	};

	assert.equal(some.getAttribute("aria-checked"), "mixed");
	assert.ok(visible(some, "minus") && !visible(some, "check"));
	assert.ok(visible(all, "check") && !visible(all, "minus"));
	document.body.replaceChildren();
});

// Type usage suite: `npm run typecheck` compiles this against index.d.ts in
// strict mode. Good calls must compile; `@ts-expect-error` lines must fail.
// Nothing here runs.

import {
	state, el, list, mount,
	cn, variants, setClassMerge, controllable,
	Button, buttonVariants, Badge, Card, CardHeader, CardTitle, CardContent, Alert, Input, Label,
	Separator, Progress, Avatar, AvatarImage, AvatarFallback, Table, TableBody, TableRow, TableCell,
	Dialog, DialogTrigger, DialogContent, DialogTitle, DialogFooter, DialogClose,
	AlertDialog, AlertDialogContent, AlertDialogAction, Sheet, SheetContent, Drawer, DrawerContent,
	Popover, PopoverTrigger, PopoverContent, Tooltip, TooltipTrigger, TooltipContent, HoverCard,
	Accordion, AccordionItem, AccordionTrigger, AccordionContent, Collapsible, Checkbox, Switch,
	RadioGroup, RadioGroupItem, Slider, Tabs, TabsList, TabsTrigger, TabsContent, Toggle, ToggleGroup,
	ToggleGroupItem, checkboxInput,
	DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuCheckboxItem,
	DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSub, DropdownMenuSubTrigger,
	DropdownMenuSubContent, ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem,
	Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem,
	NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuLink, navigationMenuTriggerStyle,
	Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Command, CommandInput, CommandList,
	CommandItem, CommandDialog, Combobox, ComboboxInput, ComboboxContent, ComboboxList, ComboboxItem,
	NativeSelect, NativeSelectOption, selectInput,
	Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, Pagination, PaginationLink, PaginationFor,
	Empty, EmptyMedia, Item, ItemMedia, ButtonGroup, InputGroup, InputGroupAddon, InputGroupButton,
	Field, FieldLabel, FieldError, useForm, Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
	registerShadcnInputs, Toaster, toast, notify, legacyToast, useToast, useIsMobile,
	Calendar, DatePicker, ChartContainer, BarChart, Bar, XAxis, CartesianGrid, ChartTooltip,
	ChartTooltipContent, Carousel, CarouselContent, CarouselItem, ResizablePanelGroup, ResizablePanel,
	ResizableHandle, ScrollArea, ScrollBar, InputOTP, InputOTPGroup, InputOTPSlot, REGEXP_ONLY_DIGITS,
	CheckIcon
} from "../index.js";
import type { ChartConfig, CarouselApi, FormController } from "../index.js";
import { registerInput } from "@nemanjan00/qrp/forms";

const s = state({ name: "", open: false, tab: "a", agree: false as boolean | "indeterminate", volume: [50], when: undefined as Date | undefined });

// --- helpers -----------------------------------------------------------------

const classes: string | (() => string) = cn("a", ["b", { c: true }], () => (s.open ? "d" : ""));
const pill = variants("rounded", { variants: { tone: { info: "x", warn: "y" } }, defaultVariants: { tone: "info" } });

pill({ tone: "warn" });
pill({ tone: () => "info" });
setClassMerge(null);

const flag = controllable<boolean>([s, "open"], false);

flag.set(!flag.get());

// --- basics ------------------------------------------------------------------

const button: HTMLButtonElement = Button({ variant: "outline", size: "sm", onclick: () => {} }, "Save");

Button("Plain");
Button({ variant: () => (s.open ? "default" : "ghost"), disabled: () => s.open }, CheckIcon(), "Reactive");
Button({ as: "a", href: "/x" }, "Link");
buttonVariants({ variant: "link" });
Badge({ variant: "secondary" }, "New");
Card(CardHeader(CardTitle("t")), CardContent(Input({ bind: [s, "name"], placeholder: "Name" })));
Alert({ variant: "destructive" }, "x");
Label({ for: "id" }, "Label");
Separator({ orientation: "vertical" });
Progress({ value: () => 40 });
Avatar({ size: "lg" }, AvatarImage({ src: "a.png" }), AvatarFallback("CN"));
Table(TableBody(list(() => [{ id: 1 }], (row) => row.id, (row) => TableRow(TableCell(String(row.id))))));

// @ts-expect-error — not a button variant
Button({ variant: "primary" }, "x");
// @ts-expect-error — not a button size
Button({ size: "huge" }, "x");

void button;
void classes;

// --- overlays ----------------------------------------------------------------

const dialog: DocumentFragment = Dialog({ open: [s, "open"], onOpenChange: (open) => { void open; } },
	DialogTrigger(Button("Open")),
	DialogContent({ showCloseButton: false }, DialogTitle("Title"), DialogFooter(DialogClose(Button("Close"))))
);

AlertDialog(AlertDialogContent({ size: "sm" }, AlertDialogAction({ onclick: () => {} }, "OK")));
Sheet(SheetContent({ side: "left" }, "Menu"));
Drawer({ direction: "right" }, DrawerContent("Body"));
Popover(PopoverTrigger(Button("p")), PopoverContent({ side: "right", align: "start", sideOffset: 8 }, "x"));
Tooltip({ delayDuration: 200 }, TooltipTrigger(Button("t")), TooltipContent({ side: "top" }, "tip"));
HoverCard({ openDelay: 100 }, "x");

// @ts-expect-error — not a side
PopoverContent({ side: "middle" }, "x");

void dialog;

// --- inputs ------------------------------------------------------------------

Accordion({ type: "single", collapsible: true, defaultValue: "a" },
	AccordionItem({ value: "a" }, AccordionTrigger("Q"), AccordionContent("A")));
Accordion({ type: "multiple", defaultValue: ["a", "b"], onValueChange: (value) => value.join() });
Collapsible({ open: [s, "open"] }, "x");
Checkbox({ checked: [s, "agree"], onCheckedChange: (checked) => { void checked; } });
Checkbox({ defaultChecked: "indeterminate", name: "terms" });
Switch({ size: "sm", bind: [s, "open"] });
RadioGroup({ defaultValue: "a", orientation: "vertical" }, RadioGroupItem({ value: "a" }));
Slider({ value: [s, "volume"], min: 0, max: 100, step: 5, onValueCommit: (value) => value[0] });
Tabs({ value: [s, "tab"], activationMode: "manual" },
	TabsList({ variant: "line" }, TabsTrigger({ value: "a" }, "A")), TabsContent({ value: "a" }, "panel"));
Toggle({ pressed: () => s.open, variant: "outline" }, "B");
ToggleGroup({ type: "multiple", spacing: 1 }, ToggleGroupItem({ value: "b" }, "B"));
registerInput("checkbox", checkboxInput);

// @ts-expect-error — multiple accordions take an array
Accordion({ type: "multiple", defaultValue: "a" });
// @ts-expect-error — not a switch size
Switch({ size: "lg" });

// --- menus -------------------------------------------------------------------

DropdownMenu(
	DropdownMenuTrigger(Button("Open")),
	DropdownMenuContent({ align: "start" },
		DropdownMenuItem({ onSelect: (event) => event.preventDefault(), variant: "destructive" }, "Delete"),
		DropdownMenuCheckboxItem({ checked: [s, "open"] }, "Status bar"),
		DropdownMenuRadioGroup({ value: [s, "tab"] }, DropdownMenuRadioItem({ value: "a" }, "A")),
		DropdownMenuSub(DropdownMenuSubTrigger("More"), DropdownMenuSubContent("…"))
	)
);
ContextMenu(ContextMenuTrigger({ disabled: false }, "Right click"), ContextMenuContent(ContextMenuItem("Back")));
Menubar(MenubarMenu(MenubarTrigger("File"), MenubarContent(MenubarItem({ inset: true }, "New"))));
NavigationMenu({ viewport: false, delayDuration: 100 },
	NavigationMenuList(NavigationMenuItem(NavigationMenuLink({ href: "/docs", class: navigationMenuTriggerStyle() }, "Docs"))));

// --- selects -----------------------------------------------------------------

Select({ value: [s, "tab"], name: "tab", onValueChange: (value) => value.toUpperCase() },
	SelectTrigger({ size: "sm" }, SelectValue({ placeholder: "Pick" })),
	SelectContent({ position: "popper", side: "bottom" }, SelectItem({ value: "a" }, "A")));
Command({ shouldFilter: false, filter: (value, search) => (value.includes(search) ? 1 : 0) },
	CommandInput({ placeholder: "Search…" }),
	CommandList(CommandItem({ onSelect: (value) => value.length, keywords: ["k"] }, "Item")));
CommandDialog({ open: [s, "open"], title: "Palette" }, "…");
Combobox({ items: ["Next.js", "Astro"], value: [s, "name"] },
	ComboboxInput({ placeholder: "Framework", showClear: true }),
	ComboboxContent(ComboboxList((item) => ComboboxItem({ value: item }, String(item)))));
NativeSelect({ bind: [s, "tab"] }, NativeSelectOption({ value: "a" }, "A"));
registerInput("ui-select", selectInput);

// --- misc --------------------------------------------------------------------

Breadcrumb(BreadcrumbList(BreadcrumbItem(BreadcrumbLink({ href: "/" }, "Home"))));
Pagination(PaginationLink({ isActive: () => true, href: "#" }, "1"));
PaginationFor({
	page: { index: 0 }, pageCount: () => 3, pageWindow: () => [0, 1, 2], goto: () => {},
	prev: () => {}, next: () => {}, hasPrev: () => false, hasNext: () => true
});
Empty(EmptyMedia({ variant: "icon" }, "∅"));
Item({ variant: "outline", size: "sm" }, ItemMedia({ variant: "image" }, "img"));
ButtonGroup({ orientation: "vertical" }, Button("a"), Button("b"));
InputGroup(InputGroupAddon({ align: "inline-end" }, InputGroupButton({ size: "icon-xs" }, "x")));
Field({ orientation: "horizontal" }, FieldLabel({ for: "x" }, "X"), FieldError({ errors: () => ["bad", { message: "worse" }] }));

const form: FormController<{ username: string; age: number }> = useForm({
	values: { username: "", age: 0 },
	schema: { username: { required: true, min: 2 } },
	validate: (values) => (values.age < 0 ? { age: "Too young" } : null)
});

Form({ form, onSubmit: (values) => values },
	FormField({ form, name: "username", render: (field, api) => FormItem(
		FormLabel("Username"), FormControl(Input({ ...field })), FormMessage(), String(api.error() || "")
	) }));
form.reset({ username: "x" });
registerShadcnInputs();

mount(document.body, () => Toaster({ position: "top-center", richColors: true }));

const id: string | number = toast("Saved", { description: "now", action: { label: "Undo", onClick: () => {} } });

toast.success("ok");
toast.promise(Promise.resolve(1), { loading: "…", success: (n) => `got ${n}`, error: "no" });
toast.dismiss(id);
notify.info("from qrp");
legacyToast({ title: "Hi", variant: "destructive" }).dismiss();
useToast().toast({ description: "x" });

const mobile = useIsMobile();

el("div", {}, () => (mobile() ? "phone" : "desktop"));

// @ts-expect-error — not a toaster position
Toaster({ position: "middle" });

// --- data --------------------------------------------------------------------

Calendar({ mode: "single", selected: [s, "when"], disabled: [{ before: new Date() }, { dayOfWeek: [0, 6] }] });
Calendar({ mode: "range", numberOfMonths: 2, onSelect: (range) => range?.from, captionLayout: "dropdown" });
Calendar({ mode: "multiple", selected: () => [new Date()] });
DatePicker({ value: [s, "when"], placeholder: "Pick a date" });
DatePicker({ mode: "range", onValueChange: (range) => range?.to });

const config: ChartConfig = {
	desktop: { label: "Desktop", color: "var(--chart-1)" },
	mobile: { label: "Mobile", theme: { light: "#2563eb", dark: "#60a5fa" } }
};

ChartContainer({ config, class: "min-h-[200px]" },
	BarChart({ data: () => [{ month: "Jan", desktop: 1 }], accessibilityLayer: true },
		CartesianGrid({ vertical: false }),
		XAxis({ dataKey: "month", tickFormatter: (value) => String(value).slice(0, 3) }),
		ChartTooltip({ content: ChartTooltipContent({ indicator: "dashed" }) }),
		Bar({ dataKey: "desktop", radius: 4 })));

Carousel({ opts: { loop: true }, setApi: (api: CarouselApi) => api.scrollNext() }, CarouselContent(CarouselItem("1")));
ResizablePanelGroup({ direction: "horizontal", onLayout: (sizes) => sizes.length },
	ResizablePanel({ defaultSize: 50 }, "a"), ResizableHandle({ withHandle: true }), ResizablePanel("b"));
ScrollArea({ type: "always" }, "long", ScrollBar({ orientation: "horizontal" }));
InputOTP({ maxLength: 6, pattern: REGEXP_ONLY_DIGITS, onComplete: (code) => code.length },
	InputOTPGroup(InputOTPSlot({ index: 0 })));

// @ts-expect-error — InputOTP needs maxLength
InputOTP({ pattern: REGEXP_ONLY_DIGITS });
// @ts-expect-error — not a calendar mode
Calendar({ mode: "week" });

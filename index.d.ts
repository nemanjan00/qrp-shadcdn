/**
 * @nemanjan00/qrp-shadcdn — shadcn/ui components for qrp.
 *
 * Every component is `(props?, ...children) => Element`, mirroring qrp's
 * `el()`: props accept everything `el()` does (attributes, `on*` listeners,
 * `bind`, reactive thunks) plus the component's own options.
 */

import type { Props, Renderable } from "@nemanjan00/qrp";
import type { InputFactory } from "@nemanjan00/qrp/forms";
import type { Column as TableColumn } from "@nemanjan00/qrp/table";
import type { DataGrid } from "@nemanjan00/qrp/datagrid";

export * from "@nemanjan00/qrp";
export { html, ref } from "@nemanjan00/qrp/html";

// --- shared ------------------------------------------------------------------

/** A value or a reactive thunk producing it. */
export type MaybeThunk<T> = T | (() => T);

/** Class input: string, array, `{ cls: bool }` map, or a thunk of those. */
export type ClassValue =
	| string
	| number
	| null
	| undefined
	| false
	| ClassValue[]
	| Record<string, unknown>
	| (() => ClassValue);

/** Props every component accepts on top of its own. */
export interface BaseProps extends Props {
	class?: ClassValue;
	/** Alias of `class`, for copy-paste from shadcn. */
	className?: ClassValue;
	/** Render as another tag — the stand-in for shadcn's `asChild`. */
	as?: string;
}

/**
 * A component: `Comp(props, ...children)` or the props-less `Comp(...children)`.
 */
export interface QsComponent<P = {}, E extends Element = HTMLElement> {
	(props: P & BaseProps, ...children: Renderable[]): E;
	(...children: Renderable[]): E;
}

/**
 * A controllable value: omitted (internal state), a plain initial value, a
 * `[state, "key"]` two-way binding, or a thunk (changes go to the onChange callback).
 */
export type Controllable<T> = T | [Record<string, any>, string] | (() => T);

/** Open state shared by every overlay root. */
export interface OpenProps {
	open?: Controllable<boolean>;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
}

/** Where a popup sits relative to its trigger. */
export interface PlacementProps {
	side?: "top" | "right" | "bottom" | "left";
	align?: "start" | "center" | "end";
	sideOffset?: number;
	alignOffset?: number;
	avoidCollisions?: boolean;
}

/** An overlay root returns its trigger(s) in a fragment; content stays detached until open. */
export interface QsRoot<P = {}> {
	(props: P & OpenProps, ...children: Renderable[]): DocumentFragment;
	(...children: Renderable[]): DocumentFragment;
}

// --- utils -------------------------------------------------------------------

/** Join classes like clsx; returns a thunk when any input is a thunk. */
export function cn(...inputs: ClassValue[]): string | (() => string);

/**
 * The built-in Tailwind conflict resolver `cn`/`variants` use: last class of a
 * group wins per variant prefix; shorthands replace earlier longhands.
 */
export function mergeClasses(classes: string): string;

/** Plug in a class-conflict resolver such as tailwind-merge's `twMerge`; null resets. */
export function setClassMerge(fn: ((classes: string) => string) | null): void;

/** Read a value that may be a thunk. */
export function read<T>(value: MaybeThunk<T>): T;

export interface VariantsConfig<V extends Record<string, Record<string, string>>> {
	variants?: V;
	defaultVariants?: { [K in keyof V]?: keyof V[K] };
	compoundVariants?: Array<{ [K in keyof V]?: keyof V[K] } & { class: string }>;
}

export type VariantProps<V extends Record<string, Record<string, string>>> = {
	[K in keyof V]?: MaybeThunk<keyof V[K] | null | undefined>;
} & { class?: ClassValue };

/** The `cva` equivalent. Returns a thunk when any variant prop is a thunk. */
export function variants<V extends Record<string, Record<string, string>>>(
	base: string,
	config?: VariantsConfig<V>
): (props?: VariantProps<V>) => string | (() => string);

/** Split `(props?, ...children)` component arguments. */
export function parseArgs(args: unknown[]): { props: Record<string, any>; children: Renderable[] };

/** Split props into the component's own keys and the rest (undefined values dropped). */
export function pick(props: Record<string, any>, keys: string[]): [Record<string, any>, Record<string, any>];

/** Factory for a styled element with a `data-slot`. */
export function part(
	tag: string,
	slot: string,
	base: string | ((own: Record<string, any>) => string | (() => string)),
	options?: { own?: string[]; attrs?: Record<string, string>; data?: (own: Record<string, any>) => Record<string, string> }
): QsComponent;

/** Value state that is internal, bound to `[state, key]`, or driven by a thunk. */
export function controllable<T>(source: Controllable<T> | undefined, fallback: T, onChange?: (value: T) => void): {
	get(): T;
	set(value: T): void;
};

/** A document-unique id. */
export function uid(prefix?: string): string;

/** Apply el()-style props to an existing element (the `asChild` merge). */
export function applyProps<E extends Element>(node: E, props: Record<string, any>): E;

/** Factory for trigger/close parts: marks a single element child, or wraps children in `tag`. */
export function roleMarker(role: string, tag?: string, base?: string): QsComponent<{}, Element>;

/** Render children through qrp's normalizer into a fragment. */
export function fragmentOf(children: Renderable[]): DocumentFragment;

/** Render children into a fragment and pull out the top-level node with `slot`. */
export function splitContent(children: Renderable[], slot: string): { fragment: DocumentFragment; content: Element | null };

/** Elements carrying a `data-qs-role` marker, the root included. */
export function withRole(root: ParentNode, role: string): Element[];

/** Run `sync` now and whenever the subtree gains or loses nodes; returns disconnect. */
export function watchTree(root: Element, sync: () => void): () => void;

/** Resolve after a node's exit animation (or at once without one). */
export function animateOut(node: Element): Promise<void>;

// --- icons (lucide, ISC) -----------------------------------------------------

export type Icon = QsComponent<{}, SVGSVGElement>;

export const CheckIcon: Icon;
export const ChevronDownIcon: Icon;
export const ChevronUpIcon: Icon;
export const ChevronRightIcon: Icon;
export const ChevronLeftIcon: Icon;
export const ChevronsUpDownIcon: Icon;
export const XIcon: Icon;
export const CircleIcon: Icon;
export const DotIcon: Icon;
export const MoreHorizontalIcon: Icon;
export const SearchIcon: Icon;
export const MinusIcon: Icon;
export const GripVerticalIcon: Icon;
export const Loader2Icon: Icon;
export const PanelLeftIcon: Icon;
export const ArrowLeftIcon: Icon;
export const ArrowRightIcon: Icon;
export const CalendarIcon: Icon;
export const ArrowUpIcon: Icon;
export const ArrowDownIcon: Icon;
export const ArrowUpDownIcon: Icon;
export const ChevronsLeftIcon: Icon;
export const ChevronsRightIcon: Icon;

// --- basic components --------------------------------------------------------

export type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
export type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";

export interface ButtonProps {
	variant?: MaybeThunk<ButtonVariant>;
	size?: MaybeThunk<ButtonSize>;
}

/** Defaults `type="button"` so it never submits a form by accident. */
export const Button: QsComponent<ButtonProps, HTMLButtonElement>;
export function buttonVariants(props?: ButtonProps & { class?: ClassValue }): string | (() => string);

export type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
export const Badge: QsComponent<{ variant?: MaybeThunk<BadgeVariant> }>;
export function badgeVariants(props?: { variant?: MaybeThunk<BadgeVariant>; class?: ClassValue }): string | (() => string);

export const Card: QsComponent;
export const CardHeader: QsComponent;
export const CardTitle: QsComponent;
export const CardDescription: QsComponent;
export const CardAction: QsComponent;
export const CardContent: QsComponent;
export const CardFooter: QsComponent;

export const Alert: QsComponent<{ variant?: MaybeThunk<"default" | "destructive"> }>;
export const AlertTitle: QsComponent;
export const AlertDescription: QsComponent;

export const Input: QsComponent<{}, HTMLInputElement>;
export const Textarea: QsComponent<{}, HTMLTextAreaElement>;
export const Label: QsComponent<{ for?: string; htmlFor?: string }, HTMLLabelElement>;

export const Separator: QsComponent<{ orientation?: "horizontal" | "vertical"; decorative?: boolean }>;
export const Skeleton: QsComponent;
export const Kbd: QsComponent;
export const KbdGroup: QsComponent;
export const Spinner: QsComponent<{}, SVGSVGElement>;
export const AspectRatio: QsComponent<{ ratio?: number }>;

export const Table: QsComponent;
export const TableHeader: QsComponent<{}, HTMLTableSectionElement>;
export const TableBody: QsComponent<{}, HTMLTableSectionElement>;
export const TableFooter: QsComponent<{}, HTMLTableSectionElement>;
export const TableRow: QsComponent<{}, HTMLTableRowElement>;
export const TableHead: QsComponent<{}, HTMLTableCellElement>;
export const TableCell: QsComponent<{}, HTMLTableCellElement>;
export const TableCaption: QsComponent<{}, HTMLTableCaptionElement>;

/** `value` 0..max (a thunk for live progress); omitted = indeterminate. */
export const Progress: QsComponent<{ value?: MaybeThunk<number | null | undefined>; max?: number }>;

export const Avatar: QsComponent<{ size?: "default" | "sm" | "lg" }>;
export const AvatarImage: QsComponent<{ src?: MaybeThunk<string>; alt?: string }, HTMLImageElement>;
export const AvatarFallback: QsComponent;
export const AvatarBadge: QsComponent;
export const AvatarGroup: QsComponent;
export const AvatarGroupCount: QsComponent;

// --- modals ------------------------------------------------------------------

export const Dialog: QsRoot;
export const DialogTrigger: QsComponent<{}, Element>;
export const DialogClose: QsComponent<{}, Element>;
export const DialogContent: QsComponent<{ showCloseButton?: boolean }>;
export const DialogHeader: QsComponent;
export const DialogFooter: QsComponent<{ showCloseButton?: boolean }>;
export const DialogTitle: QsComponent;
export const DialogDescription: QsComponent;

/** Build a modal root (how Dialog, Sheet, AlertDialog and Drawer are made). */
export function modalRoot(name: string, options?: {
	role?: string;
	outside?: boolean;
	prepare?: (content: Element, props: Record<string, any>) => void;
}): QsRoot;

/** The close "X" button modal contents render. */
export function closeX(name: string, classes: string): HTMLButtonElement;

export const AlertDialog: QsRoot;
export const AlertDialogTrigger: QsComponent<{}, Element>;
export const AlertDialogContent: QsComponent<{ size?: "default" | "sm" }>;
export const AlertDialogHeader: QsComponent;
export const AlertDialogFooter: QsComponent;
export const AlertDialogTitle: QsComponent;
export const AlertDialogDescription: QsComponent;
export const AlertDialogMedia: QsComponent;
/** Closes the dialog after its own `onclick` runs. */
export const AlertDialogAction: QsComponent<ButtonProps, HTMLButtonElement>;
export const AlertDialogCancel: QsComponent<ButtonProps, HTMLButtonElement>;

export const Sheet: QsRoot;
export const SheetTrigger: QsComponent<{}, Element>;
export const SheetClose: QsComponent<{}, Element>;
export const SheetContent: QsComponent<{ side?: "top" | "right" | "bottom" | "left"; showCloseButton?: boolean }>;
export const SheetHeader: QsComponent;
export const SheetFooter: QsComponent;
export const SheetTitle: QsComponent;
export const SheetDescription: QsComponent;

export const Drawer: QsRoot<{ direction?: "top" | "right" | "bottom" | "left" }>;
export const DrawerTrigger: QsComponent<{}, Element>;
export const DrawerClose: QsComponent<{}, Element>;
export const DrawerContent: QsComponent;
export const DrawerHeader: QsComponent;
export const DrawerFooter: QsComponent;
export const DrawerTitle: QsComponent;
export const DrawerDescription: QsComponent;

// --- popups ------------------------------------------------------------------

export const Popover: QsRoot<{ modal?: boolean }>;
export const PopoverTrigger: QsComponent<{}, Element>;
export const PopoverAnchor: QsComponent<{}, Element>;
export const PopoverClose: QsComponent<{}, Element>;
export const PopoverContent: QsComponent<PlacementProps>;
export const PopoverHeader: QsComponent;
export const PopoverTitle: QsComponent;
export const PopoverDescription: QsComponent;

export const Tooltip: QsRoot<{ delayDuration?: number }>;
export const TooltipTrigger: QsComponent<{}, Element>;
export const TooltipContent: QsComponent<PlacementProps>;
/** Accepted for copy-paste compatibility; renders its children. */
export function TooltipProvider(...args: unknown[]): DocumentFragment;

export const HoverCard: QsRoot<{ openDelay?: number; closeDelay?: number }>;
export const HoverCardTrigger: QsComponent<{}, Element>;
export const HoverCardContent: QsComponent<PlacementProps>;

// --- inputs ------------------------------------------------------------------

/** Two-way binding tuple accepted by every value control, like el()'s `bind`. */
export type BindTuple = [Record<string, any>, string];

type Orientation = "horizontal" | "vertical";

/** Accordion — https://ui.shadcn.com/docs/components/accordion */
export interface AccordionSingleProps {
	type?: "single";
	value?: Controllable<string>;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Allow closing the open item. */
	collapsible?: boolean;
}
export interface AccordionMultipleProps {
	type: "multiple";
	value?: Controllable<string[]>;
	defaultValue?: string[];
	onValueChange?: (value: string[]) => void;
}
export const Accordion: QsComponent<(AccordionSingleProps | AccordionMultipleProps) & {
	bind?: BindTuple;
	disabled?: boolean;
	orientation?: Orientation;
}>;
export const AccordionItem: QsComponent<{ value: string; disabled?: boolean }>;
export const AccordionTrigger: QsComponent<{}, HTMLButtonElement>;
export const AccordionContent: QsComponent;

/** Collapsible — https://ui.shadcn.com/docs/components/collapsible */
export const Collapsible: QsComponent<OpenProps & { bind?: BindTuple; disabled?: boolean }>;
export const CollapsibleTrigger: QsComponent<{}, Element>;
export const CollapsibleContent: QsComponent;

export type CheckedState = boolean | "indeterminate";

/** Checkbox — https://ui.shadcn.com/docs/components/checkbox */
export const Checkbox: QsComponent<{
	checked?: Controllable<CheckedState>;
	bind?: BindTuple;
	defaultChecked?: CheckedState;
	onCheckedChange?: (checked: CheckedState) => void;
	/** Form field name; a hidden input submits `value` when checked. */
	name?: string;
	value?: string;
	required?: boolean;
	disabled?: MaybeThunk<boolean>;
}, HTMLButtonElement>;
/** qrp forms adapter: `registerInput("checkbox", checkboxInput)`. */
export const checkboxInput: InputFactory;

/** Switch — https://ui.shadcn.com/docs/components/switch */
export const Switch: QsComponent<{
	checked?: Controllable<boolean>;
	bind?: BindTuple;
	defaultChecked?: boolean;
	onCheckedChange?: (checked: boolean) => void;
	size?: "default" | "sm";
	name?: string;
	value?: string;
	required?: boolean;
	disabled?: MaybeThunk<boolean>;
}, HTMLButtonElement>;
export const switchInput: InputFactory;

/** RadioGroup — https://ui.shadcn.com/docs/components/radio-group */
export const RadioGroup: QsComponent<{
	value?: Controllable<string>;
	bind?: BindTuple;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	name?: string;
	disabled?: boolean;
	required?: boolean;
	orientation?: Orientation;
	/** Wrap arrow navigation at the ends (default true). */
	loop?: boolean;
}>;
export const RadioGroupItem: QsComponent<{ value: string; disabled?: MaybeThunk<boolean> }, HTMLButtonElement>;
/** qrp forms adapter; reads `spec.options` (`{ value: label }`). */
export const radioGroupInput: InputFactory;

/** Slider — https://ui.shadcn.com/docs/components/slider */
export const Slider: QsComponent<{
	/** One number per thumb; a bound number key gives a single thumb. */
	value?: Controllable<number[] | number>;
	bind?: BindTuple;
	defaultValue?: number[];
	onValueChange?: (value: number[]) => void;
	/** At the end of an interaction (pointer up, key press). */
	onValueCommit?: (value: number[]) => void;
	min?: number;
	max?: number;
	step?: number;
	minStepsBetweenThumbs?: number;
	orientation?: Orientation;
	inverted?: boolean;
	disabled?: MaybeThunk<boolean>;
	/** Form field name (`name[]` with several thumbs). */
	name?: string;
}>;
export const sliderInput: InputFactory;

/** Tabs — https://ui.shadcn.com/docs/components/tabs */
export const Tabs: QsComponent<{
	value?: Controllable<string>;
	bind?: BindTuple;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	orientation?: Orientation;
	/** "manual": arrow keys only move focus; Enter/Space selects. */
	activationMode?: "automatic" | "manual";
}>;
export const TabsList: QsComponent<{ variant?: "default" | "line"; loop?: boolean }>;
export const TabsTrigger: QsComponent<{ value: string; disabled?: MaybeThunk<boolean> }, HTMLButtonElement>;
/** `forceMount` keeps the panel in the layout while inactive. */
export const TabsContent: QsComponent<{ value: string; forceMount?: boolean }>;
export function tabsListVariants(props?: { variant?: MaybeThunk<"default" | "line">; class?: ClassValue }): string | (() => string);

export type ToggleVariant = "default" | "outline";
export type ToggleSize = "default" | "sm" | "lg";

/** Toggle — https://ui.shadcn.com/docs/components/toggle */
export const Toggle: QsComponent<{
	pressed?: Controllable<boolean>;
	bind?: BindTuple;
	defaultPressed?: boolean;
	onPressedChange?: (pressed: boolean) => void;
	variant?: MaybeThunk<ToggleVariant>;
	size?: MaybeThunk<ToggleSize>;
}, HTMLButtonElement>;
export function toggleVariants(props?: { variant?: MaybeThunk<ToggleVariant>; size?: MaybeThunk<ToggleSize>; class?: ClassValue }): string | (() => string);
/** qrp forms adapter; `spec.text` is the button content. */
export const toggleInput: InputFactory;

/** ToggleGroup — https://ui.shadcn.com/docs/components/toggle-group */
export const ToggleGroup: QsComponent<({
	type?: "single";
	value?: Controllable<string>;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
} | {
	type: "multiple";
	value?: Controllable<string[]>;
	defaultValue?: string[];
	onValueChange?: (value: string[]) => void;
}) & {
	bind?: BindTuple;
	variant?: ToggleVariant;
	size?: ToggleSize;
	/** Gap between items in spacing units; 0 joins them. */
	spacing?: number;
	disabled?: boolean;
	orientation?: Orientation;
	loop?: boolean;
}>;
export const ToggleGroupItem: QsComponent<{ value: string; variant?: ToggleVariant; size?: ToggleSize; disabled?: MaybeThunk<boolean> }, HTMLButtonElement>;

// --- menus -------------------------------------------------------------------

/** Item props shared by Dropdown/Context/Menubar menus. */
export interface MenuItemProps {
	disabled?: boolean;
	/** Indent to line up with items that have an indicator. */
	inset?: boolean;
	/** Typeahead text when the children aren't plain text. */
	textValue?: string;
	/** Runs on click / Enter / Space; `event.preventDefault()` keeps the menu open. */
	onSelect?: (event: Event) => void;
}

export interface MenuParts<P extends string> {
	Content: QsComponent<PlacementProps & { loop?: boolean }>;
	Group: QsComponent;
	Label: QsComponent<{ inset?: boolean }>;
	Item: QsComponent<MenuItemProps & { variant?: "default" | "destructive" }>;
	CheckboxItem: QsComponent<MenuItemProps & {
		checked?: Controllable<CheckedState>;
		defaultChecked?: CheckedState;
		onCheckedChange?: (checked: boolean) => void;
	}>;
	RadioGroup: QsComponent<{ value?: Controllable<string>; defaultValue?: string; onValueChange?: (value: string) => void }>;
	RadioItem: QsComponent<MenuItemProps & { value: string }>;
	Separator: QsComponent;
	Shortcut: QsComponent;
	Sub: QsRoot;
	SubTrigger: QsComponent<MenuItemProps>;
	SubContent: QsComponent<PlacementProps & { loop?: boolean }>;
	/** Accepted for copy-paste compatibility; renders its children. */
	Portal: (...args: unknown[]) => DocumentFragment;
	readonly prefix?: P;
}

/** DropdownMenu — https://ui.shadcn.com/docs/components/dropdown-menu */
export const DropdownMenu: QsRoot<{ modal?: boolean }>;
export const DropdownMenuTrigger: QsComponent<{}, Element>;
export const DropdownMenuPortal: MenuParts<"dropdown-menu">["Portal"];
export const DropdownMenuContent: MenuParts<"dropdown-menu">["Content"];
export const DropdownMenuGroup: MenuParts<"dropdown-menu">["Group"];
export const DropdownMenuLabel: MenuParts<"dropdown-menu">["Label"];
export const DropdownMenuItem: MenuParts<"dropdown-menu">["Item"];
export const DropdownMenuCheckboxItem: MenuParts<"dropdown-menu">["CheckboxItem"];
export const DropdownMenuRadioGroup: MenuParts<"dropdown-menu">["RadioGroup"];
export const DropdownMenuRadioItem: MenuParts<"dropdown-menu">["RadioItem"];
export const DropdownMenuSeparator: MenuParts<"dropdown-menu">["Separator"];
export const DropdownMenuShortcut: MenuParts<"dropdown-menu">["Shortcut"];
export const DropdownMenuSub: MenuParts<"dropdown-menu">["Sub"];
export const DropdownMenuSubTrigger: MenuParts<"dropdown-menu">["SubTrigger"];
export const DropdownMenuSubContent: MenuParts<"dropdown-menu">["SubContent"];

/** ContextMenu — https://ui.shadcn.com/docs/components/context-menu */
export const ContextMenu: QsRoot<{ modal?: boolean }>;
/** `disabled` lets the browser's own context menu through. */
export const ContextMenuTrigger: QsComponent<{ disabled?: boolean }, Element>;
export const ContextMenuPortal: MenuParts<"context-menu">["Portal"];
export const ContextMenuContent: MenuParts<"context-menu">["Content"];
export const ContextMenuGroup: MenuParts<"context-menu">["Group"];
export const ContextMenuLabel: MenuParts<"context-menu">["Label"];
export const ContextMenuItem: MenuParts<"context-menu">["Item"];
export const ContextMenuCheckboxItem: MenuParts<"context-menu">["CheckboxItem"];
export const ContextMenuRadioGroup: MenuParts<"context-menu">["RadioGroup"];
export const ContextMenuRadioItem: MenuParts<"context-menu">["RadioItem"];
export const ContextMenuSeparator: MenuParts<"context-menu">["Separator"];
export const ContextMenuShortcut: MenuParts<"context-menu">["Shortcut"];
export const ContextMenuSub: MenuParts<"context-menu">["Sub"];
export const ContextMenuSubTrigger: MenuParts<"context-menu">["SubTrigger"];
export const ContextMenuSubContent: MenuParts<"context-menu">["SubContent"];

/** Menubar — https://ui.shadcn.com/docs/components/menubar */
export const Menubar: QsComponent;
export const MenubarMenu: QsRoot;
export const MenubarTrigger: QsComponent<{}, Element>;
export const MenubarPortal: MenuParts<"menubar">["Portal"];
export const MenubarContent: MenuParts<"menubar">["Content"];
export const MenubarGroup: MenuParts<"menubar">["Group"];
export const MenubarLabel: MenuParts<"menubar">["Label"];
export const MenubarItem: MenuParts<"menubar">["Item"];
export const MenubarCheckboxItem: MenuParts<"menubar">["CheckboxItem"];
export const MenubarRadioGroup: MenuParts<"menubar">["RadioGroup"];
export const MenubarRadioItem: MenuParts<"menubar">["RadioItem"];
export const MenubarSeparator: MenuParts<"menubar">["Separator"];
export const MenubarShortcut: MenuParts<"menubar">["Shortcut"];
export const MenubarSub: MenuParts<"menubar">["Sub"];
export const MenubarSubTrigger: MenuParts<"menubar">["SubTrigger"];
export const MenubarSubContent: MenuParts<"menubar">["SubContent"];

/** NavigationMenu — https://ui.shadcn.com/docs/components/navigation-menu */
export const NavigationMenu: QsComponent<{
	/** false: each panel opens under its own trigger instead of a shared viewport. */
	viewport?: boolean;
	/** The open item's `value` ("" = none). */
	value?: Controllable<string>;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Hover delay in ms before the first panel opens (default 200). */
	delayDuration?: number;
}, HTMLElement>;
export const NavigationMenuList: QsComponent<{}, HTMLUListElement>;
export const NavigationMenuItem: QsComponent<{ value?: string }, HTMLLIElement>;
export const NavigationMenuTrigger: QsComponent<{}, HTMLButtonElement>;
export const NavigationMenuContent: QsComponent;
/** `active` marks the current page; following the link closes the menu. */
export const NavigationMenuLink: QsComponent<{ href?: string; active?: MaybeThunk<boolean>; onSelect?: (event: Event) => void }, HTMLAnchorElement>;
export const NavigationMenuIndicator: QsComponent;
export const NavigationMenuViewport: QsComponent;
export function navigationMenuTriggerStyle(props?: { class?: ClassValue }): string | (() => string);

// --- selects -----------------------------------------------------------------

/** Select — https://ui.shadcn.com/docs/components/select */
export const Select: QsRoot<{
	value?: Controllable<string>;
	bind?: BindTuple;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Adds a hidden native select so the value submits with a form. */
	name?: string;
	required?: boolean;
	disabled?: boolean;
}>;
export const SelectTrigger: QsComponent<{ size?: "default" | "sm" }, HTMLButtonElement>;
export const SelectValue: QsComponent<{ placeholder?: Renderable }, HTMLSpanElement>;
/** Only "popper" positioning is implemented; "item-aligned" behaves like it. */
export const SelectContent: QsComponent<PlacementProps & { position?: "popper" | "item-aligned" }>;
export const SelectGroup: QsComponent;
export const SelectLabel: QsComponent;
/** `textValue` is the typeahead label when children aren't plain text. */
export const SelectItem: QsComponent<{ value: string; disabled?: boolean; textValue?: string }>;
export const SelectSeparator: QsComponent;
export const SelectScrollUpButton: QsComponent;
export const SelectScrollDownButton: QsComponent;
/** qrp forms adapter; field `{ options: { value: label } | () => …, placeholder }`. */
export const selectInput: InputFactory;

/** Command — https://ui.shadcn.com/docs/components/command */
export interface CommandProps {
	/** The highlighted item's value. */
	value?: Controllable<string>;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Score an item (0 hides it). */
	filter?: (value: string, search: string, keywords?: string[]) => number;
	/** false: you filter the items yourself. */
	shouldFilter?: boolean;
	loop?: boolean;
	/** Accessible label for the input. */
	label?: string;
	vimBindings?: boolean;
}
export const Command: QsComponent<CommandProps>;
export const CommandInput: QsComponent<{ value?: Controllable<string>; bind?: BindTuple; onValueChange?: (search: string) => void; placeholder?: string }, HTMLInputElement>;
export const CommandList: QsComponent<{ label?: string }>;
export const CommandEmpty: QsComponent;
export const CommandGroup: QsComponent<{ heading?: Renderable; value?: string }>;
export const CommandSeparator: QsComponent<{ alwaysRender?: boolean }>;
export const CommandItem: QsComponent<{
	value?: string;
	keywords?: string[];
	onSelect?: (value: string) => void;
	disabled?: boolean;
	forceMount?: boolean;
}>;
export const CommandShortcut: QsComponent;
/** A Command palette in a Dialog. */
export const CommandDialog: QsRoot<{ title?: string; description?: string; showCloseButton?: boolean; commandProps?: CommandProps }>;

/** Combobox (the v4 / Base UI API) — https://ui.shadcn.com/docs/components/combobox */
export interface ComboboxRenderPart<E extends Element = HTMLElement> {
	(props: BaseProps, render: (item: any) => Renderable): E;
	(render: (item: any) => Renderable): E;
	(props: BaseProps, ...children: Renderable[]): E;
	(...children: Renderable[]): E;
}
export const Combobox: QsRoot<{
	/** Options handed to ComboboxList/ComboboxCollection render functions. */
	items?: MaybeThunk<readonly any[]>;
	value?: Controllable<any>;
	bind?: BindTuple;
	defaultValue?: any;
	onValueChange?: (value: any) => void;
	multiple?: boolean;
	itemToStringLabel?: (value: any) => string;
	filter?: (label: string, query: string, keywords?: string[]) => number;
	autoHighlight?: boolean;
	disabled?: boolean;
}>;
export const ComboboxInput: QsComponent<{ placeholder?: string; showTrigger?: boolean; showClear?: boolean; disabled?: boolean }>;
export const ComboboxTrigger: QsComponent<{}, HTMLButtonElement>;
export const ComboboxClear: QsComponent<{}, HTMLButtonElement>;
export const ComboboxContent: QsComponent<PlacementProps & { anchor?: Element | { current: Element | null } }>;
export const ComboboxList: ComboboxRenderPart;
export const ComboboxItem: QsComponent<{ value: any; disabled?: boolean; label?: string }>;
export const ComboboxGroup: QsComponent<{ items?: MaybeThunk<readonly any[]> }>;
export const ComboboxLabel: QsComponent;
export const ComboboxCollection: ComboboxRenderPart;
export const ComboboxEmpty: QsComponent;
export const ComboboxSeparator: QsComponent;
export const ComboboxChips: QsComponent<{ ref?: unknown }>;
export const ComboboxChip: QsComponent<{ value?: any; showRemove?: boolean }>;
export const ComboboxChipsInput: QsComponent<{ placeholder?: string }, HTMLInputElement>;
/** `render(value)` gets the values array when `multiple`. */
export const ComboboxValue: ComboboxRenderPart<HTMLSpanElement>;
/** Accepted for shadcn compatibility; the chips container anchors the popup automatically. */
export function useComboboxAnchor(): { current: Element | null };
export const comboboxInput: InputFactory;

/** NativeSelect — https://ui.shadcn.com/docs/components/native-select */
export const NativeSelect: QsComponent<{ size?: "default" | "sm"; bind?: BindTuple }>;
export const NativeSelectOption: QsComponent<{ value?: string }, HTMLOptionElement>;
export const NativeSelectOptGroup: QsComponent<{ label?: string }, HTMLOptGroupElement>;
export const nativeSelectInput: InputFactory;

// --- misc --------------------------------------------------------------------

/** Breadcrumb — https://ui.shadcn.com/docs/components/breadcrumb */
export const Breadcrumb: QsComponent;
export const BreadcrumbList: QsComponent<{}, HTMLOListElement>;
export const BreadcrumbItem: QsComponent<{}, HTMLLIElement>;
export const BreadcrumbLink: QsComponent<{ href?: string }, HTMLAnchorElement>;
export const BreadcrumbPage: QsComponent<{}, HTMLSpanElement>;
/** Defaults to a chevron when given no children. */
export const BreadcrumbSeparator: QsComponent<{}, HTMLLIElement>;
export const BreadcrumbEllipsis: QsComponent<{}, HTMLSpanElement>;

/** Pagination — https://ui.shadcn.com/docs/components/pagination */
export interface PaginationLinkProps {
	isActive?: MaybeThunk<boolean>;
	size?: ButtonSize;
	href?: string;
}
export const Pagination: QsComponent;
export const PaginationContent: QsComponent<{}, HTMLUListElement>;
export const PaginationItem: QsComponent<{}, HTMLLIElement>;
export const PaginationLink: QsComponent<PaginationLinkProps, HTMLAnchorElement>;
export const PaginationPrevious: QsComponent<PaginationLinkProps, HTMLAnchorElement>;
export const PaginationNext: QsComponent<PaginationLinkProps, HTMLAnchorElement>;
export const PaginationEllipsis: QsComponent<{}, HTMLSpanElement>;

/** The pager surface PaginationFor needs (qrp's dataGrid() has it). */
export interface PagerLike {
	page: { index: number };
	pageCount(): number;
	pageWindow(span?: number): number[];
	goto(index: number): void;
	prev(): void;
	next(): void;
	hasPrev(): boolean;
	hasNext(): boolean;
}
/** Pagination driven by a qrp dataGrid pager: keyed page links, ellipses outside the window. */
export function PaginationFor(grid: PagerLike, options?: { span?: number }): HTMLElement;

/** Empty — https://ui.shadcn.com/docs/components/empty */
export const Empty: QsComponent;
export const EmptyHeader: QsComponent;
export const EmptyMedia: QsComponent<{ variant?: MaybeThunk<"default" | "icon"> }>;
export const EmptyTitle: QsComponent;
export const EmptyDescription: QsComponent;
export const EmptyContent: QsComponent;
export function emptyMediaVariants(props?: { variant?: MaybeThunk<"default" | "icon">; class?: ClassValue }): string | (() => string);

/** Item — https://ui.shadcn.com/docs/components/item */
export type ItemVariant = "default" | "outline" | "muted";
export const Item: QsComponent<{ variant?: MaybeThunk<ItemVariant>; size?: MaybeThunk<"default" | "sm"> }>;
export const ItemGroup: QsComponent;
export const ItemSeparator: QsComponent;
export const ItemMedia: QsComponent<{ variant?: MaybeThunk<"default" | "icon" | "image"> }>;
export const ItemContent: QsComponent;
export const ItemTitle: QsComponent;
export const ItemDescription: QsComponent<{}, HTMLParagraphElement>;
export const ItemActions: QsComponent;
export const ItemHeader: QsComponent;
export const ItemFooter: QsComponent;
export function itemVariants(props?: { variant?: MaybeThunk<ItemVariant>; size?: MaybeThunk<"default" | "sm">; class?: ClassValue }): string | (() => string);
export function itemMediaVariants(props?: { variant?: MaybeThunk<"default" | "icon" | "image">; class?: ClassValue }): string | (() => string);

/** ButtonGroup — https://ui.shadcn.com/docs/components/button-group */
export const ButtonGroup: QsComponent<{ orientation?: MaybeThunk<Orientation> }>;
export const ButtonGroupText: QsComponent;
export const ButtonGroupSeparator: QsComponent<{ orientation?: Orientation }>;
export function buttonGroupVariants(props?: { orientation?: MaybeThunk<Orientation>; class?: ClassValue }): string | (() => string);

/** InputGroup — https://ui.shadcn.com/docs/components/input-group */
export type InputGroupAddonAlign = "inline-start" | "inline-end" | "block-start" | "block-end";
export type InputGroupButtonSize = "xs" | "sm" | "icon-xs" | "icon-sm";
export const InputGroup: QsComponent;
/** Clicking the addon (outside a button) focuses the input. */
export const InputGroupAddon: QsComponent<{ align?: InputGroupAddonAlign }>;
export const InputGroupButton: QsComponent<{ variant?: ButtonVariant; size?: InputGroupButtonSize }, HTMLButtonElement>;
export const InputGroupText: QsComponent<{}, HTMLSpanElement>;
export const InputGroupInput: QsComponent<{}, HTMLInputElement>;
export const InputGroupTextarea: QsComponent<{}, HTMLTextAreaElement>;
export function inputGroupAddonVariants(props?: { align?: MaybeThunk<InputGroupAddonAlign>; class?: ClassValue }): string | (() => string);
export function inputGroupButtonVariants(props?: { size?: MaybeThunk<InputGroupButtonSize>; class?: ClassValue }): string | (() => string);

/** Field — https://ui.shadcn.com/docs/components/field */
export type FieldOrientation = "vertical" | "horizontal" | "responsive";
export type FieldErrors = ReadonlyArray<string | { message?: string } | null | undefined> | string | null | undefined;
export const Field: QsComponent<{ orientation?: MaybeThunk<FieldOrientation> }>;
export const FieldSet: QsComponent<{}, HTMLFieldSetElement>;
export const FieldLegend: QsComponent<{ variant?: "legend" | "label" }, HTMLLegendElement>;
export const FieldGroup: QsComponent;
export const FieldContent: QsComponent;
export const FieldLabel: QsComponent<{ for?: string; htmlFor?: string }, HTMLLabelElement>;
export const FieldTitle: QsComponent;
export const FieldDescription: QsComponent<{}, HTMLParagraphElement>;
export const FieldSeparator: QsComponent;
/** Hidden while there is nothing to say; several errors render as a list. */
export const FieldError: QsComponent<{ errors?: MaybeThunk<FieldErrors> }>;
export function fieldVariants(props?: { orientation?: MaybeThunk<FieldOrientation>; class?: ClassValue }): string | (() => string);

/** Form — https://ui.shadcn.com/docs/components/form (react-hook-form → a qrp reactive object) */
export interface UseFormOptions<T extends Record<string, any>> {
	/** Initial values (made reactive) or a state() object. */
	values: T;
	/** A qrp `validate` schema. */
	schema?: Record<string, any>;
	/** Extra validation: return `{ field: message }` (or null). */
	validate?: (values: T) => Partial<Record<keyof T & string, string>> | null | undefined;
	/** Re-check after the first submit (default) or from the first change. */
	revalidate?: "submit" | "change";
}
export interface FormController<T extends Record<string, any>> {
	values: T;
	/** `errors.name` is the message, or undefined. Reactive. */
	errors: Partial<Record<keyof T & string, string>>;
	readonly submitted: boolean;
	readonly submitting: boolean;
	/** Validate and publish errors; the coerced values, or null when invalid. */
	check(): T | null;
	valid(): boolean;
	setError(name: keyof T & string, message: string | undefined): void;
	reset(next?: Partial<T>): void;
	/** An onsubmit handler that runs `onSubmit` only when valid. */
	handleSubmit(onSubmit: (values: T, event: Event) => unknown): (event: Event) => void;
}
export function useForm<T extends Record<string, any>>(options: UseFormOptions<T>): FormController<T>;

export interface FormFieldBinding { name: string; bind: BindTuple }
export interface FormFieldApi { value(): any; set(value: any): void; error(): string | undefined }

export const Form: QsComponent<{ form: FormController<any>; onSubmit?: (values: any, event: Event) => unknown }, HTMLFormElement>;
/**
 * `render(field, api)` for a custom control, or a qrp field spec (`type`,
 * `label`, `description`, attrs) built from the forms input registry.
 */
export function FormField(props: {
	form: FormController<any>;
	name: string;
	render?: (field: FormFieldBinding, api: FormFieldApi) => Renderable;
	type?: string;
	label?: Renderable;
	description?: Renderable;
	[attr: string]: any;
}): Renderable;
/** qrp's `{ key: { name, type, description, options, … } }` field map as FormItems. */
export const FormFields: QsComponent<{ form: FormController<any>; fields: Record<string, Record<string, any>> }>;
export const FormItem: QsComponent;
export const FormLabel: QsComponent<{}, HTMLLabelElement>;
export const FormControl: QsComponent<{}, Element>;
export const FormDescription: QsComponent<{}, HTMLParagraphElement>;
export const FormMessage: QsComponent<{}, HTMLParagraphElement>;
/** Put the shadcn-styled controls into qrp's input registry. */
export function registerShadcnInputs(): void;

/** Sonner — https://ui.shadcn.com/docs/components/sonner */
export type ToastVariant = "default" | "success" | "error" | "info" | "warning" | "loading" | "custom";
export interface ToastAction { label: Renderable; onClick: (event: Event) => void }
export interface ToastOptions {
	id?: string | number;
	description?: Renderable;
	action?: ToastAction;
	cancel?: ToastAction;
	icon?: Renderable;
	/** ms; Infinity = sticky. */
	duration?: number;
	closeButton?: boolean;
	/** Called when the toast is dismissed (close button, action, toast.dismiss). */
	onDismiss?: (toast: ToastItem) => void;
	/** Called when the toast's countdown runs out. */
	onAutoClose?: (toast: ToastItem) => void;
	[key: string]: any;
}
export interface ToastFn {
	(message: Renderable, options?: ToastOptions): string | number;
	message(message: Renderable, options?: ToastOptions): string | number;
	success(message: Renderable, options?: ToastOptions): string | number;
	error(message: Renderable, options?: ToastOptions): string | number;
	info(message: Renderable, options?: ToastOptions): string | number;
	warning(message: Renderable, options?: ToastOptions): string | number;
	loading(message: Renderable, options?: ToastOptions): string | number;
	custom(render: (id: string | number) => Renderable, options?: ToastOptions): string | number;
	promise<T>(promise: Promise<T> | (() => Promise<T>), messages: {
		loading?: Renderable;
		success?: Renderable | ((result: T) => Renderable);
		error?: Renderable | ((error: unknown) => Renderable);
		description?: Renderable;
		finally?: () => void;
	}): string | number;
	dismiss(id?: string | number): void;
	getToasts(): ToastItem[];
}
export interface ToastItem extends ToastOptions {
	id: string | number;
	variant: ToastVariant | string;
	title?: Renderable;
	/** True when the toast has no title (qrp fills in the variant name; don't show it). */
	untitled?: boolean;
	/** True while the toast plays its exit (qrp's `exitMs`). */
	removed?: boolean;
}
/**
 * Sonner's semantics over a qrp toasts controller, which owns ids, countdowns,
 * pause/resume and the exit phase. Create the controller with `timeout: 0` and
 * the `exitMs` your exit animation takes: `toastLayer(createToasts({ timeout: 0, exitMs: 400 }))`.
 */
export interface ToastLayer {
	controller: import("@nemanjan00/qrp/toasts").ToastsController;
	items(): ToastItem[];
	add(data: Partial<ToastItem>): string | number;
	update(id: string | number, data: Partial<ToastItem>): string | number;
	dismiss(id?: string | number): void;
	pause(): void;
	resume(): void;
	/** Default `duration` (ms) and `limit`; the exit time is the controller's `exitMs`. */
	configure(next: { duration?: number; limit?: number }): void;
	config: { duration: number; limit: number };
}
export type ToasterPosition = "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
/** Mount once: `mount(document.body, () => Toaster())`. */
export const Toaster: QsComponent<{
	position?: ToasterPosition;
	expand?: boolean;
	richColors?: boolean;
	closeButton?: boolean;
	duration?: number;
	visibleToasts?: number;
	gap?: number;
	offset?: string;
	theme?: "light" | "dark" | "system";
	icons?: Partial<Record<"success" | "info" | "warning" | "error" | "loading", Renderable>>;
	toaster?: ToastLayer;
}>;
export const toast: ToastFn;
/** The layer behind `toast()` and qrp's `notify`. */
export const sonner: ToastLayer;
/** Wrap a qrp toasts controller in sonner's semantics (for `Toaster({ toaster })`). */
export function toastLayer(
	controller: import("@nemanjan00/qrp/toasts").ToastsController,
	options?: { duration?: number; limit?: number }
): ToastLayer;
/** sonner's `toast()` API bound to a layer. */
export function toastApi(layer: ToastLayer): ToastFn;
/** qrp's notify/bus — take them from this bundle so they reach the Toaster on a CDN page. */
export { notify } from "@nemanjan00/qrp/toasts";
export { bus } from "@nemanjan00/qrp/events";

/** Toast (legacy shadcn toast, as shipped by shadcdn) — https://ui.shadcn.com/docs/components/toast */
export type LegacyToastVariant = "default" | "destructive";
export interface LegacyToastProps {
	title?: Renderable;
	description?: Renderable;
	action?: Renderable;
	variant?: LegacyToastVariant;
	duration?: number;
}
export interface LegacyToastHandle {
	id: number;
	dismiss(): void;
	update(props: LegacyToastProps): void;
}
export const Toast: QsComponent<{ variant?: MaybeThunk<LegacyToastVariant> }, HTMLLIElement>;
export const ToastTitle: QsComponent;
export const ToastDescription: QsComponent;
export const ToastAction: QsComponent<{ altText: string }, HTMLButtonElement>;
export const ToastClose: QsComponent<{}, HTMLButtonElement>;
export const ToastViewport: QsComponent<{}, HTMLOListElement>;
export function ToastProvider(...args: unknown[]): DocumentFragment;
export function toastVariants(props?: { variant?: MaybeThunk<LegacyToastVariant>; class?: ClassValue }): string | (() => string);
export function legacyToast(props?: LegacyToastProps): LegacyToastHandle;
export const legacyToaster: ToastLayer;
/** Renders the legacy toasts; mount once. */
export const LegacyToaster: QsComponent<{ toaster?: ToastLayer }>;
export function useToast(): {
	readonly toasts: ToastItem[];
	toast: typeof legacyToast;
	dismiss(id?: string | number): void;
};

/** use-mobile — shadcn's `useIsMobile` on qrp's reactive `media()`. */
export const MOBILE_BREAKPOINT: number;
export function useIsMobile(): (() => boolean) & { media: { matches: boolean } };

// --- data --------------------------------------------------------------------

/** react-day-picker style matchers for Calendar `disabled` / `hidden`. */
export type DateMatcher =
	| boolean
	| Date
	| Date[]
	| ((day: Date) => boolean)
	| { before: Date }
	| { after: Date }
	| { before: Date; after: Date }
	| { from: Date | undefined; to?: Date | undefined }
	| { dayOfWeek: number | number[] };

export interface DateRange { from: Date | undefined; to?: Date | undefined }

interface CalendarBaseProps {
	month?: Controllable<Date>;
	defaultMonth?: Date;
	onMonthChange?: (month: Date) => void;
	numberOfMonths?: number;
	disabled?: DateMatcher | DateMatcher[];
	hidden?: DateMatcher | DateMatcher[];
	showOutsideDays?: boolean;
	fixedWeeks?: boolean;
	/** 0 = Sunday (default) … 6. */
	weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
	captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";
	startMonth?: Date;
	endMonth?: Date;
	/** BCP 47 locale for labels. */
	locale?: string;
	required?: boolean;
	buttonVariant?: ButtonVariant;
	today?: Date;
	autoFocus?: boolean;
}

/** Calendar — https://ui.shadcn.com/docs/components/calendar */
export type CalendarProps = CalendarBaseProps & (
	| { mode?: "single"; selected?: Controllable<Date | undefined>; onSelect?: (value: Date | undefined, day: Date) => void }
	| { mode: "multiple"; selected?: Controllable<Date[]>; onSelect?: (value: Date[], day: Date) => void }
	| { mode: "range"; selected?: Controllable<DateRange | undefined>; onSelect?: (value: DateRange | undefined, day: Date) => void }
);
export const Calendar: QsComponent<CalendarProps>;
export const CalendarDayButton: QsComponent<ButtonProps, HTMLButtonElement>;

/** Date Picker — https://ui.shadcn.com/docs/components/date-picker */
export type DatePickerProps = {
	placeholder?: string;
	locale?: string;
	/** Extra Calendar props (disabled, numberOfMonths, captionLayout, …). */
	calendar?: Partial<CalendarBaseProps>;
	/** Extra PopoverContent props. */
	content?: PlacementProps & BaseProps;
	class?: ClassValue;
} & (
	| { mode?: "single"; value?: Controllable<Date | undefined>; defaultValue?: Date; onValueChange?: (value: Date | undefined) => void }
	| { mode: "range"; value?: Controllable<DateRange | undefined>; defaultValue?: DateRange; onValueChange?: (value: DateRange | undefined) => void }
);
export function DatePicker(props?: DatePickerProps): DocumentFragment;
/** The trigger label for a picked value ("" when nothing is selected). */
export function formatPicked(mode: "single" | "range", value: Date | DateRange | undefined, locale?: string): string;

/** Chart — https://ui.shadcn.com/docs/components/chart (zero-dep SVG, recharts-style parts) */
export type ChartConfig = Record<string, {
	label?: Renderable;
	icon?: () => Renderable;
} & ({ color?: string; theme?: never } | { color?: never; theme: { light: string; dark: string } })>;

/** A chart part: a description read by the chart, not an element. */
export interface ChartPart<K extends string = string> {
	readonly kind: K;
	readonly props: Record<string, any>;
}
export type CurveType = "linear" | "natural" | "monotone" | "step";
interface SeriesProps {
	dataKey: string;
	name?: string;
	stackId?: string;
	fill?: string;
	stroke?: string;
	color?: string;
	fillOpacity?: number;
	strokeWidth?: number;
	strokeDasharray?: string;
	hide?: boolean;
}
export function Bar(props: SeriesProps & { radius?: number | [number, number, number, number]; maxBarSize?: number }): ChartPart<"bar">;
export function Line(props: SeriesProps & { type?: CurveType; dot?: boolean; activeDot?: boolean | Record<string, any>; downsample?: boolean | number }): ChartPart<"line">;
export function Area(props: SeriesProps & { type?: CurveType; dot?: boolean; activeDot?: boolean | Record<string, any> }): ChartPart<"area">;
interface AxisProps {
	dataKey?: string;
	hide?: boolean;
	tickLine?: boolean;
	axisLine?: boolean;
	tickMargin?: number;
	tickCount?: number;
	minTickGap?: number;
	tickFormatter?: (value: any, index: number) => string;
	domain?: [number | "auto" | "dataMin", number | "auto" | "dataMax"];
	width?: number;
	height?: number;
}
export function XAxis(props?: AxisProps): ChartPart<"xaxis">;
export function YAxis(props?: AxisProps): ChartPart<"yaxis">;
export function CartesianGrid(props?: { vertical?: boolean; horizontal?: boolean; strokeDasharray?: string }): ChartPart<"grid">;
export function ChartTooltip(props?: { content?: ChartPart; cursor?: boolean }): ChartPart<"tooltip">;
export function ChartLegend(props?: { content?: ChartPart; verticalAlign?: "top" | "bottom" }): ChartPart<"legend">;
export function ChartTooltipContent(props?: {
	indicator?: "dot" | "line" | "dashed";
	hideLabel?: boolean;
	hideIndicator?: boolean;
	nameKey?: string;
	labelKey?: string;
	labelFormatter?: (label: any, payload: any[]) => Renderable;
	formatter?: (value: any, name: string, item: any, index: number, payload: any) => Renderable;
	color?: string;
	class?: ClassValue;
}): ChartPart<"tooltip-content">;
export function ChartLegendContent(props?: { hideIcon?: boolean; nameKey?: string; class?: ClassValue }): ChartPart<"legend-content">;

export interface ChartProps {
	data: MaybeThunk<readonly Record<string, any>[]>;
	margin?: Partial<Record<"top" | "right" | "bottom" | "left", number>>;
	accessibilityLayer?: boolean;
	title?: string;
	class?: ClassValue;
}
export type ChartComponent = (props: ChartProps & BaseProps, ...parts: Array<ChartPart | Renderable>) => HTMLElement;
export const BarChart: ChartComponent;
export const LineChart: ChartComponent;
export const AreaChart: ChartComponent;
/** Sets `--color-<key>` from the config for its charts. */
export const ChartContainer: QsComponent<{ config: ChartConfig; id?: string }>;
export function ChartStyle(props: { id: string; config: ChartConfig }): Element | null;
/** qrp `spark` sized for KPI cards. */
export function ChartSparkline(props: {
	data: MaybeThunk<readonly Record<string, any>[]>;
	dataKey: string;
	kind?: "line" | "area" | "bar";
	color?: string;
	width?: number;
	height?: number;
	class?: ClassValue;
}): SVGElement;

/** Carousel — https://ui.shadcn.com/docs/components/carousel (native scroll-snap) */
export interface CarouselApi {
	scrollPrev(): void;
	scrollNext(): void;
	scrollTo(index: number): void;
	canScrollPrev(): boolean;
	canScrollNext(): boolean;
	selectedScrollSnap(): number;
	scrollSnapList(): number[];
	/** Reactive. */
	state: { index: number; count: number; canPrev: boolean; canNext: boolean };
}
export const Carousel: QsComponent<{
	orientation?: Orientation;
	opts?: { align?: "start" | "center" | "end"; loop?: boolean };
	setApi?: (api: CarouselApi) => void;
	plugins?: unknown[];
}>;
export const CarouselContent: QsComponent;
export const CarouselItem: QsComponent;
export const CarouselPrevious: QsComponent<ButtonProps, HTMLButtonElement>;
export const CarouselNext: QsComponent<ButtonProps, HTMLButtonElement>;

/** Resizable — https://ui.shadcn.com/docs/components/resizable (sizes in %) */
export const ResizablePanelGroup: QsComponent<{
	orientation?: Orientation;
	/** Alias of `orientation`. */
	direction?: Orientation;
	onLayout?: (sizes: number[]) => void;
}>;
export const ResizablePanel: QsComponent<{ defaultSize?: number; minSize?: number; maxSize?: number }>;
export const ResizableHandle: QsComponent<{ withHandle?: boolean; disabled?: boolean }>;

/** ScrollArea — https://ui.shadcn.com/docs/components/scroll-area */
export const ScrollArea: QsComponent<{ type?: "hover" | "scroll" | "auto" | "always"; scrollHideDelay?: number }>;
export const ScrollBar: QsComponent<{ orientation?: Orientation }>;

/** InputOTP — https://ui.shadcn.com/docs/components/input-otp */
export const InputOTP: QsComponent<{
	maxLength: number;
	value?: Controllable<string>;
	defaultValue?: string;
	onValueChange?: (value: string) => void;
	/** Alias of onValueChange (input-otp's name). */
	onChange?: (value: string) => void;
	onComplete?: (value: string) => void;
	pattern?: string | RegExp;
	disabled?: boolean;
	containerClassName?: ClassValue;
}>;
export const InputOTPGroup: QsComponent;
export const InputOTPSlot: QsComponent<{ index: number }>;
export const InputOTPSeparator: QsComponent;
export const REGEXP_ONLY_DIGITS: string;
export const REGEXP_ONLY_CHARS: string;
export const REGEXP_ONLY_DIGITS_AND_CHARS: string;

// --- layout: Sidebar & DataTable ----------------------------------------------

/** The sidebar controller (shadcn's useSidebar()); every getter is reactive. */
export interface SidebarController {
	open: boolean;
	openMobile: boolean;
	readonly isMobile: boolean;
	readonly state: "expanded" | "collapsed";
	setOpen(open: boolean): void;
	setOpenMobile(open: boolean): void;
	toggleSidebar(): void;
}

/** Sidebar — https://ui.shadcn.com/docs/components/sidebar */
export const SidebarProvider: QsComponent<{
	open?: Controllable<boolean>;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	/** localStorage key for the open state (default "sidebar_state"); false disables. */
	persist?: string | false;
}>;
export const Sidebar: QsComponent<{
	side?: "left" | "right";
	variant?: "sidebar" | "floating" | "inset";
	collapsible?: "offcanvas" | "icon" | "none";
}>;
export const SidebarTrigger: QsComponent<ButtonProps, HTMLButtonElement>;
export const SidebarRail: QsComponent<{}, HTMLButtonElement>;
export const SidebarInset: QsComponent;
export const SidebarInput: QsComponent<{}, HTMLInputElement>;
export const SidebarHeader: QsComponent;
export const SidebarFooter: QsComponent;
export const SidebarSeparator: QsComponent;
export const SidebarContent: QsComponent;
export const SidebarGroup: QsComponent;
export const SidebarGroupLabel: QsComponent;
export const SidebarGroupAction: QsComponent<{}, HTMLButtonElement>;
export const SidebarGroupContent: QsComponent;
export const SidebarMenu: QsComponent<{}, HTMLUListElement>;
export const SidebarMenuItem: QsComponent<{}, HTMLLIElement>;

export type SidebarMenuButtonVariant = "default" | "outline";
export type SidebarMenuButtonSize = "default" | "sm" | "lg";

export function sidebarMenuButtonVariants(props?: {
	variant?: MaybeThunk<SidebarMenuButtonVariant>;
	size?: MaybeThunk<SidebarMenuButtonSize>;
	class?: ClassValue;
}): string | (() => string);

export const SidebarMenuButton: QsComponent<{
	isActive?: MaybeThunk<boolean>;
	variant?: MaybeThunk<SidebarMenuButtonVariant>;
	size?: MaybeThunk<SidebarMenuButtonSize>;
	/** Shown when the sidebar is collapsed to icons: text, or `{ children, ...TooltipContent props }`. */
	tooltip?: Renderable | ({ children?: Renderable } & PlacementProps & BaseProps);
}>;
export const SidebarMenuAction: QsComponent<{ showOnHover?: boolean }>;
export const SidebarMenuBadge: QsComponent;
export const SidebarMenuSkeleton: QsComponent<{ showIcon?: boolean }>;
export const SidebarMenuSub: QsComponent<{}, HTMLUListElement>;
export const SidebarMenuSubItem: QsComponent<{}, HTMLLIElement>;
export const SidebarMenuSubButton: QsComponent<{ size?: "sm" | "md"; isActive?: MaybeThunk<boolean> }>;

/** The controller of the provider around `node`, else of the most recent provider. */
export function useSidebar(node?: Node): SidebarController;

/** A DataTable column: a qrp table() column plus visibility options. */
export interface DataTableColumn<T> extends Omit<TableColumn<T>, "label"> {
	/** Header text (alias: label). */
	title?: string;
	label?: string;
	/** Listed in the Columns menu (default true). */
	hideable?: boolean;
	/** Start hidden. */
	hidden?: boolean;
}

export interface DataTableOptions<T> {
	/** Rows, or a thunk returning them (reactive). */
	data: readonly T[] | (() => readonly T[]);
	columns: DataTableColumn<T>[];
	/** Row => stable id (default row.id). */
	key?: (item: T) => string | number;
	/** Prepend a row-selection checkbox column. */
	selectable?: boolean;
	pageSize?: number;
	pageSizes?: number[];
	sort?: { key: string | null; dir?: 1 | -1 };
	/** Keys the filter query searches (default every data column). */
	filterColumns?: string[];
	/** Replaces the query filter. */
	filterFn?: (item: T, filter: { query: string } & Record<string, any>) => boolean;
	onSelectionChange?: (selected: T[]) => void;
}

/** useDataTable() — the shared state + qrp datagrid every DataTable block takes as `table`. */
export interface DataTableController<T> {
	grid: DataGrid<T>;
	sort: { key: string | null; dir?: number };
	filter: { query: string } & Record<string, any>;
	page: { index: number; size: number };
	columns: DataTableColumn<T>[];
	pageSizes: number[];
	rows: () => readonly T[];
	key: (item: T) => string | number;
	/** The visible columns as qrp table() fields (reactive). */
	fields(): TableColumn<T>[];
}

/** DataTable — https://ui.shadcn.com/docs/components/data-table */
export function useDataTable<T>(options: DataTableOptions<T>): DataTableController<T>;

export function DataTable<T>(props: DataTableOptions<T> & BaseProps & {
	filterPlaceholder?: string;
	/** false hides the filter + Columns toolbar. */
	toolbar?: boolean;
	/** Content of the no-results row. */
	empty?: Renderable;
}): HTMLElement & { dataTable: DataTableController<T> };

export function DataTableView<T>(props: { table: DataTableController<T>; empty?: Renderable } & BaseProps): HTMLElement;
export function DataTableFilter<T>(props: { table: DataTableController<T>; placeholder?: string } & BaseProps): HTMLInputElement;
export function DataTableViewOptions<T>(props: { table: DataTableController<T>; label?: Renderable } & BaseProps): DocumentFragment;
export function DataTablePagination<T>(props: {
	table: DataTableController<T>;
	pageSizes?: number[];
	/** false hides the "x of y row(s) selected" text. */
	selection?: boolean;
} & BaseProps): HTMLElement;
export function DataTableColumnHeader<T>(props: {
	table: DataTableController<T>;
	column: DataTableColumn<T>;
	title?: string;
} & BaseProps): HTMLElement;

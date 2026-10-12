/**
 * @nemanjan00/qrp-shadcdn — shadcn/ui components for qrp.
 *
 * Every component is `(props?, ...children) => Element`, mirroring qrp's
 * `el()`: props accept everything `el()` does (attributes, `on*` listeners,
 * `bind`, reactive thunks) plus the component's own options.
 */

import type { Props, Renderable } from "@nemanjan00/qrp";

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

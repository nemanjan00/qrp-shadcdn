/**
 * utils/merge.js — a small Tailwind class-conflict resolver.
 *
 * shadcn lets the caller's `class` override a component default (`h-8` beats
 * the Input's `h-9`) through tailwind-merge. Without merging, both classes stay
 * and the winner is whichever the stylesheet happens to emit later. This covers
 * the utilities components and their callers actually fight over — sizing,
 * spacing, colors, typography, borders, radius, layout — in ~1 KB. For full
 * fidelity, `setClassMerge(twMerge)` swaps in tailwind-merge itself.
 *
 * Rules: a class removes earlier classes of the same group under the same
 * variants (`hover:`, `md:`, `data-[state=open]:` …), so `hover:bg-x` never
 * fights `bg-y`; and a shorthand removes earlier longhands it covers (`p-2`
 * after `px-4` drops it — `px-4` after `p-2` refines it, both stay). Classes it
 * doesn't recognize are always kept.
 */

const SIZES = "xs|sm|base|lg|xl|[2-9]xl";

// Ordered: the first matching rule names the group. Patterns are matched
// against the utility with variants, `!` and a leading `-` stripped.
const RULES = [
	["display", /^(block|inline-block|inline|flex|inline-flex|grid|inline-grid|contents|flow-root|list-item|hidden|table|table-row|table-cell)$/],
	["position", /^(static|fixed|absolute|relative|sticky)$/],
	["visibility", /^(visible|invisible|collapse)$/],
	["size", /^size-/],
	["w", /^w-/],
	["h", /^h-/],
	["min-w", /^min-w-/],
	["max-w", /^max-w-/],
	["min-h", /^min-h-/],
	["max-h", /^max-h-/],
	["basis", /^basis-/],
	["flex", /^flex-(1|auto|initial|none|\[.+\])$/],
	["flex-direction", /^flex-(row|row-reverse|col|col-reverse)$/],
	["flex-wrap", /^flex-(wrap|wrap-reverse|nowrap)$/],
	["grow", /^grow(-|$)/],
	["shrink", /^shrink(-|$)/],
	["justify", /^justify-(start|end|center|between|around|evenly|stretch|normal)$/],
	["items", /^items-/],
	["self", /^self-/],
	["content", /^content-(start|end|center|between|around|evenly|stretch|normal)$/],
	["place-items", /^place-items-/],
	["grid-cols", /^grid-cols-/],
	["grid-rows", /^grid-rows-/],
	["col", /^col-(span|start|end)-/],
	["row", /^row-(span|start|end)-/],
	["gap-x", /^gap-x-/],
	["gap-y", /^gap-y-/],
	["gap", /^gap-/],
	["p", /^p-/], ["px", /^px-/], ["py", /^py-/], ["ps", /^ps-/], ["pe", /^pe-/],
	["pt", /^pt-/], ["pr", /^pr-/], ["pb", /^pb-/], ["pl", /^pl-/],
	["m", /^m-/], ["mx", /^mx-/], ["my", /^my-/], ["ms", /^ms-/], ["me", /^me-/],
	["mt", /^mt-/], ["mr", /^mr-/], ["mb", /^mb-/], ["ml", /^ml-/],
	["inset-x", /^inset-x-/], ["inset-y", /^inset-y-/],
	// inset-shadow-* / inset-ring-* are Tailwind v4 shadow utilities, not insets.
	["inset", /^inset-(?!shadow|ring)/],
	["top", /^top-/], ["right", /^right-/], ["bottom", /^bottom-/], ["left", /^left-/],
	["z", /^z-/],
	["order", /^order-/],
	["overflow-x", /^overflow-x-/],
	["overflow-y", /^overflow-y-/],
	["overflow", /^overflow-/],
	["font-size", new RegExp(`^text-(${SIZES})(/.+)?$`)],
	["font-size", /^text-\[(length:|(\d|\.)[\d.]*(px|r?em|%|vw|vh|ch|ex|lh)\]|calc\(|clamp\()/],
	["text-align", /^text-(left|center|right|justify|start|end)$/],
	["text-wrap", /^text-(wrap|nowrap|balance|pretty)$/],
	["text-overflow", /^text-(ellipsis|clip)$/],
	["text-color", /^text-/],
	["font-weight", /^font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)$/],
	["font-weight", /^font-\[(number:|\d+\])/],
	["font-family", /^font-/],
	["leading", /^leading-/],
	["tracking", /^tracking-/],
	["whitespace", /^whitespace-/],
	["underline", /^(underline|no-underline|line-through|overline)$/],
	["bg-color", /^bg-(?!(clip|origin|repeat|no-repeat|size|cover|contain|auto|fixed|local|scroll|center|top|bottom|left|right|gradient|linear|radial|conic|none|blend)(-|$))/],
	["border-w-x", /^border-x(-\d+)?$/], ["border-w-y", /^border-y(-\d+)?$/],
	["border-w-t", /^border-t(-\d+)?$/], ["border-w-r", /^border-r(-\d+)?$/],
	["border-w-b", /^border-b(-\d+)?$/], ["border-w-l", /^border-l(-\d+)?$/],
	["border-w", /^border(-\d+)?$/],
	["border-w", /^border-\[(length:|(\d|\.)[\d.]*(px|r?em)\])/],
	["border-style", /^border-(solid|dashed|dotted|double|hidden|none)$/],
	["border-color", /^border-/],
	["rounded-tl", /^rounded-tl(-|$)/], ["rounded-tr", /^rounded-tr(-|$)/],
	["rounded-bl", /^rounded-bl(-|$)/], ["rounded-br", /^rounded-br(-|$)/],
	["rounded-ss", /^rounded-ss(-|$)/], ["rounded-se", /^rounded-se(-|$)/],
	["rounded-es", /^rounded-es(-|$)/], ["rounded-ee", /^rounded-ee(-|$)/],
	["rounded-t", /^rounded-t(-|$)/], ["rounded-r", /^rounded-r(-|$)/],
	["rounded-b", /^rounded-b(-|$)/], ["rounded-l", /^rounded-l(-|$)/],
	["rounded-s", /^rounded-s(-|$)/], ["rounded-e", /^rounded-e(-|$)/],
	["rounded", /^rounded(-|$)/],
	["shadow", /^shadow(-(2xs|xs|sm|md|lg|xl|2xl|none|inner))?$/],
	["shadow", /^shadow-\[(shadow:|\d|inset|var\(--shadow)/],
	["shadow-color", /^shadow-/],
	["opacity", /^opacity-/],
	["cursor", /^cursor-/],
	["pointer-events", /^pointer-events-/],
	["select", /^select-/],
	["outline", /^outline(-none|-hidden)?$/],
	["aspect", /^aspect-/],
	["object", /^object-(contain|cover|fill|none|scale-down)$/]
];

// A later shorthand removes these earlier longhands.
const COVERS = {
	size: ["w", "h"],
	p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
	px: ["ps", "pe", "pr", "pl"],
	py: ["pt", "pb"],
	m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
	mx: ["ms", "me", "mr", "ml"],
	my: ["mt", "mb"],
	gap: ["gap-x", "gap-y"],
	inset: ["inset-x", "inset-y", "top", "right", "bottom", "left"],
	"inset-x": ["right", "left"],
	"inset-y": ["top", "bottom"],
	overflow: ["overflow-x", "overflow-y"],
	"border-w": ["border-w-x", "border-w-y", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
	"border-w-x": ["border-w-r", "border-w-l"],
	"border-w-y": ["border-w-t", "border-w-b"],
	rounded: ["rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-s", "rounded-e",
		"rounded-tl", "rounded-tr", "rounded-bl", "rounded-br", "rounded-ss", "rounded-se", "rounded-es", "rounded-ee"],
	"rounded-t": ["rounded-tl", "rounded-tr"],
	"rounded-r": ["rounded-tr", "rounded-br"],
	"rounded-b": ["rounded-bl", "rounded-br"],
	"rounded-l": ["rounded-tl", "rounded-bl"],
	"rounded-s": ["rounded-ss", "rounded-es"],
	"rounded-e": ["rounded-se", "rounded-ee"]
};

/**
 * Split a class into its variant prefix and its utility. The utility starts
 * after the last top-level ":" (colons inside [...] belong to arbitrary values).
 */
const splitVariants = (cls) => {
	let depth = 0;
	let cut = -1;

	[...cls].forEach((char, index) => {
		if(char === "[") {
			depth += 1;
		} else if(char === "]") {
			depth -= 1;
		} else if(char === ":" && depth === 0) {
			cut = index;
		}
	});

	return { variants: cls.slice(0, cut + 1), utility: cls.slice(cut + 1) };
};

const groupOf = (utility) => {
	const bare = utility.replace(/^!|!$/g, "").replace(/^-/, "");
	const rule = RULES.find(([, pattern]) => pattern.test(bare));

	return rule ? rule[0] : null;
};

/**
 * The variant part of the conflict key: order-insensitive (`hover:md:` equals
 * `md:hover:`), except that arbitrary variants (`[&>svg]:`) keep their place —
 * the same rule tailwind-merge uses. `!` (important) is part of the key, so an
 * important class and a plain one don't override each other.
 */
const variantKey = (variants, utility) => {
	const parts = variants.split(/:(?![^[]*\])/).filter(Boolean);
	const runs = parts.reduce((acc, part) => {
		if(part.startsWith("[")) {
			acc.push([part], []);
		} else {
			acc[acc.length - 1].push(part);
		}

		return acc;
	}, [[]]);
	const important = /^!|!$/.test(utility) ? "!" : "";

	return runs.map((run) => (run[0] && run[0].startsWith("[") ? run : run.slice().sort())).flat().join(":") + important;
};

/**
 * Resolve conflicts in a space-separated class string: the last class of a
 * group wins (per variant prefix), shorthands remove the longhands they cover.
 *
 * @param {string} classes
 * @returns {string}
 */
export const mergeClasses = (classes) => {
	const tokens = classes.split(" ").filter(Boolean);
	const keys = tokens.map((cls) => {
		const { variants, utility } = splitVariants(cls);
		const group = groupOf(utility);

		return group ? { variants: variantKey(variants, utility), group } : null;
	});

	const kept = tokens.filter((cls, index) => {
		const key = keys[index];

		if(!key) {
			return true;
		}

		// Dropped when a LATER class under the same variants owns this group,
		// directly or through a shorthand that covers it.
		return !keys.slice(index + 1).some((later) => later && later.variants === key.variants &&
			(later.group === key.group || (COVERS[later.group] || []).includes(key.group)));
	});

	// Exact duplicates collapse to their last occurrence.
	return kept.filter((cls, index) => kept.lastIndexOf(cls) === index).join(" ");
};

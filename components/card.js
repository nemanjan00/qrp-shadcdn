/**
 * components/card.js — Card and its parts.
 * https://ui.shadcn.com/docs/components/card
 */

import { part } from "../utils/index.js";

export const Card = part("div", "card", "flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm");
export const CardHeader = part("div", "card-header", "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6");
export const CardTitle = part("div", "card-title", "leading-none font-semibold");
export const CardDescription = part("div", "card-description", "text-sm text-muted-foreground");
export const CardAction = part("div", "card-action", "col-start-2 row-span-2 row-start-1 self-start justify-self-end");
export const CardContent = part("div", "card-content", "px-6");
export const CardFooter = part("div", "card-footer", "flex items-center px-6 [.border-t]:pt-6");

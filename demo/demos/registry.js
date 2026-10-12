import { el, Label } from "@nemanjan00/qrp-shadcdn";

/** One demo: `{ name, build }`; build returns the rendered example. */
export const demos = [];

export const demo = (name, build) => demos.push({ name, build });

/** A labelled form row, as the shadcn examples lay them out. */
export const field = (id, label, input) => el("div", { class: "grid gap-2" }, Label({ for: id }, label), input);

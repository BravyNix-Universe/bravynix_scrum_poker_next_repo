import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Teach tailwind-merge the custom tokens from globals.css, so `text-2xs` is read as a font size
// and not mistaken for a text colour that would cancel `text-ink`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ["2xs"],
      shadow: ["card", "card-raised", "overlay", "panel"],
    },
  },
});

/** Joins class names and resolves conflicting Tailwind utilities (last one wins). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

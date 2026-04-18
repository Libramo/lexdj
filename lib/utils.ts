import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert ALL CAPS ministry names to Title Case
// Handles French prepositions (de, du, des, la, le, les, et, au, aux)
const LOWERCASE_WORDS = new Set([
  "de",
  "du",
  "des",
  "la",
  "le",
  "les",
  "et",
  "au",
  "aux",
  "en",
  "à",
  "l",
  "d",
  "un",
  "une",
  "sur",
  "par",
  "pour",
]);

export function toTitleCase(str: string): string {
  if (!str) return str;
  return str
    .toLowerCase()
    .split(" ")
    .map((word, i) => {
      const clean = word.replace(/['']/g, "'");
      if (i === 0) return clean.charAt(0).toUpperCase() + clean.slice(1);
      if (LOWERCASE_WORDS.has(clean)) return clean;
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    })
    .join(" ");
}

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** shadcn-style class merger: later Tailwind classes win over earlier ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** "flagged" -> "Flagged". Sentence case for labels that come from data. */
export function sentence(value: string): string {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

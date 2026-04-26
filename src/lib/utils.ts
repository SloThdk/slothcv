/**
 * Utility helpers shared across the app.
 *
 * `cn` is the standard shadcn helper: it merges class lists with `clsx` and
 * deduplicates conflicting Tailwind utilities with `tailwind-merge`. It exists
 * so component variants composed with `class-variance-authority` can be
 * combined safely with caller-provided className overrides.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Compose Tailwind class strings without leaving conflicting utilities behind.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

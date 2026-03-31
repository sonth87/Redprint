/**
 * cn() utility for builder-ui — thin tailwind-merge + clsx implementation.
 * Avoids importing the full clsx/twMerge packages in every file.
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

import type { BreakpointConfig } from "./types";

/**
 * Default breakpoint configuration (desktop / tablet / mobile).
 * Matches the spec from Technical Specification v2.1, Section 4.3.
 */
export const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { breakpoint: "desktop", label: "Desktop", minWidth: 1024, icon: "monitor" },
  { breakpoint: "tablet", label: "Tablet", minWidth: 768, maxWidth: 1023, icon: "tablet" },
  { breakpoint: "mobile", label: "Mobile", minWidth: 0, maxWidth: 767, icon: "smartphone" },
] as const;

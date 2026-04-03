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

/**
 * Canvas viewport dimensions per device breakpoint.
 * Used by the editor canvas to resize the artboard when switching device modes.
 */
export const DEVICE_VIEWPORT_PRESETS = {
  desktop: { width: 1280, height: 800 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 375, height: 812 },
} as const satisfies Record<string, { width: number; height: number }>;

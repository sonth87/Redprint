/**
 * Breakpoint and responsive configuration types.
 */

export type Breakpoint = "desktop" | "tablet" | "mobile";

export interface BreakpointConfig {
  breakpoint: Breakpoint;
  /** Human-readable label for toolbar display */
  label: string;
  /** Minimum viewport width in px */
  minWidth: number;
  /** Maximum viewport width in px. undefined = unbounded */
  maxWidth?: number;
  /** Icon key for toolbar */
  icon?: string;
}

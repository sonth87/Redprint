/**
 * Shared glassmorphism styles for floating editor panels.
 * All floating panels must use these constants for visual consistency.
 *
 * States:
 *   normal   — resting state
 *   dragging — while the panel is being repositioned by pointer drag
 */
export const GLASS_PANEL = {
  normal:   "bg-background/50 backdrop-blur-md border border-border/50 rounded-xl shadow-xl",
  dragging: "bg-background/10 backdrop-blur-lg border border-border/30 rounded-xl shadow-2xl",
} as const;

/**
 * Shared tooltip styles used inside floating editor panels.
 *
 * Variants:
 *   dark  — dark frosted glass (drag handle, layers, action hints)
 *   light — light frosted glass (component / group labels)
 */
export const GLASS_TOOLTIP = {
  dark:  "bg-black/30 backdrop-blur-lg border border-white/20 text-foreground",
  light: "bg-white/40 backdrop-blur-md border border-white/20 text-foreground",
} as const;

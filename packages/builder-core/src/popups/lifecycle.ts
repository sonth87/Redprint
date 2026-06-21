/**
 * Popup runtime lifecycle state machine — pure, framework-agnostic.
 *
 * This module owns the *logic* of how popups open, close, stack, and order.
 * It is shared by `builder-renderer` (production) and `builder-editor` (preview)
 * so both behave identically. It contains NO React/DOM dependency and never
 * mutates the BuilderDocument — it only computes the next runtime stack.
 *
 * Lifecycle: closed → opening → open → closing → closed
 *   - `opening`: enter animation is playing
 *   - `open`: fully visible / interactive
 *   - `closing`: exit animation is playing (still mounted)
 *   - `closed`: fully removed (entry dropped from the stack)
 */

import type { PopupKind, PopupStackMode } from "../document/popups";

export type PopupLifecycleState = "opening" | "open" | "closing" | "closed";

export interface PopupStackEntry {
  popupId: string;
  kind: PopupKind;
  state: PopupLifecycleState;
  zIndex: number;
  /** Monotonic timestamp/counter used to order entries (latest opened = topmost). */
  openedAt: number;
}

export const DEFAULT_POPUP_Z_INDEX_BASE = 10_000;
/** Gap between stacked popups so each gets its own z-index band. */
export const POPUP_Z_INDEX_STEP = 10;

/** z-index for the entry at a given depth (0 = bottom of stack). */
export function computeZIndex(base: number | undefined, depth: number): number {
  return (base ?? DEFAULT_POPUP_Z_INDEX_BASE) + depth * POPUP_Z_INDEX_STEP;
}

/** Recompute z-indexes by current stacking order so depth maps to z-index. */
function reindex(stack: PopupStackEntry[], zIndexBase?: number): PopupStackEntry[] {
  return stack.map((entry, depth) => ({ ...entry, zIndex: computeZIndex(zIndexBase, depth) }));
}

/** Is this entry still mounted (not fully closed)? */
export function isMounted(entry: PopupStackEntry): boolean {
  return entry.state !== "closed";
}

/** Entries that are still mounted, in stacking order (bottom → top). */
export function mountedEntries(stack: PopupStackEntry[]): PopupStackEntry[] {
  return stack.filter(isMounted);
}

/**
 * The topmost entry eligible for keyboard/focus interaction.
 * A `closing` entry is no longer interactive, so the topmost `opening`/`open`
 * entry wins. Returns null if none are interactive.
 */
export function topmostInteractive(stack: PopupStackEntry[]): PopupStackEntry | null {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    const entry = stack[i]!;
    if (entry.state === "opening" || entry.state === "open") return entry;
  }
  return null;
}

export function findEntry(stack: PopupStackEntry[], popupId: string): PopupStackEntry | undefined {
  return stack.find((e) => e.popupId === popupId);
}

export interface ApplyOpenInput {
  popupId: string;
  kind: PopupKind;
  stackMode?: PopupStackMode;
  zIndexBase?: number;
  /** Monotonic value for ordering (e.g. a counter or Date.now()). */
  now: number;
}

/**
 * Open a popup, applying the stack policy.
 *  - "single": close every other mounted popup, keep only this one.
 *  - "replace-same-kind": close other mounted popups of the same kind.
 *  - "multiple": push on top, keep others.
 *
 * Re-opening a popup that is currently `closing` cancels the close and returns
 * it to `opening` (moved to the top of the stack). Re-opening an already
 * open/opening popup is a no-op except it moves to the top.
 */
export function applyOpen(stack: PopupStackEntry[], input: ApplyOpenInput): PopupStackEntry[] {
  const { popupId, kind, stackMode = "single", zIndexBase, now } = input;

  // Drop any fully-closed leftovers and the existing entry for this popup.
  let next = stack.filter((e) => isMounted(e) && e.popupId !== popupId);

  if (stackMode === "single") {
    // Close everything else: they should animate out, so mark them closing.
    next = next.map((e) => (e.state === "closing" ? e : { ...e, state: "closing" as const }));
  } else if (stackMode === "replace-same-kind") {
    next = next.map((e) =>
      e.kind === kind && e.state !== "closing" ? { ...e, state: "closing" as const } : e,
    );
  }

  const entry: PopupStackEntry = {
    popupId,
    kind,
    state: "opening",
    zIndex: 0, // filled by reindex
    openedAt: now,
  };

  return reindex([...next, entry], zIndexBase);
}

/** Mark a popup as closing (plays exit animation). No-op if not mounted/closing. */
export function applyClose(
  stack: PopupStackEntry[],
  popupId: string,
  zIndexBase?: number,
): PopupStackEntry[] {
  const exists = stack.some((e) => e.popupId === popupId && e.state !== "closing");
  if (!exists) return stack;
  const next = stack.map((e) =>
    e.popupId === popupId ? { ...e, state: "closing" as const } : e,
  );
  return reindex(next, zIndexBase);
}

/** Promote an `opening` popup to `open` (enter animation finished). */
export function applyOpened(
  stack: PopupStackEntry[],
  popupId: string,
  zIndexBase?: number,
): PopupStackEntry[] {
  let changed = false;
  const next = stack.map((e) => {
    if (e.popupId === popupId && e.state === "opening") {
      changed = true;
      return { ...e, state: "open" as const };
    }
    return e;
  });
  return changed ? reindex(next, zIndexBase) : stack;
}

/** Remove a `closing` popup from the stack (exit animation finished). */
export function applyClosed(
  stack: PopupStackEntry[],
  popupId: string,
  zIndexBase?: number,
): PopupStackEntry[] {
  const exists = stack.some((e) => e.popupId === popupId);
  if (!exists) return stack;
  return reindex(
    stack.filter((e) => e.popupId !== popupId),
    zIndexBase,
  );
}

/** Force-remove a popup immediately (e.g. deleted/disabled while open). */
export function applyRemove(
  stack: PopupStackEntry[],
  popupId: string,
  zIndexBase?: number,
): PopupStackEntry[] {
  return applyClosed(stack, popupId, zIndexBase);
}

/** Whether the effective animation should be suppressed for reduced motion. */
export function shouldReduceMotion(
  behaviorReducedMotion: "respect" | "ignore" | undefined,
  prefersReducedMotion: boolean,
): boolean {
  return behaviorReducedMotion !== "ignore" && prefersReducedMotion;
}

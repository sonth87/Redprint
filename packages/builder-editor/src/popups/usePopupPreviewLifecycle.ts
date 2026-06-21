import { useCallback, useEffect, useRef, useState } from "react";
import type { PopupDefinition, PopupLifecycleState } from "@ui-builder/builder-core";
import { shouldReducePopupMotion } from "@ui-builder/builder-core";

/**
 * Editor preview lifecycle — shares the runtime state-machine semantics
 * (opening → open → closing → closed) so preview matches production.
 *
 * It deliberately reuses the same conceptual states and timing as the runtime
 * `PopupSurface`, sourced from builder-core helpers, instead of duplicating
 * lifecycle logic. It is editor-UI-only and never mutates the document.
 *
 * `active` is the editor's `previewMode` flag. When it flips on we play the
 * enter animation; `requestClose()` plays the exit animation, then invokes
 * `onClosed` (which the editor uses to turn `previewMode` off).
 */
export function usePopupPreviewLifecycle(
  active: boolean,
  popup: PopupDefinition | null,
  onClosed: () => void,
): {
  lifecycle: PopupLifecycleState;
  requestClose: () => void;
  replay: () => void;
  reset: () => void;
} {
  const [lifecycle, setLifecycle] = useState<PopupLifecycleState>("closed");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = useCallback((): number => {
    if (!popup) return 0;
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (shouldReducePopupMotion(popup.behavior.reducedMotion, prefersReduced)) return 0;
    if (popup.animation.enter === "none") return 0;
    return popup.animation.durationMs ?? 0;
  }, [popup]);

  const clear = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    setLifecycle("closed");
  }, [clear]);

  // Drive enter when preview turns on.
  useEffect(() => {
    if (!active) {
      reset();
      return;
    }
    clear();
    setLifecycle("opening");
    const d = duration();
    if (d <= 0) {
      setLifecycle("open");
    } else {
      timer.current = setTimeout(() => setLifecycle("open"), d);
    }
    return clear;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const requestClose = useCallback(() => {
    clear();
    setLifecycle("closing");
    const d = duration();
    const finish = () => {
      setLifecycle("closed");
      onClosed();
    };
    if (d <= 0) finish();
    else timer.current = setTimeout(finish, d);
  }, [clear, duration, onClosed]);

  // Replay the enter animation from the start (used by the debug strip "Open").
  const replay = useCallback(() => {
    clear();
    setLifecycle("opening");
    const d = duration();
    if (d <= 0) setLifecycle("open");
    else timer.current = setTimeout(() => setLifecycle("open"), d);
  }, [clear, duration]);

  useEffect(() => clear, [clear]);

  return { lifecycle, requestClose, replay, reset };
}

import { useCallback } from "react";
import { useBuilder } from "./useBuilder";

/**
 * Access undo/redo history controls.
 *
 * @example
 * const { canUndo, canRedo, undo, redo } = useHistory();
 */
export function useHistory(): {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
} {
  const { builder } = useBuilder();

  const undo = useCallback(() => builder.undo(), [builder]);
  const redo = useCallback(() => builder.redo(), [builder]);

  // canUndo/canRedo are derived from the history stack — we expose them
  // via the builder's public API
  const state = builder.getState();

  return {
    canUndo: builder.canUndo,
    canRedo: builder.canRedo,
    undo,
    redo,
  };
}

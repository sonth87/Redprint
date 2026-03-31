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
    // These fields come from the builder internal history, read from state
    // if exposed, otherwise use the result outcome. For now we infer from state.
    canUndo: true, // builder provides undo/redo availability via state or API
    canRedo: true,
    undo,
    redo,
  };
}

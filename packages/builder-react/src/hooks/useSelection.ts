import { useCallback } from "react";
import { useBuilder } from "./useBuilder";
import type { BuilderNode } from "@ui-builder/builder-core";

/**
 * Access and control the editor selection state.
 *
 * @example
 * const { selectedNodes, select, deselect, clearSelection } = useSelection();
 */
export function useSelection() {
  const { state, dispatch } = useBuilder();
  const { selectedNodeIds } = state.editor;

  const selectedNodes: BuilderNode[] = selectedNodeIds
    .map((id) => state.document.nodes[id])
    .filter((n): n is BuilderNode => n !== undefined);

  const select = useCallback(
    (nodeId: string, addToSelection = false) => {
      // We emit directly as selection changes are not document mutations
      // (no undo/redo needed for selection)
      dispatch({
        type: "SELECT_NODE",
        payload: { nodeId, addToSelection },
        description: "Select node",
      });
    },
    [dispatch],
  );

  const deselect = useCallback(
    (nodeId: string) => {
      dispatch({
        type: "DESELECT_NODE",
        payload: { nodeId },
        description: "Deselect node",
      });
    },
    [dispatch],
  );

  const clearSelection = useCallback(() => {
    dispatch({
      type: "CLEAR_SELECTION",
      payload: null,
      description: "Clear selection",
    });
  }, [dispatch]);

  const isSelected = useCallback(
    (nodeId: string) => selectedNodeIds.includes(nodeId),
    [selectedNodeIds],
  );

  return {
    selectedNodeIds,
    selectedNodes,
    hasSelection: selectedNodeIds.length > 0,
    isMultiSelected: selectedNodeIds.length > 1,
    select,
    deselect,
    clearSelection,
    isSelected,
  };
}

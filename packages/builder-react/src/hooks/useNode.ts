import { useCallback } from "react";
import { useBuilder } from "./useBuilder";
import type { BuilderNode } from "@ui-builder/builder-core";

/**
 * Returns a single node by ID along with helpers to update its props and style.
 *
 * Returns null if the node doesn't exist.
 *
 * @param nodeId - The ID of the node to retrieve
 *
 * @example
 * const { node, updateProps, updateStyle } = useNode('abc123');
 */
export function useNode(nodeId: string | null) {
  const { state, dispatch } = useBuilder();

  const node: BuilderNode | null =
    nodeId ? (state.document.nodes[nodeId] ?? null) : null;

  const updateProps = useCallback(
    (props: Record<string, unknown>) => {
      if (!nodeId) return;
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId, props },
        description: "Update props",
      });
    },
    [nodeId, dispatch],
  );

  const updateStyle = useCallback(
    (style: Partial<import("@ui-builder/builder-core").StyleConfig>) => {
      if (!nodeId) return;
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId, style, breakpoint: state.editor.activeBreakpoint },
        description: "Update style",
      });
    },
    [nodeId, dispatch, state.editor.activeBreakpoint],
  );

  return { node, updateProps, updateStyle };
}

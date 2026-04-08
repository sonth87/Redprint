import { useState, useCallback, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_SECTION_HEIGHT_PX } from "@ui-builder/shared";
import type { BuilderNode, ComponentRegistry } from "@ui-builder/builder-core";

type DispatchFn = (action: { type: string; payload: unknown; description?: string }) => void;

interface UseDeleteConfirmOptions {
  nodes: Record<string, BuilderNode>;
  rootNodeId: string;
  sectionNodes: BuilderNode[];
  registry: ComponentRegistry | null | undefined;
  dispatch: DispatchFn;
}

export interface UseDeleteConfirmReturn {
  deleteConfirmNodeId: string | null;
  setDeleteConfirmNodeId: (id: string | null) => void;
  deleteConfirmChildCount: number;
  handleDeleteNode: (nodeId: string) => void;
  handleDeleteNodes: (nodeIds: string[]) => void;
  executeConfirmedDelete: () => void;
}

const DEFAULT_SECTION_STYLE = {
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minHeight: "400px",
  position: "relative",
  backgroundColor: "#ffffff",
} as const;

function countDescendants(nodes: Record<string, BuilderNode>, id: string): number {
  const kids = Object.values(nodes).filter((n) => n.parentId === id);
  return kids.reduce((sum, k) => sum + 1 + countDescendants(nodes, k.id), 0);
}

function addReplacementSection(dispatch: DispatchFn, rootNodeId: string): void {
  dispatch({
    type: "ADD_NODE",
    payload: {
      nodeId: uuidv4(),
      parentId: rootNodeId,
      componentType: "Section",
      props: { minHeight: DEFAULT_SECTION_HEIGHT_PX },
      style: DEFAULT_SECTION_STYLE,
      insertIndex: 0,
    },
    description: "Add default section",
  });
}

/**
 * Delete-with-confirmation flow.
 * Shows a confirmation dialog when deleting a container that has children.
 * Automatically adds a replacement empty section if the last section is deleted.
 */
export function useDeleteConfirm({
  nodes,
  rootNodeId,
  sectionNodes,
  registry,
  dispatch,
}: UseDeleteConfirmOptions): UseDeleteConfirmReturn {
  const [deleteConfirmNodeId, setDeleteConfirmNodeId] = useState<string | null>(null);

  const deleteConfirmChildCount = useMemo(() => {
    if (!deleteConfirmNodeId) return 0;
    return countDescendants(nodes, deleteConfirmNodeId);
  }, [deleteConfirmNodeId, nodes]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      const node = nodes[nodeId];
      if (!node) return;
      const isLastSection = node.type === "Section" && sectionNodes.length === 1;
      const def = registry?.getComponent(node.type);
      const hasChildren = Object.values(nodes).some((n) => n.parentId === nodeId);

      if (def?.capabilities.canContainChildren && hasChildren) {
        setDeleteConfirmNodeId(nodeId);
        return;
      }

      dispatch({ type: "REMOVE_NODE", payload: { nodeId }, description: "Delete" });
      if (isLastSection) addReplacementSection(dispatch, rootNodeId);
    },
    [nodes, rootNodeId, sectionNodes, registry, dispatch],
  );

  const executeConfirmedDelete = useCallback(() => {
    if (!deleteConfirmNodeId) return;
    const node = nodes[deleteConfirmNodeId];
    const isLastSection = node?.type === "Section" && sectionNodes.length === 1;

    dispatch({ type: "REMOVE_NODE", payload: { nodeId: deleteConfirmNodeId }, description: "Delete" });
    if (isLastSection) addReplacementSection(dispatch, rootNodeId);

    setDeleteConfirmNodeId(null);
  }, [deleteConfirmNodeId, nodes, rootNodeId, sectionNodes, dispatch]);

  const handleDeleteNodes = useCallback(
    (nodeIds: string[]) => {
      const isDeletingLastSection = nodes[nodeIds[0]!]?.type === "Section" && sectionNodes.length === 1 && nodeIds.length === 1;
      
      dispatch({ 
        type: "REMOVE_NODES", 
        payload: { nodeIds }, 
        description: `Delete ${nodeIds.length} nodes` 
      });

      if (isDeletingLastSection) addReplacementSection(dispatch, rootNodeId);
    },
    [nodes, sectionNodes.length, rootNodeId, dispatch]
  );

  return {
    deleteConfirmNodeId,
    setDeleteConfirmNodeId,
    deleteConfirmChildCount,
    handleDeleteNode,
    handleDeleteNodes,
    executeConfirmedDelete,
  };
}

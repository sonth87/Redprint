import { useCallback } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import { v4 as uuidv4 } from "uuid";

interface UseZIndexHandlersOptions {
  selectedNodeId: string | null;
  nodes: Record<string, BuilderNode>;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseZIndexHandlersReturn {
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function useZIndexHandlers({
  selectedNodeId,
  nodes,
  dispatch,
}: UseZIndexHandlersOptions): UseZIndexHandlersReturn {
  const onMoveUp = useCallback(() => {
    if (!selectedNodeId) return;
    const n = nodes[selectedNodeId];
    if (!n) return;
    const siblings = (Object.values(nodes) as BuilderNode[])
      .filter((s) => s.parentId === n.parentId)
      .sort(
        (a, b) =>
          Number(a.style.zIndex ?? a.order) - Number(b.style.zIndex ?? b.order)
      );
    const pos = siblings.findIndex((s) => s.id === selectedNodeId);
    if (pos >= siblings.length - 1) return;
    const groupId = uuidv4();
    siblings.forEach((s, i) => {
      const newZ = i === pos ? pos + 1 : i === pos + 1 ? pos : i;
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: s.id, style: { zIndex: newZ } },
        groupId,
        description: "Bring forward",
      });
    });
  }, [selectedNodeId, nodes, dispatch]);

  const onMoveDown = useCallback(() => {
    if (!selectedNodeId) return;
    const n = nodes[selectedNodeId];
    if (!n) return;
    const siblings = (Object.values(nodes) as BuilderNode[])
      .filter((s) => s.parentId === n.parentId)
      .sort(
        (a, b) =>
          Number(a.style.zIndex ?? a.order) - Number(b.style.zIndex ?? b.order)
      );
    const pos = siblings.findIndex((s) => s.id === selectedNodeId);
    if (pos <= 0) return;
    const groupId = uuidv4();
    siblings.forEach((s, i) => {
      const newZ = i === pos ? pos - 1 : i === pos - 1 ? pos : i;
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: s.id, style: { zIndex: newZ } },
        groupId,
        description: "Send backward",
      });
    });
  }, [selectedNodeId, nodes, dispatch]);

  return { onMoveUp, onMoveDown };
}

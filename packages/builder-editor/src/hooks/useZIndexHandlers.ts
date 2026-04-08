import { useCallback } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";

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
    
    const siblings = Object.values(nodes).filter((s) => s.parentId === n.parentId);
    const pos = n.style.position;
    const isFreeForm = pos === "absolute" || pos === "fixed";

    if (isFreeForm) {
      // Strategy 1: DOM Reorder for Absolute/Fixed elements (like LadiPage/Figma)
      dispatch({
        type: "REORDER_NODE",
        payload: { nodeId: selectedNodeId, insertIndex: siblings.length },
        description: "Bring to front",
      });
    } else {
      // Strategy 2: Z-Index for Flex/Grid/Flow elements (like Webflow)
      let maxSiblingZ = -Infinity;
      for (const s of siblings) {
        if (s.id !== selectedNodeId) {
          const z = Number(s.style.zIndex ?? 0);
          if (!isNaN(z) && z > maxSiblingZ) {
            maxSiblingZ = z;
          }
        }
      }
      if (maxSiblingZ === -Infinity) maxSiblingZ = 0;
      
      let currentZ = Number(n.style.zIndex ?? 0);
      if (isNaN(currentZ)) currentZ = 0;

      if (currentZ > maxSiblingZ && currentZ !== 0) {
        return; 
      }
      
      const newZ = maxSiblingZ + 1;
      const needsPos = pos !== "sticky" && pos !== "relative"; // Note: free-form are already handled above
      
      dispatch({
        type: "UPDATE_STYLE",
        payload: { 
          nodeId: selectedNodeId, 
          style: { zIndex: newZ, ...(needsPos ? { position: "relative" } : {}) }
        },
        description: "Bring to front",
      });
    }
  }, [selectedNodeId, nodes, dispatch]);

  const onMoveDown = useCallback(() => {
    if (!selectedNodeId) return;
    const n = nodes[selectedNodeId];
    if (!n) return;
    
    const siblings = Object.values(nodes).filter((s) => s.parentId === n.parentId);
    const pos = n.style.position;
    const isFreeForm = pos === "absolute" || pos === "fixed";

    if (isFreeForm) {
      // Strategy 1: DOM Reorder for Absolute/Fixed elements
      dispatch({
        type: "REORDER_NODE",
        payload: { nodeId: selectedNodeId, insertIndex: 0 },
        description: "Send to back",
      });
    } else {
      // Strategy 2: Z-Index for Flex/Grid/Flow elements
      let minSiblingZ = Infinity;
      for (const s of siblings) {
        if (s.id !== selectedNodeId) {
          const z = Number(s.style.zIndex ?? 0);
          if (!isNaN(z) && z < minSiblingZ) {
            minSiblingZ = z;
          }
        }
      }
      if (minSiblingZ === Infinity) minSiblingZ = 0;
      
      let currentZ = Number(n.style.zIndex ?? 0);
      if (isNaN(currentZ)) currentZ = 0;

      if (currentZ < minSiblingZ && currentZ !== 0) {
        return;
      }
      
      const newZ = minSiblingZ - 1;
      const needsPos = pos !== "sticky" && pos !== "relative"; 
      
      dispatch({
        type: "UPDATE_STYLE",
        payload: { 
          nodeId: selectedNodeId, 
          style: { zIndex: newZ, ...(needsPos ? { position: "relative" } : {}) }
        },
        description: "Send to back",
      });
    }
  }, [selectedNodeId, nodes, dispatch]);

  return { onMoveUp, onMoveDown };
}


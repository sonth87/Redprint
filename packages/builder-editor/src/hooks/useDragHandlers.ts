import { useCallback } from "react";
import type { Point } from "@ui-builder/shared";
import { v4 as uuidv4 } from "uuid";

interface UseDragHandlersOptions {
  rootNodeId: string;
  zoom: number;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
}

export interface UseDragHandlersReturn {
  handleDragStart: (componentType: string, e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
}

export function useDragHandlers({
  rootNodeId,
  zoom,
  canvasFrameRef,
  dispatch,
}: UseDragHandlersOptions): UseDragHandlersReturn {
  const handleDragStart = useCallback(
    (componentType: string, e: React.DragEvent) => {
      e.dataTransfer?.setData("application/builder-component-type", componentType);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      let componentType = "";
      try {
        const data = JSON.parse(e.dataTransfer?.getData("text/plain") || "{}");
        componentType = data.type;
      } catch {
        componentType =
          e.dataTransfer?.getData("application/builder-component-type") || "";
      }
      if (!componentType) return;

      const targetEl = (e.target as HTMLElement).closest("[data-node-id]");
      const parentId = targetEl?.getAttribute("data-node-id") ?? rootNodeId;

      let position: Point | undefined;
      if (canvasFrameRef.current) {
        const frameRect = canvasFrameRef.current.getBoundingClientRect();
        position = {
          x: Math.round((e.clientX - frameRect.left) / zoom),
          y: Math.round((e.clientY - frameRect.top) / zoom),
        };
      }

      const nodeId = uuidv4();
      dispatch({
        type: "ADD_NODE",
        payload: { nodeId, parentId, componentType, position },
        description: `Add ${componentType}`,
      });
    },
    [rootNodeId, dispatch, zoom, canvasFrameRef]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { handleDragStart, handleDrop, handleDragOver, handleDragEnter };
}

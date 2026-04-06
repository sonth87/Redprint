import { useCallback } from "react";
import type React from "react";
import { v4 as uuidv4 } from "uuid";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";

interface MovingState {
  nodeId: string;
  startPoint: Point;
  startLeft: number;
  startTop: number;
  startWidth?: number;
  startHeight?: number;
  wasAbsolute: boolean;
  gestureGroupId: string;
}

interface UseDragHandleGestureOptions {
  selectedNodeId: string | null;
  nodes: Record<string, BuilderNode>;
  zoom: number;
  activeFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dragStartedRef: React.MutableRefObject<boolean>;
  setMoving: (state: MovingState | null) => void;
}

export interface UseDragHandleGestureReturn {
  /**
   * PointerDown handler for the drag grip in ContextualToolbar.
   * Computes initial position and hands off to the move gesture.
   */
  handleDragHandlePointerDown: (e: React.PointerEvent) => void;
}

/**
 * Initiates a move-gesture from the ContextualToolbar drag handle,
 * computing starting coordinates from the DOM or node style.
 */
export function useDragHandleGesture({
  selectedNodeId,
  nodes,
  zoom,
  activeFrameRef,
  canvasFrameRef,
  dragStartedRef,
  setMoving,
}: UseDragHandleGestureOptions): UseDragHandleGestureReturn {
  const handleDragHandlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!selectedNodeId) return;
      e.stopPropagation();
      const n = nodes[selectedNodeId];
      if (!n || n.locked) return;
      // Sections stack vertically — not freely draggable
      if (n.type === "Section") return;

      const style = n.style || {};
      let startLeft: number;
      let startTop: number;

      if (style.position === "absolute") {
        startLeft = parseFloat(String(style.left ?? "0")) || 0;
        startTop  = parseFloat(String(style.top  ?? "0")) || 0;
      } else if (activeFrameRef.current) {
        const frameEl = activeFrameRef.current;
        const el = frameEl.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement | null;
        if (el) {
          const frameRect = frameEl.getBoundingClientRect();
          const elRect    = el.getBoundingClientRect();
          startLeft = (elRect.left - frameRect.left) / zoom;
          startTop  = (elRect.top  - frameRect.top)  / zoom;
        } else {
          startLeft = 0;
          startTop  = 0;
        }
      } else {
        startLeft = 0;
        startTop  = 0;
      }

      const frameEl = activeFrameRef.current ?? canvasFrameRef.current;
      const el = frameEl?.querySelector(`[data-node-id="${selectedNodeId}"]`) as HTMLElement | null;

      dragStartedRef.current = false;
      setMoving({
        nodeId: selectedNodeId,
        startPoint: { x: e.clientX, y: e.clientY },
        startLeft,
        startTop,
        startWidth:  el?.offsetWidth,
        startHeight: el?.offsetHeight,
        wasAbsolute: style.position === "absolute",
        gestureGroupId: uuidv4(),
      });
    },
    [selectedNodeId, nodes, zoom, activeFrameRef, canvasFrameRef, dragStartedRef, setMoving],
  );

  return { handleDragHandlePointerDown };
}

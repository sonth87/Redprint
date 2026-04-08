import React, { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";

interface NodeMovingSnapshot {
  nodeId: string;
  startLeft: number;
  startTop: number;
  startWidth?: number;
  startHeight?: number;
  wasAbsolute: boolean;
}

interface MovingState {
  nodeId: string; // Primary anchor node
  nodes: NodeMovingSnapshot[];
  startPoint: Point;
  gestureGroupId: string;
}

interface UseDragHandleGestureOptions {
  selectedNodeId: string | null;
  selectedNodeIds: string[];
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
  selectedNodeIds,
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

      const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      const frameRect = frameEl?.getBoundingClientRect();

      const movingNodeIds = selectedNodeIds.includes(selectedNodeId) ? selectedNodeIds : [selectedNodeId];

      const movingNodes: NodeMovingSnapshot[] = movingNodeIds.map(mId => {
        const mNode = nodes[mId];
        const mStyle = mNode?.style || {};
        const mEl = frameEl?.querySelector(`[data-node-id="${mId}"]`) as HTMLElement | null;
        
        let startLeft: number;
        let startTop: number;
        if (mStyle.position === "absolute") {
          startLeft = parseFloat(String(mStyle.left ?? "0")) || 0;
          startTop = parseFloat(String(mStyle.top ?? "0")) || 0;
        } else if (mEl && frameRect) {
          const elRect = mEl.getBoundingClientRect();
          startLeft = (elRect.left - frameRect.left) / zoom;
          startTop = (elRect.top - frameRect.top) / zoom;
        } else {
          startLeft = 0;
          startTop = 0;
        }

        return {
          nodeId: mId,
          startLeft,
          startTop,
          startWidth: mEl?.offsetWidth,
          startHeight: mEl?.offsetHeight,
          wasAbsolute: mStyle.position === "absolute",
        };
      });

      dragStartedRef.current = false;
      setMoving({
        nodeId: selectedNodeId,
        nodes: movingNodes,
        startPoint: { x: e.clientX, y: e.clientY },
        gestureGroupId: uuidv4(),
      });
    },
    [selectedNodeId, selectedNodeIds, nodes, zoom, activeFrameRef, canvasFrameRef, dragStartedRef, setMoving],
  );

  return { handleDragHandlePointerDown };
}

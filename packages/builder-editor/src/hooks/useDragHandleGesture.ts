import { useCallback, type PointerEvent as ReactPointerEvent } from "react";
import { v4 as uuidv4 } from "uuid";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";
import { buildMovingSnapshots, type NodeMovingSnapshot } from "./dragUtils";

interface MovingState {
  nodeId: string; // Primary anchor node
  nodes: NodeMovingSnapshot[];
  startPoint: Point;
  gestureGroupId: string;
  fromToolbar?: boolean;
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
  handleDragHandlePointerDown: (e: ReactPointerEvent) => void;
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
    (e: ReactPointerEvent) => {
      if (!selectedNodeId) return;
      e.stopPropagation();
      const n = nodes[selectedNodeId];
      if (!n || n.locked) return;
      // Sections stack vertically — not freely draggable
      if (n.type === "Section") return;

      const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      const frameRect = frameEl?.getBoundingClientRect();

      const movingNodeIds = selectedNodeIds.includes(selectedNodeId) ? selectedNodeIds : [selectedNodeId];
      const movingNodes: NodeMovingSnapshot[] = frameEl
        ? buildMovingSnapshots(movingNodeIds, nodes, frameEl, frameRect ?? null, zoom)
        : movingNodeIds.map((nodeId) => ({
            nodeId,
            startLeft: 0,
            startTop: 0,
            wasAbsolute: nodes[nodeId]?.style.position === "absolute",
          }));

      dragStartedRef.current = false;
      setMoving({
        nodeId: selectedNodeId,
        nodes: movingNodes,
        startPoint: { x: e.clientX, y: e.clientY },
        gestureGroupId: uuidv4(),
        fromToolbar: true,
      });
    },
    [selectedNodeId, selectedNodeIds, nodes, zoom, activeFrameRef, canvasFrameRef, dragStartedRef, setMoving],
  );

  return { handleDragHandlePointerDown };
}

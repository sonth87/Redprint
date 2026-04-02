import { useState, useEffect } from "react";
import type { ResizeHandleType, SnapGuide } from "../types";
import { snapToGrid, type Point, type Rect } from "@ui-builder/shared";

interface ResizingState {
  handle: ResizeHandleType;
  nodeId: string;
  startPoint: Point;
  startRect: Rect;
  gestureGroupId: string;
}

interface UseResizeGestureOptions {
  zoom: number;
  breakpoint: string;
  showGrid: boolean;
  gridSize: number;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseResizeGestureReturn {
  resizing: ResizingState | null;
  setResizing: (state: ResizingState | null) => void;
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
}

export function useResizeGesture({
  zoom,
  breakpoint,
  showGrid,
  gridSize,
  dispatch,
}: UseResizeGestureOptions): UseResizeGestureReturn {
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);

  useEffect(() => {
    if (!resizing) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizing.startPoint.x) / zoom;
      const dy = (e.clientY - resizing.startPoint.y) / zoom;
      let { width, height } = resizing.startRect;
      if (resizing.handle.includes("e")) width += dx;
      if (resizing.handle.includes("w")) width -= dx;
      if (resizing.handle.includes("s")) height += dy;
      if (resizing.handle.includes("n")) height -= dy;
      width = Math.max(10, Math.round(width));
      height = Math.max(10, Math.round(height));

      if (showGrid) {
        width = snapToGrid(width, gridSize);
        height = snapToGrid(height, gridSize);
      }

      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: resizing.nodeId,
          style: { width: `${width}px`, height: `${height}px` },
          breakpoint,
        },
        groupId: resizing.gestureGroupId,
        description: "Resize",
      });
    };
    const handleGlobalMouseUp = () => {
      setResizing(null);
      setSnapGuides([]);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizing, zoom, breakpoint, dispatch, showGrid, gridSize]);

  return { resizing, setResizing, snapGuides, setSnapGuides };
}

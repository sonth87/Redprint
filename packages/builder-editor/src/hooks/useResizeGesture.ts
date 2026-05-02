import { useState, useEffect } from "react";
import type { ResizeHandleType, SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import { snapToGrid, type Point, type Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapEngine } from "../snap/SnapEngine";

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
  snapEngine: SnapEngine;
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  activeFrameRef?: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseResizeGestureReturn {
  resizing: ResizingState | null;
  setResizing: (state: ResizingState | null) => void;
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
  distanceGuides: DistanceGuide[];
  liveDimensions: LiveDimensions | null;
}

export function useResizeGesture({
  zoom,
  breakpoint,
  showGrid,
  gridSize,
  snapEngine,
  nodes,
  canvasFrameRef,
  activeFrameRef,
  dispatch,
}: UseResizeGestureOptions): UseResizeGestureReturn {
  const [resizing, setResizing] = useState<ResizingState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [distanceGuides, setDistanceGuides] = useState<DistanceGuide[]>([]);
  const [liveDimensions, setLiveDimensions] = useState<LiveDimensions | null>(null);

  useEffect(() => {
    if (!resizing) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - resizing.startPoint.x) / zoom;
      const dy = (e.clientY - resizing.startPoint.y) / zoom;
      let { width, height } = resizing.startRect;
      const { x, y } = resizing.startRect;
      let newX = x;
      let newY = y;

      // East/West edges
      if (resizing.handle.includes("e")) width += dx;
      if (resizing.handle.includes("w")) {
        width -= dx;
        newX += dx; // Move left position when dragging left edge
      }

      // North/South edges
      if (resizing.handle.includes("s")) height += dy;
      if (resizing.handle.includes("n")) {
        height -= dy;
        newY += dy; // Move top position when dragging top edge
      }

      // Maintain aspect ratio if Ctrl/Cmd is pressed and dragging a corner
      if ((e.ctrlKey || e.metaKey) && resizing.handle.length === 2 && resizing.startRect.height > 0) {
        const ratio = resizing.startRect.width / resizing.startRect.height;
        const wChange = Math.abs(width - resizing.startRect.width);
        const hChange = Math.abs(height - resizing.startRect.height);
        
        if (wChange > hChange) {
          height = width / ratio;
        } else {
          width = height * ratio;
        }
        
        // Re-adjust newX/newY based on the corrected width/height
        if (resizing.handle.includes("w")) {
          newX = x - (width - resizing.startRect.width);
        }
        if (resizing.handle.includes("n")) {
          newY = y - (height - resizing.startRect.height);
        }
      }

      width = Math.max(10, Math.round(width));
      height = Math.max(10, Math.round(height));
      newX = Math.round(newX);
      newY = Math.round(newY);

      if (showGrid) {
        width = snapToGrid(width, gridSize);
        height = snapToGrid(height, gridSize);
        newX = snapToGrid(newX, gridSize);
        newY = snapToGrid(newY, gridSize);
      }

      // Update live dimensions for display
      setLiveDimensions({ width, height });

      // Compute distance guides to sibling elements
      const node = nodes[resizing.nodeId];
      const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      if (node?.parentId && frameEl) {
        // Use the desktop frame (canvasFrameRef) as origin so that guide positions are
        // in CanvasRoot coordinate space — matching newX/newY which come from selectionRect
        // (also computed relative to canvasFrameRef). In dual mode this prevents guides
        // from being offset by the mobile frame's canvas position.
        const fr = frameEl.getBoundingClientRect();
        const originRect = canvasFrameRef.current?.getBoundingClientRect() ?? fr;
        const siblings: Rect[] = [];
        for (const n of Object.values(nodes) as BuilderNode[]) {
          if (n.parentId === node.parentId && n.id !== resizing.nodeId) {
            const el = frameEl.querySelector(`[data-node-id="${n.id}"]`) as HTMLElement;
            if (el) {
              const er = el.getBoundingClientRect();
              siblings.push({
                x: (er.left - originRect.left) / zoom,
                y: (er.top - originRect.top) / zoom,
                width: er.width / zoom,
                height: er.height / zoom,
              });
            }
          }
        }
        const currentRect: Rect = { x: newX, y: newY, width, height };
        setDistanceGuides(snapEngine.distanceGuides(currentRect, siblings));

        // Cross-container alignment guides — newX/newY are canvas-relative (from selectionRect)
        const allOtherRects: Rect[] = [];
        const allNodeEls = Array.from(
          frameEl.querySelectorAll("[data-node-id]")
        ) as HTMLElement[];
        for (const el of allNodeEls) {
          if (el.getAttribute("data-node-id") === resizing.nodeId) continue;
          const er = el.getBoundingClientRect();
          allOtherRects.push({
            x: (er.left - originRect.left) / zoom,
            y: (er.top - originRect.top) / zoom,
            width: er.width / zoom,
            height: er.height / zoom,
          });
        }
        setSnapGuides(snapEngine.alignmentGuides(currentRect, allOtherRects));
      } else {
        setDistanceGuides([]);
        setSnapGuides([]);
      }

      const style: Record<string, string> = {
        width: `${width}px`,
        height: `${height}px`,
      };
      if (resizing.handle.includes("w") || resizing.handle.includes("n")) {
        if (resizing.handle.includes("w")) style.left = `${newX}px`;
        if (resizing.handle.includes("n")) style.top = `${newY}px`;
      }

      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: resizing.nodeId,
          style,
          breakpoint,
        },
        groupId: resizing.gestureGroupId,
        description: "Resize",
      });
    };
    const handleGlobalMouseUp = () => {
      setResizing(null);
      setSnapGuides([]);
      setDistanceGuides([]);
      setLiveDimensions(null);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [resizing, zoom, breakpoint, dispatch, showGrid, gridSize, snapEngine, nodes, canvasFrameRef, activeFrameRef]);

  return { resizing, setResizing, snapGuides, setSnapGuides, distanceGuides, liveDimensions };
}

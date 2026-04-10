import { useState, useEffect, useMemo } from "react";
import type { Rect } from "@ui-builder/shared";
import { resolveStyle, type BuilderNode, type Breakpoint } from "@ui-builder/builder-core";
import { ROTATABLE_SELECTION_FRAME } from "../constants";

interface UseSelectionRectOptions {
  selectedNodeIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  breakpoint: string;
  /** In dual-canvas mode, pass the active frame ref so selection queries the right DOM tree.
   *  Coordinate origin always uses canvasFrameRef (Desktop frame = canvas origin). */
  nodeQueryRef?: React.RefObject<HTMLDivElement | null>;
}

export interface UseSelectionRectReturn {
  selectionRect: Rect | null;
  currentRotation: number;
}

export function useSelectionRect({
  selectedNodeIds,
  zoom,
  panOffset,
  nodes,
  canvasFrameRef,
  breakpoint,
  nodeQueryRef,
}: UseSelectionRectOptions): UseSelectionRectReturn {
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  const selectedNode = selectedNodeIds[0] ? (nodes[selectedNodeIds[0]] ?? null) : null;

  const currentRotation = useMemo(() => {
    if (!selectedNode) return 0;
    
    // Resolve style using core logic for the current breakpoint
    const resolvedStyle = resolveStyle(
      selectedNode.style,
      selectedNode.responsiveStyle,
      breakpoint as Breakpoint,
    );
    
    const transform = resolvedStyle.transform;
    if (!transform) return 0;
    
    // Improved regex to handle spaces and optional units
    const match = transform.match(/rotate\(\s*([-\d.]+)(deg|rad|turn)?\s*\)/);
    if (!match) return 0;

    const value = parseFloat(match[1]!);
    const unit = match[2] || "deg";

    if (unit === "rad") return value * (180 / Math.PI);
    if (unit === "turn") return value * 360;
    return value;
  }, [selectedNode, breakpoint]);


  useEffect(() => {
    if (selectedNodeIds.length === 0 || !canvasFrameRef.current) {
      setSelectionRect(null);
      return;
    }

    const queryRoot = nodeQueryRef?.current ?? canvasFrameRef.current;
    const frameRect = canvasFrameRef.current.getBoundingClientRect();

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let found = false;

    // Use unrotated "tight" rect if single selection and ROTATABLE_SELECTION_FRAME is enabled
    const useUnrotatedRect = ROTATABLE_SELECTION_FRAME && selectedNodeIds.length === 1;

    selectedNodeIds.forEach((id) => {
      const el = queryRoot.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
      if (!el) return;

      const elRect = el.getBoundingClientRect();
      
      if (useUnrotatedRect) {
        // Calculate the center of the elements rotated bounding box
        const centerX = (elRect.left + elRect.width / 2 - frameRect.left) / zoom;
        const centerY = (elRect.top + elRect.height / 2 - frameRect.top) / zoom;
        
        // Offset from center by half-width/height to get the "unrotated" top-left
        // Note: this assumes transform-origin is center (default for our builder components)
        const left = centerX - el.offsetWidth / 2;
        const top = centerY - el.offsetHeight / 2;
        
        minX = left;
        minY = top;
        maxX = left + el.offsetWidth;
        maxY = top + el.offsetHeight;
      } else {
        // Standard AABB (Axis-Aligned Bounding Box)
        const left = (elRect.left - frameRect.left) / zoom;
        const top = (elRect.top - frameRect.top) / zoom;
        const right = (elRect.right - frameRect.left) / zoom;
        const bottom = (elRect.bottom - frameRect.top) / zoom;

        minX = Math.min(minX, left);
        minY = Math.min(minY, top);
        maxX = Math.max(maxX, right);
        maxY = Math.max(maxY, bottom);
      }
      found = true;
    });

    if (!found) {
      setSelectionRect(null);
      return;
    }

    setSelectionRect({
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    });
  }, [selectedNodeIds, zoom, panOffset, nodes, canvasFrameRef, nodeQueryRef, breakpoint]);


  return { selectionRect, currentRotation };
}


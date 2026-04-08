import { useState, useEffect, useMemo } from "react";
import type { Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";

interface UseSelectionRectOptions {
  selectedNodeIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
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
  nodeQueryRef,
}: UseSelectionRectOptions): UseSelectionRectReturn {
  const [selectionRect, setSelectionRect] = useState<Rect | null>(null);

  const selectedNode = selectedNodeIds[0] ? (nodes[selectedNodeIds[0]] ?? null) : null;

  const currentRotation = useMemo(() => {
    if (!selectedNode?.style.transform) return 0;
    const match = selectedNode.style.transform.match(/rotate\(([-\d.]+)deg\)/);
    return match ? parseFloat(match[1]!) : 0;
  }, [selectedNode?.style.transform]);

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

    selectedNodeIds.forEach((id) => {
      const el = queryRoot.querySelector(`[data-node-id="${id}"]`) as HTMLElement;
      if (!el) return;

      const elRect = el.getBoundingClientRect();
      const left = (elRect.left - frameRect.left) / zoom;
      const top = (elRect.top - frameRect.top) / zoom;
      const right = left + el.offsetWidth;
      const bottom = top + el.offsetHeight;

      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, right);
      maxY = Math.max(maxY, bottom);
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
  }, [selectedNodeIds, zoom, panOffset, nodes, canvasFrameRef, nodeQueryRef]);

  return { selectionRect, currentRotation };
}

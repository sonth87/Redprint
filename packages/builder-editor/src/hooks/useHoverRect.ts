import { useState, useCallback, useEffect } from "react";
import type { Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";

interface UseHoverRectOptions {
  selectedNodeIds: string[];
  rootNodeId: string;
  zoom: number;
  panOffset: { x: number; y: number };
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** In dual-canvas mode, pass the active frame ref so hover queries the right DOM tree.
   *  Coordinate origin always uses canvasFrameRef (Desktop frame = canvas origin). */
  nodeQueryRef?: React.RefObject<HTMLDivElement | null>;
}

export interface UseHoverRectReturn {
  hoveredNodeId: string | null;
  hoverRect: Rect | null;
  handleMouseOver: (e: React.MouseEvent) => void;
  handleMouseOut: (e: React.MouseEvent) => void;
}

export function useHoverRect({
  selectedNodeIds,
  rootNodeId,
  zoom,
  panOffset,
  nodes,
  canvasFrameRef,
  nodeQueryRef,
}: UseHoverRectOptions): UseHoverRectReturn {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoverRect, setHoverRect] = useState<Rect | null>(null);

  const handleMouseOver = useCallback(
    (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const nodeEl = target.closest("[data-node-id]");
      if (nodeEl) {
        const id = nodeEl.getAttribute("data-node-id");
        if (id && id !== selectedNodeIds[0] && id !== rootNodeId) {
          setHoveredNodeId(id);
          return;
        }
      }
      setHoveredNodeId(null);
    },
    [selectedNodeIds, rootNodeId]
  );

  const handleMouseOut = useCallback((e: React.MouseEvent) => {
    const target = e.relatedTarget as HTMLElement;
    if (!target?.closest("[data-node-id]")) setHoveredNodeId(null);
  }, []);

  useEffect(() => {
    if (!hoveredNodeId || !canvasFrameRef.current) {
      setHoverRect(null);
      return;
    }
    const queryRoot = nodeQueryRef?.current ?? canvasFrameRef.current;
    const el = queryRoot.querySelector(
      `[data-node-id="${hoveredNodeId}"]`
    ) as HTMLElement;
    if (!el) {
      setHoverRect(null);
      return;
    }
    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setHoverRect({
      x: (elRect.left - frameRect.left) / zoom,
      y: (elRect.top - frameRect.top) / zoom,
      width: elRect.width / zoom,
      height: elRect.height / zoom,
    });
  }, [hoveredNodeId, zoom, panOffset, nodes, canvasFrameRef, nodeQueryRef]);

  return { hoveredNodeId, hoverRect, handleMouseOver, handleMouseOut };
}

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
    const id = selectedNodeIds[0]!;
    const queryRoot = nodeQueryRef?.current ?? canvasFrameRef.current;
    const el = queryRoot.querySelector(
      `[data-node-id="${id}"]`
    ) as HTMLElement;
    if (!el) {
      setSelectionRect(null);
      return;
    }

    const frameRect = canvasFrameRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const cxViewport = (elRect.left + elRect.right) / 2;
    const cyViewport = (elRect.top + elRect.bottom) / 2;
    const cxCanvas = (cxViewport - frameRect.left) / zoom;
    const cyCanvas = (cyViewport - frameRect.top) / zoom;

    setSelectionRect({
      x: cxCanvas - el.offsetWidth / 2,
      y: cyCanvas - el.offsetHeight / 2,
      width: el.offsetWidth,
      height: el.offsetHeight,
    });
  }, [selectedNodeIds, zoom, panOffset, nodes, canvasFrameRef, nodeQueryRef]);

  return { selectionRect, currentRotation };
}

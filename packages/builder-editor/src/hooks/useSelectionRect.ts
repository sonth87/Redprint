import { useState, useEffect, useMemo } from "react";
import type { Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";

interface UseSelectionRectOptions {
  selectedNodeIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
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
    const el = canvasFrameRef.current.querySelector(
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
  }, [selectedNodeIds, zoom, panOffset, nodes, canvasFrameRef]);

  return { selectionRect, currentRotation };
}

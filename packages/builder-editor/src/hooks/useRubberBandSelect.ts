import { useCallback } from "react";

interface UseRubberBandSelectParams {
  document: {
    nodes: Record<string, { type: string; locked?: boolean }>;
    rootNodeId: string;
  };
  zoom: number;
  selectedNodeIds: string[];
  select: (ids: string[]) => void;
  clearSelection: () => void;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * Provides `handleRubberBandSelect` — called when the user finishes drawing a rubber-band
 * selection rectangle. Finds all DOM nodes inside the rect and updates the selection.
 */
export function useRubberBandSelect({
  document,
  zoom,
  selectedNodeIds,
  select,
  clearSelection,
  canvasFrameRef,
}: UseRubberBandSelectParams) {
  const handleRubberBandSelect = useCallback(
    (
      rbRect: { x: number; y: number; width: number; height: number },
      originalEvent?: MouseEvent,
    ) => {
      const canvasFrameEl = canvasFrameRef.current;
      if (!canvasFrameEl) return;

      const desktopRect = canvasFrameEl.getBoundingClientRect();
      const hitIds: string[] = [];
      const buffer = 1; // 1px buffer to account for subpixel rounding

      const elements = Array.from(window.document.querySelectorAll("[data-node-id]"));

      for (const el of elements) {
        const id = el.getAttribute("data-node-id");
        if (!id || id === document.rootNodeId) continue;

        const node = document.nodes[id];
        if (!node || node.type === "Section" || node.locked) continue;

        const rect = el.getBoundingClientRect();

        const nodeX = (rect.left - desktopRect.left) / zoom;
        const nodeY = (rect.top - desktopRect.top) / zoom;
        const nodeW = rect.width / zoom;
        const nodeH = rect.height / zoom;

        const intersects =
          nodeX - buffer < rbRect.x + rbRect.width &&
          nodeX + nodeW + buffer > rbRect.x &&
          nodeY - buffer < rbRect.y + rbRect.height &&
          nodeY + nodeH + buffer > rbRect.y;

        if (intersects) {
          hitIds.push(id);
        }
      }

      if (hitIds.length > 0) {
        if (originalEvent?.shiftKey) {
          const next = Array.from(new Set([...selectedNodeIds, ...hitIds]));
          select(next);
        } else {
          select(hitIds);
        }
      } else if (!originalEvent?.shiftKey) {
        clearSelection();
      }
    },
    [document.nodes, document.rootNodeId, zoom, selectedNodeIds, select, clearSelection, canvasFrameRef],
  );

  return { handleRubberBandSelect };
}

import React from "react";
import { FlowDropPlaceholder } from "../overlay/EditorOverlay";
import { getGridCellClientRect } from "../hooks/useDropSlotResolver";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface FlowDropPlaceholderLayerProps {
  flowDropTarget: { containerId: string; insertIndex: number; gridCell?: { col: number; row: number } } | null;
  /** Dragged node id — used to exclude it from sibling calculations. Null during palette drag. */
  moving: { nodeId: string } | null;
  activeFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  nodes: Record<string, BuilderNode>;
  zoom: number;
}

export function FlowDropPlaceholderLayer({
  flowDropTarget, moving, activeFrameRef, canvasFrameRef, nodes, zoom,
}: FlowDropPlaceholderLayerProps) {
  if (!flowDropTarget) return null;
  const frameEl = activeFrameRef.current ?? canvasFrameRef.current;
  if (!frameEl) return null;

  const containerEl = frameEl.querySelector(`[data-node-id="${flowDropTarget.containerId}"]`) as HTMLElement | null;
  if (!containerEl) return null;

  const fr    = frameEl.getBoundingClientRect();
  const cRect = containerEl.getBoundingClientRect();
  const toRect = (r: DOMRect): { x: number; y: number; width: number; height: number } => ({
    x: (r.left - fr.left) / zoom,
    y: (r.top  - fr.top)  / zoom,
    width:  r.width  / zoom,
    height: r.height / zoom,
  });

  const containerRect = toRect(cRect);
  const movingNodeId = moving?.nodeId ?? null;
  const siblings = Object.values(nodes)
    .filter((n) => n.parentId === flowDropTarget.containerId && n.id !== movingNodeId)
    .sort((a, b) => a.order - b.order);

  const getSibRect = (sibId: string) => {
    const el = frameEl.querySelector(`[data-node-id="${sibId}"]`) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    // Skip elements that are hidden (visibility:hidden during drag)
    if (r.width === 0 && r.height === 0) return null;
    return toRect(r);
  };

  const idx             = flowDropTarget.insertIndex;
  const prevSiblingRect = idx > 0 ? getSibRect(siblings[idx - 1]?.id ?? "") : null;
  const nextSiblingRect = getSibRect(siblings[idx]?.id ?? "");

  let gridCellRect: { x: number; y: number; width: number; height: number } | undefined;
  if (flowDropTarget.gridCell) {
    const cellClient = getGridCellClientRect(containerEl, flowDropTarget.gridCell.col, flowDropTarget.gridCell.row);
    if (cellClient) {
      // Use the cell's full bounds directly — do not shrink by slotRect/movingRect
      // since the moving node is hidden and slotRect would be zero-sized.
      gridCellRect = toRect(cellClient as unknown as DOMRect);
    }
  }

  return (
    <FlowDropPlaceholder
      containerRect={containerRect} prevSiblingRect={prevSiblingRect}
      nextSiblingRect={nextSiblingRect} gridCellRect={gridCellRect} zoom={zoom}
    />
  );
}

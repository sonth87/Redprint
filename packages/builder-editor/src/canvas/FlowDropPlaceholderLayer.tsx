import React from "react";
import { FlowDropPlaceholder } from "../overlay/EditorOverlay";
import { getGridCellClientRect } from "../hooks/useDropSlotResolver";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface FlowDropPlaceholderLayerProps {
  flowDropTarget: { containerId: string; insertIndex: number; gridCell?: { col: number; row: number } } | null;
  moving: { nodeId: string } | null;
  activeFrameRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  nodes: Record<string, BuilderNode>;
  zoom: number;
}

export function FlowDropPlaceholderLayer({
  flowDropTarget, moving, activeFrameRef, canvasFrameRef, nodes, zoom,
}: FlowDropPlaceholderLayerProps) {
  if (!flowDropTarget || !moving) return null;
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
  const orderedChildren = Object.values(nodes)
    .filter((n) => n.parentId === flowDropTarget.containerId)
    .sort((a, b) => a.order - b.order);
  const siblings = orderedChildren
    .filter((n) => n.parentId === flowDropTarget.containerId && n.id !== moving.nodeId)
    .sort((a, b) => a.order - b.order);

  const getSibRect = (sibId: string) => {
    const el = frameEl.querySelector(`[data-node-id="${sibId}"]`) as HTMLElement | null;
    return el ? toRect(el.getBoundingClientRect()) : null;
  };

  const idx             = flowDropTarget.insertIndex;
  const prevSiblingRect = idx > 0 ? getSibRect(siblings[idx - 1]?.id ?? "") : null;
  const nextSiblingRect = getSibRect(siblings[idx]?.id ?? "");
  const movingEl = frameEl.querySelector(`[data-node-id="${moving.nodeId}"]`) as HTMLElement | null;
  const movingRect = movingEl ? toRect(movingEl.getBoundingClientRect()) : null;
  const slotRect = idx >= 0 && idx < orderedChildren.length
    ? getSibRect(orderedChildren[idx]?.id ?? "")
    : null;

  let gridCellRect: { x: number; y: number; width: number; height: number } | undefined;
  if (flowDropTarget.gridCell) {
    const cellClient = getGridCellClientRect(containerEl, flowDropTarget.gridCell.col, flowDropTarget.gridCell.row);
    if (cellClient) {
      const cellRect = toRect(cellClient as unknown as DOMRect);
      const width = Math.min(slotRect?.width ?? cellRect.width, movingRect?.width ?? cellRect.width);
      const height = Math.min(slotRect?.height ?? cellRect.height, movingRect?.height ?? cellRect.height);
      gridCellRect = {
        x: slotRect?.x ?? cellRect.x,
        y: slotRect?.y ?? (cellRect.y + Math.max(0, (cellRect.height - height) / 2)),
        width,
        height,
      };
    }
  }

  return (
    <FlowDropPlaceholder
      containerRect={containerRect} prevSiblingRect={prevSiblingRect}
      nextSiblingRect={nextSiblingRect} gridCellRect={gridCellRect} zoom={zoom}
    />
  );
}

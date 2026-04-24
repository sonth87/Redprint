import React, { useEffect, useState } from "react";
import { useBuilder } from "@ui-builder/builder-react";
import type { InsertTarget } from "./NodeTreePanel";
import { Plus } from "lucide-react";
import type { PaletteDragData } from "@ui-builder/builder-core";
import { v4 as uuidv4 } from "uuid";

export interface SlotOverlaysProps {
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onRequestInsert: (target: InsertTarget) => void;
}

export function SlotOverlays({ canvasFrameRef, zoom, onRequestInsert }: SlotOverlaysProps) {
  const { state, dispatch } = useBuilder();
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [slotRects, setSlotRects] = useState<
    Array<{ nodeId: string; slotName: string; rect: { top: number; left: number; width: number; height: number } }>
  >([]);

  useEffect(() => {
    const updateRects = () => {
      const frameEl = canvasFrameRef.current;
      if (!frameEl) return;
      const frameRect = frameEl.getBoundingClientRect();

      const newRects: typeof slotRects = [];
      const nodes = state.document.nodes;

      Object.values(nodes).forEach((node) => {
        if (!node.slot) return;
        const parentId = node.parentId;
        // Check if it's empty (no children)
        const isContainer = node.type === "Container" || node.type === "Section" || node.type === "Box"; // simple heuristic for container
        const children = Object.values(nodes).filter((candidate) => candidate.parentId === node.id);
        const isEmpty = children.length === 0;

        if (isEmpty) {
          const el = frameEl.querySelector(`[data-node-id="${node.id}"]`) as HTMLElement;
          if (el) {
            const elRect = el.getBoundingClientRect();
            // Relative to canvasFrameRef, without zoom.
            // Wait, elRect.top - frameRect.top returns scaled coordinates!
            // To get unscaled, we divide by zoom scale.
            let top = (elRect.top - frameRect.top) / zoom;
            let left = (elRect.left - frameRect.left) / zoom;
            let width = elRect.width / zoom;
            let height = elRect.height / zoom;

            // If it collapsed fully, give it a tiny footprint
            if (width < 20) width = 100;
            if (height < 20) height = 100;

            newRects.push({
              nodeId: node.id,
              slotName: node.slot,
              rect: { top, left, width, height },
            });
          }
        }
      });
      setSlotRects(newRects);
    };

    updateRects();
    const ro = new ResizeObserver(updateRects);
    if (canvasFrameRef.current) {
      ro.observe(canvasFrameRef.current);
    }
    window.addEventListener("resize", updateRects);
    // Interval fallback to catch slow CSS transitions
    const interval = setInterval(updateRects, 500);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateRects);
      clearInterval(interval);
    };
  }, [state.document.nodes, canvasFrameRef, zoom]);

  if (slotRects.length === 0) return null;

  return (
    <>
      {slotRects.map(({ nodeId, slotName, rect }) => (
        <div
          key={nodeId}
          style={{
            position: "absolute",
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            border: hoveredSlot === nodeId ? "2px dashed var(--primary)" : "1px dashed var(--primary)",
            backgroundColor: hoveredSlot === nodeId ? "rgba(59, 130, 246, 0.2)" : "rgba(59, 130, 246, 0.05)",
            pointerEvents: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10,
            transition: "all 0.15s ease-in-out",
          }}
          onClick={(e) => {
            e.stopPropagation();
            onRequestInsert({ nodeId, mode: "inside", label: slotName });
          }}
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHoveredSlot(nodeId);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "copy";
            setHoveredSlot(nodeId);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (hoveredSlot === nodeId) setHoveredSlot(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setHoveredSlot(null);
            
            let componentType = "";
            let presetData: PaletteDragData["presetData"] | undefined;
            try {
              const raw = e.dataTransfer?.getData("text/plain") || "{}";
              const data = JSON.parse(raw);
              if (data.source === "palette-item") {
                const pdd = data as PaletteDragData;
                componentType = pdd.componentType;
                presetData = pdd.presetData;
              } else {
                componentType = String(data.type ?? "");
              }
            } catch {
              componentType = e.dataTransfer?.getData("application/builder-component-type") || "";
            }
            if (!componentType) return;
            
            const newNodeId = uuidv4();
            dispatch({
              type: "ADD_NODE",
              payload: {
                nodeId: newNodeId,
                parentId: nodeId,
                componentType,
                props: presetData?.props,
                style: presetData?.style,
              }
            });
            // We can expand this logic to support full PaletteDragData later.
          }}
        >
          <button className="flex flex-col items-center justify-center gap-1 text-primary bg-background/80 px-3 py-2 rounded shadow-sm hover:shadow-md transition-all">
            <Plus className="w-4 h-4" />
            <span className="text-xs font-medium">Add to {slotName}</span>
          </button>
        </div>
      ))}
    </>
  );
}

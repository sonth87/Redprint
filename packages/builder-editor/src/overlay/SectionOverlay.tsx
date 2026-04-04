import React, { useState, useEffect, useLayoutEffect, useRef, memo, useCallback, useMemo } from "react";
import { Plus, UnfoldVertical } from "lucide-react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";
import { SECTION_HOVER_ZONE } from "../constants";

interface SectionBoundary {
  nodeId: string;
  order: number;
  /** Top of the section in canvas-space */
  top: number;
  /** Bottom of the section in canvas-space */
  bottom: number;
  /** Current rendered height in canvas-space */
  height: number;
}

export interface SectionOverlayProps {
  /** All nodes in the document */
  nodes: Record<string, BuilderNode>;
  /** Root node id */
  rootNodeId: string;
  zoom: number;
  panOffset: Point;
  /** Ref to the canvas frame element */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** Called when user wants to add a new section after the given order */
  onAddSection: (afterOrder: number) => void;
  /** Called when user starts resizing a section */
  onResizeStart: (nodeId: string, clientY: number, currentHeight: number, gestureGroupId: string) => void;
  /** Whether a section resize is in progress (suppresses UI jitter) */
  isResizing: boolean;
}

/**
 * SectionOverlay — renders "Thêm mới Section" + resize handle at the bottom
 * boundary of each Section node that is a direct child of root.
 *
 * Positioned absolutely inside the canvas transform space (same as SelectionOverlay).
 */
export const SectionOverlay = memo(function SectionOverlay({
  nodes,
  rootNodeId,
  zoom,
  canvasFrameRef,
  onAddSection,
  onResizeStart,
  isResizing,
}: SectionOverlayProps) {
  const [boundaries, setBoundaries] = useState<SectionBoundary[]>([]);
  const [hovered, setHovered] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);

  // Derive section nodes: direct children of root with type "Section", sorted by order
  const sectionNodes = useMemo(
    () =>
      Object.values(nodes)
        .filter((n) => n.parentId === rootNodeId && n.type === "Section")
        .sort((a, b) => a.order - b.order),
    [nodes, rootNodeId],
  );

  // Measure DOM rects and convert to canvas-space coordinates
  const measureBoundaries = useCallback(() => {
    const frame = canvasFrameRef.current;
    if (!frame) return;
    const frameRect = frame.getBoundingClientRect();

    const next: SectionBoundary[] = [];
    for (const sec of sectionNodes) {
      const el = frame.querySelector(`[data-node-id="${sec.id}"]`) as HTMLElement | null;
      if (!el) continue;
      const r = el.getBoundingClientRect();
      // Convert DOM viewport coords → canvas-space (account for zoom + panOffset)
      const top = (r.top - frameRect.top) / zoom;
      const height = r.height / zoom;
      next.push({
        nodeId: sec.id,
        order: sec.order,
        top,
        bottom: top + height,
        height,
      });
    }
    setBoundaries(next);
  }, [canvasFrameRef, sectionNodes, zoom]);

  // Re-measure after DOM commits (synchronous, avoids flicker)
  useLayoutEffect(() => {
    measureBoundaries();
  }, [measureBoundaries]);

  useEffect(() => {
    if (!isResizing) return;
    const loop = () => {
      measureBoundaries();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [isResizing, measureBoundaries]);

  if (boundaries.length === 0) return null;

  return (
    <>
      {boundaries.map((b) => {
        const isHov = hovered === b.nodeId;

        return (
          <div key={b.nodeId}>
            {/* Hover detection zone at bottom of section */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: b.bottom - SECTION_HOVER_ZONE / zoom / 2,
                width: "100%",
                height: SECTION_HOVER_ZONE / zoom,
                zIndex: 60,
                pointerEvents: "auto",
                cursor: "default",
              }}
              onMouseEnter={() => setHovered(b.nodeId)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* ── Dashed separator line ─── */}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  width: "100%",
                  height: 0,
                  borderTop: `${1 / zoom}px dashed ${isHov ? "#6366f1" : "#c4c4c4"}`,
                  transition: "border-color 0.15s ease",
                  pointerEvents: "none",
                }}
              />

              {/* ── "Thêm mới Section" button + resize handle ─── */}
              <div
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4 / zoom,
                  opacity: isHov || isResizing ? 1 : 0,
                  transition: "opacity 0.15s ease",
                  pointerEvents: isHov || isResizing ? "auto" : "none",
                }}
              >
                {/* Add section button */}
                <button
                  title="Thêm mới Section"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4 / zoom,
                    padding: `${3 / zoom}px ${8 / zoom}px`,
                    background: "#ffffff",
                    border: `${1 / zoom}px solid #e2e2e2`,
                    borderRadius: 4 / zoom,
                    fontSize: 11 / zoom,
                    color: "#374151",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    boxShadow: `0 ${1 / zoom}px ${4 / zoom}px rgba(0,0,0,0.08)`,
                    lineHeight: 1,
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddSection(b.order);
                  }}
                >
                  Thêm mới Section
                  <Plus size={10 / zoom} />
                </button>

                {/* Resize handle */}
                <button
                  title="Kéo để thay đổi chiều cao"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 20 / zoom,
                    height: 20 / zoom,
                    background: "#ffffff",
                    border: `${1 / zoom}px solid #e2e2e2`,
                    borderRadius: 4 / zoom,
                    cursor: "ns-resize",
                    boxShadow: `0 ${1 / zoom}px ${4 / zoom}px rgba(0,0,0,0.08)`,
                    padding: 0,
                    flexShrink: 0,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const id = b.nodeId + "-resize-" + Date.now();
                    // Pass canvas-space height (NOT multiplied by zoom)
                    onResizeStart(b.nodeId, e.clientY, b.height, id);
                  }}
                >
                  <UnfoldVertical size={10 / zoom} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
});

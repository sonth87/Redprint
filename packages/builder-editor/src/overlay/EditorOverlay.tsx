import React, { memo } from "react";
import type { Rect, Point } from "@ui-builder/shared";
import type { SelectionState, SnapGuide, ResizeHandleType } from "../types";
import { cn } from "@ui-builder/ui";

// ── Selection bounding box ─────────────────────────────────────────────────

interface ResizeHandleProps {
  handle: ResizeHandleType;
  bounds: Rect;
  zoom: number;
  onMouseDown: (handle: ResizeHandleType, e: React.MouseEvent) => void;
}

const HANDLE_POSITIONS: Record<ResizeHandleType, { top: string; left: string; transform: string }> = {
  n:  { top: "0%",   left: "50%",  transform: "translate(-50%, -50%)" },
  s:  { top: "100%", left: "50%",  transform: "translate(-50%, -50%)" },
  e:  { top: "50%",  left: "100%", transform: "translate(-50%, -50%)" },
  w:  { top: "50%",  left: "0%",   transform: "translate(-50%, -50%)" },
  ne: { top: "0%",   left: "100%", transform: "translate(-50%, -50%)" },
  nw: { top: "0%",   left: "0%",   transform: "translate(-50%, -50%)" },
  se: { top: "100%", left: "100%", transform: "translate(-50%, -50%)" },
  sw: { top: "100%", left: "0%",   transform: "translate(-50%, -50%)" },
};

const HANDLE_CURSORS: Record<ResizeHandleType, string> = {
  n: "n-resize", s: "s-resize", e: "e-resize", w: "w-resize",
  ne: "ne-resize", nw: "nw-resize", se: "se-resize", sw: "sw-resize",
};

const ResizeHandle = memo(({ handle, bounds, zoom, onMouseDown }: ResizeHandleProps) => {
  const pos = HANDLE_POSITIONS[handle];
  const size = Math.max(6, 8 / zoom);
  return (
    <div
      data-resize-handle
      className="absolute z-50 rounded-sm bg-white border-2 border-blue-500 pointer-events-auto"
      style={{
        top: pos.top,
        left: pos.left,
        transform: pos.transform,
        width: size,
        height: size,
        cursor: HANDLE_CURSORS[handle],
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onMouseDown(handle, e);
      }}
    />
  );
});

export interface SelectionOverlayProps {
  selection: SelectionState;
  zoom: number;
  rotation?: number;
  onResizeStart: (handle: ResizeHandleType, e: React.MouseEvent) => void;
  onRotateStart: (e: React.MouseEvent) => void;
}

/**
 * SelectionOverlay — renders the blue selection bounding box with resize handles.
 * Positioned absolutely over the canvas.
 */
export const SelectionOverlay = memo(function SelectionOverlay({
  selection,
  zoom,
  rotation = 0,
  onResizeStart,
  onRotateStart,
}: SelectionOverlayProps) {
  if (!selection.boundingBox || selection.selectedIds.length === 0) return null;

  const { x, y, width, height } = selection.boundingBox;
  const borderWidth = Math.max(1, 2 / zoom);

  return (
    <>
      {/* Bounding box */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: x,
          top: y,
          width,
          height,
          outline: `${borderWidth}px solid hsl(var(--selection-color, 221.2 83.2% 53.3%))`,
          transform: rotation ? `rotate(${rotation}deg)` : undefined,
          transformOrigin: "center",
          zIndex: 40,
        }}
      >
        {/* Resize handles — only show when single selection */}
        {selection.selectedIds.length === 1 && (
          (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeHandleType[]).map((h) => (
            <ResizeHandle
              key={h}
              handle={h}
              bounds={selection.boundingBox!}
              zoom={zoom}
              onMouseDown={onResizeStart}
            />
          ))
        )}

        {/* Rotation handle */}
        {selection.selectedIds.length === 1 && (
          <div
            data-rotation-handle
            className="absolute pointer-events-auto cursor-crosshair"
            style={{
              left: "50%",
              top: "100%",
              transform: "translate(-50%, 10px)",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: "white",
              border: "2px solid hsl(221.2 83.2% 53.3%)",
              zIndex: 50,
            }}
            onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
          />
        )}
      </div>

      {/* Rubber-band selection rect */}
      {selection.isRubberBanding && selection.rubberBandRect && (
        <div
          className="absolute pointer-events-none border border-blue-500 bg-blue-500/10"
          style={{
            left: selection.rubberBandRect.x,
            top: selection.rubberBandRect.y,
            width: selection.rubberBandRect.width,
            height: selection.rubberBandRect.height,
            zIndex: 45,
          }}
        />
      )}
    </>
  );
});

// ── Snap Guides ──────────────────────────────────────────────────────────────

export interface SnapGuidesProps {
  guides: SnapGuide[];
  canvasWidth: number;
  canvasHeight: number;
}

/**
 * SnapGuides — renders horizontal/vertical snap guide lines.
 */
export const SnapGuides = memo(function SnapGuides({
  guides,
  canvasWidth,
  canvasHeight,
}: SnapGuidesProps) {
  return (
    <>
      {guides.map((guide, i) => (
        <div
          key={i}
          className="absolute pointer-events-none"
          style={
            guide.type === "horizontal"
              ? {
                  left: 0,
                  top: guide.position,
                  width: canvasWidth,
                  height: 1,
                  backgroundColor: "hsl(var(--snap-guide-color, 221.2 83.2% 53.3%))",
                  opacity: 0.8,
                  zIndex: 50,
                }
              : {
                  top: 0,
                  left: guide.position,
                  height: canvasHeight,
                  width: 1,
                  backgroundColor: "hsl(var(--snap-guide-color, 221.2 83.2% 53.3%))",
                  opacity: 0.8,
                  zIndex: 50,
                }
          }
        />
      ))}
    </>
  );
});

// ── Hover Outline ────────────────────────────────────────────────────────────

export interface HoverOutlineProps {
  rect: Rect;
  zoom: number;
}

export const HoverOutline = memo(function HoverOutline({ rect, zoom }: HoverOutlineProps) {
  const borderWidth = Math.max(1, 1 / zoom);
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        outline: `${borderWidth}px solid hsl(var(--hover-color, 221.2 83.2% 53.3% / 0.4))`,
        zIndex: 30,
      }}
    />
  );
});

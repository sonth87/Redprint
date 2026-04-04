import React, { memo } from "react";
import type { Rect, Point } from "@ui-builder/shared";
import type { SelectionState, SnapGuide, ResizeHandleType, DistanceGuide, LiveDimensions } from "../types";
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
      className="absolute z-50 rounded-sm bg-white border-1 border-blue-500 pointer-events-auto"
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
  isSection?: boolean;
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
  isSection = false,
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
          outline: `${borderWidth}px dashed hsl(var(--selection-color, 221.2 83.2% 53.3%))`,
          // uncomment dòng dưới đây nếu muốn rotate cả bounding box (hiện tại chỉ rotate node, không rotate bounding box)
          // transform: rotation ? `rotate(${rotation}deg)` : undefined,
          // transformOrigin: "center",
          zIndex: 40,
        }}
      >
        {/* Resize handles — only show when single selection and not a section */}
        {selection.selectedIds.length === 1 && !isSection && (
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
        {selection.selectedIds.length === 1 && !isSection && (
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

// ── Distance Guides ──────────────────────────────────────────────────────────

export interface DistanceGuidesProps {
  guides: DistanceGuide[];
  zoom: number;
}

/**
 * DistanceGuides — renders gap lines + pixel labels between the active element
 * and its nearest siblings during drag and resize operations.
 *
 * Lines are drawn in canvas (pre-zoom) coordinates, exactly like SnapGuides.
 * Orange color differentiates them from the blue snap guides.
 */
export const DistanceGuides = memo(function DistanceGuides({ guides, zoom }: DistanceGuidesProps) {
  if (guides.length === 0) return null;

  return (
    <>
      {guides.map((guide, i) => {
        const isHorizontal = guide.edge === "left" || guide.edge === "right";
        // Gap length in canvas coordinates
        const gapLength = guide.lineEnd - guide.lineStart;
        if (gapLength <= 0) return null;

        // Label: round to 1 decimal for sub-pixel accuracy but keep it tidy
        const label = `${Math.round(guide.distance)}px`;
        const labelFontSize = Math.max(9, 11 / zoom);

        return (
          <React.Fragment key={i}>
            {/* Gap line */}
            <div
              className="absolute pointer-events-none"
              style={
                isHorizontal
                  ? {
                      // Horizontal gap between right edge of left sibling and left edge of dragging node
                      top: guide.linePosition,
                      left: guide.lineStart,
                      width: gapLength,
                      height: Math.max(1, 1 / zoom),
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
                  : {
                      // Vertical gap between bottom edge of top sibling and top edge of dragging node
                      left: guide.linePosition,
                      top: guide.lineStart,
                      width: Math.max(1, 1 / zoom),
                      height: gapLength,
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
              }
            />
            {/* Start cap */}
            <div
              className="absolute pointer-events-none"
              style={
                isHorizontal
                  ? {
                      top: guide.linePosition - Math.max(3, 3 / zoom),
                      left: guide.lineStart,
                      width: Math.max(1, 1 / zoom),
                      height: Math.max(6, 6 / zoom),
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
                  : {
                      left: guide.linePosition - Math.max(3, 3 / zoom),
                      top: guide.lineStart,
                      width: Math.max(6, 6 / zoom),
                      height: Math.max(1, 1 / zoom),
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
              }
            />
            {/* End cap */}
            <div
              className="absolute pointer-events-none"
              style={
                isHorizontal
                  ? {
                      top: guide.linePosition - Math.max(3, 3 / zoom),
                      left: guide.lineEnd - Math.max(1, 1 / zoom),
                      width: Math.max(1, 1 / zoom),
                      height: Math.max(6, 6 / zoom),
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
                  : {
                      left: guide.linePosition - Math.max(3, 3 / zoom),
                      top: guide.lineEnd - Math.max(1, 1 / zoom),
                      width: Math.max(6, 6 / zoom),
                      height: Math.max(1, 1 / zoom),
                      backgroundColor: "hsl(32 95% 55%)",
                      zIndex: 55,
                    }
              }
            />
            {/* Pixel label */}
            <div
              className="absolute pointer-events-none select-none"
              style={
                isHorizontal
                  ? {
                      top: guide.linePosition - labelFontSize - Math.max(2, 2 / zoom),
                      left: guide.lineStart + gapLength / 2,
                      transform: "translateX(-50%)",
                      fontSize: labelFontSize,
                      lineHeight: 1,
                      fontFamily: "monospace",
                      color: "white",
                      backgroundColor: "hsl(32 95% 45%)",
                      padding: `${Math.max(1, 2 / zoom)}px ${Math.max(2, 4 / zoom)}px`,
                      borderRadius: Math.max(2, 3 / zoom),
                      whiteSpace: "nowrap",
                      zIndex: 56,
                    }
                  : {
                      left: guide.linePosition + Math.max(4, 4 / zoom),
                      top: guide.lineStart + gapLength / 2,
                      transform: "translateY(-50%)",
                      fontSize: labelFontSize,
                      lineHeight: 1,
                      fontFamily: "monospace",
                      color: "white",
                      backgroundColor: "hsl(32 95% 45%)",
                      padding: `${Math.max(1, 2 / zoom)}px ${Math.max(2, 4 / zoom)}px`,
                      borderRadius: Math.max(2, 3 / zoom),
                      whiteSpace: "nowrap",
                      zIndex: 56,
                    }
              }
            >
              {label}
            </div>
          </React.Fragment>
        );
      })}
    </>
  );
});

// ── Resize/Drag Dimensions Display ───────────────────────────────────────────

export interface LiveDimensionsDisplayProps {
  /** Bounding box of the element (canvas coordinates) */
  bounds: Rect;
  /** Current width/height to display */
  dimensions: LiveDimensions;
  zoom: number;
}

/**
 * LiveDimensionsDisplay — shows "W × H" at the bottom-right corner of the
 * bounding box while the user is resizing or dragging an element.
 * Positioned inside the bottom-right to avoid overlapping the ContextualToolbar above.
 */
export const LiveDimensionsDisplay = memo(function LiveDimensionsDisplay({
  bounds,
  dimensions,
  zoom,
}: LiveDimensionsDisplayProps) {
  const fontSize = Math.max(8, 9 / zoom);
  const paddingV = Math.max(1, 1.5 / zoom);
  const paddingH = Math.max(2, 3 / zoom);
  const radius = Math.max(2, 2 / zoom);
  const offset = Math.max(3, 4 / zoom);

  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{
        left: bounds.x + bounds.width,
        top: bounds.y + bounds.height + offset,
        transform: "translateX(-100%)",
        fontSize,
        lineHeight: 1,
        fontFamily: "monospace",
        color: "white",
        backgroundColor: "hsl(221.2 83.2% 25% / 0.5)",
        padding: `${paddingV}px ${paddingH}px`,
        borderRadius: radius,
        whiteSpace: "nowrap",
        zIndex: 60,
      }}
    >
      {Math.round(dimensions.width)} × {Math.round(dimensions.height)}
    </div>
  );
});

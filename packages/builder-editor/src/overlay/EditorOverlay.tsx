import React, { memo } from "react";
import type { Rect } from "@ui-builder/shared";
import type { SelectionState, SnapGuide, ResizeHandleType, DistanceGuide, LiveDimensions } from "../types";
import { ROTATABLE_SELECTION_FRAME } from "../constants";

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

const ResizeHandle = memo(({ handle, bounds: _bounds, zoom, onMouseDown }: ResizeHandleProps) => {
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
  if (!selection.isRubberBanding && (!selection.boundingBox || selection.selectedIds.length === 0)) return null;

  const boundingBox = selection.boundingBox;
  const showBoundingBox = boundingBox && selection.selectedIds.length > 0;
  const borderWidth = Math.max(1, 2 / zoom);

  // Only apply rotation if enabled and it's a single selection
  const applyRotation = ROTATABLE_SELECTION_FRAME && selection.selectedIds.length === 1;

  return (
    <>
      {/* Bounding box */}
      {showBoundingBox && (
        <div
          className="absolute pointer-events-none"
          style={{
            left: boundingBox.x,
            top: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height,
            outline: `${borderWidth}px dashed hsl(var(--selection-color, 221.2 83.2% 53.3%))`,
            transform: applyRotation ? `rotate(${rotation}deg)` : undefined,
            zIndex: 40,
          }}
        >
          {/* Resize handles — only show when single selection and not a section */}
          {selection.selectedIds.length === 1 && !isSection && (
            (["n", "s", "e", "w", "ne", "nw", "se", "sw"] as ResizeHandleType[]).map((h) => (
              <ResizeHandle
                key={h}
                handle={h}
                bounds={boundingBox}
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
                transform: applyRotation 
                  ? "translate(-50%, 15px)" // More spacing if frame is rotated
                  : "translate(-50%, 10px)",
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: "white",
                border: "2px solid hsl(221.2 83.2% 53.3%)",
                zIndex: 50,
              }}
              onMouseDown={(e) => { e.stopPropagation(); onRotateStart(e); }}
            >
              {/* Rotation connector line */}
              {applyRotation && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[2px] h-[15px] bg-blue-500/50" />
              )}
            </div>
          )}
        </div>
      )}

      {/* Rubber-band selection rect */}
      {selection.isRubberBanding && selection.rubberBandRect && (
        <div
          className="absolute pointer-events-none border-2 border-blue-500 bg-blue-500/20"
          style={{
            left: selection.rubberBandRect.x,
            top: selection.rubberBandRect.y,
            width: selection.rubberBandRect.width,
            height: selection.rubberBandRect.height,
            zIndex: 100,
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
  helperLineColor?: string;
}

export interface CanvasHelperLinesProps {
  canvasWidth: number;
  canvasHeight: number;
  color?: string;
}

export const CanvasHelperLines = memo(function CanvasHelperLines({
  canvasWidth,
  canvasHeight,
  color,
}: CanvasHelperLinesProps) {
  const guideColor = color ?? "hsl(var(--snap-guide-color, 221.2 83.2% 53.3%))";
  const opacity = 0.3; // Make these subtle compared to active snap guides

  return (
    <>
      <div
        className="absolute pointer-events-none"
        style={{
          left: canvasWidth / 2,
          top: 0,
          width: 1,
          height: canvasHeight,
          backgroundColor: guideColor,
          opacity,
          zIndex: 49,
        }}
      />
    </>
  );
});

/**
 * SnapGuides — renders horizontal/vertical snap guide lines.
 */
export const SnapGuides = memo(function SnapGuides({
  guides,
  canvasWidth,
  canvasHeight,
  helperLineColor,
}: SnapGuidesProps) {
  return (
    <>
      {guides.map((guide, i) => {
        const clampedPosition = Math.max(
          0,
          Math.min(
            guide.type === "horizontal" ? canvasHeight : canvasWidth,
            guide.position
          )
        );

        const defaultColor = helperLineColor ?? "hsl(var(--snap-guide-color, 221.2 83.2% 53.3%))";
        const guideColor =
          guide.source === "canvas-center"
            ? "hsl(280 70% 55%)"
            : guide.source === "canvas-edge"
            ? "hsl(0 70% 55%)"
            : guide.source === "component-center"
            ? "hsl(200 80% 50%)"
            : defaultColor;

        return (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={
              guide.type === "horizontal"
                ? {
                    left: 0,
                    top: clampedPosition,
                    width: canvasWidth,
                    height: 1,
                    backgroundColor: guideColor,
                    opacity: 0.8,
                    zIndex: 50,
                  }
                : {
                    top: 0,
                    left: clampedPosition,
                    height: canvasHeight,
                    width: 1,
                    backgroundColor: guideColor,
                    opacity: 0.8,
                    zIndex: 50,
                  }
            }
          />
        );
      })}
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
                      color: "hsl(32 95% 45%)", // "white",
                      // backgroundColor: "hsl(32 95% 45%)",
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
                      color: "hsl(32 95% 45%)", // "white",
                      // backgroundColor: "hsl(32 95% 45%)",
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

// ── Flow Drop Placeholder ─────────────────────────────────────────────────────────────────

export interface FlowDropPlaceholderProps {
  /**
   * Canvas-space rect of the container element being hovered.
   * The placeholder line is rendered at the top/bottom edge of a sibling
   * (or at the top of the container if inserting at index 0).
   */
  containerRect: Rect;
  /**
   * Canvas-space rect of the sibling immediately BEFORE the insert point,
   * or null when inserting at index 0 (line at the top of the container).
   */
  prevSiblingRect: Rect | null;
  /**
   * Canvas-space rect of the sibling immediately AFTER the insert point,
   * or null when inserting at the end (line at the bottom of the last sibling).
   */
  nextSiblingRect: Rect | null;
  /**
   * For grid containers: canvas-space rect of the exact cell being targeted.
   * When provided a cell-highlight box is rendered instead of the insert line.
   */
  gridCellRect?: Rect;
  zoom: number;
}

/**
 * FlowDropPlaceholder — renders a horizontal blue insert-line that shows
 * where the dragged component will be placed inside a flow/grid container.
 *
 * The line sits in the gap between prevSiblingRect and nextSiblingRect (canvas
 * coordinates). When there are no siblings the line fills the empty container.
 */
export const FlowDropPlaceholder = memo(function FlowDropPlaceholder({
  containerRect,
  prevSiblingRect,
  nextSiblingRect,
  gridCellRect,
  zoom,
}: FlowDropPlaceholderProps) {
  // ── Grid mode: highlight the targeted cell ──────────────────────────────
  if (gridCellRect) {
    const borderWidth = Math.max(1.5, 2 / zoom);
    return (
      <>
        {/* Container dashed outline */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: containerRect.x,
            top: containerRect.y,
            width: containerRect.width,
            height: containerRect.height,
            outline: `${Math.max(1.5, 2 / zoom)}px dashed hsl(221.2 83.2% 53.3% / 0.4)`,
            borderRadius: 4 / zoom,
            zIndex: 48,
          }}
        />
        {/* Cell highlight */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: gridCellRect.x,
            top: gridCellRect.y,
            width: gridCellRect.width,
            height: gridCellRect.height,
            backgroundColor: "hsl(221.2 83.2% 53.3% / 0.12)",
            outline: `${borderWidth}px solid hsl(221.2 83.2% 53.3%)`,
            borderRadius: 4 / zoom,
            zIndex: 58,
          }}
        />
      </>
    );
  }

  // ── Flow/flex mode: horizontal insert line ──────────────────────────────

  // ── Compute Y position of the insert line ──────────────────────────
  let lineY: number;
  if (prevSiblingRect) {
    // midpoint between bottom of previous sibling and top of next sibling (or container bottom)
    const prevBottom = prevSiblingRect.y + prevSiblingRect.height;
    const nextTop = nextSiblingRect ? nextSiblingRect.y : (containerRect.y + containerRect.height);
    lineY = (prevBottom + nextTop) / 2;
  } else if (nextSiblingRect) {
    // inserting before first sibling — put line slightly above its top
    lineY = nextSiblingRect.y - Math.max(2, 4 / zoom);
  } else {
    // empty container — put line at top with some padding
    lineY = containerRect.y + Math.max(4, 8 / zoom);
  }

  const lineThickness = Math.max(2, 2 / zoom);
  const dotSize = Math.max(8, 8 / zoom);
  const padding = Math.max(6, 8 / zoom);

  return (
    <>
      {/* Container highlight */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: containerRect.x,
          top: containerRect.y,
          width: containerRect.width,
          height: containerRect.height,
          outline: `${Math.max(1.5, 2 / zoom)}px dashed hsl(221.2 83.2% 53.3% / 0.5)`,
          borderRadius: 4 / zoom,
          zIndex: 48,
        }}
      />
      {/* Insert line */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: containerRect.x + padding,
          top: lineY - lineThickness / 2,
          width: containerRect.width - padding * 2,
          height: lineThickness,
          backgroundColor: "hsl(221.2 83.2% 53.3%)",
          borderRadius: lineThickness,
          zIndex: 58,
        }}
      />
      {/* Left dot */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: containerRect.x + padding - dotSize / 2,
          top: lineY - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: "hsl(221.2 83.2% 53.3%)",
          zIndex: 58,
        }}
      />
      {/* Right dot */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: containerRect.x + containerRect.width - padding - dotSize / 2,
          top: lineY - dotSize / 2,
          width: dotSize,
          height: dotSize,
          borderRadius: "50%",
          backgroundColor: "hsl(221.2 83.2% 53.3%)",
          zIndex: 58,
        }}
      />
    </>
  );
});

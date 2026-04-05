import React from "react";
import { cn } from "@ui-builder/ui";
import type { Point } from "@ui-builder/shared";

export interface CanvasMinimapProps {
  canvasWidth: number;
  canvasHeight: number;
  zoom: number;
  panOffset: Point;
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
}

/** Fixed inner width of the minimap canvas area (px). */
const MINIMAP_INNER_W = 144;
const MINIMAP_PAD = 8;

/**
 * CanvasMinimap — a small fixed overlay (bottom-right) that shows:
 * - A rectangle representing the full canvas
 * - A blue viewport indicator showing the currently visible portion
 *
 * Visibility is controlled externally:
 * - Auto-shows when the canvas moves out of the viewport
 * - Fades out after a timeout (controlled by the parent)
 */
export function CanvasMinimap({
  canvasWidth,
  canvasHeight,
  zoom,
  panOffset,
  containerWidth,
  containerHeight,
  visible,
}: CanvasMinimapProps) {
  // Scale: canvas world coords → minimap px
  const scale = MINIMAP_INNER_W / canvasWidth;
  const innerH = Math.max(4, Math.round(canvasHeight * scale));
  const totalW = MINIMAP_INNER_W + MINIMAP_PAD * 2;
  const totalH = innerH + MINIMAP_PAD * 2;

  // Viewport rect in canvas-space coords
  const vpX = -panOffset.x / zoom;
  const vpY = -panOffset.y / zoom;
  const vpW = containerWidth / zoom;
  const vpH = containerHeight / zoom;

  // Clamp viewport indicator within inner minimap area
  const indLeft   = Math.max(0, Math.min(vpX * scale, MINIMAP_INNER_W));
  const indTop    = Math.max(0, Math.min(vpY * scale, innerH));
  const indRight  = Math.max(0, Math.min((vpX + vpW) * scale, MINIMAP_INNER_W));
  const indBottom = Math.max(0, Math.min((vpY + vpH) * scale, innerH));
  const indW = Math.max(0, indRight - indLeft);
  const indH = Math.max(0, indBottom - indTop);

  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 z-30 overflow-hidden rounded-lg border shadow-md",
        "bg-background/90 backdrop-blur-sm",
        "transition-all duration-300 ease-in-out",
        visible
          ? "pointer-events-auto opacity-100 translate-y-0"
          : "pointer-events-none opacity-0 translate-y-1",
      )}
      style={{ width: totalW, height: totalH }}
      aria-hidden="true"
      title="Minimap"
    >
      {/* Canvas rectangle */}
      <div
        className="absolute rounded-sm bg-white border border-border/50"
        style={{
          left: MINIMAP_PAD,
          top: MINIMAP_PAD,
          width: MINIMAP_INNER_W,
          height: innerH,
        }}
      />

      {/* Viewport indicator */}
      {indW > 1 && indH > 1 && (
        <div
          className="absolute border-2 border-primary bg-primary/15 rounded-sm"
          style={{
            left: MINIMAP_PAD + indLeft,
            top: MINIMAP_PAD + indTop,
            width: indW,
            height: indH,
          }}
        />
      )}

      {/* "MAP" label */}
      <div
        className="absolute bottom-1 right-1.5 select-none text-[8px] font-medium uppercase tracking-widest text-muted-foreground/40"
      >
        MAP
      </div>
    </div>
  );
}

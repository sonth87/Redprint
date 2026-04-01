import React, { useRef, useCallback, useEffect, useState } from "react";
import type { MouseEvent as RMouseEvent } from "react";
import { cn } from "@ui-builder/ui";
import type { CanvasConfig } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";

export interface CanvasRootProps {
  canvasConfig: CanvasConfig;
  zoom: number;
  panOffset: Point;
  onZoomChange: (zoom: number) => void;
  onPanOffsetChange: (offset: Point) => void;
  children: React.ReactNode;
  className?: string;
}

/**
 * CanvasRoot — the scrollable, zoomable container for the editor canvas.
 *
 * - Mouse wheel + Ctrl → zoom (pinch-to-zoom)
 * - Mouse wheel without Ctrl → pan
 * - Middle mouse button drag → pan
 * - Space + left drag → pan (pan tool)
 * - Renders background grid if enabled
 *
 * All coordinate transforms produce canvas-space coords
 * by accounting for zoom and panOffset.
 */
export function CanvasRoot({
  canvasConfig,
  zoom,
  panOffset,
  onZoomChange,
  onPanOffsetChange,
  children,
  className,
}: CanvasRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ pointer: Point; offset: Point } | null>(null);

  const MIN_ZOOM = 0.1;
  const MAX_ZOOM = 4;
  const ZOOM_SENSITIVITY = 0.001;

  // ── Wheel → Zoom or Pan ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+scroll
        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * (1 + delta * 50)));
        onZoomChange(nextZoom);
      } else {
        // Pan
        onPanOffsetChange({
          x: panOffset.x - e.deltaX,
          y: panOffset.y - e.deltaY,
        });
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoom, panOffset, onZoomChange, onPanOffsetChange]);

  // ── Middle-mouse pan ─────────────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: RMouseEvent) => {
      if (e.button === 1) {
        // Middle mouse
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { pointer: { x: e.clientX, y: e.clientY }, offset: panOffset };
      }
    },
    [panOffset],
  );

  const handleMouseMove = useCallback(
    (e: RMouseEvent) => {
      if (isPanning && panStart.current) {
        const dx = e.clientX - panStart.current.pointer.x;
        const dy = e.clientY - panStart.current.pointer.y;
        onPanOffsetChange({
          x: panStart.current.offset.x + dx,
          y: panStart.current.offset.y + dy,
        });
      }
    },
    [isPanning, onPanOffsetChange],
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    panStart.current = null;
  }, []);

  // Background grid pattern
  const gridPattern = canvasConfig.showGrid ? (
    <defs>
      <pattern
        id="canvas-grid"
        width={canvasConfig.gridSize * zoom}
        height={canvasConfig.gridSize * zoom}
        patternUnits="userSpaceOnUse"
        x={panOffset.x % (canvasConfig.gridSize * zoom)}
        y={panOffset.y % (canvasConfig.gridSize * zoom)}
      >
        <path
          d={`M ${canvasConfig.gridSize * zoom} 0 L 0 0 0 ${canvasConfig.gridSize * zoom}`}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="0.5"
        />
      </pattern>
    </defs>
  ) : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex-1 overflow-hidden",
        "bg-[hsl(var(--canvas-bg))]",
        isPanning ? "cursor-grabbing" : "cursor-default",
        className,
      )}
      style={{ userSelect: "none" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG background grid */}
      {canvasConfig.showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {gridPattern}
          <rect width="100%" height="100%" fill="url(#canvas-grid)" />
        </svg>
      )}

      {/* Canvas transform container */}
      <div
        className="absolute"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          willChange: "transform",
        }}
      >
        {children}
      </div>
    </div>
  );
}

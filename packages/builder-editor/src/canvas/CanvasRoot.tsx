import React, { type MouseEvent as RMouseEvent, useRef, useCallback, useEffect, useLayoutEffect, useState } from "react";
import { cn } from "@ui-builder/ui";
import type { CanvasConfig } from "@ui-builder/builder-core";
import type { Point } from "@ui-builder/shared";
import { CANVAS_MIN_ZOOM, CANVAS_MAX_ZOOM, CANVAS_ZOOM_SENSITIVITY } from "../constants";

export interface CanvasRootProps {
  canvasConfig: CanvasConfig;
  zoom: number;
  panOffset: Point;
  onZoomChange: (zoom: number) => void;
  onPanOffsetChange: (offset: Point) => void;
  children: React.ReactNode;
  className?: string;
  activeTool?: string;
  onPointerDown?: (e: React.PointerEvent) => void;
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
  activeTool = "select",
  onPointerDown,
}: CanvasRootProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef<{ pointer: Point; offset: Point } | null>(null);

  // Zoom constraints extracted to constants
  // MIN_ZOOM: CANVAS_MIN_ZOOM, MAX_ZOOM: CANVAS_MAX_ZOOM, SENSITIVITY: CANVAS_ZOOM_SENSITIVITY

  // ── Apply CSS transform — useLayoutEffect so screen-space overlays (e.g.
  // SectionToolbar) can read correct getBoundingClientRect in their own
  // useLayoutEffects during the same commit phase.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const canvasDiv = el.querySelector("[style*='transform']") as HTMLElement | null;
    if (canvasDiv) {
      canvasDiv.style.transform = `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale(${zoom})`;
    }
  }, [zoom, panOffset]);

  // ── Subpixel crisp-rendering flush (runs after paint, zoom changes only) ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const canvasDiv = el.querySelector("[style*='transform']") as HTMLElement | null;
    if (canvasDiv) {
      void canvasDiv.offsetHeight; // force layout recalculation after zoom
    }
  }, [zoom]);

  // ── Wheel → Zoom or Pan ──────────────────────────────────────────────────
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: globalThis.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Pinch-to-zoom or Ctrl+scroll — zoom from cursor position
        const rect = el.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate canvas point under cursor before zoom
        const canvasX = (mouseX - panOffset.x) / zoom;
        const canvasY = (mouseY - panOffset.y) / zoom;

        // Determine zoom scale step
        let zoomMultiplier = 1;
        if (Math.abs(e.deltaY) >= 50) {
          // Likely a standard mouse wheel (large delta steps). 
          // Use fixed 15% zoom increments per wheel tick
          zoomMultiplier = e.deltaY > 0 ? 0.85 : 1.15;
        } else {
          // Likely a trackpad (small delta stream, often floats).
          // Allow continuous, responsive smooth zooming proportional to delta.
          // 0.01 sensitivity maps 10 pixels of pinch to ~10% zoom.
          zoomMultiplier = Math.exp(-e.deltaY * 0.01);
        }

        const nextZoom = Math.min(CANVAS_MAX_ZOOM, Math.max(CANVAS_MIN_ZOOM, zoom * zoomMultiplier));

        // Adjust pan so the canvas point stays under the cursor
        const newPanX = mouseX - canvasX * nextZoom;
        const newPanY = mouseY - canvasY * nextZoom;

        onZoomChange(nextZoom);
        onPanOffsetChange({ x: newPanX, y: newPanY });
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

  // ── Middle-mouse pan + Pan tool ─────────────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: RMouseEvent) => {
      // Middle mouse button always pans
      if (e.button === 1) {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { pointer: { x: e.clientX, y: e.clientY }, offset: panOffset };
      }
      // Left mouse button pans only if pan tool is active
      if (e.button === 0 && activeTool === "pan") {
        e.preventDefault();
        setIsPanning(true);
        panStart.current = { pointer: { x: e.clientX, y: e.clientY }, offset: panOffset };
      }
    },
    [panOffset, activeTool],
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

  // Calculate dynamic grid opacity to prevent moire patterns when zoomed out
  const apparentGridSize = canvasConfig.gridSize * zoom;
  // Fade out small grid when apparent size drops below 15px, completely hide below 4px
  const smallGridAlpha = Math.max(0, Math.min(0.4, (apparentGridSize - 4) / 10 * 0.4));
  // Large grid is 10x larger and fades out if it gets too small
  const largeGridVisualSize = apparentGridSize * 10;
  const largeGridAlpha = Math.max(0, Math.min(0.4, (largeGridVisualSize - 4) / 10 * 0.4));

  const gridPattern = canvasConfig.showGrid ? (
    <defs>
      <pattern
        id="canvas-grid-small"
        width={apparentGridSize}
        height={apparentGridSize}
        patternUnits="userSpaceOnUse"
        x={panOffset.x % apparentGridSize}
        y={panOffset.y % apparentGridSize}
      >
        <path
          d={`M ${apparentGridSize} 0 L 0 0 0 ${apparentGridSize}`}
          fill="none"
          stroke={`hsl(var(--muted-foreground) / ${smallGridAlpha})`}
          strokeWidth="0.5"
        />
      </pattern>
      <pattern
        id="canvas-grid-large"
        width={apparentGridSize * 10}
        height={apparentGridSize * 10}
        patternUnits="userSpaceOnUse"
        x={panOffset.x % (apparentGridSize * 10)}
        y={panOffset.y % (apparentGridSize * 10)}
      >
        <rect width="100%" height="100%" fill="url(#canvas-grid-small)" />
        <path
          d={`M ${apparentGridSize * 10} 0 L 0 0 0 ${apparentGridSize * 10}`}
          fill="none"
          stroke={`hsl(var(--muted-foreground) / ${largeGridAlpha})`}
          strokeWidth="1"
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
        isPanning ? "cursor-grabbing" : activeTool === "pan" ? "cursor-grab" : "cursor-default",
        className,
      )}
      style={{ userSelect: "none" }}
      onPointerDown={onPointerDown}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* SVG background grid */}
      {canvasConfig.showGrid && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          {gridPattern}
          <rect width="100%" height="100%" fill="url(#canvas-grid-large)" />
        </svg>
      )}

      {/* Canvas transform container */}
      <div
        className="absolute"
        style={{
          transform: `translate3d(${panOffset.x}px, ${panOffset.y}px, 0) scale3d(${zoom}, ${zoom}, 1)`,
          transformOrigin: "0 0",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          backfaceVisibility: "hidden",
          perspective: "1000px",
          imageRendering: "-webkit-optimize-contrast",
          shapeRendering: "geometricPrecision",
          paintOrder: "stroke fill markers",
          transformStyle: "preserve-3d",
          contain: "layout style", // contain: "layout style paint", bỏ paint vì không hiển thị khi component bên ngoài
        }}
      >
        {children}
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo } from "react";
import type { Point, Rect } from "@ui-builder/shared";

interface RubberBandingState {
  startPoint: Point;
  currentPoint: Point;
}

interface UseRubberBandOptions {
  zoom: number;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  onSelectionEnd?: (rect: Rect, e: MouseEvent) => void;
}

export interface UseRubberBandReturn {
  rubberBanding: RubberBandingState | null;
  setRubberBanding: (state: RubberBandingState | null) => void;
  rubberBandRect: Rect | null;
}

export function useRubberBand({ zoom, canvasFrameRef, onSelectionEnd }: UseRubberBandOptions): UseRubberBandReturn {
  const [rubberBanding, setRubberBanding] = useState<RubberBandingState | null>(null);

  const rubberBandRect = useMemo<Rect | null>(() => {
    if (!rubberBanding) return null;
    return {
      x: Math.min(rubberBanding.startPoint.x, rubberBanding.currentPoint.x),
      y: Math.min(rubberBanding.startPoint.y, rubberBanding.currentPoint.y),
      width: Math.abs(rubberBanding.currentPoint.x - rubberBanding.startPoint.x),
      height: Math.abs(rubberBanding.currentPoint.y - rubberBanding.startPoint.y),
    };
  }, [rubberBanding]);

  useEffect(() => {
    if (!rubberBanding) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasFrameRef.current) return;
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const pt = {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
      setRubberBanding(prev => prev ? { ...prev, currentPoint: pt } : null);
    };

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (onSelectionEnd) {
        if (!canvasFrameRef.current) return;
        const rect = canvasFrameRef.current.getBoundingClientRect();
        const pt = {
          x: (e.clientX - rect.left) / zoom,
          y: (e.clientY - rect.top) / zoom,
        };
        
        // Compute final rect directly to ensure we have the latest coordinates
        const finalRect = {
          x: Math.min(rubberBanding.startPoint.x, pt.x),
          y: Math.min(rubberBanding.startPoint.y, pt.y),
          width: Math.abs(pt.x - rubberBanding.startPoint.x),
          height: Math.abs(pt.y - rubberBanding.startPoint.y),
        };

        if (finalRect.width > 2 || finalRect.height > 2) {
          onSelectionEnd(finalRect, e);
        }
      }
      setRubberBanding(null);
    };

    window.addEventListener("pointermove", handleGlobalMouseMove as EventListener);
    window.addEventListener("pointerup", handleGlobalMouseUp as EventListener, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleGlobalMouseMove as EventListener);
      window.removeEventListener("pointerup", handleGlobalMouseUp as EventListener);
    };
  }, [rubberBanding, zoom, canvasFrameRef, onSelectionEnd]);

  return { rubberBanding, setRubberBanding, rubberBandRect };
}

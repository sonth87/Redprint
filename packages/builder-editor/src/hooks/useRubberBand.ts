import { useState, useEffect } from "react";
import type { Point, Rect } from "@ui-builder/shared";

interface RubberBandingState {
  startPoint: Point;
  currentPoint: Point;
}

interface UseRubberBandOptions {
  zoom: number;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
}

export interface UseRubberBandReturn {
  rubberBanding: RubberBandingState | null;
  setRubberBanding: (state: RubberBandingState | null) => void;
  rubberBandRect: Rect | null;
}

export function useRubberBand({ zoom, canvasFrameRef }: UseRubberBandOptions): UseRubberBandReturn {
  const [rubberBanding, setRubberBanding] = useState<RubberBandingState | null>(null);

  useEffect(() => {
    if (!rubberBanding) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!canvasFrameRef.current) return;
      const rect = canvasFrameRef.current.getBoundingClientRect();
      const pt = {
        x: (e.clientX - rect.left) / zoom,
        y: (e.clientY - rect.top) / zoom,
      };
      setRubberBanding((prev) => (prev ? { ...prev, currentPoint: pt } : null));
    };
    const handleGlobalMouseUp = () => setRubberBanding(null);
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [rubberBanding, zoom, canvasFrameRef]);

  const rubberBandRect: Rect | null = rubberBanding
    ? {
        x: Math.min(rubberBanding.startPoint.x, rubberBanding.currentPoint.x),
        y: Math.min(rubberBanding.startPoint.y, rubberBanding.currentPoint.y),
        width: Math.abs(rubberBanding.currentPoint.x - rubberBanding.startPoint.x),
        height: Math.abs(rubberBanding.currentPoint.y - rubberBanding.startPoint.y),
      }
    : null;

  return { rubberBanding, setRubberBanding, rubberBandRect };
}

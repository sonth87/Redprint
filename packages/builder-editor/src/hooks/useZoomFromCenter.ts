import { useCallback } from "react";
import { ZOOM_LEVELS } from "@ui-builder/shared";
import type React from "react";
import type { Point } from "@ui-builder/shared";

interface UseZoomFromCenterOptions {
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  panOffset: Point;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
}

export interface UseZoomFromCenterReturn {
  handleZoomInFromCenter: () => void;
  handleZoomOutFromCenter: () => void;
}

/**
 * Hook to handle zoom in/out operations from the center of the visible canvas.
 * When zooming, the center point of the viewport stays fixed.
 */
export function useZoomFromCenter({
  canvasContainerRef,
  zoom,
  panOffset,
  setZoom,
  setPanOffset,
}: UseZoomFromCenterOptions): UseZoomFromCenterReturn {
  const handleZoomInFromCenter = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const next = ZOOM_LEVELS.find((z) => z > zoom);
    if (!next) return;

    const rect = canvasContainerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate canvas point at center before zoom
    const canvasX = (centerX - panOffset.x) / zoom;
    const canvasY = (centerY - panOffset.y) / zoom;

    // Adjust pan so that canvas point stays at center after zoom
    const newPanX = centerX - canvasX * next;
    const newPanY = centerY - canvasY * next;

    setZoom(next);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoom, panOffset, setZoom, setPanOffset, canvasContainerRef]);

  const handleZoomOutFromCenter = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const prev = [...ZOOM_LEVELS].reverse().find((z) => z < zoom);
    if (!prev) return;

    const rect = canvasContainerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Calculate canvas point at center before zoom
    const canvasX = (centerX - panOffset.x) / zoom;
    const canvasY = (centerY - panOffset.y) / zoom;

    // Adjust pan so that canvas point stays at center after zoom
    const newPanX = centerX - canvasX * prev;
    const newPanY = centerY - canvasY * prev;

    setZoom(prev);
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoom, panOffset, setZoom, setPanOffset, canvasContainerRef]);

  return { handleZoomInFromCenter, handleZoomOutFromCenter };
}

import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { MIN_ZOOM, FIT_TO_SCREEN_PADDING, CANVAS_CENTER_OFFSET, VERTICAL_CENTER_DIVISOR, type Point } from "@ui-builder/shared";

interface UseAutoFitCanvasOptions {
  breakpoint: string;
  canvasMode: string;
  canvasWidth: number;
  canvasMinHeight: number;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  clearSelection: () => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  zoom: number;
  panOffset: Point;
  boundingWidth?: number;
  boundingHeight?: number;
}

export interface UseAutoFitCanvasReturn {
  /** Fit the canvas to fill the visible container at the current breakpoint. */
  handleFitToScreen: () => void;
  /** Whether the canvas artboard has any portion visible in the container. */
  isCanvasInViewport: boolean;
}

/**
 * Auto-fits canvas zoom/pan when switching breakpoints and exposes
 * a manual fit-to-screen handler. Also computes `isCanvasInViewport`
 * so the "Return to Canvas" cue can be shown when the user has panned away.
 */
export function useAutoFitCanvas({
  breakpoint,
  canvasMode,
  canvasWidth,
  canvasMinHeight,
  canvasContainerRef,
  clearSelection,
  setZoom,
  setPanOffset,
  zoom,
  panOffset,
  boundingWidth,
  boundingHeight,
}: UseAutoFitCanvasOptions): UseAutoFitCanvasReturn {
  const prevBreakpointRef = useRef<string>(breakpoint);

  // Auto-fit on breakpoint switch (skip in dual mode — both artboards are fixed-size)
  useEffect(() => {
    if (prevBreakpointRef.current === breakpoint) return;
    prevBreakpointRef.current = breakpoint;
    clearSelection();
    if (canvasMode === "dual") return;
    if (!canvasContainerRef.current) return;
    const containerWidth = canvasContainerRef.current.offsetWidth;
    const containerHeight = canvasContainerRef.current.offsetHeight;
    const fitZoom = Math.min((containerWidth - FIT_TO_SCREEN_PADDING) / canvasWidth, 1);
    const actualZoom = Math.max(MIN_ZOOM, parseFloat(fitZoom.toFixed(2)));
    setZoom(actualZoom);
    const centeredX = Math.max(CANVAS_CENTER_OFFSET, (containerWidth - canvasWidth * actualZoom) / 2);
    const centeredY = Math.max(CANVAS_CENTER_OFFSET, (containerHeight - canvasMinHeight * actualZoom) / VERTICAL_CENTER_DIVISOR);
    setPanOffset({ x: centeredX, y: centeredY });
  }, [breakpoint, canvasWidth, canvasMinHeight, canvasMode, clearSelection, setZoom, setPanOffset, canvasContainerRef]);

  const handleFitToScreen = useCallback(() => {
    if (!canvasContainerRef.current) return;
    const containerWidth  = canvasContainerRef.current.offsetWidth;
    const containerHeight = canvasContainerRef.current.offsetHeight;
    if (containerWidth === 0 || containerHeight === 0) return;
    const fitZoom = Math.min(
      (containerWidth  - FIT_TO_SCREEN_PADDING) / canvasWidth,
      (containerHeight - FIT_TO_SCREEN_PADDING) / canvasMinHeight,
      1,
    );
    const actualZoom = Math.max(MIN_ZOOM, parseFloat(fitZoom.toFixed(2)));
    setZoom(actualZoom);
    const centeredX = Math.max(CANVAS_CENTER_OFFSET, (containerWidth  - canvasWidth    * actualZoom) / 2);
    const centeredY = Math.max(CANVAS_CENTER_OFFSET, (containerHeight - canvasMinHeight * actualZoom) / VERTICAL_CENTER_DIVISOR);
    setPanOffset({ x: centeredX, y: centeredY });
  }, [canvasContainerRef, canvasWidth, canvasMinHeight, setZoom, setPanOffset]);

  // Fit to screen once on initial mount — useLayoutEffect fires after DOM layout
  // but before browser paint, so there is no visible flash/flicker.
  const hasInitialFitRef = useRef(false);
  useLayoutEffect(() => {
    if (hasInitialFitRef.current) return;
    hasInitialFitRef.current = true;
    handleFitToScreen();
  }, [handleFitToScreen]);

  const containerW = canvasContainerRef.current?.offsetWidth  ?? 1000;
  const containerH = canvasContainerRef.current?.offsetHeight ?? 1000;

  const actualContentW = boundingWidth ?? canvasWidth;
  const actualContentH = boundingHeight ?? canvasMinHeight;

  const isCanvasInViewport =
    panOffset.x + actualContentW * zoom > 0 &&
    panOffset.x                          < containerW &&
    panOffset.y + actualContentH * zoom > 0 &&
    panOffset.y                          < containerH;

  return { handleFitToScreen, isCanvasInViewport };
}

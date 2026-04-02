import { useState, useCallback } from "react";
import type { EditorTool } from "../types";
import type { Point } from "@ui-builder/shared";

export interface UseViewportReturn {
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: Point;
  setPanOffset: (offset: Point) => void;
  activeTool: EditorTool;
  setActiveTool: (tool: EditorTool) => void;
  showGrid: boolean;
  toggleGrid: () => void;
  snapEnabled: boolean;
  toggleSnap: () => void;
}

export function useViewport(): UseViewportReturn {
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState<Point>({ x: 32, y: 32 });
  const [activeTool, setActiveTool] = useState<EditorTool>("select");
  const [showGrid, setShowGrid] = useState(true);

  const toggleGrid = useCallback(() => setShowGrid((v) => !v), []);
  // snapEnabled always equals showGrid
  const snapEnabled = showGrid;
  const toggleSnap = useCallback(() => {}, []);

  return {
    zoom,
    setZoom,
    panOffset,
    setPanOffset,
    activeTool,
    setActiveTool,
    showGrid,
    toggleGrid,
    snapEnabled,
    toggleSnap,
  };
}

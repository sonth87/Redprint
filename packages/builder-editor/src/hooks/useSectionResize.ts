import { useState, useEffect, useRef } from "react";
import { snapToGrid } from "@ui-builder/shared";

interface SectionResizingState {
  nodeId: string;
  startY: number;
  startHeight: number;
  gestureGroupId: string;
}

interface UseSectionResizeOptions {
  zoom: number;
  showGrid: boolean;
  gridSize: number;
  breakpoint?: string;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseSectionResizeReturn {
  sectionResizing: SectionResizingState | null;
  startSectionResize: (nodeId: string, startY: number, currentHeight: number, gestureGroupId: string) => void;
}

export function useSectionResize({
  zoom,
  showGrid,
  gridSize,
  breakpoint,
  dispatch,
}: UseSectionResizeOptions): UseSectionResizeReturn {
  const [sectionResizing, setSectionResizing] = useState<SectionResizingState | null>(null);

  // Keep a ref copy so event handlers always see the latest value.
  const resizingRef = useRef(sectionResizing);
  resizingRef.current = sectionResizing;

  const MIN_HEIGHT = 100;

  useEffect(() => {
    if (!sectionResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const state = resizingRef.current;
      if (!state) return;

      const deltaY = (e.clientY - state.startY) / zoom;
      let newHeight = Math.round(state.startHeight + deltaY);
      newHeight = Math.max(MIN_HEIGHT, newHeight);

      if (showGrid) {
        newHeight = snapToGrid(newHeight, gridSize);
      }

      const isMobile = breakpoint && breakpoint !== "desktop";

      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: state.nodeId,
          style: { minHeight: `${newHeight}px` },
          ...(isMobile ? { breakpoint } : {}),
        },
        groupId: state.gestureGroupId,
        description: "Resize section",
      });

      // Keep props.minHeight in sync only for desktop (base layout height)
      if (!isMobile) {
        dispatch({
          type: "UPDATE_PROPS",
          payload: {
            nodeId: state.nodeId,
            props: { minHeight: newHeight },
          },
          groupId: state.gestureGroupId,
          description: "Resize section props",
        });
      }
    };

    const handleMouseUp = () => {
      setSectionResizing(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [sectionResizing, zoom, showGrid, gridSize, breakpoint, dispatch]);

  const startSectionResize = (
    nodeId: string,
    startY: number,
    currentHeight: number,
    gestureGroupId: string,
  ) => {
    setSectionResizing({ nodeId, startY, startHeight: currentHeight, gestureGroupId });
  };

  return { sectionResizing, startSectionResize };
}

import { useState, useEffect, useRef } from "react";
import { snapToGrid } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";

interface SectionResizingState {
  nodeId: string;
  startY: number;
  startHeight: number;
  gestureGroupId: string;
  minAllowedHeight: number;
}

interface UseSectionResizeOptions {
  zoom: number;
  showGrid: boolean;
  gridSize: number;
  breakpoint?: string;
  nodes: Record<string, BuilderNode>;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
}

export interface UseSectionResizeReturn {
  sectionResizing: SectionResizingState | null;
  startSectionResize: (nodeId: string, startY: number, currentHeight: number, gestureGroupId: string, minAllowedHeight: number) => void;
}

export function useSectionResize({
  zoom,
  showGrid,
  gridSize,
  breakpoint,
  nodes,
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
      newHeight = Math.max(state.minAllowedHeight || MIN_HEIGHT, newHeight);

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

      // Clamp absolute children whose top exceeds the new height so they stay inside
      const children = Object.values(nodes).filter(
        (n) => n.parentId === state.nodeId && n.style?.position === "absolute",
      );
      for (const child of children) {
        const childTop = parseFloat(String(child.style.top ?? "0")) || 0;
        if (childTop >= newHeight) {
          dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId: child.id,
              style: { top: `${Math.max(0, newHeight - 20)}px` },
              ...(isMobile ? { breakpoint } : {}),
            },
            groupId: state.gestureGroupId,
            description: "Clamp child on section resize",
          });
        }
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
  }, [sectionResizing, zoom, showGrid, gridSize, breakpoint, nodes, dispatch]);

  const startSectionResize = (
    nodeId: string,
    startY: number,
    currentHeight: number,
    gestureGroupId: string,
    minAllowedHeight: number,
  ) => {
    setSectionResizing({ nodeId, startY, startHeight: currentHeight, gestureGroupId, minAllowedHeight });
  };

  return { sectionResizing, startSectionResize };
}

import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { PaletteItem, Breakpoint } from "@ui-builder/builder-core";

interface UseClickToAddOptions {
  rootNodeId: string;
  zoom: number;
  panOffset: { x: number; y: number };
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string; groupId?: string }) => void;
  onAfterAdd?: () => void;
}

/**
 * Returns a callback that, when given a PaletteItem, adds it at the
 * visible centre of the canvas, applying any preset responsive overrides.
 */
export function useClickToAdd({
  rootNodeId,
  zoom,
  panOffset,
  canvasContainerRef,
  dispatch,
  onAfterAdd,
}: UseClickToAddOptions) {
  const addItem = useCallback(
    (item: PaletteItem) => {
      // Compute canvas-space centre of the visible viewport
      let x = 100;
      let y = 100;
      if (canvasContainerRef.current) {
        const containerWidth = canvasContainerRef.current.offsetWidth;
        const containerHeight = canvasContainerRef.current.offsetHeight;
        x = Math.round((-panOffset.x + containerWidth / 2) / zoom);
        y = Math.round((-panOffset.y + containerHeight / 2) / zoom);
      }

      const nodeId = uuidv4();
      const groupId = uuidv4(); // group all preset commands

      // 1. ADD_NODE with base props + style + absolute position
      dispatch({
        type: "ADD_NODE",
        payload: {
          nodeId,
          parentId: rootNodeId,
          componentType: item.componentType,
          props: item.props ?? {},
          style: {
            ...(item.style ?? {}),
            position: "absolute",
            left: `${x}px`,
            top: `${y}px`,
          },
        },
        description: `Add ${item.name}`,
        groupId,
      });

      // 2. Apply responsive style overrides if present
      if (item.responsiveStyle) {
        for (const [bp, style] of Object.entries(item.responsiveStyle)) {
          if (!style) continue;
          dispatch({
            type: "UPDATE_RESPONSIVE_STYLE",
            payload: { nodeId, breakpoint: bp as Breakpoint, style },
            description: `Set responsive style (${bp})`,
            groupId,
          });
        }
      }

      // 3. Apply responsive props overrides if present
      if (item.responsiveProps) {
        for (const [bp, props] of Object.entries(item.responsiveProps)) {
          if (!props) continue;
          dispatch({
            type: "UPDATE_RESPONSIVE_PROPS",
            payload: { nodeId, breakpoint: bp as Breakpoint, props },
            description: `Set responsive props (${bp})`,
            groupId,
          });
        }
      }

      if (onAfterAdd) {
        onAfterAdd();
      }
    },
    [rootNodeId, zoom, panOffset, canvasContainerRef, dispatch, onAfterAdd],
  );

  return { addItem };
}

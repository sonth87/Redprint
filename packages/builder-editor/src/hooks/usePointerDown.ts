import { useCallback } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { EditorTool } from "../types";
import type { Point } from "@ui-builder/shared";
import { v4 as uuidv4 } from "uuid";

interface MovingState {
  nodeId: string;
  startPoint: Point;
  startLeft: number;
  startTop: number;
  startWidth?: number;
  startHeight?: number;
  wasAbsolute: boolean;
  gestureGroupId: string;
}

interface UsePointerDownOptions {
  activeTool: EditorTool;
  zoom: number;
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** In dual mode: the currently-active artboard ref for coordinate computations */
  activeFrameRef?: React.RefObject<HTMLDivElement | null>;
  dragStartedRef: React.MutableRefObject<boolean>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
  clearSelection: () => void;
  setMoving: (state: MovingState | null) => void;
  setRubberBanding: (state: { startPoint: Point; currentPoint: Point } | null) => void;
  selectedNodeIds: string[];
}

export interface UsePointerDownReturn {
  handlePointerDown: (e: React.PointerEvent) => void;
}

export function usePointerDown({
  activeTool,
  zoom,
  rootNodeId,
  nodes,
  canvasFrameRef,
  activeFrameRef,
  dragStartedRef,
  dispatch,
  clearSelection,
  setMoving,
  setRubberBanding,
  selectedNodeIds,
}: UsePointerDownOptions): UsePointerDownReturn {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (activeTool === "pan") return;
      const target = e.target as HTMLElement;
      if (
        target.closest("[data-resize-handle]") ||
        target.closest("[data-rotation-handle]")
      )
        return;

      let nodeEl = target.closest("[data-node-id]");

      const isForcingSelection = e.metaKey || e.ctrlKey;
      if (isForcingSelection) {
        nodeEl = null;
      }

      // Cycle Selection (Alt+Click or DoubleClick)
      if (e.altKey && nodeEl && canvasFrameRef.current) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const hitNodeIds = elements
          .map((el) => el.getAttribute("data-node-id"))
          .filter((id): id is string => id !== null && id !== rootNodeId);

        if (hitNodeIds.length > 0) {
          const currentSelectedIndex = hitNodeIds.findIndex((id) => selectedNodeIds.includes(id));
          if (currentSelectedIndex !== -1) {
            const nextIndex = (currentSelectedIndex + 1) % hitNodeIds.length;
            const nextId = hitNodeIds[nextIndex];
            const nextEl = canvasFrameRef.current.querySelector(`[data-node-id="${nextId}"]`);
            if (nextEl) {
              nodeEl = nextEl;
            }
          }
        }
      }

      if (nodeEl) {
        const id = nodeEl.getAttribute("data-node-id");
        if (id && id !== rootNodeId) {
          const node = nodes[id];
          if (node?.locked) return;

          dispatch({
            type: "SELECT_NODE",
            payload: { nodeId: id, addToSelection: e.shiftKey },
            description: "Select",
          });

          // Sections stack vertically — select only, no free drag
          if (node?.type === "Section") {
            // Start rubber banding instead of moving
            if (canvasFrameRef.current) {
              const rect = canvasFrameRef.current.getBoundingClientRect();
              const pt = {
                x: (e.clientX - rect.left) / zoom,
                y: (e.clientY - rect.top) / zoom,
              };
              setRubberBanding({ startPoint: pt, currentPoint: pt });
            }
            return;
          }

          const style = nodes[id]?.style || {};
          const el = target.closest("[data-node-id]") as HTMLElement;

          let startLeft: number;
          let startTop: number;
          if (style.position === "absolute") {
            startLeft = parseFloat(String(style.left ?? "0")) || 0;
            startTop = parseFloat(String(style.top ?? "0")) || 0;
          } else if (el && canvasFrameRef.current) {
            const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
            const frameRect = frameEl.getBoundingClientRect();
            const elRect = el.getBoundingClientRect();
            startLeft = (elRect.left - frameRect.left) / zoom;
            startTop = (elRect.top - frameRect.top) / zoom;
          } else {
            startLeft = 0;
            startTop = 0;
          }

          const startWidth = el?.offsetWidth || undefined;
          const startHeight = el?.offsetHeight || undefined;

          dragStartedRef.current = false;
          setMoving({
            nodeId: id,
            startPoint: { x: e.clientX, y: e.clientY },
            startLeft,
            startTop,
            startWidth,
            startHeight,
            wasAbsolute: style.position === "absolute",
            gestureGroupId: uuidv4(),
          });
          return;
        }
      }

      if (!e.shiftKey) {
        clearSelection();
      }

      const frame = canvasFrameRef.current || activeFrameRef?.current;
      if (frame) {
        const rect = frame.getBoundingClientRect();
        const pt = {
          x: Math.round((e.clientX - rect.left) / zoom),
          y: Math.round((e.clientY - rect.top) / zoom),
        };
        setRubberBanding({ startPoint: pt, currentPoint: pt });
      }
    },
    [
      activeTool,
      dispatch,
      clearSelection,
      zoom,
      nodes,
      rootNodeId,
      canvasFrameRef,
      activeFrameRef,
      dragStartedRef,
      setMoving,
      setRubberBanding,
      selectedNodeIds,
    ]
  );

  return { handlePointerDown };
}

import { useCallback } from "react";
import type { Point } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import { v4 as uuidv4 } from "uuid";
import { resolveContainerDropPosition } from "./useDropSlotResolver";

interface UseDragHandlersOptions {
  rootNodeId: string;
  zoom: number;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
  /** Flat nodes map — used for parent layout-type resolution */
  nodes?: Record<string, BuilderNode>;
  /**
   * Returns { layoutType, disallowedChildTypes } for a given component type.
   * Used to: (a) skip absolute position when dropping into a flow/grid container,
   * and (b) redirect the drop when the target forbids the dragged type.
   */
  getContainerConfig?: (
    componentType: string,
  ) => { layoutType?: string; disallowedChildTypes?: string[] } | undefined;
}

export interface UseDragHandlersReturn {
  handleDragStart: (componentType: string, e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
}

export function useDragHandlers({
  rootNodeId,
  zoom,
  canvasFrameRef,
  dispatch,
  nodes,
  getContainerConfig,
}: UseDragHandlersOptions): UseDragHandlersReturn {
  const handleDragStart = useCallback(
    (componentType: string, e: React.DragEvent) => {
      e.dataTransfer?.setData("application/builder-component-type", componentType);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ── 1. Extract component type ────────────────────────────────────────
      let componentType = "";
      try {
        const data = JSON.parse(e.dataTransfer?.getData("text/plain") || "{}");
        componentType = data.type;
      } catch {
        componentType =
          e.dataTransfer?.getData("application/builder-component-type") || "";
      }
      if (!componentType) return;

      // ── 2. Resolve drop target parent, respecting disallowedChildTypes ───
      const targetEl = (e.target as HTMLElement).closest("[data-node-id]");
      let parentId = targetEl?.getAttribute("data-node-id") ?? rootNodeId;

      if (nodes && getContainerConfig) {
        // Walk up the DOM until we find a parent that accepts this component type
        let candidateEl: HTMLElement | null = targetEl as HTMLElement | null;
        while (candidateEl) {
          const candidateId = candidateEl.getAttribute("data-node-id") ?? rootNodeId;
          const candidateNode = nodes[candidateId];
          if (candidateNode) {
            const cfg = getContainerConfig(candidateNode.type);
            if (!cfg?.disallowedChildTypes?.includes(componentType)) {
              parentId = candidateId;
              break;
            }
          }
          // Move up one level
          candidateEl = candidateEl.parentElement?.closest("[data-node-id]") as HTMLElement | null;
        }
        // If we walked all the way up without a valid parent, fall back to root
        const finalNode = nodes[parentId];
        if (finalNode) {
          const cfg = getContainerConfig(finalNode.type);
          if (cfg?.disallowedChildTypes?.includes(componentType)) {
            parentId = rootNodeId;
          }
        }
      }

      // ── 3. Compute canvas-space drop position ────────────────────────────
      let position: Point | undefined;
      if (canvasFrameRef.current) {
        const frameRect = canvasFrameRef.current.getBoundingClientRect();
        position = {
          x: Math.round((e.clientX - frameRect.left) / zoom),
          y: Math.round((e.clientY - frameRect.top) / zoom),
        };
      }

      // ── 4. Skip absolute position for flow/grid parents ──────────────────
      if (nodes && getContainerConfig) {
        const parentNode = nodes[parentId];
        if (parentNode) {
          const cfg = getContainerConfig(parentNode.type);
          const layoutType = cfg?.layoutType ?? "absolute";
          if (layoutType !== "absolute") {
            position = undefined; // Children flow naturally — no position:absolute
          }
        }
      }

      // ── 5. Compute insert index for flow/grid parents ─────────────────────
      let insertIndex: number | undefined;
      if (nodes && getContainerConfig && canvasFrameRef.current) {
        const parentNode = nodes[parentId];
        if (parentNode) {
          const cfg = getContainerConfig(parentNode.type);
          const layoutType = cfg?.layoutType ?? "absolute";
          if (layoutType !== "absolute") {
            const frameEl = canvasFrameRef.current;
            const containerEl = frameEl.querySelector(
              `[data-node-id="${parentId}"]`,
            ) as HTMLElement | null;
            if (containerEl) {
              const siblings = Object.values(nodes).filter(
                (n) => n.parentId === parentId,
              );
              const result = resolveContainerDropPosition(
                e.clientX,
                e.clientY,
                containerEl,
                parentNode,
                siblings,
                getContainerConfig,
              );
              insertIndex = result.insertIndex;
            }
          }
        }
      }

      // ── 6. Dispatch ADD_NODE ─────────────────────────────────────────────
      const nodeId = uuidv4();
      dispatch({
        type: "ADD_NODE",
        payload: { nodeId, parentId, componentType, position, insertIndex },
        description: `Add ${componentType}`,
      });
    },
    [rootNodeId, dispatch, zoom, canvasFrameRef, nodes, getContainerConfig],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  return { handleDragStart, handleDrop, handleDragOver, handleDragEnter };
}


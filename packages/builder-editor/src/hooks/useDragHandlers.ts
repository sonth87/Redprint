import { useCallback } from "react";
import type { Point } from "@ui-builder/shared";
import type { BuilderNode, PaletteDragData, Breakpoint, PaletteItem } from "@ui-builder/builder-core";
import { v4 as uuidv4 } from "uuid";
import { resolveContainerDropPosition } from "./useDropSlotResolver";

interface UseDragHandlersOptions {
  rootNodeId: string;
  zoom: number;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string; groupId?: string }) => void;
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
  onAfterDrop?: () => void;
}

export interface UseDragHandlersReturn {
  handleDragStart: (componentType: string, e: React.DragEvent) => void;
  handlePaletteDragStart: (item: PaletteItem, e: React.DragEvent) => void;
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
  onAfterDrop,
}: UseDragHandlersOptions): UseDragHandlersReturn {
  const handleDragStart = useCallback(
    (componentType: string, e: React.DragEvent) => {
      e.dataTransfer?.setData("application/builder-component-type", componentType);
    },
    [],
  );

  const handlePaletteDragStart = useCallback(
    (item: PaletteItem, e: React.DragEvent) => {
      const dragData: PaletteDragData = {
        source: "palette-item",
        componentType: item.componentType,
        presetData: {
          props: item.props ?? {},
          style: item.style,
          responsiveStyle: item.responsiveStyle,
          responsiveProps: item.responsiveProps,
        },
      };
      e.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
      e.dataTransfer?.setData("application/builder-component-type", item.componentType);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // ── 1. Extract component type + optional preset data ─────────────────
      let componentType = "";
      let presetData: PaletteDragData["presetData"] | undefined;
      try {
        const raw = e.dataTransfer?.getData("text/plain") || "{}";
        const data = JSON.parse(raw) as Record<string, unknown>;
        if (data.source === "palette-item") {
          const pdd = data as unknown as PaletteDragData;
          componentType = pdd.componentType;
          presetData = pdd.presetData;
        } else {
          componentType = String(data.type ?? "");
        }
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
      const groupId = presetData ? uuidv4() : undefined;
      dispatch({
        type: "ADD_NODE",
        payload: {
          nodeId,
          parentId,
          componentType,
          position,
          insertIndex,
          ...(presetData?.props ? { props: presetData.props } : {}),
          ...(presetData?.style ? { style: { ...presetData.style, ...(position ? { position: "absolute", left: `${position.x}px`, top: `${position.y}px` } : {}) } } : {}),
        },
        description: `Add ${componentType}`,
        groupId,
      });

      // ── 7. Apply preset responsive overrides ─────────────────────────────
      if (presetData?.responsiveStyle) {
        for (const [bp, style] of Object.entries(presetData.responsiveStyle)) {
          if (!style) continue;
          dispatch({
            type: "UPDATE_RESPONSIVE_STYLE",
            payload: { nodeId, breakpoint: bp as Breakpoint, style },
            description: `Set responsive style (${bp})`,
            groupId,
          });
        }
      }
      if (presetData?.responsiveProps) {
        for (const [bp, props] of Object.entries(presetData.responsiveProps)) {
          if (!props) continue;
          dispatch({
            type: "UPDATE_RESPONSIVE_PROPS",
            payload: { nodeId, breakpoint: bp as Breakpoint, props },
            description: `Set responsive props (${bp})`,
            groupId,
          });
        }
      }

      if (onAfterDrop) {
        onAfterDrop();
      }
    },
    [rootNodeId, dispatch, zoom, canvasFrameRef, nodes, getContainerConfig, onAfterDrop],
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

  return { handleDragStart, handlePaletteDragStart, handleDrop, handleDragOver, handleDragEnter };
}

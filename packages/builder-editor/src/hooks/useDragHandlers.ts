import { useCallback, useState } from "react";
import type { Point } from "@ui-builder/shared";
import type { BuilderNode, PaletteDragData, Breakpoint, PaletteItem } from "@ui-builder/builder-core";
import { v4 as uuidv4 } from "uuid";
import { resolveContainerDropPosition } from "./useDropSlotResolver";
import { resolveContainerLayoutType, type ContainerConfigResolver, getDropTargetSection } from "./dragUtils";
import { generateRecursiveAddActions } from "./presetUtils";

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
    nodeOrType: BuilderNode | string,
  ) => { layoutType?: string; disallowedChildTypes?: string[] } | undefined;
  onAfterDrop?: () => void;
}

export interface UseDragHandlersReturn {
  handleDragStart: (componentType: string, e: React.DragEvent) => void;
  handlePaletteDragStart: (item: PaletteItem, e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragEnter: (e: React.DragEvent) => void;
  /** True while a Designed Section item is being dragged from the palette. */
  isDSDragging: boolean;
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
  const [isDSDragging, setIsDSDragging] = useState(false);

  const buildPresetProps = useCallback((item: PaletteItem) => {
    if (!item.icon || item.props?.icon) {
      return item.props ?? {};
    }

    return {
      ...(item.props ?? {}),
      icon: item.icon,
    };
  }, []);

  const handleDragStart = useCallback(
    (componentType: string, e: React.DragEvent) => {
      e.dataTransfer?.setData("application/builder-component-type", componentType);
    },
    [],
  );

  const handlePaletteDragStart = useCallback(
    (item: PaletteItem, e: React.DragEvent) => {
      const isDesignedSection = item.componentType === "Section" && item.children && item.children.length > 0;
      const dragData: PaletteDragData = {
        source: "palette-item",
        componentType: item.componentType,
        presetData: {
          props: buildPresetProps(item),
          style: item.style,
          responsiveStyle: item.responsiveStyle,
          responsiveProps: item.responsiveProps,
          children: item.children,
        },
      };
      e.dataTransfer?.setData("text/plain", JSON.stringify(dragData));
      e.dataTransfer?.setData("application/builder-component-type", item.componentType);
      // Marker so SectionOverlay can detect a DS drag from dragenter/dragover events
      if (isDesignedSection) {
        e.dataTransfer?.setData("application/builder-designed-section", "true");
        setIsDSDragging(true);
      } else {
        setIsDSDragging(false);
      }
    },
    [buildPresetProps],
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
      let parentId = rootNodeId;

      if (nodes && getContainerConfig && canvasFrameRef.current) {
        if (componentType === "Section") {
          parentId = rootNodeId;
        } else {
          const targetEl = (e.target as HTMLElement).closest("[data-node-id]");
          let candidateEl = targetEl as HTMLElement | null;
          let isValidFlowTarget = false;
          
          while (candidateEl) {
            const candidateId = candidateEl.getAttribute("data-node-id") ?? rootNodeId;
            const candidateNode = nodes[candidateId];
            if (candidateNode) {
              const cfg = getContainerConfig(candidateNode);
              const layoutType = resolveContainerLayoutType(candidateNode, getContainerConfig as ContainerConfigResolver | undefined);
              
              // If we find a flow container that accepts this child, we drop into it.
              if (layoutType !== "absolute" && !cfg?.disallowedChildTypes?.includes(componentType)) {
                parentId = candidateId;
                isValidFlowTarget = true;
                break;
              }
            }
            candidateEl = candidateEl.parentElement?.closest("[data-node-id]") as HTMLElement | null;
          }
          
          // If we didn't find a valid flow container target organically, use geometric hit test for the Section parent!
          if (!isValidFlowTarget) {
            parentId = getDropTargetSection(e.clientY, canvasFrameRef.current, nodes, rootNodeId);
            
            // Check if even the section rejects this type (fallback to root if true)
            const finalNode = nodes[parentId];
            if (finalNode) {
              const cfg = getContainerConfig(finalNode);
              if (cfg?.disallowedChildTypes?.includes(componentType)) {
                parentId = rootNodeId;
              }
            }
          }
        }
      }

      // ── 3. Compute local space drop position ────────────────────────────
      let position: Point | undefined;
      if (canvasFrameRef.current) {
        if (parentId !== rootNodeId && nodes && nodes[parentId]) {
          // Local position to parent
          const parentEl = canvasFrameRef.current.querySelector(`[data-node-id="${parentId}"]`) as HTMLElement | null;
          if (parentEl) {
            const parentRect = parentEl.getBoundingClientRect();
            position = {
              x: Math.round((e.clientX - parentRect.left) / zoom),
              y: Math.round((e.clientY - parentRect.top) / zoom),
            };
          }
        }
        // Fallback to canvas position if root
        if (!position) {
          const frameRect = canvasFrameRef.current.getBoundingClientRect();
          position = {
            x: Math.round((e.clientX - frameRect.left) / zoom),
            y: Math.round((e.clientY - frameRect.top) / zoom),
          };
        }
      }

      // ── 4. Skip absolute position for flow/grid parents ──────────────────
      if (nodes && getContainerConfig) {
        const parentNode = nodes[parentId];
        if (parentNode) {
          const layoutType = resolveContainerLayoutType(parentNode, getContainerConfig as ContainerConfigResolver | undefined);
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
          const layoutType = resolveContainerLayoutType(parentNode, getContainerConfig as ContainerConfigResolver | undefined);
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

      // ── 6. Handle Designed Section logic ────────────────────────────────
      const isDesignedSection = componentType === "Section" && presetData?.children && presetData.children.length > 0;
      const nodeId = uuidv4();
      const groupId = presetData ? uuidv4() : undefined;

      if (isDesignedSection) {
        // Redirection logic for Designed Sections
        const targetNode = nodes?.[parentId];
        const isEmptySection = targetNode?.type === "Section" && 
          !Object.values(nodes || {}).some(n => n.parentId === parentId);

        if (isEmptySection) {
          // Drop into an existing empty section
          // Apply the DS preset's section style/props onto the existing empty section.
          // Always reset height to "auto" so the section grows to fit the DS content.
          dispatch({
            type: "UPDATE_STYLE",
            payload: { nodeId: parentId, style: { height: "auto", ...presetData?.style } },
            description: `Apply DS style to section`,
            groupId,
          });
          if (presetData?.props && Object.keys(presetData.props).length > 0) {
            dispatch({
              type: "UPDATE_PROPS",
              payload: { nodeId: parentId, props: { ...presetData.props } },
              description: `Apply DS props to section`,
              groupId,
            });
          }
          generateRecursiveAddActions(presetData!.children!, parentId, groupId!, dispatch);
        } else {
          // Drop as a NEW section — always attach to rootNodeId regardless of where the drag landed
          const actualParentId = rootNodeId;
          
          dispatch({
            type: "ADD_NODE",
            payload: {
              nodeId,
              parentId: actualParentId,
              componentType: "Section",
              insertIndex,
              props: presetData?.props,
              style: presetData?.style,
            },
            description: `Add Designed Section`,
            groupId,
          });

          generateRecursiveAddActions(presetData!.children!, nodeId, groupId!, dispatch);
        }
      } else {
        // ── Standard ADD_NODE ─────────────────────────────────────────────
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

        // Recursively add children if any (for non-Section containers)
        if (presetData?.children && presetData.children.length > 0) {
          generateRecursiveAddActions(presetData.children, nodeId, groupId!, dispatch);
        }
      }

      setIsDSDragging(false);

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

  return { handleDragStart, handlePaletteDragStart, handleDrop, handleDragOver, handleDragEnter, isDSDragging };
}

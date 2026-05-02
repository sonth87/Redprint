import React, { useCallback } from "react";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { v4 as uuidv4 } from "uuid";
import type { PaletteItem, Breakpoint, BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";
import { generateRecursiveAddActions } from "./presetUtils";
import { getDropTargetSection } from "./dragUtils";

interface UseClickToAddOptions {
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  selectedNodeIds: string[];
  zoom: number;
  breakpoint: Breakpoint;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef?: React.RefObject<HTMLDivElement | null>;
  resolveComponentDefinition?: (componentType: string) => ComponentDefinition | undefined;
  dispatch: (action: { type: string; payload: unknown; description?: string; groupId?: string }) => void;
  onAfterAdd?: () => void;
  /**
   * Section ID explicitly targeted via the DS button on an empty section.
   * When set, takes priority over selectedNodeIds for Designed Section placement.
   */
  pendingTargetSectionId?: string | null;
}

/**
 * Returns a callback that, when given a PaletteItem, adds it either into a selected empty section
 * or as a new section at the end of the document.
 */
export function useClickToAdd({
  rootNodeId,
  nodes,
  selectedNodeIds,
  zoom,
  breakpoint,
  canvasContainerRef,
  canvasFrameRef,
  resolveComponentDefinition,
  dispatch,
  onAfterAdd,
  pendingTargetSectionId,
}: UseClickToAddOptions) {
  const buildPresetProps = useCallback((item: PaletteItem) => {
    if (!item.icon || item.props?.icon) {
      return item.props ?? {};
    }

    return {
      ...(item.props ?? {}),
      icon: item.icon,
    };
  }, []);

  const measureRenderedSize = useCallback((
    item: PaletteItem,
    componentDef: ComponentDefinition | undefined,
    parentWidth: number,
  ): { width: number; height: number } | null => {
    if (!componentDef || typeof document === "undefined") return null;

    const host = document.createElement("div");
    host.style.position = "absolute";
    host.style.left = "-100000px";
    host.style.top = "0";
    host.style.width = `${Math.max(parentWidth, 0)}px`;
    host.style.visibility = "hidden";
    host.style.pointerEvents = "none";
    host.style.zIndex = "-1";

    const mount = document.createElement("div");
    mount.style.position = "relative";
    mount.style.width = `${Math.max(parentWidth, 0)}px`;
    host.appendChild(mount);
    document.body.appendChild(host);

    const root = createRoot(mount);
    const nodeId = "__measure_node__";
    const timestamp = new Date().toISOString();
    const measuredNode: BuilderNode = {
      id: nodeId,
      type: item.componentType,
      parentId: null,
      order: 0,
      props: { ...(componentDef.defaultProps ?? {}), ...buildPresetProps(item) },
      style: {
        ...(componentDef.defaultStyle ?? {}),
        ...(item.style ?? {}),
        position: "absolute",
        left: "0px",
        top: "0px",
      },
      responsiveStyle: {},
      interactions: [],
      metadata: { createdAt: timestamp, updatedAt: timestamp },
    };

    try {
      flushSync(() => {
        root.render(
          React.createElement(
            React.Fragment,
            null,
            componentDef.editorRenderer({
              node: measuredNode,
              style: measuredNode.style,
              interactions: measuredNode.interactions,
              breakpoint,
            }) as React.ReactNode,
          ),
        );
      });

      const measuredEl = mount.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;
      const targetEl = measuredEl ?? (mount.firstElementChild as HTMLElement | null);
      if (!targetEl) return null;

      return {
        width: targetEl.offsetWidth,
        height: targetEl.offsetHeight,
      };
    } catch {
      return null;
    } finally {
      root.unmount();
      host.remove();
    }
  }, [breakpoint, buildPresetProps]);

  const addItem = useCallback(
    (item: PaletteItem) => {
      const isDesignedSection = item.componentType === "Section" && item.children && item.children.length > 0;
      const groupId = uuidv4();

      if (isDesignedSection) {
        // --- Special Logic for Designed Sections ---

        // Priority 1: section explicitly targeted via the DS button (pendingTargetSectionId)
        // Priority 2: currently selected node if it is an empty section
        const targetId = pendingTargetSectionId ?? selectedNodeIds[0];
        const selectedNode = targetId ? nodes[targetId] : null;
        const isEmptySection = selectedNode?.type === "Section" &&
          !Object.values(nodes).some(n => n.parentId === targetId);

        if (isEmptySection && targetId) {
          // Case: Insert children INTO the target empty section
          // Apply the DS preset's section style onto the existing empty section.
          // Always reset height to "auto" so the section grows to fit the DS content.
          dispatch({
            type: "UPDATE_STYLE",
            payload: { nodeId: targetId, style: { height: "auto", ...item.style } },
            groupId,
            description: `Apply DS style to section`,
          });
          if (item.props && Object.keys(item.props).length > 0) {
            dispatch({
              type: "UPDATE_PROPS",
              payload: { nodeId: targetId, props: { ...item.props } },
              groupId,
              description: `Apply DS props to section`,
            });
          }
          generateRecursiveAddActions(item.children!, targetId, groupId, dispatch);
        } else {
          // Case: Add as a NEW section at the end of the root
          const newNodeId = uuidv4();
          const siblings = Object.values(nodes).filter(n => n.parentId === rootNodeId);
          const lastOrder = siblings.length > 0 
            ? Math.max(...siblings.map(s => s.order ?? 0)) + 1 
            : 0;

          dispatch({
            type: "ADD_NODE",
            payload: {
              nodeId: newNodeId,
              parentId: rootNodeId,
              componentType: "Section",
              props: { ...item.props },
              style: { ...item.style },
              insertIndex: lastOrder,
            },
            groupId,
            description: `Add ${item.name}`,
          });

          // Add children recursively to the new section
          generateRecursiveAddActions(item.children!, newNodeId, groupId, dispatch);
        }
      } else {
        // --- Standard logic for other components ---
        let x = 0;
        let y = 0;
        let parentId = rootNodeId;

        if (canvasContainerRef.current && canvasFrameRef?.current) {
          const containerRect = canvasContainerRef.current.getBoundingClientRect();
          const fr = canvasFrameRef.current.getBoundingClientRect();

          // Target drop position in screen space = center of the editor viewport,
          // clamped so it lands inside the canvas frame.
          // getBoundingClientRect() already encodes zoom+pan, so the correct inverse is:
          //   canvas_coord = (screen_coord - frame_origin) / zoom
          // No panOffset manipulation needed.
          const targetScreenX = containerRect.left + containerRect.width / 2;
          const targetScreenY = Math.max(fr.top + 1, Math.min(fr.bottom - 1,
            containerRect.top + containerRect.height / 2,
          ));

          // Determine parent section from the hit Y position
          parentId = getDropTargetSection(targetScreenY, canvasFrameRef.current, nodes, rootNodeId);

          const parentEl = parentId !== rootNodeId
            ? (canvasFrameRef.current.querySelector(`[data-node-id="${parentId}"]`) as HTMLElement | null)
            : canvasFrameRef.current;
          const pr = parentEl?.getBoundingClientRect() ?? fr;

          // Convert screen target → parent-local canvas coordinates
          // (works because all children share the same zoom transform origin)
          const localX = (targetScreenX - pr.left) / zoom;
          const localY = (targetScreenY - pr.top) / zoom;

          const componentDef = resolveComponentDefinition?.(item.componentType);
          const measuredSize = measureRenderedSize(item, componentDef, pr.width / zoom);

          if (measuredSize) {
            x = Math.round(localX - measuredSize.width / 2);
            y = Math.round(localY - measuredSize.height / 2);
          } else {
            x = Math.round(localX);
            y = Math.round(localY);
          }

          x = Math.max(0, x);
          y = Math.max(0, y);
        }

        const nodeId = uuidv4();

        // 1. ADD_NODE with base props + style + absolute position
        dispatch({
          type: "ADD_NODE",
          payload: {
            nodeId,
            parentId,
            componentType: item.componentType,
            props: buildPresetProps(item),
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

        // 4. Handle children for non-Section containers (if any)
        if (item.children && item.children.length > 0) {
          generateRecursiveAddActions(item.children, nodeId, groupId, dispatch);
        }
      }

      if (onAfterAdd) {
        onAfterAdd();
      }
    },
    [rootNodeId, nodes, selectedNodeIds, pendingTargetSectionId, zoom, breakpoint, canvasContainerRef, canvasFrameRef, resolveComponentDefinition, dispatch, onAfterAdd, buildPresetProps, measureRenderedSize],
  );

  return { addItem };
}

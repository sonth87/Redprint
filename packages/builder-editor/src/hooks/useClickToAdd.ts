import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { PaletteItem, Breakpoint, BuilderNode } from "@ui-builder/builder-core";
import { generateRecursiveAddActions } from "./presetUtils";

interface UseClickToAddOptions {
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  selectedNodeIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string; groupId?: string }) => void;
  onAfterAdd?: () => void;
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
  panOffset,
  canvasContainerRef,
  dispatch,
  onAfterAdd,
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

  const addItem = useCallback(
    (item: PaletteItem) => {
      const isDesignedSection = item.componentType === "Section" && item.children && item.children.length > 0;
      const groupId = uuidv4();

      if (isDesignedSection) {
        // --- Special Logic for Designed Sections ---
        
        // 1. Check if an empty section is selected
        const selectedId = selectedNodeIds[0];
        const selectedNode = selectedId ? nodes[selectedId] : null;
        const isEmptySection = selectedNode?.type === "Section" && 
          !Object.values(nodes).some(n => n.parentId === selectedId);

        if (isEmptySection && selectedId) {
          // Case: Insert children INTO selected empty section
          generateRecursiveAddActions(item.children!, selectedId, groupId, dispatch);
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

        // 1. ADD_NODE with base props + style + absolute position
        dispatch({
          type: "ADD_NODE",
          payload: {
            nodeId,
            parentId: rootNodeId,
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
    [rootNodeId, nodes, selectedNodeIds, zoom, panOffset, canvasContainerRef, dispatch, onAfterAdd, buildPresetProps],
  );

  return { addItem };
}

import { useCallback, useMemo } from "react";
import { DEFAULT_SECTION_HEIGHT_PX } from "@ui-builder/shared";
import { v4 as uuidv4 } from "uuid";
import { SnapEngine } from "../snap/SnapEngine";
import type {
  BuilderNode,
  BuilderDocument,
  ComponentDefinition,
  ComponentRegistry,
  CanvasMode,
  Command,
  CommandResult,
} from "@ui-builder/builder-core";

interface UseCanvasActionsParams {
  document: BuilderDocument;
  allComponents: ComponentDefinition[];
  registry: ComponentRegistry | undefined;
  canvasMode: CanvasMode;
  canvasWidth: number;
  canvasMinHeight: number;
  /** Actual rendered canvas height (offsetHeight) for accurate snap bounds */
  canvasActualHeight?: number;
  showGrid: boolean;
  dispatch: (command: Command) => CommandResult | void;
}

/**
 * Provides canvas-level action callbacks and derived values:
 * - `snapEngine`         — SnapEngine instance, memoised on config changes
 * - `getContainerConfig` — resolves container layout config for a component type
 * - `handleAddSection`   — inserts a new Section node after the given sibling order
 * - `setCanvasMode`      — dispatches SET_CANVAS_MODE
 * - `toggleCanvasMode`   — toggles between single / dual canvas mode
 */
export function useCanvasActions({
  document,
  allComponents: _allComponents,
  registry,
  canvasMode,
  canvasWidth,
  canvasMinHeight,
  canvasActualHeight,
  showGrid,
  dispatch,
}: UseCanvasActionsParams) {
  const snapEngine = useMemo(
    () =>
      new SnapEngine({
        gridSize: document.canvasConfig.gridSize,
        snapEnabled: showGrid,
        snapToGrid: showGrid,
        snapToComponents: document.canvasConfig.snapToComponents,
        threshold: document.canvasConfig.snapThreshold,
        canvasWidth,
        canvasHeight: canvasActualHeight ?? canvasMinHeight,
      }),
    [document.canvasConfig, showGrid, canvasWidth, canvasMinHeight, canvasActualHeight],
  );

  const getContainerConfig = useCallback(
    (nodeOrType: BuilderNode | string) => {
      const componentType = typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type;
      const def = registry?.getComponent(componentType);
      return def?.containerConfig
        ? {
            layoutType: def.containerConfig.layoutType,
            disallowedChildTypes: def.containerConfig.disallowedChildTypes,
          }
        : undefined;
    },
    [registry],
  );

  const handleAddSection = useCallback(
    (afterOrder: number) => {
      dispatch({
        type: "ADD_NODE",
        payload: {
          nodeId: uuidv4(),
          parentId: document.rootNodeId,
          componentType: "Section",
          props: { minHeight: DEFAULT_SECTION_HEIGHT_PX },
          style: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minHeight: "400px",
            position: "relative",
            backgroundColor: "#ffffff",
          },
          insertIndex: afterOrder + 1,
        },
        description: "Add section",
      });
    },
    [dispatch, document.rootNodeId],
  );

  const setCanvasMode = useCallback(
    (mode: CanvasMode) =>
      dispatch({
        type: "SET_CANVAS_MODE",
        payload: { canvasMode: mode },
        description: "Toggle canvas mode",
      }),
    [dispatch],
  );

  const toggleCanvasMode = useCallback(
    () => setCanvasMode(canvasMode === "dual" ? "single" : "dual"),
    [canvasMode, setCanvasMode],
  );

  return {
    snapEngine,
    getContainerConfig,
    handleAddSection,
    setCanvasMode,
    toggleCanvasMode,
  };
}

import { useCallback } from "react";
import type { BuilderNode, CanvasConfig } from "@ui-builder/builder-core";

type DispatchFn = (action: { type: string; payload: unknown; description?: string }) => void;

interface UseNodeHandlersOptions {
  selectedNodeId: string | null;
  breakpoint: string;
  dispatch: DispatchFn;
  nodes: Record<string, BuilderNode>;
}

export interface UseNodeHandlersReturn {
  /** Toggle hidden state of any node (e.g. from layer tree). */
  handleToggleHidden: (nodeId: string) => void;
  /** Toggle locked state of any node (e.g. from layer tree). */
  handleToggleLocked: (nodeId: string) => void;
  /** Update a prop on the selected node (responsive-aware). */
  handlePropChange: (key: string, value: unknown) => void;
  /** Update a style property on the selected node. */
  handleStyleChange: (key: string, value: unknown) => void;
  /** Update a canvas-level config value. */
  handleCanvasConfigChange: (key: keyof CanvasConfig, value: unknown) => void;
}

/** All property/style/visibility mutation handlers for the editor panels. */
export function useNodeHandlers({
  selectedNodeId,
  breakpoint,
  dispatch,
  nodes,
}: UseNodeHandlersOptions): UseNodeHandlersReturn {
  const handleToggleHidden = useCallback(
    (nodeId: string) => {
      const node = nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.hidden ? "SHOW_NODE" : "HIDE_NODE",
        payload: { nodeId },
        description: node.hidden ? "Show" : "Hide",
      });
    },
    [nodes, dispatch],
  );

  const handleToggleLocked = useCallback(
    (nodeId: string) => {
      const node = nodes[nodeId];
      if (!node) return;
      dispatch({
        type: node.locked ? "UNLOCK_NODE" : "LOCK_NODE",
        payload: { nodeId },
        description: node.locked ? "Unlock" : "Lock",
      });
    },
    [nodes, dispatch],
  );

  const handlePropChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      if (!breakpoint || breakpoint === "desktop") {
        dispatch({
          type: "UPDATE_PROPS",
          payload: { nodeId: selectedNodeId, props: { [key]: value } },
          description: `Set ${key}`,
        });
      } else {
        dispatch({
          type: "UPDATE_RESPONSIVE_PROPS",
          payload: { nodeId: selectedNodeId, breakpoint, props: { [key]: value } },
          description: `Set ${key}`,
        });
      }
    },
    [selectedNodeId, breakpoint, dispatch],
  );

  const handleStyleChange = useCallback(
    (key: string, value: unknown) => {
      if (!selectedNodeId) return;
      dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: selectedNodeId, style: { [key]: value } as never, breakpoint },
        description: `Set style.${key}`,
      });
    },
    [selectedNodeId, breakpoint, dispatch],
  );

  const handleCanvasConfigChange = useCallback(
    (key: keyof CanvasConfig, value: unknown) => {
      dispatch({
        type: "UPDATE_CANVAS_CONFIG",
        payload: { config: { [key]: value } },
        description: "Update page settings",
      });
    },
    [dispatch],
  );

  return {
    handleToggleHidden,
    handleToggleLocked,
    handlePropChange,
    handleStyleChange,
    handleCanvasConfigChange,
  };
}

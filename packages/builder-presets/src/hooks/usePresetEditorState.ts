import { useState } from "react";
import type { ComponentRegistry } from "@ui-builder/builder-core";
import { useBuilder, useSelection, useBreakpoint } from "@ui-builder/builder-react";
import type { PaletteItem } from "../types/palette.types";
import type { InsertTarget } from "../components/NodeTreePanel";

export type PanelTab = "info" | "properties" | "layout";
export type StructureMode = "semantic" | "layers";

function getAllowedComponentTypesForInsertTarget(
  target: InsertTarget | null,
  nodes: Record<string, { id: string; parentId: string | null; type: string }>,
  registry: ComponentRegistry,
  rootNodeId: string,
): string[] | undefined {
  if (!target) return undefined;

  if (target.mode === "inside") {
    const targetNode = nodes[target.nodeId];
    if (!targetNode) return undefined;
    return registry.getComponent(targetNode.type)?.capabilities.acceptedChildTypes;
  }

  const targetNode = nodes[target.nodeId];
  if (!targetNode) return undefined;

  const parentId = targetNode.parentId ?? rootNodeId;
  const parentNode = nodes[parentId];
  if (!parentNode) return undefined;

  return registry.getComponent(parentNode.type)?.capabilities.acceptedChildTypes;
}

export function usePresetEditorState(
  registry: ComponentRegistry,
  allPresets: PaletteItem[] = []
) {
  const { state, dispatch } = useBuilder();
  const { selectedNodeIds } = useSelection();
  const { breakpoint } = useBreakpoint();

  const [activeTab, setActiveTab] = useState<PanelTab>("properties");
  const [structureMode, setStructureMode] = useState<StructureMode>("semantic");
  const [insertTarget, setInsertTarget] = useState<InsertTarget | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<InsertTarget | null>(null);

  const selectedNodeId = selectedNodeIds[0] ?? state.document.rootNodeId;
  const selectedNode = state.document.nodes[selectedNodeId] ?? null;
  const selectedDefinition = selectedNode
    ? (registry.getComponent(selectedNode.type) ?? null)
    : null;

  const allowedComponentTypes = getAllowedComponentTypesForInsertTarget(
    insertTarget,
    state.document.nodes,
    registry,
    state.document.rootNodeId,
  );
  const allowedReplaceTypes = getAllowedComponentTypesForInsertTarget(
    replaceTarget,
    state.document.nodes,
    registry,
    state.document.rootNodeId,
  );

  const handleAddChildConfirm = (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => {
    if (!insertTarget) return;

    const targetNode = state.document.nodes[insertTarget.nodeId];
    if (!targetNode) return;

    let parentId = insertTarget.nodeId;
    let insertIndex = Object.values(state.document.nodes).filter(
      (n) => n.parentId === parentId,
    ).length;

    if (insertTarget.mode !== "inside") {
      parentId = targetNode.parentId ?? state.document.rootNodeId;
      const siblings = Object.values(state.document.nodes)
        .filter((n) => n.parentId === parentId)
        .sort((a, b) => a.order - b.order);
      const targetIndex = siblings.findIndex((n) => n.id === targetNode.id);
      insertIndex = insertTarget.mode === "before" ? targetIndex : targetIndex + 1;
    }

    dispatch({
      type: "ADD_NODE",
      payload: { parentId, componentType, props, style, insertIndex },
    });
    setInsertTarget(null);
  };

  const handleRemoveNode = (nodeId: string) => {
    dispatch({ type: "REMOVE_NODE", payload: { nodeId } });
  };

  const handleReplaceNodeConfirm = (
    componentType: string,
    props: Record<string, unknown>,
    style: Record<string, unknown>,
  ) => {
    if (!replaceTarget) return;

    const targetNode = state.document.nodes[replaceTarget.nodeId];
    if (!targetNode || !targetNode.parentId) return;

    const parentId = targetNode.parentId;
    const insertIndex = targetNode.order;

    dispatch({ type: "REMOVE_NODE", payload: { nodeId: targetNode.id } });
    dispatch({
      type: "ADD_NODE",
      payload: { parentId, componentType, props, style, insertIndex },
    });
    setReplaceTarget(null);
  };

  const handleReorderNode = (nodeId: string, targetParentId: string | undefined, insertIndex: number) => {
    dispatch({
      type: "MOVE_NODE",
      payload: { nodeId, targetParentId, insertIndex },
    });
  };

  const handleDuplicateNode = (nodeId: string) => {
    dispatch({
      type: "DUPLICATE_NODE",
      payload: { nodeId },
    });
  };

  return {
    state,
    dispatch,
    breakpoint,
    activeTab,
    setActiveTab,
    structureMode,
    setStructureMode,
    insertTarget,
    setInsertTarget,
    replaceTarget,
    setReplaceTarget,
    selectedNodeId,
    selectedNode,
    selectedDefinition,
    allowedComponentTypes,
    allowedReplaceTypes,
    handleAddChildConfirm,
    handleRemoveNode,
    handleReplaceNodeConfirm,
    handleReorderNode,
    handleDuplicateNode,
  };
}

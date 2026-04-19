import { useState, useCallback, useMemo } from "react";
import type { BuilderDocument, BuilderNode, ComponentDefinition, StyleConfig } from "@ui-builder/builder-core";
import type { PaletteItem } from "@/types/palette.types";
import { buildPreviewDocument } from "@/lib/buildPreviewDocument";
import { registry } from "@/lib/registry";

export interface UseDocumentEditorReturn {
  document: BuilderDocument;
  selectedNodeId: string;
  selectedNode: BuilderNode | null;
  selectedDefinition: ComponentDefinition | null;
  selectNode: (id: string) => void;
  updateNodeProp: (nodeId: string, key: string, value: unknown) => void;
  updateNodeStyle: (nodeId: string, key: string, value: unknown) => void;
  addChildNode: (parentId: string, componentType: string) => string;
  removeNode: (nodeId: string) => void;
  reset: () => void;
}

function buildInitialDoc(item: PaletteItem): BuilderDocument {
  return buildPreviewDocument(
    item.componentType,
    item.props,
    (item.style ?? {}) as Partial<StyleConfig>,
    item.children,
  );
}

function getAllDescendants(nodes: Record<string, BuilderNode>, nodeId: string): Set<string> {
  const result = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const id = queue.pop()!;
    for (const n of Object.values(nodes)) {
      if (n.parentId === id) {
        result.add(n.id);
        queue.push(n.id);
      }
    }
  }
  return result;
}

export function useDocumentEditor(item: PaletteItem): UseDocumentEditorReturn {
  const initialDoc = useMemo(() => buildInitialDoc(item), []); // eslint-disable-line react-hooks/exhaustive-deps

  const [doc, setDoc] = useState<BuilderDocument>(initialDoc);
  const [selectedNodeId, setSelectedNodeId] = useState<string>(initialDoc.rootNodeId);

  const selectedNode = doc.nodes[selectedNodeId] ?? null;
  const selectedDefinition = selectedNode ? (registry.getComponent(selectedNode.type) ?? null) : null;

  const selectNode = useCallback((id: string) => {
    setSelectedNodeId(id);
  }, []);

  const updateNodeProp = useCallback((nodeId: string, key: string, value: unknown) => {
    setDoc((prev) => {
      const node = prev.nodes[nodeId];
      if (!node) return prev;
      const updated: BuilderNode = { ...node, props: { ...node.props, [key]: value } };
      return { ...prev, nodes: { ...prev.nodes, [nodeId]: updated } };
    });
  }, []);

  const updateNodeStyle = useCallback((nodeId: string, key: string, value: unknown) => {
    setDoc((prev) => {
      const node = prev.nodes[nodeId];
      if (!node) return prev;
      const nextStyle = { ...(node.style as Record<string, unknown>) };
      if (value === undefined || value === "") {
        delete nextStyle[key];
      } else {
        nextStyle[key] = value;
      }
      const updated: BuilderNode = { ...node, style: nextStyle as StyleConfig };
      return { ...prev, nodes: { ...prev.nodes, [nodeId]: updated } };
    });
  }, []);

  const addChildNode = useCallback((parentId: string, componentType: string): string => {
    const id = `node-${Date.now()}`;
    const def = registry.getComponent(componentType);
    const childCount = Object.values(doc.nodes).filter((n) => n.parentId === parentId).length;
    const newNode: BuilderNode = {
      id,
      type: componentType,
      parentId,
      order: childCount,
      props: def?.defaultProps ?? {},
      style: (def?.defaultStyle ?? {}) as StyleConfig,
      responsiveStyle: {},
      interactions: [],
    };
    setDoc((prev) => ({
      ...prev,
      nodes: { ...prev.nodes, [id]: newNode },
    }));
    return id;
  }, [doc.nodes]);

  const removeNode = useCallback((nodeId: string) => {
    setDoc((prev) => {
      if (nodeId === prev.rootNodeId) return prev;
      const descendants = getAllDescendants(prev.nodes, nodeId);
      descendants.add(nodeId);
      const nodes = { ...prev.nodes };
      descendants.forEach((id) => delete nodes[id]);
      return { ...prev, nodes };
    });
    setSelectedNodeId((prev) => {
      const descendants = getAllDescendants(doc.nodes, nodeId);
      descendants.add(nodeId);
      return descendants.has(prev) ? doc.rootNodeId : prev;
    });
  }, [doc.nodes, doc.rootNodeId]);

  const reset = useCallback(() => {
    const fresh = buildInitialDoc(item);
    setDoc(fresh);
    setSelectedNodeId(fresh.rootNodeId);
  }, [item]);

  return {
    document: doc,
    selectedNodeId,
    selectedNode,
    selectedDefinition,
    selectNode,
    updateNodeProp,
    updateNodeStyle,
    addChildNode,
    removeNode,
    reset,
  };
}

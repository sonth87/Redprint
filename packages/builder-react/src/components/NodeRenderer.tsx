import React, { useCallback, useEffect, useRef } from "react";
import type { BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";
import { resolveStyle } from "@ui-builder/builder-core";
import { useBuilder } from "../hooks/useBuilder";

export interface NodeRendererProps {
  nodeId: string;
  mode?: "editor" | "runtime";
}

/**
 * NodeRenderer — resolves and renders a single BuilderNode.
 *
 * - Looks up the node by ID from state
 * - Looks up the ComponentDefinition from the registry
 * - Resolves the effective style for the active breakpoint
 * - Invokes either editorRenderer or runtimeRenderer based on mode
 * - Recursively renders child nodes
 * - Reports render errors via builder events (does not throw)
 *
 * @example
 * <NodeRenderer nodeId={rootNode.id} mode="editor" />
 */
export function NodeRenderer({ nodeId, mode = "editor" }: NodeRendererProps) {
  const { state, builder } = useBuilder();
  const node = state.document.nodes[nodeId];

  if (!node) {
    return null;
  }

  // Lookup registry — exposed via builder API
  const registry = builder.registry;
  const def: ComponentDefinition | undefined = registry?.getComponent(node.type);

  if (!def) {
    // Emit error event for missing component type
    builder.dispatch({
      type: "COMPONENT_RENDER_ERROR",
      payload: { nodeId, type: node.type, error: `No component registered for type "${node.type}"` },
      description: "Render error",
    });
    return (
      <div
        data-node-id={nodeId}
        style={{ border: "1px dashed red", padding: 4, fontSize: 12, color: "red" }}
      >
        Unknown component: {node.type}
      </div>
    );
  }

  // Resolve style for active breakpoint
  const resolvedStyle = resolveStyle(
    node.style,
    node.responsiveStyle,
    state.editor.activeBreakpoint,
  );

  // Build children
  const childNodes = Object.values(state.document.nodes).filter(
    (n) => n.parentId === nodeId,
  ).sort((a, b) => a.order - b.order);

  const children = childNodes.map((child) => (
    <NodeRenderer key={child.id} nodeId={child.id} mode={mode} />
  ));

  const renderer = mode === "editor" ? def.editorRenderer : def.runtimeRenderer;

  try {
    const rendered = renderer({
      node,
      children: children.length > 0 ? children : undefined,
      style: resolvedStyle,
      interactions: node.interactions,
    });
    return rendered as React.ReactElement;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    builder.dispatch({
      type: "COMPONENT_RENDER_ERROR",
      payload: { nodeId, type: node.type, error },
      description: "Render error",
    });
    return (
      <div
        data-node-id={nodeId}
        style={{ border: "1px dashed red", padding: 4, fontSize: 12, color: "red" }}
      >
        Render error in {node.type}: {error}
      </div>
    );
  }
}

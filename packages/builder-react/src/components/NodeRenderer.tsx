import React, { useCallback, useEffect, useRef } from "react";
import type { BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";
import { resolveStyle, resolveProps, resolveVisibility } from "@ui-builder/builder-core";
import { useBuilder } from "../hooks/useBuilder";
import { useResolvedBreakpoint } from "../hooks/useResolvedBreakpoint";

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
  // Use override context if inside a BreakpointOverrideProvider (e.g. dual canvas),
  // otherwise fall back to global active breakpoint.
  const breakpoint = useResolvedBreakpoint();

  // Track render errors to report via effect (avoids setState during render)
  const renderErrorRef = useRef<string | null>(null);
  useEffect(() => {
    if (renderErrorRef.current) {
      builder.dispatch({
        type: "COMPONENT_RENDER_ERROR",
        payload: { nodeId, type: node?.type ?? "unknown", error: renderErrorRef.current },
        description: "Render error",
      });
      renderErrorRef.current = null;
    }
  });

  if (!node) {
    return null;
  }

  // Check per-breakpoint visibility (respects responsiveHidden and global hidden).
  // In runtime mode: omit entirely. In editor mode: render dimmed so user can still select/edit.
  const visible = resolveVisibility(node, breakpoint);
  if (!visible && mode === "runtime") return null;

  // Lookup registry — exposed via builder API
  const registry = builder.registry;
  const def: ComponentDefinition | undefined = registry?.getComponent(node.type);

  if (!def) {
    renderErrorRef.current = `No component registered for type "${node.type}"`;
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
    breakpoint,
  );

  // Resolve props: merge base props with breakpoint-specific overrides
  const resolvedProps = resolveProps(node.props, node.responsiveProps, breakpoint);

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
      node: { ...node, props: resolvedProps },
      children: children.length > 0 ? children : undefined,
      style: resolvedStyle,
      interactions: node.interactions,
    });
    // Inject data-node-id so canvas event handlers can identify nodes via
    // closest("[data-node-id]") / querySelector("[data-node-id]")
    if (React.isValidElement(rendered)) {
      const extraProps: Record<string, unknown> = { "data-node-id": nodeId };
      // In editor mode, dim hidden nodes so they are visible but clearly marked as hidden
      if (!visible && mode === "editor") {
        extraProps["data-editor-hidden"] = "true";
        const existingStyle = (rendered.props as Record<string, unknown>).style as React.CSSProperties | undefined;
        extraProps.style = { ...existingStyle, opacity: 0.35, outline: "2px dashed rgba(99,102,241,0.5)", outlineOffset: "-2px" };
      }
      return React.cloneElement(
        rendered as React.ReactElement<Record<string, unknown>>,
        extraProps,
      );
    }
    return rendered as React.ReactElement;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    renderErrorRef.current = error;
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

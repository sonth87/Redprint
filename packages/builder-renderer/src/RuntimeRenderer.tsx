import React, { createContext, useContext, useState, useCallback, useMemo, memo } from "react";
import type { BuilderDocument, Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { ComponentRegistry, resolveStyle, resolveProps, resolveVisibility } from "@ui-builder/builder-core";
import type { RendererConfig } from "./types";
import { StylePipeline } from "./pipeline/StylePipeline";
import { InteractionBinder } from "./pipeline/InteractionBinder";

// ── Runtime Context ───────────────────────────────────────────────────────

interface RuntimeContextValue {
  document: BuilderDocument;
  registry: ComponentRegistry;
  breakpoint: Breakpoint;
  variables: Record<string, unknown>;
  setVariable: (key: string, value: unknown) => void;
  attachNodeIds: boolean;
  missingComponentFallback?: ComponentDefinition;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

function useRuntimeContext(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error("[RuntimeRenderer] Used outside <RuntimeRenderer>");
  return ctx;
}

// ── RuntimeNode ─────────────────────────────────────────────────────────────

const RuntimeNode = memo(function RuntimeNode({ nodeId }: { nodeId: string }) {
  const ctx = useRuntimeContext();
  const node = ctx.document.nodes[nodeId];

  if (!node) return null;

  // Resolve per-breakpoint visibility (respects both global hidden and responsiveHidden)
  if (!resolveVisibility(node, ctx.breakpoint)) return null;

  const def =
    ctx.registry.getComponent(node.type) ??
    ctx.missingComponentFallback;

  if (!def) {
    return React.createElement("div", {
      "data-node-id": ctx.attachNodeIds ? nodeId : undefined,
      style: { border: "1px dashed #f00", padding: 4, fontSize: 12, color: "#f00" },
    }, `Unknown component: ${node.type}`);
  }

  // Resolve style for active breakpoint
  const resolvedStyle = StylePipeline.resolve(node, ctx.breakpoint);
  const cssProps = StylePipeline.toCSSProperties(resolvedStyle);

  // Bind interactions to React event handlers
  const interactionHandlers = InteractionBinder.bindAll(
    node.interactions,
    ctx.variables,
    (type, payload) => {
      if (type === "SET_VARIABLE") {
        const { key, value } = payload as { key: string; value: unknown };
        ctx.setVariable(key, value);
      }
      // Other action types handled externally
    },
  );

  // Build sorted children
  const childIds = Object.values(ctx.document.nodes)
    .filter((n) => n.parentId === nodeId)
    .sort((a, b) => a.order - b.order)
    .map((n) => n.id);

  const children = childIds.map((id) =>
    React.createElement(RuntimeNode, { key: id, nodeId: id }),
  );

  const extraProps: Record<string, unknown> = {
    ...interactionHandlers,
  };

  if (ctx.attachNodeIds) {
    extraProps["data-node-id"] = nodeId;
  }

  try {
    // Resolve per-breakpoint props override
    const resolvedNodeProps = resolveProps(node.props, node.responsiveProps, ctx.breakpoint);
    const rendered = def.runtimeRenderer({
      node: { ...node, props: resolvedNodeProps },
      children: children.length > 0 ? children : undefined,
      style: resolvedStyle,
      interactions: node.interactions,
      breakpoint: ctx.breakpoint,
    });

    // Inject extra props into the top-level element if it's a React element
    if (React.isValidElement(rendered) && (extraProps["data-node-id"] || Object.keys(interactionHandlers).length > 0)) {
      return React.cloneElement(rendered as React.ReactElement<Record<string, unknown>>, extraProps);
    }
    return rendered as React.ReactElement;
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return React.createElement("div", {
      style: { border: "1px dashed #f00", padding: 4, fontSize: 12, color: "#f00" },
    }, `Render error in ${node.type}: ${error}`);
  }
});

// ── RuntimeRenderer ───────────────────────────────────────────────────────

export interface RuntimeRendererProps {
  document: BuilderDocument;
  registry: ComponentRegistry;
  config?: RendererConfig;
}

/**
 * RuntimeRenderer — the production-runtime React renderer.
 *
 * Renders a BuilderDocument into a React element tree.
 * - Resolves components from the registry
 * - Applies style pipeline (base + breakpoint merging)
 * - Binds interactions as React event handlers
 * - Evaluates variables
 * - Supports SSR (no DOM-specific APIs)
 *
 * @example
 * <RuntimeRenderer
 *   document={myDocument}
 *   registry={myRegistry}
 *   config={{ breakpoint: 'mobile', variables: { name: 'World' } }}
 * />
 */
export function RuntimeRenderer({ document, registry, config = {} }: RuntimeRendererProps) {
  const {
    breakpoint = "desktop",
    variables: initialVariables = {},
    missingComponentFallback,
    attachNodeIds = false,
  } = config;

  const [variables, setVariables] = useState<Record<string, unknown>>(() => ({
    // Merge document default variable values with initial overrides
    ...Object.fromEntries(
      Object.entries(document.variables).map(([key, def]) => [key, def.defaultValue]),
    ),
    ...initialVariables,
  }));

  const setVariable = useCallback((key: string, value: unknown) => {
    setVariables((prev) => ({ ...prev, [key]: value }));
  }, []);

  const contextValue = useMemo<RuntimeContextValue>(
    () => ({
      document,
      registry,
      breakpoint,
      variables,
      setVariable,
      attachNodeIds,
      missingComponentFallback,
    }),
    [document, registry, breakpoint, variables, setVariable, attachNodeIds, missingComponentFallback],
  );

  return React.createElement(
    RuntimeContext.Provider,
    { value: contextValue },
    React.createElement(RuntimeNode, { nodeId: document.rootNodeId }),
  );
}

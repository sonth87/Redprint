import React, { createContext, useContext, useState, useCallback, useMemo, memo, useRef, useEffect } from "react";
import type { BuilderDocument, Breakpoint, ComponentDefinition } from "@ui-builder/builder-core";
import { ComponentRegistry, resolveProps, resolveVisibility } from "@ui-builder/builder-core";
import { ANIMATION_KEYFRAMES_CSS, PRESET_KEYFRAME, PRESET_INITIAL } from "@ui-builder/shared";
import type { RendererConfig } from "./types";
import { StylePipeline } from "./pipeline/StylePipeline";
import { InteractionBinder } from "./pipeline/InteractionBinder";

function AnimationKeyframes() {
  return <style>{ANIMATION_KEYFRAMES_CSS}</style>;
}

// Walk up the DOM to find the nearest scrollable ancestor.
// Used as IntersectionObserver root so it works inside overflow:auto containers
// (e.g. editor preview pane) as well as normal window-scroll pages.
function findScrollContainer(el: Element): Element | null {
  let parent = el.parentElement;
  while (parent && parent !== document.documentElement) {
    const { overflow, overflowY } = getComputedStyle(parent);
    if (/auto|scroll/.test(overflow) || /auto|scroll/.test(overflowY)) return parent;
    parent = parent.parentElement;
  }
  return null;
}

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

  // ── Animation state ──────────────────────────────────────────────
  const animPreset = node?.props._animation as string | undefined;
  const hasAnimation = !!(animPreset && animPreset !== "none" && PRESET_KEYFRAME[animPreset]);
  const elementRef = useRef<Element | null>(null);
  const [animActive, setAnimActive] = useState(false);
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    if (!hasAnimation || !elementRef.current) return;
    const playOnce = node?.props._animationPlayOnce !== false; // default true
    const root = findScrollContainer(elementRef.current);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setAnimActive(true);
        hasAnimatedRef.current = true;
        if (playOnce) observer.disconnect();
      } else if (!playOnce && hasAnimatedRef.current) {
        setAnimActive(false);
      }
    }, { root, threshold: 0.1 });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [hasAnimation, animPreset, node?.props._animationPlayOnce]);

  // ── Hover state ──────────────────────────────────────────────────
  const hoverTransform = node?.props._hoverTransform as string | undefined;
  const hoverOpacity   = node?.props._hoverOpacity   as string | undefined;
  const hoverShadow    = node?.props._hoverShadow    as string | undefined;
  const hasHover = !!(hoverTransform || hoverOpacity || hoverShadow);
  const [hovered, setHovered] = useState(false);

  // ── Early exits ──────────────────────────────────────────────────
  if (!node) return null;
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

  // Bind interactions to React event handlers
  const interactionHandlers = InteractionBinder.bindAll(
    node.interactions,
    ctx.variables,
    (type, payload) => {
      if (type === "SET_VARIABLE") {
        const { key, value } = payload as { key: string; value: unknown };
        ctx.setVariable(key, value);
      }
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

  // ── Build extra props ────────────────────────────────────────────
  const extraProps: Record<string, unknown> = { ...interactionHandlers };

  if (ctx.attachNodeIds) {
    extraProps["data-node-id"] = nodeId;
  }

  // Callback ref for IntersectionObserver — works with cloneElement on HTML elements
  if (hasAnimation) {
    extraProps["ref"] = (el: Element | null) => { elementRef.current = el; };
  }

  // Hover handlers — merged with existing interaction handlers
  if (hasHover) {
    const prevEnter = extraProps["onMouseEnter"] as ((e: unknown) => void) | undefined;
    const prevLeave = extraProps["onMouseLeave"] as ((e: unknown) => void) | undefined;
    extraProps["onMouseEnter"] = (e: unknown) => { setHovered(true);  prevEnter?.(e); };
    extraProps["onMouseLeave"] = (e: unknown) => { setHovered(false); prevLeave?.(e); };
  }

  // Animation style: hidden initial state → active animation
  const animStyle: React.CSSProperties = hasAnimation
    ? animActive
      ? {
          animation: `${PRESET_KEYFRAME[animPreset!]} ${Number(node.props._animationDuration ?? 600)}ms ${String(node.props._animationEasing ?? "ease")} ${Number(node.props._animationDelay ?? 0)}ms both`,
        }
      : (PRESET_INITIAL[animPreset!] ?? {})
    : {};

  // Hover style: applied on hover state, overrides animation transform if both active
  const hoverStyle: React.CSSProperties = hovered
    ? {
        ...(hoverTransform ? { transform: hoverTransform } : {}),
        ...(hoverOpacity   ? { opacity: Number(hoverOpacity) } : {}),
        ...(hoverShadow    ? { boxShadow: hoverShadow } : {}),
      }
    : {};

  const hasStyleOverride =
    Object.keys(animStyle).length > 0 || Object.keys(hoverStyle).length > 0;

  try {
    const resolvedNodeProps = resolveProps(node.props, node.responsiveProps, ctx.breakpoint);
    const rendered = def.runtimeRenderer({
      node: { ...node, props: resolvedNodeProps },
      children: children.length > 0 ? children : undefined,
      style: resolvedStyle,
      interactions: node.interactions,
      breakpoint: ctx.breakpoint,
    });

    const shouldInject =
      ctx.attachNodeIds ||
      Object.keys(interactionHandlers).length > 0 ||
      hasAnimation ||
      hasHover;

    if (React.isValidElement(rendered) && shouldInject) {
      if (hasStyleOverride) {
        // Merge: renderer's own style → animation override → hover override (hover wins)
        const renderedStyle =
          (rendered.props as Record<string, unknown>).style as React.CSSProperties ?? {};
        extraProps["style"] = { ...renderedStyle, ...animStyle, ...hoverStyle };
      }
      return React.cloneElement(
        rendered as React.ReactElement<Record<string, unknown>>,
        extraProps,
      );
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
    React.createElement(AnimationKeyframes, null),
    React.createElement(RuntimeNode, { nodeId: document.rootNodeId }),
  );
}

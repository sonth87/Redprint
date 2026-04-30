import React, { useState, useEffect, useRef } from "react";
import type { BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";
import { resolveStyle, resolveProps, resolveVisibility } from "@ui-builder/builder-core";
import { ANIMATION_KEYFRAMES_CSS, PRESET_KEYFRAME } from "@ui-builder/shared";
import { useBuilder } from "../hooks/useBuilder";
import { useResolvedBreakpoint } from "../hooks/useResolvedBreakpoint";

// Singleton: inject keyframes into <head> once, lazily when first preview fires
let _keyframesInjected = false;
function ensureKeyframesInjected() {
  if (_keyframesInjected || typeof document === "undefined") return;
  _keyframesInjected = true;
  const el = document.createElement("style");
  el.setAttribute("data-rb-animations", "1");
  el.textContent = ANIMATION_KEYFRAMES_CSS;
  document.head.appendChild(el);
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface NodeRendererProps {
  nodeId: string;
  mode?: "editor" | "runtime";
}

/**
 * NodeRenderer — resolves and renders a single BuilderNode.
 *
 * - In editor mode: plays a one-shot animation preview when _animation or
 *   _animationPreviewKey changes (keyframes injected lazily into <head>).
 *
 * @example
 * <NodeRenderer nodeId={rootNode.id} mode="editor" />
 */
export function NodeRenderer({ nodeId, mode = "editor" }: NodeRendererProps) {
  const { state, builder } = useBuilder();
  const node = state.document.nodes[nodeId];
  const breakpoint = useResolvedBreakpoint();

  // ── Animation preview (editor only) ─────────────────────────────
  const animPreset = node?.props._animation as string | undefined;
  const previewKey = node?.props._animationPreviewKey as number | undefined;

  const [previewActive, setPreviewActive] = useState(false);
  const prevAnimRef = useRef<string | undefined>(animPreset);
  const prevKeyRef  = useRef<number | undefined>(previewKey);
  const rafIdRef    = useRef<number | undefined>(undefined);
  const timerIdRef  = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (mode !== "editor") return;

    const animChanged = animPreset !== prevAnimRef.current;
    const keyChanged  = previewKey !== prevKeyRef.current;
    prevAnimRef.current = animPreset;
    prevKeyRef.current  = previewKey;

    if (!(animChanged || keyChanged)) return;
    if (!animPreset || animPreset === "none" || !PRESET_KEYFRAME[animPreset]) return;

    // Ensure @keyframes are in the document before playing
    ensureKeyframesInjected();

    // Clear any in-flight preview
    if (rafIdRef.current !== undefined) cancelAnimationFrame(rafIdRef.current);
    if (timerIdRef.current !== undefined) clearTimeout(timerIdRef.current);

    // Reset → next frame start: forces CSS engine to restart the animation
    setPreviewActive(false);
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = undefined;
      setPreviewActive(true);
      const duration =
        Number(node?.props._animationDuration ?? 600) +
        Number(node?.props._animationDelay    ?? 0)   +
        200;
      timerIdRef.current = setTimeout(() => {
        timerIdRef.current = undefined;
        setPreviewActive(false);
      }, duration);
    });

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = undefined;
      }
      if (timerIdRef.current !== undefined) {
        clearTimeout(timerIdRef.current);
        timerIdRef.current = undefined;
      }
    };
  }, [mode, animPreset, previewKey]);

  // ── Render-error reporting ──────────────────────────────────────
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

  // ── Guards ───────────────────────────────────────────────────────
  if (!node) return null;

  const visible = resolveVisibility(node, breakpoint);
  if (!visible && mode === "runtime") return null;

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

  // ── Resolve ──────────────────────────────────────────────────────
  const resolvedStyle = resolveStyle(node.style, node.responsiveStyle, breakpoint);
  const resolvedProps = resolveProps(node.props, node.responsiveProps, breakpoint);

  const childNodes = (Object.values(state.document.nodes) as BuilderNode[])
    .filter((n) => n.parentId === nodeId)
    .sort((a, b) => a.order - b.order);

  const children = childNodes.map((child) => (
    <NodeRenderer key={child.id} nodeId={child.id} mode={mode} />
  ));

  const renderer = mode === "editor" ? def.editorRenderer : def.runtimeRenderer;

  // ── Render ───────────────────────────────────────────────────────
  try {
    const rendered = renderer({
      node: { ...node, props: resolvedProps },
      children: children.length > 0 ? children : undefined,
      style: resolvedStyle,
      interactions: node.interactions,
      breakpoint,
    });

    if (React.isValidElement(rendered)) {
      const extraProps: Record<string, unknown> = { "data-node-id": nodeId };

      // Dim hidden nodes in editor so they're still selectable
      if (!visible && mode === "editor") {
        extraProps["data-editor-hidden"] = "true";
        const existingStyle = (rendered.props as Record<string, unknown>).style as React.CSSProperties | undefined;
        extraProps.style = {
          ...existingStyle,
          opacity: 0.35,
          outline: "2px dashed rgba(99,102,241,0.5)",
          outlineOffset: "-2px",
        };
      }

      // Inject animation CSS during preview
      if (mode === "editor" && previewActive && animPreset && PRESET_KEYFRAME[animPreset]) {
        const existingStyle = (
          extraProps.style ?? (rendered.props as Record<string, unknown>).style
        ) as React.CSSProperties | undefined;
        extraProps.style = {
          ...existingStyle,
          animation: `${PRESET_KEYFRAME[animPreset]} ${Number(node.props._animationDuration ?? 600)}ms ${String(node.props._animationEasing ?? "ease")} ${Number(node.props._animationDelay ?? 0)}ms both`,
        };
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

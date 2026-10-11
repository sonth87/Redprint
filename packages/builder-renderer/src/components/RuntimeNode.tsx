import React, { memo, useRef, useState, useEffect, useMemo, useCallback } from "react";
import { resolveProps, resolveVisibility } from "@ui-builder/builder-core";
import { PRESET_KEYFRAME, PRESET_INITIAL } from "@ui-builder/shared";
import { useRuntimeContext } from "../context/RuntimeContext";
import { findScrollContainer } from "../styles/keyframes";
import { StylePipeline } from "../pipeline/StylePipeline";
import { InteractionBinder } from "../pipeline/InteractionBinder";

export const RuntimeNode = memo(function RuntimeNode({ nodeId }: { nodeId: string }) {
  const ctx = useRuntimeContext();
  const node = ctx.document.nodes[nodeId];
  const warnedClassOverrideRef = useRef(false);

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

  // ── Lifecycle interactions: mount / unmount / intersect ───────────
  // See docs/roadmap/01-interactions-events/02-lifecycle-triggers.md.
  // `mount`/`unmount`/`intersect` are not DOM events — TRIGGER_TO_REACT_EVENT has no
  // entry for them, so bindAll() silently skips them; they need React lifecycle hooks
  // instead. Kept separate from InteractionBinder (which stays framework-light) but
  // reuses its shared runInteraction() for condition-eval + action-dispatch.
  const interactions = node?.interactions;
  const lifecycleInteractions = useMemo(
    () => (interactions ?? []).filter((i) => i.trigger === "mount" || i.trigger === "unmount" || i.trigger === "intersect"),
    [interactions],
  );
  const hasIntersectInteraction = lifecycleInteractions.some((i) => i.trigger === "intersect");
  const lifecycleDispatch = useCallback(
    (type: string, payload: unknown) => {
      if (type === "SET_VARIABLE") {
        const { key, value } = payload as { key: string; value: unknown };
        ctx.setVariable(key, value);
      } else if (type === "SHOW_MODAL") {
        const { targetId } = payload as { targetId: string };
        ctx.openPopup(targetId);
      } else if (type === "HIDE_MODAL") {
        const { targetId } = payload as { targetId: string };
        ctx.closePopup(targetId, "action");
      } else if (type === "TOGGLE_VISIBILITY") {
        const { targetId } = payload as { targetId: string };
        ctx.toggleNodeVisibility(targetId);
      } else if (type === "ADD_CLASS") {
        const { targetId, className } = payload as { targetId: string; className: string };
        ctx.addNodeClass(targetId, className);
      } else if (type === "REMOVE_CLASS") {
        const { targetId, className } = payload as { targetId: string; className: string };
        ctx.removeNodeClass(targetId, className);
      } else if (type === "EMIT_EVENT") {
        const { event, payload: eventPayload } = payload as { event: string; payload?: unknown };
        if (ctx.onCustomEvent) ctx.onCustomEvent(event, eventPayload);
        else console.warn(`[interactions] emit "${event}" had no RendererConfig.onCustomEvent listener attached`);
      } else if (type === "CUSTOM_ACTION") {
        const { handler, params } = payload as { handler: string; params?: unknown };
        const fn = ctx.customActionHandlers?.[handler];
        if (fn) fn(params);
        else console.warn(`[interactions] custom handler "${handler}" had no RendererConfig.customActionHandlers entry`);
      }
    },
    [ctx],
  );

  // mount / unmount — fire once per node lifecycle. Does not run during SSR
  // (useEffect never executes server-side), which is the correct semantics for a
  // side-effecting action.
  useEffect(() => {
    if (!node) return;
    for (const interaction of lifecycleInteractions) {
      if (interaction.trigger === "mount") {
        InteractionBinder.runInteraction(interaction, ctx.variables, lifecycleDispatch);
      }
    }
    return () => {
      for (const interaction of lifecycleInteractions) {
        if (interaction.trigger === "unmount") {
          InteractionBinder.runInteraction(interaction, ctx.variables, lifecycleDispatch);
        }
      }
    };
    // Intentionally mount/unmount-only (empty-ish dep list): this must run exactly
    // once per node instance, not re-fire when `variables`/lifecycleDispatch change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  // intersect — reuses the same element ref as the animation observer (both may be
  // active on the same node; two independent IntersectionObservers on one element
  // is supported and does not conflict).
  const intersectFiredRef = useRef(false);
  useEffect(() => {
    if (!hasIntersectInteraction || !elementRef.current) return;
    const root = findScrollContainer(elementRef.current);
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      for (const interaction of lifecycleInteractions) {
        if (interaction.trigger !== "intersect") continue;
        if (interaction.once && intersectFiredRef.current) continue;
        InteractionBinder.runInteraction(interaction, ctx.variables, lifecycleDispatch);
      }
      intersectFiredRef.current = true;
    }, { root, threshold: 0.1 });
    observer.observe(elementRef.current);
    return () => observer.disconnect();
  }, [hasIntersectInteraction, lifecycleInteractions, ctx.variables, lifecycleDispatch]);

  // ── Hover state ──────────────────────────────────────────────────
  const hoverTransform = node?.props._hoverTransform as string | undefined;
  const hoverOpacity   = node?.props._hoverOpacity   as string | undefined;
  const hoverShadow    = node?.props._hoverShadow    as string | undefined;
  const hasHover = !!(hoverTransform || hoverOpacity || hoverShadow);
  const [hovered, setHovered] = useState(false);

  // ── Early exits ──────────────────────────────────────────────────
  if (!node) return null;
  if (!resolveVisibility(node, ctx.breakpoint)) return null;
  // toggleVisibility interaction action — runtime-only, resets on reload (roadmap 01/01, 3.2).
  if (ctx.hiddenNodeIds.has(nodeId)) return null;

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
      } else if (type === "SHOW_MODAL") {
        const { targetId } = payload as { targetId: string };
        ctx.openPopup(targetId);
      } else if (type === "HIDE_MODAL") {
        const { targetId } = payload as { targetId: string };
        ctx.closePopup(targetId, "action");
      } else if (type === "TOGGLE_VISIBILITY") {
        const { targetId } = payload as { targetId: string };
        ctx.toggleNodeVisibility(targetId);
      } else if (type === "ADD_CLASS") {
        const { targetId, className } = payload as { targetId: string; className: string };
        ctx.addNodeClass(targetId, className);
      } else if (type === "REMOVE_CLASS") {
        const { targetId, className } = payload as { targetId: string; className: string };
        ctx.removeNodeClass(targetId, className);
      } else if (type === "EMIT_EVENT") {
        const { event, payload: eventPayload } = payload as { event: string; payload?: unknown };
        if (ctx.onCustomEvent) {
          ctx.onCustomEvent(event, eventPayload);
        } else {
          console.warn(`[interactions] emit "${event}" had no RendererConfig.onCustomEvent listener attached`);
        }
      } else if (type === "CUSTOM_ACTION") {
        const { handler, params } = payload as { handler: string; params?: unknown };
        const fn = ctx.customActionHandlers?.[handler];
        if (fn) {
          fn(params);
        } else {
          console.warn(`[interactions] custom handler "${handler}" had no RendererConfig.customActionHandlers entry`);
        }
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

  // addClass/removeClass interaction actions — runtime-only className additions
  // (roadmap 01/01, 3.3). Merged onto whatever className the component itself
  // already renders, further down at cloneElement time.
  const classOverrides = ctx.nodeClassOverrides.get(nodeId);
  const hasClassOverride = !!classOverrides && classOverrides.size > 0;

  // Callback ref for IntersectionObserver — works with cloneElement on HTML elements.
  // Shared by both the animation observer and the `intersect` interaction observer.
  if (hasAnimation || hasIntersectInteraction) {
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
      onFormSubmit: ctx.onFormSubmit,
      onOpenPopup: ctx.openPopup,
    });

    const shouldInject =
      ctx.attachNodeIds ||
      Object.keys(interactionHandlers).length > 0 ||
      hasAnimation ||
      hasIntersectInteraction ||
      hasHover ||
      hasClassOverride;

    if (React.isValidElement(rendered) && shouldInject) {
      if (Object.keys(interactionHandlers).length > 0) {
        const renderedProps = rendered.props as Record<string, unknown>;
        for (const [propName, interactionHandler] of Object.entries(interactionHandlers)) {
          const ownHandler = renderedProps[propName] as ((event: unknown) => void) | undefined;
          if (typeof ownHandler === "function") {
            extraProps[propName] = (event: unknown) => {
              ownHandler(event);
              interactionHandler(event as Event);
            };
          }
        }
      }
      if (hasStyleOverride) {
        const renderedStyle =
          (rendered.props as Record<string, unknown>).style as React.CSSProperties ?? {};
        extraProps["style"] = { ...renderedStyle, ...animStyle, ...hoverStyle };
      }
      if (hasClassOverride) {
        if (typeof rendered.type === "string") {
          const renderedClassName = (rendered.props as Record<string, unknown>).className as string | undefined;
          extraProps["className"] = [renderedClassName, ...Array.from(classOverrides!)]
            .filter(Boolean)
            .join(" ");
        } else if (!warnedClassOverrideRef.current) {
          warnedClassOverrideRef.current = true;
          console.warn(
            `[interactions] addClass/removeClass on node "${nodeId}" (${node.type}) was skipped — its renderer's root element does not accept a plain className prop.`,
          );
        }
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

import React, { createContext, useContext, useState, useCallback, useMemo, memo, useRef, useEffect } from "react";
import type {
  BuilderDocument,
  Breakpoint,
  ComponentDefinition,
  PopupStackEntry,
  PopupLifecycleState,
  PopupDefinition,
  PopupAnalyticsEvent,
} from "@ui-builder/builder-core";
import {
  ComponentRegistry,
  resolveProps,
  resolveVisibility,
  DEFAULT_POPUP_Z_INDEX_BASE,
  applyPopupOpen,
  applyPopupClose,
  applyPopupOpened,
  applyPopupClosed,
  applyPopupRemove,
  topmostInteractivePopup,
  shouldReducePopupMotion,
  resolveVariantAssignment,
  resolvePopupForVariant,
  seededRng,
  evaluateSchedule,
  evaluateTargeting,
  evaluateFrequency,
  recordFrequencyImpression,
  resolveLocaleContent,
  evaluateCampaignGate,
  effectivePriority,
  resolveConflictPolicy,
  arbitrate,
  mountedPopupEntries,
} from "@ui-builder/builder-core";
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

/**
 * Pure decision for the `hideAfterSubmit` popup rule (roadmap 03/04): true only
 * when the goal that just fired was a `submit` goal AND the popup's rules opt
 * into auto-close. Extracted as a standalone function so this decision is
 * unit-testable without a real DOM/jsdom (this monorepo has neither).
 */
export function shouldHideAfterSubmit(goalType: "click" | "submit", hideAfterSubmit: boolean | undefined): boolean {
  return goalType === "submit" && hideAfterSubmit === true;
}

// ── Runtime Context ───────────────────────────────────────────────────────

interface RuntimeContextValue {
  document: BuilderDocument;
  registry: ComponentRegistry;
  breakpoint: Breakpoint;
  variables: Record<string, unknown>;
  setVariable: (key: string, value: unknown) => void;
  openPopup: (popupId: string) => void;
  closePopup: (popupId: string, reason?: PopupAnalyticsEvent["closeReason"]) => void;
  attachNodeIds: boolean;
  missingComponentFallback?: ComponentDefinition;
  /**
   * Runtime-only visibility overrides toggled by the `toggleVisibility` interaction
   * action — never mutates the document, resets on reload (roadmap 01/01, 3.2).
   */
  hiddenNodeIds: Set<string>;
  /** Runtime-only className overrides from `addClass`/`removeClass` (roadmap 01/01, 3.3). */
  nodeClassOverrides: Map<string, Set<string>>;
  /** Bridge for the `emit` interaction action (RendererConfig.onCustomEvent). */
  onCustomEvent?: (event: string, payload?: unknown) => void;
  /** Bridge for the `custom` interaction action (RendererConfig.customActionHandlers). */
  customActionHandlers?: Record<string, (params?: unknown) => void>;
  /** Bridge for Form.submitAction "emit" (RendererConfig.onFormSubmit, roadmap 03/04). */
  onFormSubmit?: (formName: string, fields: Record<string, unknown>) => void;
  toggleNodeVisibility: (targetId: string) => void;
  addNodeClass: (targetId: string, className: string) => void;
  removeNodeClass: (targetId: string, className: string) => void;
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
    });

    const shouldInject =
      ctx.attachNodeIds ||
      Object.keys(interactionHandlers).length > 0 ||
      hasAnimation ||
      hasIntersectInteraction ||
      hasHover ||
      hasClassOverride;

    if (React.isValidElement(rendered) && shouldInject) {
      // Compose (don't overwrite) event handler props the renderer already set
      // for the same trigger — e.g. Form.runtimeRenderer's own `onSubmit` (which
      // runs the submit pipeline: preventDefault, FormData, webhook/emit) must
      // still run before a node's `submit`-trigger interaction handler injected
      // here, matching the documented order (pipeline internal, then
      // interactions — roadmap 03/04). Without this, cloneElement's shallow
      // prop merge would silently replace the renderer's own handler.
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
        // Merge: renderer's own style → animation override → hover override (hover wins)
        const renderedStyle =
          (rendered.props as Record<string, unknown>).style as React.CSSProperties ?? {};
        extraProps["style"] = { ...renderedStyle, ...animStyle, ...hoverStyle };
      }
      if (hasClassOverride) {
        // Only string-typed elements (DOM tags) can safely receive a className prop —
        // a component that renders a Fragment or a custom component whose root prop
        // isn't `className` would silently receive a prop it ignores. Skip quietly
        // with a one-time-per-node warning rather than fail (roadmap 01/01, 3.3).
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
    onPopupOpen,
    onPopupClose,
    popupStorage,
    onPopupAnalyticsEvent,
    eventBus,
    getVariantAssignment,
    setVariantAssignment,
    isPreview = false,
    popupContext = {},
    locale,
    getFrequencyCount,
    setFrequencyCount,
    onCustomEvent,
    customActionHandlers,
    onFormSubmit,
  } = config;
  const hasSectionVisibleTrigger = Object.values(document.popups ?? {}).some(
    (popup) => popup.autoTrigger.type === "sectionVisible",
  );
  const effectiveAttachNodeIds = attachNodeIds || hasSectionVisibleTrigger;

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

  // toggleVisibility interaction action — runtime-only, never mutates the document
  // (roadmap 01/01, 3.2). Reset on every mount/reload, exactly like popupStack.
  const [hiddenNodeIds, setHiddenNodeIds] = useState<Set<string>>(() => new Set());
  const toggleNodeVisibility = useCallback((targetId: string) => {
    setHiddenNodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(targetId)) next.delete(targetId);
      else next.add(targetId);
      return next;
    });
  }, []);

  // addClass/removeClass interaction actions — runtime-only className overrides
  // (roadmap 01/01, 3.3).
  const [nodeClassOverrides, setNodeClassOverrides] = useState<Map<string, Set<string>>>(() => new Map());
  const addNodeClass = useCallback((targetId: string, className: string) => {
    setNodeClassOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(targetId);
      const updated = existing ? new Set(existing) : new Set<string>();
      updated.add(className);
      next.set(targetId, updated);
      return next;
    });
  }, []);
  const removeNodeClass = useCallback((targetId: string, className: string) => {
    setNodeClassOverrides((prev) => {
      const existing = prev.get(targetId);
      if (!existing || !existing.has(className)) return prev;
      const next = new Map(prev);
      const updated = new Set(existing);
      updated.delete(className);
      if (updated.size > 0) next.set(targetId, updated);
      else next.delete(targetId);
      return next;
    });
  }, []);

  // Runtime popup lifecycle stack (opening → open → closing → closed).
  // Pure transitions live in builder-core; this hook owns timers + callbacks.
  const [popupStack, setPopupStack] = useState<PopupStackEntry[]>([]);
  // V6: queue for "queue" conflict policy — popups waiting for a slot to open.
  const [popupQueue, setPopupQueue] = useState<string[]>([]);
  // V6: stable ref so openPopup can call closePopup without a circular dep.
  const closePopupRef = useRef<((id: string, reason?: PopupAnalyticsEvent["closeReason"]) => void) | null>(null);
  const openTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const closeTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const clearTimer = useCallback((map: React.MutableRefObject<Map<string, ReturnType<typeof setTimeout>>>, popupId: string) => {
    const t = map.current.get(popupId);
    if (t) {
      clearTimeout(t);
      map.current.delete(popupId);
    }
  }, []);

  const effectiveDurationMs = useCallback((popupId: string): number => {
    const popup = document.popups?.[popupId];
    if (!popup) return 0;
    const prefersReduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (shouldReducePopupMotion(popup.behavior.reducedMotion, prefersReduced)) return 0;
    if (popup.animation.enter === "none") return 0;
    return popup.animation.durationMs ?? 0;
  }, [document.popups]);

  const markPopupShown = useCallback((popupId: string) => {
    if (typeof window === "undefined") return;
    const storage = popupStorage ?? window.localStorage;
    const prefix = `ui-builder:popup:${document.id}:${popupId}`;
    const count = Number(storage.getItem(`${prefix}:count`) ?? "0");
    storage.setItem(`${prefix}:count`, String(count + 1));
    storage.setItem(`${prefix}:lastShownAt`, String(Date.now()));
    window.sessionStorage.setItem(`${prefix}:sessionShown`, "true");
  }, [document.id, popupStorage]);

  // ── V4: analytics emission (callback + optional EventBus) ────────────────
  const emitPopupEvent = useCallback(
    (event: Omit<PopupAnalyticsEvent, "timestamp"> & { timestamp?: number }) => {
      const full: PopupAnalyticsEvent = {
        ...event,
        timestamp: event.timestamp ?? Date.now(),
        ...(isPreview
          ? { metadata: { ...(event.metadata ?? {}), preview: true } }
          : event.metadata
            ? { metadata: event.metadata }
            : {}),
      };
      // A throwing host analytics handler must never break the popup UI.
      try {
        onPopupAnalyticsEvent?.(full);
      } catch {
        /* swallow — analytics is best-effort */
      }
      try {
        eventBus?.emit("popup:analytics", full);
      } catch {
        /* swallow */
      }
    },
    [onPopupAnalyticsEvent, eventBus, isPreview],
  );

  // ── V5: frequency storage helpers ─────────────────────────────────────────
  const readFrequencyCount = useCallback(
    (key: string): { count: number; storedAt: number } | undefined => {
      if (getFrequencyCount) return getFrequencyCount(key);
      if (typeof window === "undefined") return undefined;
      const storage = key.includes(":session:") ? window.sessionStorage : (popupStorage ?? window.localStorage);
      const raw = storage.getItem(key);
      if (!raw) return undefined;
      try {
        return JSON.parse(raw) as { count: number; storedAt: number };
      } catch {
        return undefined;
      }
    },
    [getFrequencyCount, popupStorage],
  );

  const writeFrequencyCount = useCallback(
    (key: string, count: number, expiresAt?: number) => {
      if (setFrequencyCount) { setFrequencyCount(key, count, expiresAt); return; }
      if (typeof window === "undefined") return;
      const storage = key.includes(":session:") ? window.sessionStorage : (popupStorage ?? window.localStorage);
      storage.setItem(key, JSON.stringify({ count, storedAt: Date.now(), ...(expiresAt ? { expiresAt } : {}) }));
    },
    [setFrequencyCount, popupStorage],
  );

  // ── V5: resolved locale state (runtime-only) ───────────────────────────────
  const [localeAssignments, setLocaleAssignments] = useState<Record<string, string | null>>({});

  // ── V4: A/B variant assignment (runtime-only; never mutates the document) ─
  // Resolved per popup at open time and held in component state so the surface
  // renders the right content. Sticky reads/writes go through the host
  // callbacks first, then fall back to popupStorage.
  const [assignments, setAssignments] = useState<Record<string, string | null>>({});

  const readStickyAssignment = useCallback(
    (popupId: string): string | null => {
      const fromHost = getVariantAssignment?.(popupId);
      if (fromHost !== undefined && fromHost !== null) return fromHost;
      if (typeof window === "undefined") return null;
      const storage = popupStorage ?? window.localStorage;
      return storage.getItem(`ui-builder:popup:${document.id}:${popupId}:variant`);
    },
    [getVariantAssignment, popupStorage, document.id],
  );

  const persistStickyAssignment = useCallback(
    (popupId: string, variantId: string) => {
      setVariantAssignment?.(popupId, variantId);
      if (typeof window === "undefined") return;
      const storage = popupStorage ?? window.localStorage;
      storage.setItem(`ui-builder:popup:${document.id}:${popupId}:variant`, variantId);
    },
    [setVariantAssignment, popupStorage, document.id],
  );

  const assignVariant = useCallback(
    (popup: PopupDefinition): string | null => {
      const sticky = popup.experiment?.assignment === "sticky";
      const { variantId, isNew } = resolveVariantAssignment({
        variants: popup.variants,
        experiment: popup.experiment,
        existingAssignment: sticky ? readStickyAssignment(popup.id) : undefined,
        rng: popup.experiment?.seed ? seededRng(`${popup.experiment.seed}:${popup.id}`) : Math.random,
      });
      setAssignments((prev) => ({ ...prev, [popup.id]: variantId }));
      if (variantId) {
        if (sticky && isNew) persistStickyAssignment(popup.id, variantId);
        emitPopupEvent({ type: "popup_variant_assigned", popupId: popup.id, popupName: popup.name, variantId });
      }
      return variantId;
    },
    [readStickyAssignment, persistStickyAssignment, emitPopupEvent],
  );

  const openPopup = useCallback((popupId: string) => {
    const popup = document.popups?.[popupId];
    if (!popup?.enabled) return;

    const now = Date.now();
    const effectiveLocale = locale ?? (typeof navigator !== "undefined" ? navigator.language : undefined);

    // V6: campaign gate — runs first (before V5 checks).
    const gate = evaluateCampaignGate(popup, document.popupCampaigns);
    if (!gate.allowed) {
      emitPopupEvent({
        type: "popup_rules_blocked",
        popupId,
        popupName: popup.name,
        rulesBlockReason: "campaign",
        campaignId: gate.campaignId,
      });
      return;
    }

    // V5: pre-open eligibility — schedule → targeting → frequency
    if (!evaluateSchedule(popup.rules.scheduling, now)) {
      emitPopupEvent({ type: "popup_rules_blocked", popupId, popupName: popup.name, rulesBlockReason: "schedule" });
      return;
    }
    if (!evaluateTargeting(popup.rules.targeting, popupContext)) {
      emitPopupEvent({ type: "popup_rules_blocked", popupId, popupName: popup.name, rulesBlockReason: "targeting" });
      return;
    }
    if (!evaluateFrequency(popup.rules.frequency, popup.rules, readFrequencyCount, popupId, document.id, now)) {
      emitPopupEvent({ type: "popup_rules_blocked", popupId, popupName: popup.name, rulesBlockReason: "frequency" });
      return;
    }

    // V6: conflict arbitration — only for popups belonging to a campaign.
    if (popup.campaignId) {
      const policy = resolveConflictPolicy(popup, document.popupCampaigns);
      const candidatePriority = effectivePriority(popup, document.popupCampaigns);
      const openCampaignPopups = mountedPopupEntries(popupStack)
        .map((e) => document.popups?.[e.popupId])
        .filter((p): p is NonNullable<typeof p> => !!p?.campaignId)
        .map((p) => ({ popupId: p.id, priority: effectivePriority(p, document.popupCampaigns) }));

      const decision = arbitrate({ candidatePopupId: popupId, candidatePolicy: policy, candidatePriority, openCampaignPopups });

      if (decision.action === "suppress") {
        emitPopupEvent({
          type: "popup_rules_blocked",
          popupId,
          popupName: popup.name,
          rulesBlockReason: "conflict",
          campaignId: gate.campaignId,
        });
        return;
      }
      if (decision.action === "queue") {
        setPopupQueue((q) => (q.includes(popupId) ? q : [...q, popupId]));
        return;
      }
      if (decision.action === "replace") {
        decision.closePopupIds.forEach((id) => closePopupRef.current?.(id, "programmatic"));
      }
      // "open" falls through below.
    }

    const zIndexBase = popup.runtimeState?.zIndexBase ?? DEFAULT_POPUP_Z_INDEX_BASE;
    // Reopen cancels a pending close.
    clearTimer(closeTimers, popupId);
    // V4: resolve the A/B variant before showing the surface.
    const variantId = assignVariant(popup);

    // V5: resolve locale content.
    const { resolvedLocale } = resolveLocaleContent(popup, effectiveLocale);
    if (resolvedLocale) {
      setLocaleAssignments((prev) => ({ ...prev, [popupId]: resolvedLocale }));
      emitPopupEvent({ type: "popup_locale_resolved", popupId, popupName: popup.name, locale: resolvedLocale });
    }
    setPopupStack((prev) =>
      applyPopupOpen(prev, {
        popupId,
        kind: popup.kind,
        stackMode: popup.runtimeState?.stackMode ?? "single",
        zIndexBase,
        now: Date.now(),
      }),
    );
    markPopupShown(popupId);
    // V5: record frequency impression
    const { key: freqKey } = recordFrequencyImpression(popupId, document.id, popup.rules.frequency, now);
    const existing = readFrequencyCount(freqKey);
    writeFrequencyCount(freqKey, (existing?.count ?? 0) + 1);
    onPopupOpen?.(popupId);
    emitPopupEvent({
      type: "popup_open",
      popupId,
      popupName: popup.name,
      ...(variantId ? { variantId } : {}),
      ...(resolvedLocale ? { locale: resolvedLocale } : {}),
      triggerType: popup.autoTrigger.type,
    });
    // Promote opening → open after the enter animation, then count impression.
    clearTimer(openTimers, popupId);
    const duration = effectiveDurationMs(popupId);
    const finishOpen = () => {
      openTimers.current.delete(popupId);
      setPopupStack((prev) => applyPopupOpened(prev, popupId, zIndexBase));
      emitPopupEvent({
        type: "popup_impression",
        popupId,
        popupName: popup.name,
        ...(variantId ? { variantId } : {}),
      });
    };
    if (duration <= 0) finishOpen();
    else openTimers.current.set(popupId, setTimeout(finishOpen, duration));
  }, [document.popups, document.popupCampaigns, document.id, popupStack, markPopupShown, onPopupOpen, clearTimer, effectiveDurationMs, assignVariant, emitPopupEvent, locale, popupContext, readFrequencyCount, writeFrequencyCount, setPopupQueue]);

  const closePopup = useCallback(
    (popupId: string, closeReason: PopupAnalyticsEvent["closeReason"] = "programmatic") => {
      const popup = document.popups?.[popupId];
      const zIndexBase = popup?.runtimeState?.zIndexBase ?? DEFAULT_POPUP_Z_INDEX_BASE;
      clearTimer(openTimers, popupId);
      setPopupStack((prev) => applyPopupClose(prev, popupId, zIndexBase));
      onPopupClose?.(popupId);
      const variantId = assignments[popupId] ?? undefined;
      emitPopupEvent({
        type: "popup_close",
        popupId,
        popupName: popup?.name,
        ...(variantId ? { variantId } : {}),
        closeReason,
      });
      // V4: a `close`-type goal converts when the popup closes.
      for (const goal of popup?.goals ?? []) {
        if (goal.type === "close") {
          emitPopupEvent({
            type: "popup_conversion",
            popupId,
            popupName: popup?.name,
            ...(variantId ? { variantId } : {}),
            goalId: goal.id,
          });
        }
      }
      // V4: dismissal = user-initiated close (not a programmatic/action close).
      if (closeReason === "escape" || closeReason === "backdrop" || closeReason === "button") {
        emitPopupEvent({
          type: "popup_dismiss",
          popupId,
          popupName: popup?.name,
          ...(variantId ? { variantId } : {}),
          closeReason,
        });
      }
      // Remove after exit animation.
      clearTimer(closeTimers, popupId);
      const duration = effectiveDurationMs(popupId);
      const finishClose = () => {
        closeTimers.current.delete(popupId);
        setPopupStack((prev) => applyPopupClosed(prev, popupId, zIndexBase));
      };
      if (duration <= 0) finishClose();
      else closeTimers.current.set(popupId, setTimeout(finishClose, duration));
    },
    [document.popups, onPopupClose, clearTimer, effectiveDurationMs, assignments, emitPopupEvent],
  );

  // V6: keep the ref in sync so openPopup can use it without circular deps.
  useEffect(() => {
    closePopupRef.current = closePopup;
  });

  // V6: drain the queue whenever the stack changes — open the highest-priority
  // queued popup whose campaign is still published, re-checking gate at drain time.
  useEffect(() => {
    if (popupQueue.length === 0) return;
    const hasMountedCampaignPopup = mountedPopupEntries(popupStack).some(
      (e) => document.popups?.[e.popupId]?.campaignId,
    );
    if (hasMountedCampaignPopup) return;
    // Pick the highest-priority queued popup that still passes the campaign gate.
    let bestId: string | null = null;
    let bestPriority = -Infinity;
    for (const id of popupQueue) {
      const p = document.popups?.[id];
      if (!p) continue;
      const gate = evaluateCampaignGate(p, document.popupCampaigns);
      if (!gate.allowed) continue;
      const pri = effectivePriority(p, document.popupCampaigns);
      if (pri > bestPriority) { bestPriority = pri; bestId = id; }
    }
    if (!bestId) return;
    const nextId = bestId;
    setPopupQueue((q) => q.filter((id) => id !== nextId));
    openPopup(nextId);
  }, [popupStack, popupQueue, document.popups, document.popupCampaigns, openPopup]);

  // Clean up all timers on unmount.
  useEffect(() => {
    const open = openTimers.current;
    const close = closeTimers.current;
    return () => {
      open.forEach((t) => clearTimeout(t));
      close.forEach((t) => clearTimeout(t));
      open.clear();
      close.clear();
    };
  }, []);

  // Force-remove popups that get deleted/disabled while mounted.
  useEffect(() => {
    setPopupStack((prev) => {
      let next = prev;
      for (const entry of prev) {
        const popup = document.popups?.[entry.popupId];
        if (!popup || !popup.enabled) {
          clearTimer(openTimers, entry.popupId);
          clearTimer(closeTimers, entry.popupId);
          next = applyPopupRemove(next, entry.popupId);
        }
      }
      return next;
    });
  }, [document.popups, clearTimer]);

  const popupPushPadding = useMemo<React.CSSProperties | undefined>(() => {
    let paddingTop: string | undefined;
    let paddingBottom: string | undefined;
    for (const entry of popupStack) {
      if (entry.state === "closing") continue;
      const popup = document.popups?.[entry.popupId];
      if (!popup || popup.kind !== "bar" || popup.kindConfig.kind !== "bar" || !popup.kindConfig.pushPageContent) {
        continue;
      }
      const height = popup.kindConfig.height ?? "72px";
      if (popup.placement === "top") paddingTop = height;
      if (popup.placement === "bottom") paddingBottom = height;
    }
    return paddingTop || paddingBottom ? { paddingTop, paddingBottom } : undefined;
  }, [document.popups, popupStack]);

  const contextValue = useMemo<RuntimeContextValue>(
    () => ({
      document,
      registry,
      breakpoint,
      variables,
      setVariable,
      openPopup,
      closePopup,
      attachNodeIds: effectiveAttachNodeIds,
      missingComponentFallback,
      hiddenNodeIds,
      nodeClassOverrides,
      onCustomEvent,
      customActionHandlers,
      onFormSubmit,
      toggleNodeVisibility,
      addNodeClass,
      removeNodeClass,
    }),
    [
      document,
      registry,
      breakpoint,
      variables,
      setVariable,
      openPopup,
      closePopup,
      effectiveAttachNodeIds,
      missingComponentFallback,
      hiddenNodeIds,
      nodeClassOverrides,
      onCustomEvent,
      customActionHandlers,
      onFormSubmit,
      toggleNodeVisibility,
      addNodeClass,
      removeNodeClass,
    ],
  );

  // Background should be inert when the topmost interactive popup is modal-like
  // and requests it (a11y: keep AT/keyboard focus inside the dialog).
  const topInteractive = topmostInteractivePopup(popupStack);
  const topPopup = topInteractive ? document.popups?.[topInteractive.popupId] : undefined;
  const backgroundInert = !!(
    topPopup &&
    topPopup.kind !== "bar" &&
    (topPopup.behavior.inertBackground ?? false)
  );

  return React.createElement(
    RuntimeContext.Provider,
    { value: contextValue },
    React.createElement(AnimationKeyframes, null),
    React.createElement(PopupKeyframes, null),
    React.createElement(
      "div",
      {
        style: popupPushPadding,
        // `inert` is the standard way to make a subtree non-interactive for
        // pointer, keyboard, and AT. React passes it through to the DOM.
        ...(backgroundInert ? { inert: "", "aria-hidden": true } : {}),
      },
      React.createElement(RuntimeNode, { nodeId: document.rootNodeId }),
    ),
    React.createElement(PopupRuntimeLayer, {
      popupStack,
      breakpoint,
      storage: popupStorage,
      onOpenPopup: openPopup,
      onClosePopup: closePopup,
      assignments,
      localeAssignments,
      emitPopupEvent,
    }),
  );
}

function PopupKeyframes() {
  return React.createElement("style", null, `
@keyframes rb-popup-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes rb-popup-scale { from { opacity: 0; transform: scale(.96) } to { opacity: 1; transform: scale(1) } }
@keyframes rb-popup-slide-up { from { opacity: 0; transform: translateY(32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-down { from { opacity: 0; transform: translateY(-32px) } to { opacity: 1; transform: translateY(0) } }
@keyframes rb-popup-slide-left { from { opacity: 0; transform: translateX(32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-slide-right { from { opacity: 0; transform: translateX(-32px) } to { opacity: 1; transform: translateX(0) } }
@keyframes rb-popup-fade-out { from { opacity: 1 } to { opacity: 0 } }
@keyframes rb-popup-scale-out { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(.96) } }
@keyframes rb-popup-slide-up-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(32px) } }
@keyframes rb-popup-slide-down-out { from { opacity: 1; transform: translateY(0) } to { opacity: 0; transform: translateY(-32px) } }
@keyframes rb-popup-slide-left-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(32px) } }
@keyframes rb-popup-slide-right-out { from { opacity: 1; transform: translateX(0) } to { opacity: 0; transform: translateX(-32px) } }
@keyframes rb-popup-backdrop-in { from { opacity: 0 } to { opacity: 1 } }
@keyframes rb-popup-backdrop-out { from { opacity: 1 } to { opacity: 0 } }
`);
}

function popupCanOpen(
  popup: NonNullable<BuilderDocument["popups"]>[string],
  documentId: string,
  breakpoint: Breakpoint,
  storage?: Storage,
): boolean {
  if (!popup.enabled) return false;
  if (popup.rules.devices?.length && !popup.rules.devices.includes(breakpoint)) return false;
  if (typeof window === "undefined") return false;

  const local = storage ?? window.localStorage;
  const prefix = `ui-builder:popup:${documentId}:${popup.id}`;
  if (popup.rules.showOncePerSession && window.sessionStorage.getItem(`${prefix}:sessionShown`) === "true") {
    return false;
  }
  const count = Number(local.getItem(`${prefix}:count`) ?? "0");
  if (popup.rules.maxShows !== undefined && count >= popup.rules.maxShows) return false;
  if (popup.rules.showOnceEveryDays !== undefined) {
    const last = Number(local.getItem(`${prefix}:lastShownAt`) ?? "0");
    if (last > 0) {
      const elapsedDays = (Date.now() - last) / 86_400_000;
      if (elapsedDays < popup.rules.showOnceEveryDays) return false;
    }
  }
  return true;
}

function PopupRuntimeLayer({
  popupStack,
  breakpoint,
  storage,
  onOpenPopup,
  onClosePopup,
  assignments,
  localeAssignments,
  emitPopupEvent,
}: {
  popupStack: PopupStackEntry[];
  breakpoint: Breakpoint;
  storage?: Storage;
  onOpenPopup: (popupId: string) => void;
  onClosePopup: (popupId: string, reason?: PopupAnalyticsEvent["closeReason"]) => void;
  assignments: Record<string, string | null>;
  localeAssignments: Record<string, string | null>;
  emitPopupEvent: (event: Omit<PopupAnalyticsEvent, "timestamp"> & { timestamp?: number }) => void;
}) {
  const ctx = useRuntimeContext();
  const builderDocument = ctx.document;
  const popups = builderDocument.popups ?? {};
  const topInteractive = topmostInteractivePopup(popupStack);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const disposers: Array<() => void> = [];
    Object.values(popups).forEach((popup) => {
      if (!popupCanOpen(popup, builderDocument.id, breakpoint, storage)) return;
      if (popup.autoTrigger.type === "pageLoad") {
        const id = window.setTimeout(() => onOpenPopup(popup.id), popup.autoTrigger.delayMs ?? 0);
        disposers.push(() => window.clearTimeout(id));
      }
      if (popup.autoTrigger.type === "scrollDepth") {
        const trigger = popup.autoTrigger;
        const onScroll = () => {
          const doc = window.document.documentElement;
          const scrollable = Math.max(1, doc.scrollHeight - window.innerHeight);
          const percent = Math.round((window.scrollY / scrollable) * 100);
          if (percent >= trigger.percent) {
            onOpenPopup(popup.id);
            window.removeEventListener("scroll", onScroll);
          }
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        disposers.push(() => window.removeEventListener("scroll", onScroll));
      }
      if (popup.autoTrigger.type === "sectionVisible" && "IntersectionObserver" in window) {
        const target = window.document.querySelector(`[data-node-id="${popup.autoTrigger.targetNodeId}"]`);
        if (!target) return;
        const observer = new IntersectionObserver(([entry]) => {
          if (entry?.isIntersecting) {
            onOpenPopup(popup.id);
            observer.disconnect();
          }
        }, { threshold: popup.autoTrigger.threshold ?? 0.25 });
        observer.observe(target);
        disposers.push(() => observer.disconnect());
      }
    });
    return () => disposers.forEach((dispose) => dispose());
  }, [popups, builderDocument.id, breakpoint, storage, onOpenPopup]);

  // Body scroll stays locked while ANY mounted (non-closed) popup wants it.
  const shouldLock = popupStack.some(
    (entry) => entry.state !== "closed" && popups[entry.popupId]?.behavior.lockBodyScroll,
  );
  useEffect(() => {
    if (typeof window === "undefined" || !shouldLock) return;
    const previous = window.document.body.style.overflow;
    window.document.body.style.overflow = "hidden";
    return () => {
      window.document.body.style.overflow = previous;
    };
  }, [shouldLock]);

  return React.createElement(
    React.Fragment,
    null,
    popupStack.map((entry) => {
      if (entry.state === "closed") return null;
      const popup = popups[entry.popupId];
      if (!popup?.enabled) return null;
      return React.createElement(PopupSurface, {
        key: entry.popupId,
        popupId: entry.popupId,
        lifecycle: entry.state,
        zIndex: entry.zIndex,
        isTopmost: topInteractive?.popupId === entry.popupId,
        variantId: assignments[entry.popupId] ?? null,
        resolvedLocale: localeAssignments[entry.popupId] ?? null,
        emitPopupEvent,
        onClose: (reason?: PopupAnalyticsEvent["closeReason"]) => onClosePopup(entry.popupId, reason),
      });
    }),
  );
}

function PopupSurface({
  popupId,
  lifecycle,
  zIndex,
  isTopmost,
  variantId,
  resolvedLocale,
  emitPopupEvent,
  onClose,
}: {
  popupId: string;
  lifecycle: PopupLifecycleState;
  zIndex: number;
  isTopmost: boolean;
  variantId: string | null;
  resolvedLocale: string | null;
  emitPopupEvent: (event: Omit<PopupAnalyticsEvent, "timestamp"> & { timestamp?: number }) => void;
  onClose: (reason?: PopupAnalyticsEvent["closeReason"]) => void;
}) {
  const ctx = useRuntimeContext();
  const basePopup = ctx.document.popups?.[popupId];
  // V4: apply the assigned variant's patch + pick its content root.
  const resolved = basePopup ? resolvePopupForVariant(basePopup, variantId) : null;
  // V5: apply locale patch on top of variant-resolved popup.
  const localeResolved = resolved?.popup && resolvedLocale
    ? resolveLocaleContent(basePopup!, resolvedLocale)
    : null;
  const popup: PopupDefinition | undefined = (localeResolved?.patch && resolved?.popup)
    ? { ...resolved.popup, ...localeResolved.patch }
    : resolved?.popup;
  const contentRootId = localeResolved?.rootNodeId !== basePopup?.rootNodeId
    ? localeResolved?.rootNodeId
    : (resolved?.rootNodeId ?? basePopup?.rootNodeId);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const isClosing = lifecycle === "closing";

  // V4: track which goals already fired this open lifecycle (de-dupe).
  const firedGoals = useRef<Set<string>>(new Set());
  useEffect(() => {
    firedGoals.current = new Set();
  }, [popupId, variantId]);

  // V4: delegated goal tracking for click/submit goals targeting content nodes.
  useEffect(() => {
    if (!basePopup?.goals?.length || typeof document === "undefined") return;
    const surface = surfaceRef.current;
    if (!surface) return;

    const matchGoalNode = (target: EventTarget | null, type: "click" | "submit") => {
      if (!(target instanceof Element)) return;
      for (const goal of basePopup.goals ?? []) {
        if (goal.type !== type || !goal.targetNodeId) continue;
        if (firedGoals.current.has(goal.id)) continue;
        const node = target.closest(`[data-node-id="${goal.targetNodeId}"]`);
        if (node) {
          firedGoals.current.add(goal.id);
          emitPopupEvent({
            type: type === "click" ? "popup_cta_click" : "popup_submit",
            popupId,
            popupName: basePopup.name,
            ...(variantId ? { variantId } : {}),
            goalId: goal.id,
            nodeId: goal.targetNodeId,
          });
          emitPopupEvent({
            type: "popup_conversion",
            popupId,
            popupName: basePopup.name,
            ...(variantId ? { variantId } : {}),
            goalId: goal.id,
            nodeId: goal.targetNodeId,
          });
          // hideAfterSubmit (roadmap 03/04): close the popup once a `submit`
          // goal fires. No prior runtime behavior consumed this rule — it was
          // only validated in the schema before this. Deferred to the next
          // microtask so the Form's own submit pipeline (success message,
          // reset) finishes rendering first, rather than yanking the popup
          // away mid-submit.
          if (shouldHideAfterSubmit(type, basePopup.rules?.hideAfterSubmit)) {
            queueMicrotask(() => onClose("submit"));
          }
        }
      }
    };
    const onClick = (e: Event) => matchGoalNode(e.target, "click");
    const onSubmit = (e: Event) => matchGoalNode(e.target, "submit");
    surface.addEventListener("click", onClick);
    surface.addEventListener("submit", onSubmit, true);
    return () => {
      surface.removeEventListener("click", onClick);
      surface.removeEventListener("submit", onSubmit, true);
    };
  }, [basePopup, popupId, variantId, emitPopupEvent, onClose]);

  // Runtime-only drag/resize state. NEVER written back to the document.
  const modalConfig = popup?.kindConfig.kind === "modal" ? popup.kindConfig : undefined;
  const runtimeDraggable = !!modalConfig?.runtimeDraggable;
  const runtimeResizable = !!modalConfig?.runtimeResizable;
  const dragBounds = modalConfig?.dragBounds ?? "viewport";
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [runtimeSize, setRuntimeSize] = useState<{ width: number; height: number } | null>(null);

  const beginPointerDrag = useCallback(
    (event: React.PointerEvent, mode: "move" | "resize") => {
      if (isClosing) return;
      event.preventDefault();
      event.stopPropagation();
      const startX = event.clientX;
      const startY = event.clientY;
      const startOffset = { ...dragOffset };
      const rect = surfaceRef.current?.getBoundingClientRect();
      const startSize = rect ? { width: rect.width, height: rect.height } : { width: 0, height: 0 };
      const onMove = (e: PointerEvent) => {
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;
        if (mode === "move") {
          let nx = startOffset.x + dx;
          let ny = startOffset.y + dy;
          if (dragBounds === "viewport" && rect) {
            const maxX = Math.max(0, (window.innerWidth - rect.width) / 2);
            const maxY = Math.max(0, (window.innerHeight - rect.height) / 2);
            nx = Math.min(maxX, Math.max(-maxX, nx));
            ny = Math.min(maxY, Math.max(-maxY, ny));
          }
          setDragOffset({ x: nx, y: ny });
        } else {
          setRuntimeSize({
            width: Math.max(160, startSize.width + dx),
            height: Math.max(120, startSize.height + dy),
          });
        }
      };
      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [dragOffset, dragBounds, isClosing],
  );

  // Capture the element to restore focus to, once, on mount.
  useEffect(() => {
    if (typeof document === "undefined") return;
    restoreFocusRef.current = document.activeElement;
    return () => {
      if (popup?.behavior.restoreFocus && restoreFocusRef.current instanceof HTMLElement) {
        restoreFocusRef.current.focus();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ESC + focus-trap: only the topmost interactive popup responds.
  useEffect(() => {
    if (!popup || typeof document === "undefined" || !isTopmost || isClosing) return;
    const surface = surfaceRef.current;
    if (popup.behavior.trapFocus && surface) {
      const focusable = surface.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      focusable?.focus();
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && popup.behavior.closeOnEscape) {
        onClose("escape");
        return;
      }
      if (event.key !== "Tab" || !popup.behavior.trapFocus || !surface) return;
      const focusables = Array.from(surface.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )).filter((el) => !el.hasAttribute("disabled"));
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [popup, onClose, isTopmost, isClosing]);

  if (!popup) return null;

  const shellStyle = getPopupShellStyle(popup);
  const backdrop = popup.behavior.backdrop;
  // Enter animation while opening, exit animation while closing.
  const exitKind = popup.animation.exit ?? popup.animation.enter;
  const animationName = (() => {
    if (isClosing) return exitKind === "none" ? undefined : `rb-popup-${exitKind}-out`;
    return popup.animation.enter === "none" ? undefined : `rb-popup-${popup.animation.enter}`;
  })();

  return React.createElement(
    "div",
    {
      "data-popup-id": popup.id,
      "data-popup-state": lifecycle,
      style: {
        position: "fixed",
        inset: 0,
        zIndex,
        // Non-backdrop popups (e.g. bar) must not block the whole page; only
        // the surface itself should capture pointer events.
        pointerEvents: backdrop.enabled ? "auto" : "none",
        display: "flex",
        alignItems: shellStyle.alignItems,
        justifyContent: shellStyle.justifyContent,
        padding: shellStyle.wrapperPadding,
      } as React.CSSProperties,
    },
    backdrop.enabled
      ? React.createElement("button", {
          type: "button",
          "aria-label": "Close popup backdrop",
          tabIndex: -1,
          onClick: popup.behavior.closeOnBackdropClick && !isClosing ? () => onClose("backdrop") : undefined,
          style: {
            position: "absolute",
            inset: 0,
            border: 0,
            padding: 0,
            margin: 0,
            background: backdrop.color,
            opacity: backdrop.opacity,
            backdropFilter: backdrop.blur ? `blur(${backdrop.blur})` : undefined,
            cursor: popup.behavior.closeOnBackdropClick ? "pointer" : "default",
            animation: animationName
              ? `${isClosing ? "rb-popup-backdrop-out" : "rb-popup-backdrop-in"} ${popup.animation.durationMs}ms ${popup.animation.easing ?? "ease"} both`
              : undefined,
          },
        })
      : null,
    React.createElement(
      "div",
      {
        ref: surfaceRef,
        role: "dialog",
        "aria-modal": popup.kind !== "bar" ? true : undefined,
        style: {
          ...shellStyle.surface,
          ...(runtimeSize ? { width: `${runtimeSize.width}px`, height: `${runtimeSize.height}px` } : {}),
          position: "relative",
          zIndex: 1,
          pointerEvents: "auto",
          overflow: "auto",
          // Compose runtime drag offset on top of the document-defined transform.
          transform: composeTransforms(shellStyle.surface.transform, dragOffset),
          animation: animationName
            ? `${animationName} ${popup.animation.durationMs}ms ${popup.animation.easing ?? "ease"} both`
            : undefined,
        },
      },
      // Runtime drag handle (modal only, opt-in). Grab anywhere on this bar.
      runtimeDraggable
        ? React.createElement("div", {
            "aria-hidden": true,
            onPointerDown: (e: React.PointerEvent) => beginPointerDrag(e, "move"),
            style: {
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 28,
              cursor: "move",
              zIndex: 3,
              touchAction: "none",
            } as React.CSSProperties,
          })
        : null,
      // Runtime resize handle (modal only, opt-in), bottom-right corner.
      runtimeResizable
        ? React.createElement("div", {
            "aria-hidden": true,
            onPointerDown: (e: React.PointerEvent) => beginPointerDrag(e, "resize"),
            style: {
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 18,
              height: 18,
              cursor: "nwse-resize",
              zIndex: 3,
              touchAction: "none",
              background: "linear-gradient(135deg, transparent 50%, rgba(0,0,0,.25) 50%)",
            } as React.CSSProperties,
          })
        : null,
      popup.behavior.showCloseButton
        ? React.createElement("button", {
            type: "button",
            "aria-label": "Close popup",
            onClick: () => onClose("button"),
            style: {
              position: "absolute",
              right: 12,
              top: 12,
              zIndex: 2,
              width: 32,
              height: 32,
              borderRadius: 999,
              border: "1px solid rgba(0,0,0,.12)",
              background: "rgba(255,255,255,.86)",
              cursor: "pointer",
              fontSize: 20,
              lineHeight: "28px",
            },
          }, "×")
        : null,
      React.createElement(RuntimeNode, { nodeId: contentRootId ?? popup.rootNodeId }),
    ),
  );
}

/** Compose the document-defined transform with a runtime drag offset. */
function composeTransforms(
  base: React.CSSProperties["transform"],
  offset: { x: number; y: number },
): React.CSSProperties["transform"] {
  const parts: string[] = [];
  if (typeof base === "string" && base.length > 0) parts.push(base);
  if (offset.x !== 0 || offset.y !== 0) parts.push(`translate(${offset.x}px, ${offset.y}px)`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function getPopupShellStyle(popup: NonNullable<BuilderDocument["popups"]>[string]): {
  alignItems: React.CSSProperties["alignItems"];
  justifyContent: React.CSSProperties["justifyContent"];
  wrapperPadding: string;
  surface: React.CSSProperties;
} {
  const base: React.CSSProperties = {
    background: "#ffffff",
    color: "#111827",
    boxShadow: "0 24px 80px rgba(15, 23, 42, 0.24)",
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 32px)",
  };

  if (popup.kind === "drawer") {
    const config = popup.kindConfig.kind === "drawer" ? popup.kindConfig : undefined;
    return {
      alignItems: "stretch",
      justifyContent: popup.placement === "left" ? "flex-start" : "flex-end",
      wrapperPadding: "0",
      surface: {
        ...base,
        width: config?.width ?? "420px",
        minWidth: config?.minWidth,
        maxWidth: config?.maxWidth ?? "80vw",
        height: "100vh",
        maxHeight: "100vh",
      },
    };
  }
  if (popup.kind === "bottomSheet") {
    const config = popup.kindConfig.kind === "bottomSheet" ? popup.kindConfig : undefined;
    return {
      alignItems: "flex-end",
      justifyContent: "center",
      wrapperPadding: "0",
      surface: {
        ...base,
        width: "100%",
        minHeight: config?.minHeight,
        height: config?.initialHeight ?? "45vh",
        maxHeight: config?.maxHeight ?? "92vh",
        borderRadius: "18px 18px 0 0",
      },
    };
  }
  if (popup.kind === "bar") {
    const config = popup.kindConfig.kind === "bar" ? popup.kindConfig : undefined;
    return {
      alignItems: popup.placement === "top" ? "flex-start" : "flex-end",
      justifyContent: "center",
      wrapperPadding: "0",
      surface: {
        ...base,
        width: "100%",
        minHeight: config?.height ?? "72px",
        maxHeight: "40vh",
        borderRadius: 0,
      },
    };
  }
  if (popup.kind === "fullscreen") {
    return {
      alignItems: "stretch",
      justifyContent: "stretch",
      wrapperPadding: "0",
      surface: { ...base, width: "100vw", height: "100vh", maxWidth: "100vw", maxHeight: "100vh" },
    };
  }
  const config = popup.kindConfig.kind === "modal" ? popup.kindConfig : undefined;
  const offsetX = config?.offsetX ?? 0;
  const offsetY = config?.offsetY ?? 0;
  return {
    alignItems: "center",
    justifyContent: "center",
    wrapperPadding: "16px",
    surface: {
      ...base,
      width: config?.width ?? undefined,
      height: config?.height ?? undefined,
      maxWidth: config?.maxWidth ?? "640px",
      maxHeight: config?.maxHeight ?? "90vh",
      borderRadius: 16,
      transform: offsetX !== 0 || offsetY !== 0 ? `translate(${offsetX}px, ${offsetY}px)` : undefined,
    },
  };
}

import React, { useState, useCallback, useMemo } from "react";
import type {
  BuilderDocument,
  ComponentRegistry,
} from "@ui-builder/builder-core";
import type { RendererConfig } from "./types";
import { RuntimeContext, type RuntimeContextValue } from "./context/RuntimeContext";
import { AnimationKeyframes, PopupKeyframes } from "./styles/keyframes";
import { RuntimeNode } from "./components/RuntimeNode";
import { PopupRuntimeLayer } from "./popups/PopupRuntimeLayer";
import { usePopupLifecycle } from "./popups/usePopupLifecycle";
import { shouldHideAfterSubmit } from "./popups/shouldHideAfterSubmit";

export { shouldHideAfterSubmit };

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
    popupStorage,
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

  // Popup lifecycle & state management
  const {
    popupStack,
    openPopup,
    closePopup,
    popupPushPadding,
    assignments,
    localeAssignments,
    emitPopupEvent,
    backgroundInert,
  } = usePopupLifecycle({ document, config });

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

  return React.createElement(
    RuntimeContext.Provider,
    { value: contextValue },
    React.createElement(AnimationKeyframes, null),
    React.createElement(PopupKeyframes, null),
    React.createElement(
      "div",
      {
        className: "ui-builder-scope",
        style: popupPushPadding,
        // `inert` is the standard way to make a subtree non-interactive for pointer, keyboard, and AT.
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

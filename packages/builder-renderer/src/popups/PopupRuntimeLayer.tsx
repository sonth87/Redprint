import React, { useEffect, useRef, useState, useCallback } from "react";
import type {
  BuilderDocument,
  Breakpoint,
  PopupStackEntry,
  PopupLifecycleState,
  PopupDefinition,
  PopupAnalyticsEvent,
} from "@ui-builder/builder-core";
import {
  topmostInteractivePopup,
  resolvePopupForVariant,
  resolveLocaleContent,
} from "@ui-builder/builder-core";
import { useRuntimeContext } from "../context/RuntimeContext";
import { RuntimeNode } from "../components/RuntimeNode";
import { shouldHideAfterSubmit } from "./shouldHideAfterSubmit";

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

export function PopupRuntimeLayer({
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

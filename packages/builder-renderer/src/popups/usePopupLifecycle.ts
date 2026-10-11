import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
  BuilderDocument,
  PopupDefinition,
  PopupStackEntry,
  PopupAnalyticsEvent,
} from "@ui-builder/builder-core";
import {
  DEFAULT_POPUP_Z_INDEX_BASE,
  applyPopupOpen,
  applyPopupClose,
  applyPopupOpened,
  applyPopupClosed,
  applyPopupRemove,
  topmostInteractivePopup,
  shouldReducePopupMotion,
  resolveVariantAssignment,
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
import type { RendererConfig } from "../types";

export interface UsePopupLifecycleProps {
  document: BuilderDocument;
  config: RendererConfig;
}

export function usePopupLifecycle({ document, config }: UsePopupLifecycleProps) {
  const {
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
  } = config;

  // Runtime popup lifecycle stack (opening → open → closing → closed).
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

  // ── V4: A/B variant assignment ─────────────────────────────────────────────
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
    }

    const zIndexBase = popup.runtimeState?.zIndexBase ?? DEFAULT_POPUP_Z_INDEX_BASE;
    clearTimer(closeTimers, popupId);
    const variantId = assignVariant(popup);

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

      if (closeReason === "escape" || closeReason === "backdrop" || closeReason === "button") {
        emitPopupEvent({
          type: "popup_dismiss",
          popupId,
          popupName: popup?.name,
          ...(variantId ? { variantId } : {}),
          closeReason,
        });
      }

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

  useEffect(() => {
    closePopupRef.current = closePopup;
  });

  useEffect(() => {
    if (popupQueue.length === 0) return;
    const hasMountedCampaignPopup = mountedPopupEntries(popupStack).some(
      (e) => document.popups?.[e.popupId]?.campaignId,
    );
    if (hasMountedCampaignPopup) return;

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

  const topInteractive = topmostInteractivePopup(popupStack);
  const topPopup = topInteractive ? document.popups?.[topInteractive.popupId] : undefined;
  const backgroundInert = !!(
    topPopup &&
    topPopup.kind !== "bar" &&
    (topPopup.behavior.inertBackground ?? false)
  );

  return {
    popupStack,
    openPopup,
    closePopup,
    popupPushPadding,
    assignments,
    localeAssignments,
    emitPopupEvent,
    backgroundInert,
  };
}

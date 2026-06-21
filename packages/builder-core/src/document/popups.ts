import type { StyleConfig } from "./types";
import type { Breakpoint } from "../responsive/types";

export type PopupKind = "modal" | "drawer" | "bottomSheet" | "bar" | "fullscreen";

export type PopupPlacement = "center" | "top" | "bottom" | "left" | "right";

export interface PopupModalConfig {
  kind: "modal";
  size: "sm" | "md" | "lg" | "xl" | "custom";
  width?: string;
  height?: string;
  maxWidth?: string;
  maxHeight?: string;
  /** Editor-time drag (document-mutating). */
  draggable?: boolean;
  /** Editor-time resize (document-mutating). */
  resizable?: boolean;
  offsetX?: number;
  offsetY?: number;
  /** V3: allow end-user to drag the shell at runtime (runtime-only, never mutates the document). */
  runtimeDraggable?: boolean;
  /** V3: allow end-user to resize the shell at runtime (runtime-only). */
  runtimeResizable?: boolean;
  /** V3: constrain runtime drag within the viewport. Default "viewport". */
  dragBounds?: "viewport" | "none";
}

export interface PopupDrawerConfig {
  kind: "drawer";
  width: string;
  minWidth?: string;
  maxWidth?: string;
  resizable?: boolean;
}

export interface PopupBottomSheetConfig {
  kind: "bottomSheet";
  initialHeight: string;
  minHeight?: string;
  maxHeight?: string;
  snapPoints?: string[];
  draggable: boolean;
  dragToClose: boolean;
  /** V3: allow end-user to drag between snap points at runtime (runtime-only). */
  runtimeDraggable?: boolean;
  /** V3: snap point below which a drag-down closes the sheet (requires dragToClose). */
  closeBelowSnapPoint?: string;
}

export interface PopupBarConfig {
  kind: "bar";
  height?: string;
  sticky: boolean;
  pushPageContent?: boolean;
}

export interface PopupFullscreenConfig {
  kind: "fullscreen";
}

export type PopupKindConfig =
  | PopupModalConfig
  | PopupDrawerConfig
  | PopupBottomSheetConfig
  | PopupBarConfig
  | PopupFullscreenConfig;

export type PopupAutoTrigger =
  | { type: "manual" }
  | { type: "pageLoad"; delayMs?: number }
  | { type: "scrollDepth"; percent: number }
  | { type: "sectionVisible"; targetNodeId: string; threshold?: number };

export interface PopupBehavior {
  backdrop: {
    enabled: boolean;
    color: string;
    opacity: number;
    blur?: string;
  };
  closeOnEscape: boolean;
  closeOnBackdropClick: boolean;
  showCloseButton: boolean;
  lockBodyScroll: boolean;
  trapFocus: boolean;
  restoreFocus: boolean;
  /** V3: close the popup when the route/URL changes (runtime hook decides how route change is detected). */
  closeOnRouteChange?: boolean;
  /** V3: close when the user interacts with anything outside the popup surface. */
  closeOnOutsideInteraction?: boolean;
  /** V3: prevent pointer interaction with background content while open. */
  preventBackgroundInteraction?: boolean;
  /** V3: mark the background as inert (inert + aria-hidden) for the topmost modal-like popup. */
  inertBackground?: boolean;
  /** V3: how to handle prefers-reduced-motion. Default "respect". */
  reducedMotion?: "respect" | "ignore";
}

export interface PopupAnimation {
  enter: "fade" | "scale" | "slide-up" | "slide-down" | "slide-left" | "slide-right" | "none";
  exit?: PopupAnimation["enter"];
  durationMs: number;
  easing?: string;
}

// ── V5: Frequency ─────────────────────────────────────────────────────────────

export type FrequencyUnit = "session" | "hour" | "day" | "week" | "month";

export interface PopupFrequencyRule {
  maxShows: number;
  per: FrequencyUnit;
}

export interface PopupFrequencyConfig {
  cap?: PopupFrequencyRule;
  suppressAfterGoalIds?: string[];
  storageKeyPrefix?: string;
}

// ── V5: Targeting ──────────────────────────────────────────────────────────────

export type PopupConditionOperator =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "contains"
  | "truthy"
  | "falsy"
  | "in"
  | "notIn"
  | "matches";

export interface PopupTargetingCondition {
  /** Dot-notation key resolved from RendererConfig.popupContext.
   * Convention: "user.id", "user.trait.plan", "page.url", "page.locale",
   * "visitor.sessionCount", "datetime.hour", "datetime.dayOfWeek" */
  variable: string;
  operator: PopupConditionOperator;
  value?: unknown;
}

export interface PopupTargetingGroup {
  match: "all" | "any";
  conditions: PopupTargetingCondition[];
}

export interface PopupTargeting {
  enabled: boolean;
  groups?: PopupTargetingGroup[];
}

// ── V5: Scheduling ─────────────────────────────────────────────────────────────

export interface PopupSchedule {
  enabled: boolean;
  startDate?: string;
  endDate?: string;
  timezone?: string;
  timeWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek?: number[];
  };
}

// ── PopupRules (extended for V5) ───────────────────────────────────────────────

export interface PopupRules {
  // Existing (preserved for V2/V3/V4 back-compat):
  devices?: Breakpoint[];
  showOncePerSession?: boolean;
  showOnceEveryDays?: number;
  maxShows?: number;
  hideAfterSubmit?: boolean;
  // V5 additions:
  frequency?: PopupFrequencyConfig;
  targeting?: PopupTargeting;
  scheduling?: PopupSchedule;
}

/** V3: runtime stacking policy. Runtime-only; never affects document content. */
export type PopupStackMode = "single" | "multiple" | "replace-same-kind";

export interface PopupRuntimeStateConfig {
  /** How concurrent popups stack. Default "single". */
  stackMode?: PopupStackMode;
  /** Base z-index for the popup stack. Default 10000. */
  zIndexBase?: number;
}

export interface PopupMetadata {
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  pluginData?: Record<string, unknown>;
}

/** V4: a measurable conversion goal attached to a popup. */
export interface PopupGoal {
  id: string;
  name: string;
  type: "click" | "submit" | "close" | "customEvent" | "urlVisit";
  /** For click/submit goals — a node inside the popup content tree. */
  targetNodeId?: string;
  /** For customEvent goals — matches the runtime `popup:goal` emit name. */
  eventName?: string;
  /** For urlVisit goals — a URL substring/pattern the runtime checks. */
  urlPattern?: string;
}

/**
 * V4: an A/B test variant of a popup.
 *
 * Content ownership: a variant may have its own `rootNodeId` (a content tree
 * owned by the popup — cascade-deleted with the popup, deep-cloned on
 * duplicate). When omitted, the variant reuses the base content and only
 * applies `popupPatch`.
 */
export interface PopupVariant {
  id: string;
  name: string;
  /** Relative weight for weighted assignment; values <= 0 are excluded. */
  weight: number;
  enabled: boolean;
  /** Config patch applied over the base popup (excludes identity/content/variants). */
  popupPatch?: Partial<
    Omit<PopupDefinition, "id" | "rootNodeId" | "metadata" | "variants" | "experiment" | "goals">
  >;
  /** Optional alternate content root (owned by the popup). */
  rootNodeId?: string;
}

/** V4: experiment configuration governing variant assignment. */
export interface PopupExperiment {
  enabled: boolean;
  /** "random" assigns per open; "sticky" persists per visitor. */
  assignment: "random" | "sticky";
  /** Optional seed for deterministic assignment. */
  seed?: string;
  /** When set, forces this variant (experiment concluded). */
  winnerVariantId?: string;
}

// ── V5: Localization ───────────────────────────────────────────────────────────

/**
 * V5: locale-specific content override for a popup.
 *
 * Content ownership: same rules as PopupVariant — a locale with its own
 * `rootNodeId` is popup-owned (cascade-deleted with popup, deep-cloned on
 * duplicate). Absence of `rootNodeId` = reuse base content + apply patch only.
 */
export interface PopupLocaleContent {
  locale: string;
  rootNodeId?: string;
  popupPatch?: Partial<
    Omit<
      PopupDefinition,
      | "id"
      | "rootNodeId"
      | "metadata"
      | "locales"
      | "fallbackLocale"
      | "variants"
      | "experiment"
    >
  >;
}

/**
 * V4: vendor-neutral analytics event emitted by the runtime. Serializable;
 * lives in builder-core so editor preview and renderer share one contract.
 */
export interface PopupAnalyticsEvent {
  type:
    | "popup_impression"
    | "popup_open"
    | "popup_close"
    | "popup_cta_click"
    | "popup_submit"
    | "popup_dismiss"
    | "popup_conversion"
    | "popup_error"
    | "popup_variant_assigned"
    | "popup_rules_blocked"
    | "popup_locale_resolved";
  popupId: string;
  popupName?: string;
  variantId?: string;
  triggerType?: string;
  closeReason?: "button" | "escape" | "backdrop" | "action" | "routeChange" | "programmatic";
  goalId?: string;
  nodeId?: string;
  timestamp: number;
  sessionId?: string;
  visitorId?: string;
  /** V5: resolved locale tag (e.g. "fr-CA"). */
  locale?: string;
  /** V5: reason a popup was suppressed by rules. */
  rulesBlockReason?: "targeting" | "schedule" | "frequency";
  metadata?: Record<string, unknown>;
}

export interface PopupDefinition {
  id: string;
  name: string;
  enabled: boolean;
  rootNodeId: string;
  kind: PopupKind;
  placement: PopupPlacement;
  kindConfig: PopupKindConfig;
  autoTrigger: PopupAutoTrigger;
  behavior: PopupBehavior;
  animation: PopupAnimation;
  rules: PopupRules;
  /** V3: optional runtime stacking/z-index policy. */
  runtimeState?: PopupRuntimeStateConfig;
  /** V4: conversion goals tracked for this popup. */
  goals?: PopupGoal[];
  /** V4: A/B test variants (content roots owned by this popup). */
  variants?: PopupVariant[];
  /** V4: experiment/assignment configuration. */
  experiment?: PopupExperiment;
  /** V5: locale-specific content overrides (content roots owned by this popup). */
  locales?: PopupLocaleContent[];
  /** V5: fallback locale tag when no exact/prefix match found. */
  fallbackLocale?: string;
  metadata: PopupMetadata;
}

export interface PopupNodeTemplate {
  componentType: string;
  name?: string;
  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  children?: PopupNodeTemplate[];
}

export interface PopupTemplate {
  id: string;
  name: string;
  description?: string;
  category?: string;
  thumbnail?: string | null;
  tags?: string[];
  popup: Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">;
  root: PopupNodeTemplate;
}

export function getDefaultPopupKindConfig(kind: PopupKind): PopupKindConfig {
  switch (kind) {
    case "drawer":
      return { kind, width: "420px", minWidth: "320px", maxWidth: "80vw", resizable: false };
    case "bottomSheet":
      return {
        kind,
        initialHeight: "45vh",
        minHeight: "160px",
        maxHeight: "92vh",
        snapPoints: ["25vh", "50vh", "90vh"],
        draggable: true,
        dragToClose: true,
      };
    case "bar":
      return { kind, height: "72px", sticky: true, pushPageContent: false };
    case "fullscreen":
      return { kind };
    case "modal":
    default:
      return { kind: "modal", size: "md", maxWidth: "640px", maxHeight: "90vh" };
  }
}

export function getDefaultPopupBehavior(kind: PopupKind): PopupBehavior {
  const usesBackdrop = kind !== "bar";
  return {
    backdrop: {
      enabled: usesBackdrop,
      color: "#000000",
      opacity: 0.48,
      blur: usesBackdrop ? "2px" : undefined,
    },
    closeOnEscape: true,
    closeOnBackdropClick: usesBackdrop,
    showCloseButton: true,
    lockBodyScroll: usesBackdrop,
    trapFocus: usesBackdrop,
    restoreFocus: true,
    closeOnRouteChange: false,
    closeOnOutsideInteraction: false,
    preventBackgroundInteraction: usesBackdrop,
    inertBackground: usesBackdrop,
    reducedMotion: "respect",
  };
}

export function getDefaultPopupAnimation(kind: PopupKind): PopupAnimation {
  switch (kind) {
    case "drawer":
      return { enter: "slide-left", exit: "slide-right", durationMs: 220, easing: "ease" };
    case "bottomSheet":
      return { enter: "slide-up", exit: "slide-down", durationMs: 240, easing: "ease" };
    case "bar":
      return { enter: "slide-down", exit: "slide-up", durationMs: 180, easing: "ease" };
    case "fullscreen":
      return { enter: "fade", exit: "fade", durationMs: 180, easing: "ease" };
    case "modal":
    default:
      return { enter: "scale", exit: "scale", durationMs: 200, easing: "ease" };
  }
}

export function createDefaultPopupDefinition(input: {
  id: string;
  name: string;
  rootNodeId: string;
  kind?: PopupKind;
  placement?: PopupPlacement;
  timestamp: string;
}): PopupDefinition {
  const kind = input.kind ?? "modal";
  return {
    id: input.id,
    name: input.name,
    enabled: true,
    rootNodeId: input.rootNodeId,
    kind,
    placement: input.placement ?? (kind === "drawer" ? "right" : kind === "bar" || kind === "bottomSheet" ? "bottom" : "center"),
    kindConfig: getDefaultPopupKindConfig(kind),
    autoTrigger: { type: "manual" },
    behavior: getDefaultPopupBehavior(kind),
    animation: getDefaultPopupAnimation(kind),
    rules: {},
    metadata: { createdAt: input.timestamp, updatedAt: input.timestamp },
  };
}

/**
 * builder-renderer — type contracts.
 * Production runtime rendering types.
 */

import type { BuilderDocument, BuilderNode, StyleConfig } from "@ui-builder/builder-core";
import type { Breakpoint } from "@ui-builder/builder-core";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import type { PopupAnalyticsEvent } from "@ui-builder/builder-core";

/**
 * Minimal structural EventBus contract — lets a host that already owns a
 * builder EventBus receive popup analytics without the renderer importing the
 * concrete class. Compatible with builder-core's `EventBus`.
 */
export interface PopupAnalyticsEventBus {
  emit(event: "popup:analytics", payload: PopupAnalyticsEvent): void;
}

// ── Component manifest for remote/dynamic loading ─────────────────────────

export interface ComponentManifestEntry {
  type: string;
  name: string;
  version: string;
  /** URL to the ESM bundle for this component */
  bundleUrl: string;
  /** Expected export name in the bundle */
  exportName?: string;
  /** CSS URL if the component needs styles */
  cssUrl?: string;
  /** SHA-256 content hash for integrity verification */
  integrity?: string;
}

export interface ComponentManifest {
  schemaVersion: string;
  baseUrl?: string;
  components: ComponentManifestEntry[];
}

// ── Loader state ──────────────────────────────────────────────────────────

export type LoadState = "idle" | "loading" | "loaded" | "error";

export interface ComponentLoadStatus {
  type: string;
  state: LoadState;
  error?: string;
  loadedAt?: number;
}

// ── Render pipeline ───────────────────────────────────────────────────────

export interface RenderContext {
  document: BuilderDocument;
  breakpoint: Breakpoint;
  /** Variable values resolved for rendering */
  variables: Record<string, unknown>;
  /** Whether running inside editor or production runtime */
  mode: "editor" | "runtime";
}

export interface ResolvedNode {
  node: BuilderNode;
  definition: ComponentDefinition;
  resolvedStyle: StyleConfig;
  children: ResolvedNode[];
}

// ── Renderer options ──────────────────────────────────────────────────────

export interface RendererConfig {
  /** Breakpoint to render at. Default: 'desktop' */
  breakpoint?: Breakpoint;
  /** Variable values for data binding. Default: {} */
  variables?: Record<string, unknown>;
  /** Fallback component when a type is missing. Default: PlaceholderComponent */
  missingComponentFallback?: ComponentDefinition;
  /** Whether to add data-node-id attributes to DOM output. Default: false */
  attachNodeIds?: boolean;
  /** Runtime popup lifecycle callback. */
  onPopupOpen?: (popupId: string) => void;
  /** Runtime popup lifecycle callback. */
  onPopupClose?: (popupId: string) => void;
  /** Storage used for popup frequency rules. Defaults to browser local/session storage. */
  popupStorage?: Storage;

  // ── V4: analytics + A/B experiments ──────────────────────────────────────
  /** Vendor-neutral popup analytics callback (GA/Segment/etc. wiring lives here). */
  onPopupAnalyticsEvent?: (event: PopupAnalyticsEvent) => void;
  /**
   * Optional EventBus to also emit `popup:analytics` on (e.g. a host's builder
   * EventBus). Fired in addition to `onPopupAnalyticsEvent`.
   */
  eventBus?: PopupAnalyticsEventBus;
  /**
   * Host override to read a sticky A/B variant assignment (e.g. server cookie).
   * When omitted, sticky assignment falls back to `popupStorage`.
   */
  getVariantAssignment?: (popupId: string) => string | null | undefined;
  /** Host override to persist a sticky A/B variant assignment. */
  setVariantAssignment?: (popupId: string, variantId: string) => void;
  /** When true, analytics events are tagged `metadata.preview = true` (editor preview). */
  isPreview?: boolean;

  // ── V5: targeting context, locale, frequency storage ──────────────────────
  /**
   * Arbitrary context object used for popup targeting rule evaluation.
   * Access fields via dot-notation in condition `variable` (e.g. "user.trait.plan").
   */
  popupContext?: Record<string, unknown>;
  /**
   * BCP-47 locale tag (e.g. "fr-CA"). Used to resolve locale-specific popup
   * content. Falls back to navigator.language, then popup.fallbackLocale, then
   * base content.
   */
  locale?: string;
  /**
   * Host override to read a stored frequency impression count.
   * Receives the storage key; returns `{ count, storedAt }` or `undefined`.
   * When omitted, falls back to localStorage/sessionStorage.
   */
  getFrequencyCount?: (key: string) => { count: number; storedAt: number } | undefined;
  /**
   * Host override to persist a frequency impression count.
   * When omitted, falls back to localStorage/sessionStorage.
   */
  setFrequencyCount?: (key: string, count: number, expiresAt?: number) => void;

  // ── Interaction actions: emit / custom (roadmap 01/01) ────────────────────
  /**
   * Standard bridge for the `emit` interaction action — lets page content notify
   * the host app (CMS/website) of a named event. Called with no listener attached
   * is a dev-only no-op warning, never a thrown error.
   */
  onCustomEvent?: (event: string, payload?: unknown) => void;
  /**
   * Named handlers for the `custom` interaction action. A handler name with no
   * matching entry is a dev-only no-op warning, never a thrown error.
   */
  customActionHandlers?: Record<string, (params?: unknown) => void>;

  // ── Form submit pipeline (roadmap 03/04) ──────────────────────────────────
  /**
   * Called when a `Form` node with `submitAction: "emit"` submits successfully
   * (after HTML5 validation passes). `formName` is the Form node's `name` prop
   * (or its node id if unset); `fields` is `{ name: value }` collected from the
   * form's inputs. This is the escape hatch for host apps (CMS/website) that
   * want to handle form data themselves instead of a webhook POST.
   */
  onFormSubmit?: (formName: string, fields: Record<string, unknown>) => void;
}

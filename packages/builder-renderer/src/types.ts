/**
 * builder-renderer — type contracts.
 * Production runtime rendering types.
 */

import type { BuilderDocument, BuilderNode, StyleConfig } from "@ui-builder/builder-core";
import type { Breakpoint } from "@ui-builder/builder-core";
import type { ComponentDefinition } from "@ui-builder/builder-core";

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
}

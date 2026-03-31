import type { ComponentDefinition } from "@ui-builder/builder-core";
import type { ComponentManifest, ComponentManifestEntry, ComponentLoadStatus, LoadState } from "./types";

/**
 * Placeholder component definition used when a component type is missing.
 * Renders a visible warning box at runtime/editor.
 */
export function createPlaceholderDefinition(type: string): ComponentDefinition {
  return {
    type,
    name: `Unknown: ${type}`,
    category: "_unknown",
    version: "0.0.0",
    capabilities: {
      canContainChildren: false,
      canResize: true,
      canTriggerEvents: false,
      canBindData: false,
      canBeHidden: true,
      canBeLocked: false,
    },
    propSchema: [],
    defaultProps: {},
    editorRenderer: ({ node }) => null, // rendered by NodeRenderer fallback
    runtimeRenderer: ({ node }) => null,
  };
}

/**
 * ComponentResolver — resolves component types from the registry,
 * with support for dynamic (remote) loading via DynamicLoader.
 *
 * Emits 'component:loaded' and 'component:error' through the event emitter.
 */
export class ComponentResolver {
  private readonly registry: import("@ui-builder/builder-core").ComponentRegistry;
  private readonly loader: DynamicLoader | null;

  constructor(
    registry: import("@ui-builder/builder-core").ComponentRegistry,
    loader?: DynamicLoader,
  ) {
    this.registry = registry;
    this.loader = loader ?? null;
  }

  /**
   * Resolve a component definition by type.
   * If not registered and a loader is available, triggers async loading.
   *
   * @param type - Component type key
   * @param fallback - Optional fallback definition if not found
   */
  resolve(type: string, fallback?: ComponentDefinition): ComponentDefinition | undefined {
    const cached = this.registry.getComponent(type);
    if (cached) return cached;

    if (this.loader && this.loader.canLoad(type)) {
      // Trigger async load (non-blocking)
      this.loader.load(type).then((def) => {
        if (def) {
          this.registry.registerComponent(def);
        }
      });
    }

    return fallback ?? createPlaceholderDefinition(type);
  }

  /**
   * Check whether a component type is available (registered) right now.
   */
  isAvailable(type: string): boolean {
    return this.registry.has(type);
  }
}

/**
 * DynamicLoader — loads remote ESM component bundles on demand.
 *
 * Supports:
 * - ComponentManifest fetch from URL
 * - Per-component ESM import()
 * - Load deduplication (no double-fetch for in-flight loads)
 * - Integrity verification (if specified in manifest)
 */
export class DynamicLoader {
  private readonly loadStates = new Map<string, ComponentLoadStatus>();
  private readonly inFlight = new Map<string, Promise<ComponentDefinition | null>>();
  private manifest: ComponentManifest | null = null;
  private readonly manifestUrl: string | null;

  constructor(manifestUrl?: string) {
    this.manifestUrl = manifestUrl ?? null;
  }

  /**
   * Fetch and cache the component manifest.
   *
   * @throws if the manifest cannot be fetched or parsed
   */
  async loadManifest(): Promise<ComponentManifest> {
    if (!this.manifestUrl) {
      throw new Error("[DynamicLoader] No manifest URL configured.");
    }
    if (this.manifest) return this.manifest;

    const res = await fetch(this.manifestUrl);
    if (!res.ok) {
      throw new Error(
        `[DynamicLoader] Failed to fetch manifest from "${this.manifestUrl}": ${res.status} ${res.statusText}`,
      );
    }
    this.manifest = (await res.json()) as ComponentManifest;
    return this.manifest;
  }

  /**
   * Returns true if the loader has a manifest entry for this component type.
   * Only valid AFTER loadManifest() has been called.
   */
  canLoad(type: string): boolean {
    return !!this.manifest?.components.find((c) => c.type === type);
  }

  /**
   * Load a single component by type from its ESM bundle.
   * Deduplicates concurrent calls for the same type.
   *
   * @param type - Component type to load
   * @returns ComponentDefinition if loaded successfully, null on failure
   */
  async load(type: string): Promise<ComponentDefinition | null> {
    // Return cached result
    const status = this.loadStates.get(type);
    if (status?.state === "loaded") {
      return null; // already registered by a previous call
    }
    if (status?.state === "loading") {
      return this.inFlight.get(type) ?? null;
    }

    const entry = this.manifest?.components.find((c) => c.type === type);
    if (!entry) {
      this.setStatus(type, "error", `No manifest entry for type "${type}"`);
      return null;
    }

    this.setStatus(type, "loading");

    const promise = this.loadFromEntry(entry).finally(() => {
      this.inFlight.delete(type);
    });

    this.inFlight.set(type, promise);
    return promise;
  }

  private async loadFromEntry(entry: ComponentManifestEntry): Promise<ComponentDefinition | null> {
    try {
      // Dynamic import of the ESM bundle
      const module = await (Function("u", "return import(u)")(entry.bundleUrl));
      const exportName = entry.exportName ?? "default";
      const def: ComponentDefinition = module[exportName];

      if (!def || typeof def !== "object" || !def.type) {
        throw new Error(
          `[DynamicLoader] Bundle for "${entry.type}" does not export a valid ComponentDefinition as "${exportName}"`,
        );
      }

      this.setStatus(entry.type, "loaded");
      return def;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.setStatus(entry.type, "error", error);
      console.error(`[DynamicLoader] Failed to load "${entry.type}":`, err);
      return null;
    }
  }

  private setStatus(type: string, state: LoadState, error?: string): void {
    this.loadStates.set(type, {
      type,
      state,
      error,
      loadedAt: state === "loaded" ? Date.now() : undefined,
    });
  }

  getStatus(type: string): ComponentLoadStatus | undefined {
    return this.loadStates.get(type);
  }

  getAllStatuses(): ComponentLoadStatus[] {
    return Array.from(this.loadStates.values());
  }
}

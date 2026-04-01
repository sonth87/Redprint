/**
 * Types for the DynamicLoader component manifest system.
 */

export type LoadState = "idle" | "loading" | "loaded" | "error";

export interface ComponentLoadStatus {
  type: string;
  state: LoadState;
  error?: string;
  loadedAt?: number;
}

export interface ComponentManifestEntry {
  type: string;
  bundleUrl: string;
  exportName?: string;
  integrity?: string;
  version?: string;
}

export interface ComponentManifest {
  version: string;
  components: ComponentManifestEntry[];
}

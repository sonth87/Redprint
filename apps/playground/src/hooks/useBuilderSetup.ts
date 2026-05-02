import { useMemo, useEffect } from "react";
import { createBuilder, GroupRegistry, BUILT_IN_GROUPS, BUILT_IN_SUB_GROUPS } from "@ui-builder/builder-core";
import type { BuilderAPI, AssetProvider, AssetListResult } from "@ui-builder/builder-core";
import { BASE_COMPONENTS } from "@ui-builder/builder-components";
import { CUSTOM_COMPONENTS } from "../components/sample-components";
import { FIXTURE_DOCUMENT } from "../fixtures/fixture-document";

const API_BASE = "http://localhost:3002";

/**
 * AssetProvider backed by the local API server.
 * Upload → POST /api/media/upload (multipart)
 * List   → GET  /api/media/list
 * Delete → DELETE /api/media/:id
 * Static → GET /uploads/:filename
 */
const localAssetProvider: AssetProvider = {
  id: "local",
  name: "Local Media",
  supportedTypes: ["image", "video"],

  async listAssets(): Promise<AssetListResult> {
    try {
      const res = await fetch(`${API_BASE}/api/media/list`);
      const data = await res.json();
      const assets = (data.assets ?? []);
      return { assets, total: assets.length, page: 1, pageSize: assets.length };
    } catch {
      return { assets: [], total: 0, page: 1, pageSize: 0 };
    }
  },

  async upload(file): Promise<import("@ui-builder/builder-core").Asset> {
    const form = new FormData();
    form.append("files", file as File);
    const res = await fetch(`${API_BASE}/api/media/upload`, { method: "POST", body: form });
    const data = await res.json();
    const asset = data.assets?.[0];
    if (!asset) throw new Error("Upload failed");
    return { ...asset, source: "local" };
  },

  async delete(assetId: string): Promise<void> {
    await fetch(`${API_BASE}/api/media/${assetId}`, { method: "DELETE" });
  },
};

/**
 * Creates a BuilderAPI instance pre-loaded with sample components and
 * the fixture document, plus a GroupRegistry for the 2-level component palette.
 */
export function useBuilderSetup(): { builder: BuilderAPI; groupRegistry: GroupRegistry; useRemotePalette: boolean; assetProvider: AssetProvider } {
  const builder = useMemo(() => {
    const b = createBuilder({
      document: FIXTURE_DOCUMENT,
      permissions: {
        canEdit: true,
        canDelete: true,
        canAddComponents: true,
        canLoadRemoteComponents: true,
        canExport: true,
        canImport: true,
      },
    });

    // Register all base components
    for (const comp of BASE_COMPONENTS) {
      b.registry.registerComponent(comp);
    }

    // Register project-specific custom components (from sample-components.tsx)
    for (const comp of CUSTOM_COMPONENTS) {
      b.registry.registerComponent(comp);
    }

    return b;
  }, []);

  const groupRegistry = useMemo(() => {
    const gr = new GroupRegistry();
    for (const g of BUILT_IN_GROUPS) gr.registerGroup(g);
    for (const sg of BUILT_IN_SUB_GROUPS) gr.registerSubGroup(sg);
    return gr;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      builder.destroy();
    };
  }, [builder]);

  return { builder, groupRegistry, useRemotePalette: true, assetProvider: localAssetProvider };
}

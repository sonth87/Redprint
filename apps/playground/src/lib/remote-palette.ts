import type { RemotePaletteProvider } from "@ui-builder/builder-editor";
import type { PaletteCatalog, PaletteItem } from "@ui-builder/builder-core";
import tempCatalog from "../fixtures/palette-catalog.json";

const BASE_URL = "http://localhost:3002/api/palette";

export const remotePaletteProvider: RemotePaletteProvider = {
  fetchCatalog: async (): Promise<PaletteCatalog> => {
    try {
      const res = await fetch(`${BASE_URL}/catalog`);
      if (res.ok) return res.json();
    } catch (err) {
      console.warn("API unavailable, falling back to local JSON for catalog");
    }

    // Fallback to local JSON
    return {
      version: tempCatalog.version,
      groups: tempCatalog.groups as any,
    };
  },

  fetchItem: async (id: string): Promise<PaletteItem> => {
    try {
      const res = await fetch(`${BASE_URL}/items/${id}`);
      if (res.ok) return res.json();
    } catch (err) {
      console.warn(`API unavailable, falling back to local JSON for item: ${id}`);
    }

    // Fallback: search in catalog groups -> types -> items
    for (const group of tempCatalog.groups) {
      for (const type of group.types) {
        const item = (type.items as any[]).find((it) => it.id === id);
        if (item) return item as PaletteItem;
      }
    }

    throw new Error(`Failed to fetch palette item: ${id}`);
  },
};

import type { RemotePaletteProvider } from "@ui-builder/builder-editor";
import type { PaletteCatalog, PaletteItem } from "@ui-builder/builder-core";
import tempCatalog from "../../../api/src/data/palette.combined.json";

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

  fetchMetadata: async (): Promise<PaletteCatalog> => {
    try {
      const res = await fetch(`${BASE_URL}/metadata`);
      if (res.ok) return res.json();
    } catch (err) {
      console.warn("API unavailable, falling back to local JSON for metadata");
    }

    // Fallback: strip items from tempCatalog
    return {
      version: tempCatalog.version,
      groups: tempCatalog.groups.map((g: any) => ({
        ...g,
        types: g.types.map((t: any) => ({ ...t, items: [] }))
      })) as any,
    };
  },

  fetchGroupItems: async (groupId: string): Promise<{ groupId: string; types: { id: string; items: PaletteItem[] }[] }> => {
    try {
      const res = await fetch(`${BASE_URL}/groups/${groupId}/items`);
      if (res.ok) return res.json();
    } catch (err) {
      console.warn(`API unavailable, falling back to local JSON for group items: ${groupId}`);
    }

    // Fallback from local JSON
    const group = tempCatalog.groups.find((g: any) => g.id === groupId);
    if (!group) throw new Error(`Group not found: ${groupId}`);

    return {
      groupId: group.id,
      types: group.types.map((t: any) => ({
        id: t.id,
        items: t.items as any[]
      }))
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

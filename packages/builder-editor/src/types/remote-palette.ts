import type { PaletteCatalog, PaletteItem } from "@ui-builder/builder-core";

export interface RemotePaletteProvider {
  /** Fetch the entire catalog (legacy) */
  fetchCatalog: () => Promise<PaletteCatalog>;
  /** Fetch only metadata (groups and types without items) */
  fetchMetadata: () => Promise<PaletteCatalog>;
  /** Fetch items for a specific group */
  fetchGroupItems: (groupId: string) => Promise<{ groupId: string; types: { id: string; items: PaletteItem[] }[] }>;
  fetchItem: (id: string) => Promise<PaletteItem>;
}

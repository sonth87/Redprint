import type { PaletteCatalog, PaletteItem } from "@ui-builder/builder-core";

export interface RemotePaletteProvider {
  fetchCatalog: () => Promise<PaletteCatalog>;
  fetchItem: (id: string) => Promise<PaletteItem>;
}

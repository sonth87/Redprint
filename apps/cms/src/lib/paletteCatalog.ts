import type { PaletteGroup } from "@ui-builder/builder-presets";

// Static imports — no runtime API dependency.
// Vite resolves these via the @palette alias → apps/api/src/data/palette/
import textData from "@palette/text.json";
import imageData from "@palette/image.json";
import buttonData from "@palette/button.json";
import galleryData from "@palette/gallery.json";
import decorativeData from "@palette/decorative.json";
import menuData from "@palette/menu.json";
import collectionData from "@palette/collection.json";
import containerData from "@palette/container.json";
import cardData from "@palette/card.json";
import designedSectionData from "@palette/designed_section.json";

const RAW_GROUPS = [
  textData,
  imageData,
  buttonData,
  galleryData,
  decorativeData,
  menuData,
  collectionData,
  containerData,
  cardData,
  designedSectionData,
];

export const PALETTE_GROUPS: PaletteGroup[] = RAW_GROUPS as PaletteGroup[];

/** Flat list of all items across all groups and types */
export function getAllPaletteItems() {
  return PALETTE_GROUPS.flatMap((group) =>
    group.types.flatMap((type) =>
      type.items.map((item) => ({ ...item, _group: group.id, _type: type.id })),
    ),
  );
}

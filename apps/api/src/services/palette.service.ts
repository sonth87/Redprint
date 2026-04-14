import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PALETTE_DATA_PATH = path.resolve(__dirname, "../data/palette.json");

export class PaletteService {
  private static async getRawData() {
    const data = await fs.readFile(PALETTE_DATA_PATH, "utf-8");
    return JSON.parse(data);
  }

  /**
   * Returns the tree structure for the side panel (Metadata only).
   */
  static async getCatalog() {
    const data = await this.getRawData();
    // In a real system, we might want to strip 'content' here to save bandwidth
    const catalog = {
      version: data.version,
      groups: data.groups.map((group: any) => ({
        ...group,
        types: group.types.map((type: any) => ({
          ...type,
          items: type.items.map((item: any) => ({
            id: item.id,
            type: item.type,
            name: item.name,
            description: item.description,
            thumbnail: item.thumbnail,
            componentType: item.componentType,
            tags: item.tags || [],
            style: item.style,
            props: item.props,
            i18n: item.i18n,
            responsiveStyle: item.responsiveStyle,
            responsiveProps: item.responsiveProps
          }))
        }))
      }))
    };
    return catalog;
  }

  /**
   * Returns the full blueprint for a specific item.
   */
  static async getItem(id: string) {
    const data = await this.getRawData();
    let foundItem = null;

    for (const group of data.groups) {
      for (const type of group.types) {
        foundItem = type.items.find((i: any) => i.id === id);
        if (foundItem) break;
      }
      if (foundItem) break;
    }

    if (!foundItem) return null;
    return foundItem;
  }
}

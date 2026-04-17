import { loadPalette } from "../data/palette/loader.js";

export class PaletteService {
  private static async getRawData() {
    return await loadPalette();
  }

  /**
   * Returns the tree structure for the side panel (Metadata only - NO ITEMS).
   */
  static async getMetadata() {
    const data = await this.getRawData();
    return {
      version: data.version,
      groups: data.groups.map((group: any) => ({
        id: group.id,
        label: group.label,
        icon: group.icon,
        order: group.order,
        i18n: group.i18n,
        types: group.types.map((type: any) => ({
          id: type.id,
          label: type.label,
          order: type.order,
          layout: type.layout,
          i18n: type.i18n,
          // Items are NOT included here
          items: []
        }))
      }))
    };
  }

  /**
   * Returns items for a specific group.
   */
  static async getGroupItems(groupId: string) {
    const data = await this.getRawData();
    const group = data.groups.find((g: any) => g.id === groupId);
    if (!group) return null;

    return {
      groupId: group.id,
      types: group.types.map((type: any) => ({
        id: type.id,
        items: type.items
      }))
    };
  }

  /**
   * Returns the tree structure for the side panel (Metadata with ALL items).
   * @deprecated Use getMetadata and getGroupItems instead for better performance.
   */
  static async getCatalog() {
    const data = await this.getRawData();
    return data;
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

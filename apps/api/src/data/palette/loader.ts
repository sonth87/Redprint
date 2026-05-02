/**
 * Palette Loader
 *
 * Loads and combines individual group files into a complete palette structure.
 * This allows for easier management of large palette data by keeping each group in a separate file.
 *
 * Usage:
 *   import { loadPalette } from './palette/loader';
 *   const palette = loadPalette();
 */

import fs from "fs/promises";
import fsSyncModule from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface PaletteGroup {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  i18n?: Record<string, string | Record<string, string>>;
  types: Array<{
    id: string;
    label: string;
    order?: number;
    layout?: string;
    i18n?: Record<string, string | Record<string, string>>;
    items: Record<string, unknown>[];
  }>;
}

export interface Palette {
  version: string;
  groups: PaletteGroup[];
}

/**
 * Load a single group file synchronously
 */
function loadGroupSync(groupId: string): PaletteGroup {
  const filePath = path.join(__dirname, `${groupId}.json`);
  const content = fsSyncModule.readFileSync(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Load a single group file asynchronously
 */
async function loadGroup(groupId: string): Promise<PaletteGroup> {
  const filePath = path.join(__dirname, `${groupId}.json`);
  const content = await fs.readFile(filePath, "utf-8");
  return JSON.parse(content);
}

/**
 * Load all palette groups and combine them (async)
 */
export async function loadPalette(): Promise<Palette> {
  const groupIds = [
    "text",
    "image",
    "button",
    "layout",
    "gallery",
    "decorative",
    "menu",
    "card",
    "designed_section",
  ];

  const groups = await Promise.all(
    groupIds.map(async (groupId) => {
      try {
        return await loadGroup(groupId);
      } catch (error) {
        console.error(`Failed to load group: ${groupId}`, error);
        throw error;
      }
    })
  );

  return {
    version: "1.0.0",
    groups,
  };
}

/**
 * Load all palette groups and combine them (sync)
 */
export function loadPaletteSync(): Palette {
  const groupIds = [
    "text",
    "image",
    "button",
    "layout",
    "gallery",
    "decorative",
    "menu",
    "card",
    "designed_section",
  ];

  const groups: PaletteGroup[] = groupIds.map((groupId) => {
    try {
      return loadGroupSync(groupId);
    } catch (error) {
      console.error(`Failed to load group: ${groupId}`, error);
      throw error;
    }
  });

  return {
    version: "1.0.0",
    groups,
  };
}

/**
 * Get a specific group by ID (sync)
 */
export function getGroupSync(groupId: string): PaletteGroup {
  return loadGroupSync(groupId);
}

/**
 * Get a specific group by ID (async)
 */
export async function getGroup(groupId: string): Promise<PaletteGroup> {
  return loadGroup(groupId);
}

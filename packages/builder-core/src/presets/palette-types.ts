/**
 * PaletteCatalog — JSON-driven catalog for the "Add Elements" palette.
 *
 * The catalog flows: PaletteCatalog → PaletteGroup → PaletteType → PaletteItem
 *
 * Items are *presets* of registered ComponentDefinition types — they define
 * different props/style/responsive overrides but share the same renderer.
 *
 * This data structure is designed to be serialisable (plain JSON), so it can
 * be loaded from a mock file today and from an API endpoint in the future.
 *
 * Design decisions:
 * - Item i18n lives in the JSON (not in editor locale files): labels travel
 *   with catalog data from the API.
 * - Group-level / palette-chrome i18n keys ("Add Elements", "Search…") live
 *   in the editor locale files under the `palette.*` namespace.
 * - `responsiveStyle` and `responsiveProps` carry per-breakpoint overrides that
 *   are applied immediately after ADD_NODE via UPDATE_RESPONSIVE_STYLE commands.
 */

import type { StyleConfig } from "../document/types";
import type { Breakpoint } from "../responsive/types";
import type { PresetChildNode } from "./types";

// ── Top-level catalog ─────────────────────────────────────────────────────

export interface PaletteCatalog {
  /** Semantic version string, e.g. "1.0.0" */
  version: string;
  /** Ordered list of component groups to display in the palette */
  groups: PaletteGroup[];
}

// ── Group ─────────────────────────────────────────────────────────────────

export interface PaletteGroup {
  /** Unique identifier matching a ComponentGroup.id — e.g. "text" */
  id: string;
  /** Fallback label shown when i18n lookup fails */
  label: string;
  /**
   * Lucide icon name (without the "lucide-" prefix), e.g. "type", "image".
   * Used for the floating palette icon rail.
   */
  icon: string;
  /** Lower number appears first */
  order: number;
  /**
   * Optional per-locale label overrides.
   * Keyed by locale code, e.g. { "en": "Text", "vi": "Văn bản" }
   */
  i18n?: Record<string, string>;
  /** Sub-categories within this group */
  types: PaletteType[];
}

// ── Type (sub-category) ───────────────────────────────────────────────────

export interface PaletteType {
  /** Unique within the parent group, e.g. "titles", "paragraphs" */
  id: string;
  /** Fallback label */
  label: string;
  /** Lucide icon name (optional, for future use) */
  icon?: string;
  /** Lower number appears first */
  order: number;
  /**
   * Controls how items inside this type are laid out in the panel.
   * - `"grid"` (default): 2-column grid — suits visual/thumbnail items (images, shapes, containers).
   * - `"list"`: single-column, horizontal card — suits text-heavy items where the label is primary.
   * - `"preview"`: 2-column grid — full-width visual-only card, no label. Suits styled buttons, badges.
   */
  layout?: "grid" | "list" | "preview";
  /** Optional description shown as a section hint */
  description?: string;
  /** Per-locale label overrides */
  i18n?: Record<string, string>;
  /** Item variants for this type */
  items: PaletteItem[];
}

// ── Item (variant / preset) ───────────────────────────────────────────────

export type PaletteItemType = "variant" | "group";

export interface PaletteItem {
  /** Unique within the parent type. Used as React key and for dedup. */
  id: string;
  /**
   * The type of item:
   * - "variant": A single component with pre-defined props/style.
   * - "group": A composite component or snippet (e.g. Price Card).
   */
  type: PaletteItemType;
  /**
   * The ComponentDefinition.type key this item instantiates.
   * For "group", this is usually the root component (e.g. "Container" or "Section").
   */
  componentType: string;
  /** Fallback display name */
  name: string;
  /** Optional description shown in item tooltip */
  description?: string;
  /**
   * Preview thumbnail URL or data-URI.
   */
  thumbnail?: string | null;
  /**
   * Per-locale name/description overrides.
   */
  i18n?: Record<string, { name?: string; description?: string }>;
  /**
   * The following fields are optional because they might be fetched on-demand (Lazy-load).
   */
  /** Props applied when the item is added to the canvas */
  props?: Record<string, unknown>;
  /** Style overrides applied to node.style */
  style?: Partial<StyleConfig>;
  /** Per-breakpoint style overrides */
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  /** Per-breakpoint prop overrides */
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  /**
   * For container-type items: child nodes to create recursively.
   */
  children?: PresetChildNode[];
  /** Tags used for cross-group search */
  tags?: string[];
}

/**
 * Minimal metadata for a palette item, used for the initial catalog load.
 */
export type PaletteItemMetadata = Pick<
  PaletteItem,
  "id" | "type" | "componentType" | "name" | "thumbnail" | "i18n" | "tags"
>;

// ── Palette drag data ─────────────────────────────────────────────────────

/**
 * Serialised payload placed in dataTransfer when dragging a PaletteItem.
 * Also used by the click-to-add handler.
 *
 * Parsed in useDragHandlers.handleDrop and useClickToAdd.
 */
export interface PaletteDragData {
  /** "palette-item" discriminant — distinguishes from old `{ type }` format */
  source: "palette-item";
  /** Item ID for remote fetching */
  itemId?: string;
  /** Component type to instantiate */
  componentType: string;
  /** Full preset configuration to apply after ADD_NODE (optional if itemId is present) */
  presetData?: {
    props: Record<string, unknown>;
    style?: Partial<StyleConfig>;
    responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
    responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
    children?: PresetChildNode[];
  };
}

/**
 * Preset types for the component preset system.
 *
 * Presets are pre-configured variations of components (e.g. "Hero Section",
 * "CTA Button", "Testimonial Card") that users can drag onto the canvas.
 */
import type { StyleConfig } from "../document/types";

export interface ComponentPreset {
  id: string;
  /** Component type this preset applies to */
  componentType: string;
  /** Human-readable name */
  name: string;
  /** Category for grouping in palette */
  category: string;
  /** Optional description */
  description?: string;
  /** Thumbnail URL or data-uri */
  thumbnail?: string;
  /** Tags for search */
  tags?: string[];
  /** Pre-configured props */
  props: Record<string, unknown>;
  /** Pre-configured style */
  style?: Partial<StyleConfig>;
  /** For container presets: child nodes to create */
  children?: PresetChildNode[];
}

export interface PresetChildNode {
  componentType: string;
  props: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  children?: PresetChildNode[];
}

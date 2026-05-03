/**
 * Gallery system — types and presets shared across builder-components and builder-editor.
 * Zero React/DOM dependencies.
 */

// ── GalleryItem ───────────────────────────────────────────────────────────────

export interface GalleryItem {
  /** Stable React key — generated client-side via shortId */
  id: string;
  src: string;
  alt?: string;
  title?: string;
  description?: string;
  link?: string;
  /** Original pixel width — used for masonry aspect-ratio calculation */
  width?: number;
  /** Original pixel height */
  height?: number;
}

// ── Layout modes ──────────────────────────────────────────────────────────────

export type GalleryLayoutMode =
  | "grid"
  | "masonry"
  | "collage"
  | "slider"
  | "slideshow"
  | "thumbnails"
  | "strip"
  | "column"
  | "bricks"
  | "honeycomb"
  | "freestyle"
  | "carousel-3d"
  | "stacked";

export interface GalleryLayoutModeDefinition {
  value: GalleryLayoutMode;
  label: string;
  description: string;
  group: "gallery" | "slideshow" | "creative";
}

export const GALLERY_LAYOUT_MODES: GalleryLayoutModeDefinition[] = [
  // Gallery
  { value: "grid",        label: "Grid",        description: "Uniform cells in N columns",          group: "gallery" },
  { value: "masonry",     label: "Masonry",      description: "Pinterest-style varying heights",     group: "gallery" },
  { value: "collage",     label: "Collage",      description: "Featured first image, mosaic style",  group: "gallery" },
  { value: "strip",       label: "Strip",        description: "Large left image + stacked right",    group: "gallery" },
  { value: "column",      label: "Column",       description: "Single column, stacked full-width",   group: "gallery" },
  { value: "bricks",      label: "Bricks",       description: "Alternating 2-col and 1-col rows",    group: "gallery" },
  // Slideshow
  { value: "slider",      label: "Slider",       description: "Horizontal carousel, one at a time",  group: "slideshow" },
  { value: "slideshow",   label: "Slideshow",    description: "Full-bleed autoplay presentation",    group: "slideshow" },
  { value: "thumbnails",  label: "Thumbnails",   description: "Main image + filmstrip below",        group: "slideshow" },
  // Creative
  { value: "honeycomb",   label: "Honeycomb",    description: "Hexagonal honeycomb grid layout",     group: "creative" },
  { value: "freestyle",   label: "Freestyle",    description: "Scattered with random rotation",      group: "creative" },
  { value: "carousel-3d", label: "3D Carousel",  description: "3D perspective coverflow effect",     group: "creative" },
  { value: "stacked",     label: "Stacked",      description: "Card stack with depth and rotation",  group: "creative" },
];

// ── Default items ─────────────────────────────────────────────────────────────

export const DEFAULT_GALLERY_ITEMS: GalleryItem[] = [
  { id: "gi-0", src: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=600&q=80", alt: "Mountain lake" },
  { id: "gi-1", src: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80", alt: "Mountain peaks" },
  { id: "gi-2", src: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80", alt: "Sunrise valley" },
  { id: "gi-3", src: "https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=600&q=80", alt: "Waterfall" },
  { id: "gi-4", src: "https://images.unsplash.com/photo-1440342359743-84fcb8c21f21?w=600&q=80", alt: "Coast road" },
  { id: "gi-5", src: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=600&q=80", alt: "Aerial forest" },
];

// ── normalizeItems (shared logic) ─────────────────────────────────────────────

/**
 * Coerces any raw prop value into a GalleryItem[].
 * Handles:
 *   - new format:  { id, src, alt, title, description, link }
 *   - old format:  { src, alt } (GalleryPro v1/v2)
 *   - empty/null:  returns DEFAULT_GALLERY_ITEMS
 */
export function normalizeGalleryItems(raw: unknown): GalleryItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return DEFAULT_GALLERY_ITEMS;
  return (raw as Record<string, unknown>[]).map((item, i) => ({
    id: typeof item["id"] === "string" ? item["id"] : `gi-${i}`,
    src: typeof item["src"] === "string" ? item["src"] : "",
    alt: typeof item["alt"] === "string" ? item["alt"] : "",
    title: typeof item["title"] === "string" ? item["title"] : "",
    description: typeof item["description"] === "string" ? item["description"] : "",
    link: typeof item["link"] === "string"
      ? item["link"]
      : typeof item["linkUrl"] === "string"
        ? item["linkUrl"]
        : "",
  }));
}

// ── seededRandom — deterministic pseudo-random from a string seed ─────────────

/**
 * djb2-based hash → value in [0, 1).
 * Same seed always produces the same result — used for freestyle layout.
 */
export function seededRandom(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash & 0x7fffffff) / 0x7fffffff;
}

/**
 * Image filter definitions — framework-agnostic, zero dependencies.
 *
 * Each filter has a stable `value` key stored in props.
 * Three rendering modes:
 *   - "css"     → apply cssFilter as CSS `filter` property on <img>
 *   - "svg"     → inject SVG filter def; apply `filter: url(#svgId)` on <img>
 *   - "overlay" → apply overlayBaseCss on <img> + color div with mix-blend-mode on top
 *
 * Consumers:
 *   - builder-components/Image.tsx  — renders the actual img + overlay
 *   - builder-editor/ImageFilterPicker.tsx — renders preview swatches + injects SVG defs
 */

export type FilterMode = "css" | "svg" | "overlay";

export interface ImageFilter {
  /** Stable key stored in node props */
  value: string;
  /** Human-readable name shown in the picker */
  label: string;
  /** Rendering strategy */
  mode: FilterMode;
  /** CSS filter string for mode="css", or overlayBaseCss for mode="overlay" */
  cssFilter?: string;
  /** SVG filter element id (without #) for mode="svg" */
  svgId?: string;
  /** Full SVG <filter>…</filter> markup for mode="svg" */
  svgDef?: string;
  /** Solid hex overlay color for mode="overlay" */
  overlayColor?: string;
  /** Overlay opacity 0–1 for mode="overlay" */
  overlayOpacity?: number;
  /** CSS mix-blend-mode for the overlay div (default "multiply") */
  overlayBlend?: string;
  /** Additional CSS filter applied to <img> before the color overlay */
  overlayBaseCss?: string;
}

// ── SVG filter definitions ────────────────────────────────────────────────

/**
 * Anaglyph 3D — splits RGB channels: red shifted left, cyan shifted right.
 */
const SVG_3D = `
<filter id="if-3d" color-interpolation-filters="sRGB" x="-5%" width="110%">
  <feColorMatrix type="matrix" in="SourceGraphic" result="red"
    values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"/>
  <feOffset in="red" dx="-6" dy="0" result="redShifted"/>
  <feColorMatrix type="matrix" in="SourceGraphic" result="cyan"
    values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0"/>
  <feOffset in="cyan" dx="6" dy="0" result="cyanShifted"/>
  <feBlend in="redShifted" in2="cyanShifted" mode="screen"/>
</filter>`;

/**
 * Ink — ultra-high contrast grayscale, ink-on-paper look.
 */
const SVG_INK = `
<filter id="if-ink" color-interpolation-filters="sRGB">
  <feColorMatrix type="saturate" values="0" result="gray"/>
  <feComponentTransfer in="gray">
    <feFuncR type="linear" slope="1.8" intercept="-0.35"/>
    <feFuncG type="linear" slope="1.8" intercept="-0.35"/>
    <feFuncB type="linear" slope="1.8" intercept="-0.35"/>
  </feComponentTransfer>
</filter>`;

// ── Filter list ───────────────────────────────────────────────────────────

export const IMAGE_FILTERS: ImageFilter[] = [
  // Row 1
  { value: "none", label: "None", mode: "css" },
  {
    value: "kennedy",
    label: "Kennedy",
    mode: "css",
    cssFilter: "grayscale(0.5) contrast(1.2) brightness(1.15) sepia(0.2)",
  },
  {
    value: "darken",
    label: "Darken",
    mode: "css",
    cssFilter: "brightness(0.65) contrast(1.25)",
  },

  // Row 2
  {
    value: "blur",
    label: "Blur",
    mode: "css",
    cssFilter: "blur(4px) brightness(1.05)",
  },
  {
    value: "lighten",
    label: "Lighten",
    mode: "css",
    cssFilter: "brightness(1.45) contrast(0.85) saturate(0.9)",
  },
  {
    value: "faded",
    label: "Faded",
    mode: "overlay",
    overlayBaseCss: "sepia(0.2) contrast(0.9) brightness(1.05) saturate(0.75)",
    overlayColor: "#f5e6d0",
    overlayOpacity: 0.22,
    overlayBlend: "soft-light",
  },

  // Row 3
  {
    value: "kerouac",
    label: "Kerouac",
    mode: "overlay",
    overlayBaseCss: "sepia(0.35) contrast(1.1) brightness(0.9)",
    overlayColor: "#c8a882",
    overlayOpacity: 0.2,
    overlayBlend: "multiply",
  },
  {
    value: "orca",
    label: "Orca",
    mode: "css",
    cssFilter: "saturate(1.6) hue-rotate(165deg) brightness(1.05) contrast(1.15)",
  },
  {
    value: "sangria",
    label: "Sangria",
    mode: "overlay",
    overlayBaseCss: "contrast(1.1) brightness(0.9) saturate(1.2)",
    overlayColor: "#8b1a3a",
    overlayOpacity: 0.28,
    overlayBlend: "multiply",
  },

  // Row 4
  {
    value: "gotham",
    label: "Gotham",
    mode: "css",
    cssFilter: "grayscale(1) contrast(1.4) brightness(0.8)",
  },
  {
    value: "nightrain",
    label: "Nightrain",
    mode: "overlay",
    overlayBaseCss: "contrast(1.2) brightness(0.85) saturate(1.1)",
    overlayColor: "#1a1040",
    overlayOpacity: 0.35,
    overlayBlend: "multiply",
  },
  {
    value: "whistler",
    label: "Whistler",
    mode: "overlay",
    overlayBaseCss: "brightness(1.1) contrast(0.9) saturate(0.8)",
    overlayColor: "#d0e8f0",
    overlayOpacity: 0.25,
    overlayBlend: "soft-light",
  },

  // Row 5
  {
    value: "feathered",
    label: "Feathered",
    mode: "overlay",
    overlayBaseCss: "contrast(0.85) brightness(1.1) saturate(0.7)",
    overlayColor: "#e8ddd0",
    overlayOpacity: 0.3,
    overlayBlend: "soft-light",
  },
  {
    value: "soledad",
    label: "Soledad",
    mode: "css",
    cssFilter: "sepia(0.7) contrast(1.1) brightness(0.9) saturate(1.3)",
  },
  {
    value: "goldie",
    label: "Goldie",
    mode: "overlay",
    overlayBaseCss: "brightness(1.1) contrast(0.9) saturate(1.1)",
    overlayColor: "#f5c842",
    overlayOpacity: 0.25,
    overlayBlend: "soft-light",
  },

  // Row 6
  {
    value: "3d",
    label: "3D",
    mode: "svg",
    svgId: "if-3d",
    svgDef: SVG_3D,
  },
  {
    value: "ink",
    label: "Ink",
    mode: "svg",
    svgId: "if-ink",
    svgDef: SVG_INK,
  },
  {
    value: "manhattan",
    label: "Manhattan",
    mode: "overlay",
    overlayBaseCss: "grayscale(0.3) contrast(1.1) brightness(0.95)",
    overlayColor: "#c8b090",
    overlayOpacity: 0.22,
    overlayBlend: "multiply",
  },

  // Row 7
  {
    value: "gumby",
    label: "Gumby",
    mode: "overlay",
    overlayBaseCss: "saturate(1.2) brightness(1.0) contrast(1.1)",
    overlayColor: "#00a86b",
    overlayOpacity: 0.35,
    overlayBlend: "multiply",
  },
  {
    value: "organic",
    label: "Organic",
    mode: "overlay",
    overlayBaseCss: "sepia(0.4) brightness(1.0) contrast(1.05)",
    overlayColor: "#8b6914",
    overlayOpacity: 0.28,
    overlayBlend: "multiply",
  },
  {
    value: "elmo",
    label: "Elmo",
    mode: "overlay",
    overlayBaseCss: "contrast(1.15) brightness(1.0) saturate(1.3)",
    overlayColor: "#cc2200",
    overlayOpacity: 0.32,
    overlayBlend: "multiply",
  },

  // Row 8
  {
    value: "neptune",
    label: "Neptune",
    mode: "overlay",
    overlayBaseCss: "saturate(0.9) brightness(1.05) contrast(1.05)",
    overlayColor: "#6688cc",
    overlayOpacity: 0.38,
    overlayBlend: "multiply",
  },
  {
    value: "jellybean",
    label: "Jellybean",
    mode: "overlay",
    overlayBaseCss: "contrast(1.1) brightness(1.0) saturate(1.2)",
    overlayColor: "#cc0088",
    overlayOpacity: 0.38,
    overlayBlend: "multiply",
  },
  {
    value: "neonsky",
    label: "Neon Sky",
    mode: "overlay",
    overlayBaseCss: "contrast(1.1) brightness(1.05) saturate(1.2)",
    overlayColor: "#ff8800",
    overlayOpacity: 0.3,
    overlayBlend: "soft-light",
  },

  // Row 9
  {
    value: "hulk",
    label: "Hulk",
    mode: "overlay",
    overlayBaseCss: "contrast(1.2) brightness(0.95) saturate(1.3)",
    overlayColor: "#33cc00",
    overlayOpacity: 0.45,
    overlayBlend: "multiply",
  },
  {
    value: "bauhaus",
    label: "Bauhaus",
    mode: "overlay",
    overlayBaseCss: "grayscale(0.3) contrast(1.2) brightness(1.0)",
    overlayColor: "#c8c0a8",
    overlayOpacity: 0.25,
    overlayBlend: "multiply",
  },
  {
    value: "yoda",
    label: "Yoda",
    mode: "overlay",
    overlayBaseCss: "contrast(1.1) brightness(0.95) saturate(1.1)",
    overlayColor: "#006644",
    overlayOpacity: 0.38,
    overlayBlend: "multiply",
  },

  // Row 10
  {
    value: "midnight",
    label: "Midnight",
    mode: "overlay",
    overlayBaseCss: "brightness(0.6) contrast(1.4) saturate(0.7)",
    overlayColor: "#000033",
    overlayOpacity: 0.5,
    overlayBlend: "multiply",
  },
  {
    value: "unicorn",
    label: "Unicorn",
    mode: "overlay",
    overlayBaseCss: "brightness(1.1) contrast(0.9) saturate(0.8)",
    overlayColor: "#d4a8e8",
    overlayOpacity: 0.4,
    overlayBlend: "soft-light",
  },
  {
    value: "blueray",
    label: "Blue Ray",
    mode: "overlay",
    overlayBaseCss: "contrast(1.2) brightness(0.85) saturate(1.1)",
    overlayColor: "#0022dd",
    overlayOpacity: 0.45,
    overlayBlend: "multiply",
  },

  // Row 11
  {
    value: "malibu",
    label: "Malibu",
    mode: "overlay",
    overlayBaseCss: "brightness(1.05) contrast(1.0) saturate(0.9)",
    overlayColor: "#8888ee",
    overlayOpacity: 0.35,
    overlayBlend: "soft-light",
  },
  {
    value: "redrum",
    label: "Red Rum",
    mode: "overlay",
    overlayBaseCss: "contrast(1.3) brightness(0.85) saturate(1.2)",
    overlayColor: "#990000",
    overlayOpacity: 0.45,
    overlayBlend: "multiply",
  },
  {
    value: "flamingo",
    label: "Flamingo",
    mode: "overlay",
    overlayBaseCss: "brightness(1.1) contrast(0.95) saturate(1.1)",
    overlayColor: "#ff88aa",
    overlayOpacity: 0.38,
    overlayBlend: "soft-light",
  },

  // Row 12
  {
    value: "hydra",
    label: "Hydra",
    mode: "overlay",
    overlayBaseCss: "brightness(1.15) contrast(0.9) saturate(0.9)",
    overlayColor: "#ffaacc",
    overlayOpacity: 0.3,
    overlayBlend: "soft-light",
  },
  {
    value: "koolaid",
    label: "Kool-Aid",
    mode: "overlay",
    overlayBaseCss: "contrast(1.2) brightness(1.0) saturate(1.3)",
    overlayColor: "#aa0066",
    overlayOpacity: 0.45,
    overlayBlend: "multiply",
  },
  {
    value: "barney",
    label: "Barney",
    mode: "overlay",
    overlayBaseCss: "contrast(1.2) brightness(0.8) saturate(1.1)",
    overlayColor: "#550066",
    overlayOpacity: 0.5,
    overlayBlend: "multiply",
  },

  // Row 13
  {
    value: "pixie",
    label: "Pixie",
    mode: "overlay",
    overlayBaseCss: "brightness(1.2) contrast(0.85) saturate(0.7)",
    overlayColor: "#c8e8f0",
    overlayOpacity: 0.35,
    overlayBlend: "soft-light",
  },
  {
    value: "marge",
    label: "Marge",
    mode: "overlay",
    overlayBaseCss: "contrast(1.3) brightness(0.85) saturate(1.1)",
    overlayColor: "#ddaa00",
    overlayOpacity: 0.55,
    overlayBlend: "multiply",
  },
  {
    value: "lucille",
    label: "Lucille",
    mode: "overlay",
    overlayBaseCss: "contrast(1.4) brightness(0.8) saturate(1.2)",
    overlayColor: "#cc1100",
    overlayOpacity: 0.55,
    overlayBlend: "multiply",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

/** Look up a filter definition by its value key. */
export function getFilterDef(value: string): ImageFilter | undefined {
  return IMAGE_FILTERS.find((f) => f.value === value);
}

/**
 * Returns the CSS `filter` string to apply on <img>.
 * For SVG filters this returns `url(#id)`.
 * Returns undefined for "none" or when no CSS filter is needed.
 */
export function buildCssFilter(def: ImageFilter | undefined): string | undefined {
  if (!def || def.value === "none") return undefined;
  if (def.mode === "css") return def.cssFilter;
  if (def.mode === "svg") return `url(#${def.svgId})`;
  if (def.mode === "overlay") return def.overlayBaseCss;
  return undefined;
}

/** Collect all SVG filter def markup strings (for injection into DOM). */
export function collectSvgFilterDefs(): string {
  return IMAGE_FILTERS.filter((f) => f.mode === "svg" && f.svgDef)
    .map((f) => f.svgDef!)
    .join("\n");
}

/**
 * Image frame definitions — framework-agnostic, zero dependencies.
 *
 * Provides preset data for the ImageFramePanel in builder-editor.
 * Consumed by both the editor (swatch rendering) and builder-components
 * (Image.tsx) for special-effect rendering (tape, polaroid, etc.).
 *
 * Four preset categories:
 *   - FRAME_PRESETS   → border presets (CSS border / borderRadius)
 *   - SHADOW_PRESETS  → box-shadow presets
 *   - SHAPE_PRESETS   → clip-path / borderRadius shapes
 *   - SPECIAL_PRESETS → decorative effects; some require extra DOM markup
 *
 * Special effects that require extra markup (requiresCustomMarkup: true)
 * are handled inside Image.tsx renderers — the SpecialFrameStyle value is
 * stored in node.props.frameStyle and read at render time.
 */

// ── Types ─────────────────────────────────────────────────────────────────

/** CSS properties used in frame presets — plain strings, no StyleConfig import */
export interface FramePresetStyle {
  border?: string;
  borderRadius?: string;
  outline?: string;
  outlineOffset?: string;
  padding?: string;
  background?: string;
}

export interface FramePreset {
  /** Stable key (stored for selection tracking in editor) */
  value: string;
  /** Human-readable label shown in the picker */
  label: string;
  /** CSS properties applied via UPDATE_STYLE */
  style: FramePresetStyle;
}

export interface ShadowPreset {
  value: string;
  label: string;
  /** CSS box-shadow value */
  boxShadow: string;
}

export interface ShapePreset {
  value: string;
  label: string;
  /** CSS clip-path value; undefined = shape uses borderRadius instead */
  clipPath?: string;
  /** CSS border-radius value; defined when shape is radius-based (not clip-path) */
  borderRadius?: string;
}

export type SpecialFrameStyle = "none" | "tape" | "polaroid" | "vintage";

export interface SpecialPreset {
  value: SpecialFrameStyle;
  label: string;
  /** Description shown in the picker card */
  description: string;
  /**
   * true = Image.tsx renderer adds extra DOM nodes (e.g. tape corner divs).
   * false = effect is pure CSS applied to container.
   */
  requiresCustomMarkup: boolean;
  /** Additional CSS applied to the container when requiresCustomMarkup=false */
  cssStyle?: Record<string, string>;
}

// ── Frame Presets ─────────────────────────────────────────────────────────

export const FRAME_PRESETS: FramePreset[] = [
  {
    value: "none",
    label: "No Frame",
    style: { border: "none", borderRadius: "0px" },
  },
  {
    value: "thin-black",
    label: "Thin Black",
    style: { border: "1px solid #000000", borderRadius: "0px" },
  },
  {
    value: "medium-black",
    label: "Medium Black",
    style: { border: "3px solid #000000", borderRadius: "0px" },
  },
  {
    value: "thick-black",
    label: "Thick Black",
    style: { border: "6px solid #000000", borderRadius: "0px" },
  },
  {
    value: "thin-white",
    label: "Thin White",
    style: { border: "2px solid #ffffff", borderRadius: "0px" },
  },
  {
    value: "thick-white",
    label: "Thick White",
    style: { border: "6px solid #ffffff", borderRadius: "0px" },
  },
  {
    value: "thin-gray",
    label: "Gray",
    style: { border: "2px solid #9ca3af", borderRadius: "0px" },
  },
  {
    value: "dashed-black",
    label: "Dashed",
    style: { border: "2px dashed #000000", borderRadius: "0px" },
  },
  {
    value: "dotted-black",
    label: "Dotted",
    style: { border: "3px dotted #000000", borderRadius: "0px" },
  },
  {
    value: "double-black",
    label: "Double",
    style: { border: "4px double #000000", borderRadius: "0px" },
  },
  {
    value: "rounded-thin",
    label: "Rounded",
    style: { border: "2px solid #000000", borderRadius: "12px" },
  },
  {
    value: "rounded-thick",
    label: "Rounded Thick",
    style: { border: "4px solid #000000", borderRadius: "12px" },
  },
];

// ── Shadow Presets ────────────────────────────────────────────────────────

export const SHADOW_PRESETS: ShadowPreset[] = [
  { value: "none",          label: "No Shadow",     boxShadow: "none" },
  { value: "soft",          label: "Soft",          boxShadow: "0 2px 8px rgba(0,0,0,0.12)" },
  { value: "medium",        label: "Medium",        boxShadow: "0 4px 16px rgba(0,0,0,0.20)" },
  { value: "hard",          label: "Hard",          boxShadow: "4px 4px 0px rgba(0,0,0,0.85)" },
  { value: "deep",          label: "Deep",          boxShadow: "0 8px 32px rgba(0,0,0,0.35)" },
  { value: "offset-bottom", label: "Offset",        boxShadow: "0 10px 0 rgba(0,0,0,0.25)" },
  { value: "spread",        label: "Spread",        boxShadow: "0 0 0 8px rgba(0,0,0,0.10)" },
  { value: "glow-white",    label: "Glow White",    boxShadow: "0 0 20px 4px rgba(255,255,255,0.60)" },
  { value: "glow-blue",     label: "Glow Blue",     boxShadow: "0 0 20px 6px rgba(59,130,246,0.55)" },
  { value: "glow-pink",     label: "Glow Pink",     boxShadow: "0 0 20px 6px rgba(236,72,153,0.50)" },
  { value: "retro-hard",    label: "Retro",         boxShadow: "5px 5px 0px #000000" },
  { value: "layered",       label: "Layered",       boxShadow: "0 2px 4px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.16)" },
];

// ── Shape Presets ─────────────────────────────────────────────────────────

export const SHAPE_PRESETS: ShapePreset[] = [
  { value: "none",        label: "None",       borderRadius: "0px" },
  { value: "rounded-sm",  label: "Slight",     borderRadius: "4px" },
  { value: "rounded-md",  label: "Rounded",    borderRadius: "12px" },
  { value: "rounded-lg",  label: "Large",      borderRadius: "24px" },
  { value: "squircle",    label: "Squircle",   borderRadius: "40%" },
  { value: "circle",      label: "Circle",     clipPath: "ellipse(50% 50% at 50% 50%)" },
  { value: "hexagon",     label: "Hexagon",    clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)" },
  { value: "diamond",     label: "Diamond",    clipPath: "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)" },
  { value: "arch-top",    label: "Arch",       clipPath: "ellipse(50% 60% at 50% 60%)" },
  { value: "triangle",    label: "Triangle",   clipPath: "polygon(50% 0%, 100% 100%, 0% 100%)" },
  { value: "star",        label: "Star",       clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" },
  { value: "parallelogram", label: "Slant",    clipPath: "polygon(15% 0%, 100% 0%, 85% 100%, 0% 100%)" },
];

// ── Special Presets ───────────────────────────────────────────────────────

export const SPECIAL_PRESETS: SpecialPreset[] = [
  {
    value: "none",
    label: "None",
    description: "No special effect",
    requiresCustomMarkup: false,
  },
  {
    value: "tape",
    label: "Tape",
    description: "Tape corners decoration",
    requiresCustomMarkup: true,
  },
  {
    value: "polaroid",
    label: "Polaroid",
    description: "White matting with rotation",
    requiresCustomMarkup: false,
    cssStyle: {
      background: "#ffffff",
      padding: "8px 8px 40px 8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
      transform: "rotate(-1.5deg)",
    },
  },
  {
    value: "vintage",
    label: "Vintage",
    description: "Aged border effect",
    requiresCustomMarkup: false,
    cssStyle: {
      border: "8px solid #d4b896",
      outline: "1px solid #a08060",
      outlineOffset: "-12px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.30)",
    },
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────

export function getSpecialPreset(value: string): SpecialPreset | undefined {
  return SPECIAL_PRESETS.find((p) => p.value === value);
}

export function getShapePreset(value: string): ShapePreset | undefined {
  return SHAPE_PRESETS.find((p) => p.value === value);
}

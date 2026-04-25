export interface ShadowParams {
  enabled: boolean;
  angle: number;    // 0–360 degrees
  distance: number; // px
  blur: number;     // px
  size: number;     // spread px
  opacity: number;  // 0–100
  color: string;    // hex (no alpha — opacity is separate)
}

export const DEFAULT_SHADOW_PARAMS: ShadowParams = {
  enabled: false,
  angle: 315,
  distance: 4,
  blur: 8,
  size: 0,
  opacity: 30,
  color: "#000000",
};

/** Convert angle (deg) + distance (px) → { x, y } offsets */
function angleDistanceToXY(angle: number, distance: number): { x: number; y: number } {
  const rad = ((angle - 90) * Math.PI) / 180;
  return {
    x: Math.round(Math.cos(rad) * distance),
    y: Math.round(Math.sin(rad) * distance),
  };
}

/** Convert { x, y } offsets → angle (deg, 0–360) */
function xyToAngle(x: number, y: number): number {
  const rad = Math.atan2(y, x);
  const deg = (rad * 180) / Math.PI + 90;
  return Math.round(((deg % 360) + 360) % 360);
}

/** Parse a hex color + opacity (0–100) to rgba() string */
function toRgba(hex: string, opacity: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${(opacity / 100).toFixed(2)})`;
}

/** Extract hex color from rgba/rgb string */
function extractHexFromColor(color: string): string {
  const rgbaMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbaMatch) {
    const r = parseInt(rgbaMatch[1] ?? "0").toString(16).padStart(2, "0");
    const g = parseInt(rgbaMatch[2] ?? "0").toString(16).padStart(2, "0");
    const b = parseInt(rgbaMatch[3] ?? "0").toString(16).padStart(2, "0");
    return `#${r}${g}${b}`;
  }
  if (color.startsWith("#")) return color.substring(0, 7);
  return "#000000";
}

/** Extract opacity (0–100) from rgba string */
function extractOpacity(color: string): number {
  const rgbaMatch = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
  if (rgbaMatch) return Math.round(parseFloat(rgbaMatch[1] ?? "1") * 100);
  return 100;
}

/**
 * Parse a CSS box-shadow string into structured ShadowParams.
 * Returns DEFAULT_SHADOW_PARAMS (disabled) for "none" or empty values.
 */
export function parseShadow(css: string | undefined): ShadowParams {
  if (!css || css === "none" || css.trim() === "") return { ...DEFAULT_SHADOW_PARAMS };

  // Match: [inset] <offsetX> <offsetY> <blur> <spread> <color>
  // Color can be rgba(...) or hex
  const parts = css.trim();

  // Extract color (rgba or hex)
  const rgbaColorMatch = parts.match(/rgba?\([^)]+\)/);
  const hexColorMatch = parts.match(/#[0-9a-fA-F]{6}/);
  const colorStr = rgbaColorMatch ? rgbaColorMatch[0] : hexColorMatch ? hexColorMatch[0] : "#000000";

  // Remove color from string to parse numbers
  const withoutColor = parts.replace(/rgba?\([^)]+\)/, "").replace(/#[0-9a-fA-F]{6}/, "").replace("inset", "").trim();
  const nums = withoutColor.split(/\s+/).map((s) => parseFloat(s)).filter((n) => !isNaN(n));

  const offsetX = nums[0] ?? 0;
  const offsetY = nums[1] ?? 0;
  const blur = nums[2] ?? 0;
  const size = nums[3] ?? 0;
  const distance = Math.round(Math.sqrt(offsetX * offsetX + offsetY * offsetY));
  const angle = distance === 0 ? DEFAULT_SHADOW_PARAMS.angle : xyToAngle(offsetX, offsetY);

  return {
    enabled: true,
    angle,
    distance,
    blur: Math.round(blur),
    size: Math.round(size),
    opacity: extractOpacity(colorStr),
    color: extractHexFromColor(colorStr),
  };
}

/**
 * Serialize ShadowParams → CSS box-shadow string.
 */
export function serializeShadow(params: ShadowParams): string {
  if (!params.enabled) return "none";
  const { x, y } = angleDistanceToXY(params.angle, params.distance);
  return `${x}px ${y}px ${params.blur}px ${params.size}px ${toRgba(params.color, params.opacity)}`;
}

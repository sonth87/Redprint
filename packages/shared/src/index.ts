/**
 * @ui-builder/shared — public API
 *
 * Shared primitive types and utility functions used across all packages.
 * Zero runtime dependencies on React, DOM, or builder-specific code.
 */

// ── Primitive geometry types ────────────────────────────────────────────────

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BoxValue {
  top?: string | number;
  right?: string | number;
  bottom?: string | number;
  left?: string | number;
}

export interface BorderValue {
  width?: string | number;
  style?: "none" | "solid" | "dashed" | "dotted" | "double";
  color?: string;
  radius?: string;
}

// ── Math/geometry utilities ────────────────────────────────────────────────

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

export function distance(a: Point, b: Point): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

export function rectContainsPoint(rect: Rect, point: Point): boolean {
  return (
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height
  );
}

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(
    a.x + a.width < b.x ||
    b.x + b.width < a.x ||
    a.y + a.height < b.y ||
    b.y + b.height < a.y
  );
}

// ── Deep merge ─────────────────────────────────────────────────────────────

/**
 * Shallow-merges two objects. For nested objects, the override overwrites
 * the base value entirely (no recursive deep merge).
 *
 * Used in resolveStyle to merge base styles with breakpoint overrides.
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  override: Partial<T>,
): T {
  return { ...base, ...override };
}

// ── Object utilities ───────────────────────────────────────────────────────

/**
 * Type-safe object entries.
 */
export function entries<K extends string, V>(obj: Record<K, V>): [K, V][] {
  return Object.entries(obj) as [K, V][];
}

/**
 * Pick specific keys from an object.
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    result[key] = obj[key];
  }
  return result;
}

/**
 * Omit specific keys from an object.
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key as string];
  }
  return result as Omit<T, K>;
}

// ── String utilities ───────────────────────────────────────────────────────

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function camelToKebab(s: string): string {
  return s.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

export function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// ── ID utilities ───────────────────────────────────────────────────────────

/**
 * Generate a short random ID. Not UUID-level unique but suitable for
 * non-critical ID generation (e.g., generated style class names).
 * For node IDs, builder-core uses uuid v4.
 */
export function shortId(prefix = ""): string {
  return `${prefix}${Math.random().toString(36).slice(2, 9)}`;
}

// ── CSS utilities ──────────────────────────────────────────────────────────

/**
 * Convert a StyleConfig value to a CSS pixel string.
 * Passes through strings that already include a unit.
 *
 * @example
 * toPx(16) → '16px'
 * toPx('16px') → '16px'
 * toPx('50%') → '50%'
 */
export function toPx(value: string | number): string {
  if (typeof value === "number") return `${value}px`;
  return value;
}

/**
 * Converts a BoxValue object to CSS margin/padding shorthand.
 *
 * @example
 * boxToCSS({ top: 8, right: 16, bottom: 8, left: 16 }) → '8px 16px 8px 16px'
 */
export function boxToCSS(box: BoxValue): string {
  const { top = 0, right = 0, bottom = 0, left = 0 } = box;
  return [top, right, bottom, left].map(toPx).join(" ");
}

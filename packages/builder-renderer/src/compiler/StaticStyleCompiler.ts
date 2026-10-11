import type { BuilderDocument, Breakpoint, StyleConfig, BuilderNode } from "@ui-builder/builder-core";
import { ANIMATION_KEYFRAMES_CSS } from "@ui-builder/shared";

/**
 * Converts a camelCase CSS property name to kebab-case.
 * e.g. "backgroundColor" -> "background-color"
 */
export function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Normalizes CSS values (e.g. numeric widths to px if necessary).
 */
export function formatCssValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const sVal = String(value).trim();
  return sVal;
}

/**
 * Converts a StyleConfig or generic style map to a CSS declaration block string.
 */
export function styleConfigToCssRules(style: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(style)) {
    if (value === undefined || value === null || value === "") continue;
    // Skip non-style properties or internal keys
    if (typeof value === "object" && !Array.isArray(value)) continue;

    const cssProp = camelToKebab(key);
    const cssVal = formatCssValue(key, value);
    if (cssVal) {
      lines.push(`  ${cssProp}: ${cssVal};`);
    }
  }
  return lines.join("\n");
}

/**
 * Compiles all node styles (base and responsive) from a document into an optimized CSS stylesheet.
 */
export function compileDocumentStyles(document: BuilderDocument): string {
  const baseRules: string[] = [];
  const tabletRules: string[] = [];
  const mobileRules: string[] = [];

  // Reset & base styles for standalone output
  const resetStyles = `
/* UI Builder Scoped Reset & Base */
.ui-builder-scope *,
.ui-builder-scope *::before,
.ui-builder-scope *::after {
  box-sizing: border-box;
}
.ui-builder-scope {
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  color: #111827;
  line-height: 1.5;
  width: 100%;
}
.ui-builder-scope img {
  max-width: 100%;
  height: auto;
  display: block;
}
.ui-builder-scope a {
  text-decoration: none;
  color: inherit;
}
.ui-builder-scope button {
  font: inherit;
}
`;

  for (const node of Object.values(document.nodes)) {
    if (!node || !node.id) continue;
    const selector = `.ub-node-${node.id}`;

    // Base (Desktop) styles
    if (node.style && Object.keys(node.style).length > 0) {
      const declarations = styleConfigToCssRules(node.style as Record<string, unknown>);
      if (declarations) {
        baseRules.push(`${selector} {\n${declarations}\n}`);
      }
    }

    // Responsive styles
    if (node.responsiveStyle) {
      const tablet = node.responsiveStyle.tablet;
      if (tablet && Object.keys(tablet).length > 0) {
        const declarations = styleConfigToCssRules(tablet as Record<string, unknown>);
        if (declarations) {
          tabletRules.push(`  ${selector} {\n${declarations.replace(/^/gm, "  ")}\n  }`);
        }
      }

      const mobile = node.responsiveStyle.mobile;
      if (mobile && Object.keys(mobile).length > 0) {
        const declarations = styleConfigToCssRules(mobile as Record<string, unknown>);
        if (declarations) {
          mobileRules.push(`  ${selector} {\n${declarations.replace(/^/gm, "  ")}\n  }`);
        }
      }
    }
  }

  const mediaBlocks: string[] = [];
  if (tabletRules.length > 0) {
    mediaBlocks.push(`@media (max-width: 1024px) {\n${tabletRules.join("\n")}\n}`);
  }
  if (mobileRules.length > 0) {
    mediaBlocks.push(`@media (max-width: 768px) {\n${mobileRules.join("\n")}\n}`);
  }

  return [
    ANIMATION_KEYFRAMES_CSS,
    resetStyles,
    baseRules.join("\n\n"),
    mediaBlocks.join("\n\n"),
  ].filter(Boolean).join("\n\n").trim();
}

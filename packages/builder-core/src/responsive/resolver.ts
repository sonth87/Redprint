import type { Breakpoint } from "./types";
import type { StyleConfig } from "../document/types";

/**
 * Resolves the effective style for a given breakpoint by merging
 * the base style with the breakpoint-specific override.
 *
 * @param baseStyle - The base StyleConfig applied at all breakpoints
 * @param responsiveStyle - Breakpoint-keyed style overrides
 * @param breakpoint - The active breakpoint to resolve for
 * @returns Merged StyleConfig for the given breakpoint
 *
 * @example
 * const resolved = resolveStyle(node.style, node.responsiveStyle, 'mobile');
 * // resolved = { ...baseStyle, ...node.responsiveStyle.mobile }
 */
export function resolveStyle(
  baseStyle: StyleConfig,
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>,
  breakpoint: Breakpoint,
): StyleConfig {
  const override = responsiveStyle[breakpoint];
  if (!override) return baseStyle;
  return { ...baseStyle, ...override } as StyleConfig;
}

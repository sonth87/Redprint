import type { Breakpoint } from "./types";
import type { StyleConfig, BuilderNode } from "../document/types";

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

/**
 * Resolves the effective props for a given breakpoint by merging
 * the base props with the breakpoint-specific override.
 *
 * Desktop edits go to base props. Mobile/tablet overrides go to responsiveProps.
 *
 * @example
 * const resolved = resolveProps(node.props, node.responsiveProps, 'mobile');
 */
export function resolveProps(
  baseProps: Record<string, unknown>,
  responsiveProps: Partial<Record<Breakpoint, Record<string, unknown>>> | undefined,
  breakpoint: Breakpoint,
): Record<string, unknown> {
  if (!responsiveProps) return baseProps;
  const override = responsiveProps[breakpoint];
  if (!override) return baseProps;
  return { ...baseProps, ...override };
}

/**
 * Returns true if the node should be visible at the given breakpoint.
 *
 * A node is hidden if:
 * - node.hidden is true (global editor toggle), OR
 * - node.responsiveHidden[breakpoint] is true
 *
 * @example
 * if (!resolveVisibility(node, 'mobile')) { // hide on mobile }
 */
export function resolveVisibility(
  node: Pick<BuilderNode, "hidden" | "responsiveHidden">,
  breakpoint: Breakpoint,
): boolean {
  if (node.hidden) return false;
  if (node.responsiveHidden?.[breakpoint]) return false;
  return true;
}

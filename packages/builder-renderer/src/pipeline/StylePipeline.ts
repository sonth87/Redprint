import type { BuilderNode, StyleConfig, Breakpoint } from "@ui-builder/builder-core";
import { resolveStyle } from "@ui-builder/builder-core";

/**
 * StylePipeline — computes the final CSS property map for a node
 * at a given breakpoint, with optional user variable overrides.
 *
 * Pipeline steps:
 * 1. Take node.style (base)
 * 2. Merge breakpoint override (node.responsiveStyle[breakpoint])
 * 3. Convert to CSS property map (camelCase → kebab-case not needed,
 *    as React accepts camelCase)
 *
 * @example
 * const css = StylePipeline.resolve(node, 'mobile');
 */
export class StylePipeline {
  /**
   * Resolve the final StyleConfig for a node at a given breakpoint.
   */
  static resolve(node: BuilderNode, breakpoint: Breakpoint): StyleConfig {
    return resolveStyle(node.style, node.responsiveStyle, breakpoint);
  }

  /**
   * Convert a StyleConfig to a React CSSProperties-compatible object.
   * Values are passed through as-is (React handles units).
   */
  static toCSSProperties(
    style: StyleConfig,
  ): React.CSSProperties {
    // StyleConfig keys ARE camelCase React CSS property names already
    return style as unknown as React.CSSProperties;
  }

  /**
   * Merge multiple StyleConfigs. Later values override earlier ones.
   */
  static merge(...styles: Partial<StyleConfig>[]): StyleConfig {
    return Object.assign({} as StyleConfig, ...styles);
  }
}

// React import for the CSSProperties type (type-only, no runtime cost)
import type React from "react";

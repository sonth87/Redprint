import React, { memo } from "react";
import type { BuilderNode, Breakpoint } from "@ui-builder/builder-core";
import { resolveStyle } from "@ui-builder/builder-core";
import type { Rect } from "@ui-builder/shared";

interface SpacingHighlightOverlayProps {
  /** Which spacing zone is currently hovered in the PropertyPanel */
  type: "padding" | "margin" | null;
  /** Selected node (to read its style values) */
  node: BuilderNode | null;
  /** Current breakpoint */
  breakpoint: Breakpoint;
  /** Canvas-space bounding rect of the selected element */
  selectionRect: Rect | null;
  /** Canvas zoom factor */
  zoom: number;
}

/** Parse a CSS length string to a pixel number */
function parseLen(val: unknown): number {
  if (!val || val === "auto") return 0;
  return Math.max(0, parseFloat(String(val)) || 0);
}

/**
 * SpacingHighlightOverlay renders colored areas on the canvas when the user
 * hovers padding or margin inputs in the PropertyPanel.
 *
 * - Padding hover → green tint inside the element's content area edges
 * - Margin hover  → orange tint outside the element's bounding box
 *
 * All coordinates are in canvas-space (pre-zoom). The overlay is positioned
 * via transform: scale(zoom) on the parent canvas area.
 */
export const SpacingHighlightOverlay = memo(function SpacingHighlightOverlay({
  type,
  node,
  breakpoint,
  selectionRect,
  zoom,
}: SpacingHighlightOverlayProps) {
  if (!type || !node || !selectionRect) return null;

  const style = resolveStyle(
    node.style,
    node.responsiveStyle ?? {},
    breakpoint,
  ) as Record<string, unknown>;

  const s = selectionRect;

  if (type === "padding") {
    const pt = parseLen(style.paddingTop ?? style.padding);
    const pr = parseLen(style.paddingRight ?? style.padding);
    const pb = parseLen(style.paddingBottom ?? style.padding);
    const pl = parseLen(style.paddingLeft ?? style.padding);

    const paddingColor = "hsla(142, 71%, 45%, 0.25)";
    const borderColor = "hsla(142, 71%, 40%, 0.5)";

    return (
      <>
        {/* Top padding */}
        {pt > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x,
              top:    s.y,
              width:  s.width,
              height: pt,
              backgroundColor: paddingColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Bottom padding */}
        {pb > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x,
              top:    s.y + s.height - pb,
              width:  s.width,
              height: pb,
              backgroundColor: paddingColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Left padding */}
        {pl > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x,
              top:    s.y + pt,
              width:  pl,
              height: s.height - pt - pb,
              backgroundColor: paddingColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Right padding */}
        {pr > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x + s.width - pr,
              top:    s.y + pt,
              width:  pr,
              height: s.height - pt - pb,
              backgroundColor: paddingColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
      </>
    );
  }

  if (type === "margin") {
    const mt = parseLen(style.marginTop ?? style.margin);
    const mr = parseLen(style.marginRight ?? style.margin);
    const mb = parseLen(style.marginBottom ?? style.margin);
    const ml = parseLen(style.marginLeft ?? style.margin);

    const marginColor = "hsla(27, 87%, 67%, 0.25)";
    const borderColor = "hsla(27, 87%, 55%, 0.5)";

    return (
      <>
        {/* Top margin */}
        {mt > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x - ml,
              top:    s.y - mt,
              width:  s.width + ml + mr,
              height: mt,
              backgroundColor: marginColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Bottom margin */}
        {mb > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x - ml,
              top:    s.y + s.height,
              width:  s.width + ml + mr,
              height: mb,
              backgroundColor: marginColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Left margin */}
        {ml > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x - ml,
              top:    s.y,
              width:  ml,
              height: s.height,
              backgroundColor: marginColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
        {/* Right margin */}
        {mr > 0 && (
          <div
            className="absolute pointer-events-none"
            style={{
              left:   s.x + s.width,
              top:    s.y,
              width:  mr,
              height: s.height,
              backgroundColor: marginColor,
              border: `1px solid ${borderColor}`,
              zIndex: 52,
            }}
          />
        )}
      </>
    );
  }

  return null;
});

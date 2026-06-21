import React, { memo } from "react";
import type { Rect } from "@ui-builder/shared";
import type { SpacingStrips } from "../hooks/useSpacingOverlay";
import { SPACING_MARGIN_COLOR, SPACING_PADDING_COLOR, SPACING_OVERLAY_OPACITY } from "../constants";

interface StripProps {
  rect: Rect;
  color: string;
  zIndex: number;
}

const Strip = memo(function Strip({ rect, color, zIndex }: StripProps) {
  if (rect.width <= 0 || rect.height <= 0) return null;
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.width,
        height: rect.height,
        backgroundColor: color,
        zIndex,
      }}
    />
  );
});

export interface SpacingOverlayProps {
  spacingRects: SpacingStrips;
  zIndexBase?: number;
}

export const SpacingOverlay = memo(function SpacingOverlay({ spacingRects, zIndexBase = 44 }: SpacingOverlayProps) {
  const { padding, margin } = spacingRects;

  return (
    <>
      {margin && (
        <>
          <Strip rect={margin.top}    color={`hsl(${SPACING_MARGIN_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase} />
          <Strip rect={margin.bottom} color={`hsl(${SPACING_MARGIN_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase} />
          <Strip rect={margin.left}   color={`hsl(${SPACING_MARGIN_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase} />
          <Strip rect={margin.right}  color={`hsl(${SPACING_MARGIN_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase} />
        </>
      )}
      {padding && (
        <>
          <Strip rect={padding.top}    color={`hsl(${SPACING_PADDING_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase + 1} />
          <Strip rect={padding.bottom} color={`hsl(${SPACING_PADDING_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase + 1} />
          <Strip rect={padding.left}   color={`hsl(${SPACING_PADDING_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase + 1} />
          <Strip rect={padding.right}  color={`hsl(${SPACING_PADDING_COLOR} / ${SPACING_OVERLAY_OPACITY})`} zIndex={zIndexBase + 1} />
        </>
      )}
    </>
  );
});

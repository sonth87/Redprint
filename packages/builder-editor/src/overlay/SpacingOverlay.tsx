import React, { memo } from "react";
import type { Rect } from "@ui-builder/shared";
import type { SpacingStrips } from "../hooks/useSpacingOverlay";

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
}

export const SpacingOverlay = memo(function SpacingOverlay({ spacingRects }: SpacingOverlayProps) {
  const { padding, margin } = spacingRects;

  return (
    <>
      {margin && (
        <>
          <Strip rect={margin.top}    color="rgba(255, 165, 0, 0.15)" zIndex={44} />
          <Strip rect={margin.bottom} color="rgba(255, 165, 0, 0.15)" zIndex={44} />
          <Strip rect={margin.left}   color="rgba(255, 165, 0, 0.15)" zIndex={44} />
          <Strip rect={margin.right}  color="rgba(255, 165, 0, 0.15)" zIndex={44} />
        </>
      )}
      {padding && (
        <>
          <Strip rect={padding.top}    color="rgba(0, 204, 136, 0.15)" zIndex={45} />
          <Strip rect={padding.bottom} color="rgba(0, 204, 136, 0.15)" zIndex={45} />
          <Strip rect={padding.left}   color="rgba(0, 204, 136, 0.15)" zIndex={45} />
          <Strip rect={padding.right}  color="rgba(0, 204, 136, 0.15)" zIndex={45} />
        </>
      )}
    </>
  );
});

import { useState, useLayoutEffect } from "react";
import type { Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface SpacingStrips {
  // All rects are in screen-space (pixels), relative to canvasContainerRef
  padding: { top: Rect; right: Rect; bottom: Rect; left: Rect } | null;
  margin: { top: Rect; right: Rect; bottom: Rect; left: Rect } | null;
  // Actual rendered size in CSS pixels (layout space, not screen-space)
  elementSize: { width: number; height: number };
}

interface UseSpacingOverlayOptions {
  selectedNodeIds: string[];
  zoom: number;
  panOffset: { x: number; y: number };
  nodes: Record<string, BuilderNode>;
  canvasContainerRef: React.RefObject<HTMLDivElement | null>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  nodeQueryRef?: React.RefObject<HTMLDivElement | null>;
}

export function useSpacingOverlay({
  selectedNodeIds,
  zoom,
  panOffset,
  nodes,
  canvasContainerRef,
  canvasFrameRef,
  nodeQueryRef,
}: UseSpacingOverlayOptions): { spacingRects: SpacingStrips | null } {
  const [spacingRects, setSpacingRects] = useState<SpacingStrips | null>(null);

  useLayoutEffect(() => {
    if (selectedNodeIds.length !== 1 || !canvasFrameRef.current || !canvasContainerRef.current) {
      setSpacingRects(null);
      return;
    }

    const selectedId = selectedNodeIds[0]!;
    const queryRoot = nodeQueryRef?.current ?? canvasFrameRef.current;
    const el = queryRoot.querySelector(`[data-node-id="${selectedId}"]`) as HTMLElement | null;

    if (!el) {
      setSpacingRects(null);
      return;
    }

    // Screen-space rect of the canvas container (our positioning origin)
    const containerRect = canvasContainerRef.current.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    // Element position relative to canvas container (screen-space, no zoom division)
    const ex = elRect.left - containerRect.left;
    const ey = elRect.top - containerRect.top;
    const ew = elRect.width;
    const eh = elRect.height;

    // getComputedStyle returns CSS layout pixels (NOT scaled by zoom).
    // Multiply by zoom to convert to screen pixels, matching elRect dimensions.
    const cs = window.getComputedStyle(el);
    const pt = parseFloat(cs.paddingTop)    * zoom;
    const pr = parseFloat(cs.paddingRight)  * zoom;
    const pb = parseFloat(cs.paddingBottom) * zoom;
    const pl = parseFloat(cs.paddingLeft)   * zoom;
    const mt = parseFloat(cs.marginTop)    * zoom;
    const mr = parseFloat(cs.marginRight)  * zoom;
    const mb = parseFloat(cs.marginBottom) * zoom;
    const ml = parseFloat(cs.marginLeft)   * zoom;

    const hasPadding = pt > 0 || pr > 0 || pb > 0 || pl > 0;
    const hasMargin = mt > 0 || mr > 0 || mb > 0 || ml > 0;

    setSpacingRects({
      // offsetWidth/offsetHeight = CSS layout size in px (excludes margin, includes padding+border)
      elementSize: { width: el.offsetWidth, height: el.offsetHeight },
      padding: hasPadding
        ? {
            top:    { x: ex,           y: ey,           width: ew,       height: pt },
            bottom: { x: ex,           y: ey + eh - pb, width: ew,       height: pb },
            left:   { x: ex,           y: ey + pt,      width: pl,       height: eh - pt - pb },
            right:  { x: ex + ew - pr, y: ey + pt,      width: pr,       height: eh - pt - pb },
          }
        : null,
      // getBoundingClientRect excludes margin, so margin boxes extend outside elRect
      margin: hasMargin
        ? {
            top:    { x: ex - ml,  y: ey - mt,  width: ew + ml + mr, height: mt },
            bottom: { x: ex - ml,  y: ey + eh,  width: ew + ml + mr, height: mb },
            left:   { x: ex - ml,  y: ey,       width: ml,            height: eh },
            right:  { x: ex + ew,  y: ey,       width: mr,            height: eh },
          }
        : null,
    });
  }, [selectedNodeIds, zoom, panOffset, nodes, canvasContainerRef, canvasFrameRef, nodeQueryRef]);

  return { spacingRects };
}

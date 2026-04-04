import type { Point, Rect } from "@ui-builder/shared";
import { snapToGrid, clamp } from "@ui-builder/shared";
import type { SnapGuide, DistanceGuide } from "../types";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface SnapEngineConfig {
  gridSize: number;
  snapEnabled: boolean;
  snapToGrid: boolean;
  snapToComponents: boolean;
  /** Snap threshold in pixels */
  threshold: number;
  /** Canvas frame width in px — enables canvas-center and canvas-edge snapping */
  canvasWidth?: number;
  /** Canvas frame height in px — enables canvas horizontal-center snapping */
  canvasHeight?: number;
}

export interface SnapResult {
  snappedPoint: Point;
  guides: SnapGuide[];
}

/**
 * SnapEngine — computes snap positions and guide lines.
 *
 * Snap types (per spec, Section 6.4):
 * 1. Grid snap — align to grid origin + gridSize
 * 2. Component edge snap — align to other node edges
 * 3. Component center snap — align to other node centers
 * 4. Spacing snap — equal spacing between nodes
 *
 * Performance target: < 8ms per snap computation (per spec, Section 7.3).
 */
export class SnapEngine {
  private readonly config: SnapEngineConfig;

  constructor(config: SnapEngineConfig) {
    this.config = config;
  }

  /**
   * Compute the snapped position for a dragged element.
   *
   * @param draggingRect - The current (unsnapped) bounding rect of the dragging node
   * @param otherRects - Bounding rects of other nodes to snap against
   * @returns Snapped point and active snap guides
   */
  snap(draggingRect: Rect, otherRects: Rect[]): SnapResult {
    if (!this.config.snapEnabled) {
      return {
        snappedPoint: { x: draggingRect.x, y: draggingRect.y },
        guides: [],
      };
    }

    let { x, y } = draggingRect;
    const guides: SnapGuide[] = [];

    // 1. Grid snap
    if (this.config.snapToGrid) {
      const snappedX = snapToGrid(x, this.config.gridSize);
      const snappedY = snapToGrid(y, this.config.gridSize);
      if (Math.abs(snappedX - x) <= this.config.threshold) x = snappedX;
      if (Math.abs(snappedY - y) <= this.config.threshold) y = snappedY;
    }

    // 2. Component snap
    if (this.config.snapToComponents && otherRects.length > 0) {
      const dragCX = x + draggingRect.width / 2;
      const dragCY = y + draggingRect.height / 2;
      const dragRight = x + draggingRect.width;
      const dragBottom = y + draggingRect.height;

      for (const other of otherRects) {
        const oCX = other.x + other.width / 2;
        const oCY = other.y + other.height / 2;
        const oRight = other.x + other.width;
        const oBottom = other.y + other.height;

        // Left edge snap
        if (Math.abs(x - other.x) < this.config.threshold) {
          x = other.x;
          guides.push({ type: "vertical", position: other.x, source: "component-edge" });
        }
        // Right edge snap
        if (Math.abs(dragRight - oRight) < this.config.threshold) {
          x = oRight - draggingRect.width;
          guides.push({ type: "vertical", position: oRight, source: "component-edge" });
        }
        // Center-X snap
        if (Math.abs(dragCX - oCX) < this.config.threshold) {
          x = oCX - draggingRect.width / 2;
          guides.push({ type: "vertical", position: oCX, source: "component-center" });
        }
        // Top edge snap
        if (Math.abs(y - other.y) < this.config.threshold) {
          y = other.y;
          guides.push({ type: "horizontal", position: other.y, source: "component-edge" });
        }
        // Bottom edge snap
        if (Math.abs(dragBottom - oBottom) < this.config.threshold) {
          y = oBottom - draggingRect.height;
          guides.push({ type: "horizontal", position: oBottom, source: "component-edge" });
        }
        // Center-Y snap
        if (Math.abs(dragCY - oCY) < this.config.threshold) {
          y = oCY - draggingRect.height / 2;
          guides.push({ type: "horizontal", position: oCY, source: "component-center" });
        }
      }
    }

    // 3. Canvas axis snap — snap to canvas center line and canvas edges.
    //    These provide the most important alignment guides in a page editor
    //    (equivalent to Figma's "snap to canvas" feature).
    if (this.config.snapToComponents && this.config.canvasWidth != null) {
      const cw = this.config.canvasWidth;
      const canvasCX = cw / 2;
      const dragCX = x + draggingRect.width / 2;
      const dragRight = x + draggingRect.width;
      let addedCanvasCenterX = false;

      const pushCenterX = (snappedX: number) => {
        x = snappedX;
        if (!addedCanvasCenterX) {
          guides.push({ type: "vertical", position: canvasCX, source: "canvas-center" });
          addedCanvasCenterX = true;
        }
      };

      // Left edge → canvas left border (x = 0)
      if (Math.abs(x) <= this.config.threshold) {
        x = 0;
        guides.push({ type: "vertical", position: 0, source: "canvas-edge" });
      }
      // Left edge → canvas center
      if (Math.abs(x - canvasCX) <= this.config.threshold) pushCenterX(canvasCX);
      // Element center → canvas center
      if (Math.abs(dragCX - canvasCX) <= this.config.threshold) pushCenterX(canvasCX - draggingRect.width / 2);
      // Right edge → canvas center
      if (Math.abs(dragRight - canvasCX) <= this.config.threshold) pushCenterX(canvasCX - draggingRect.width);
      // Right edge → canvas right border
      if (Math.abs(dragRight - cw) <= this.config.threshold) {
        x = cw - draggingRect.width;
        guides.push({ type: "vertical", position: cw, source: "canvas-edge" });
      }
    }

    return { snappedPoint: { x, y }, guides };
  }

  /**
   * Find the nearest sibling rect on each edge (left, right, top, bottom) and
   * compute distance guides for visual feedback during drag/resize.
   *
   * Only siblings within `threshold` px are considered.
   *
   * @param draggingRect  The current bounding rect of the element being moved/resized
   * @param otherRects    Sibling bounding rects to measure against
   * @param threshold     Max distance (canvas px) to look for neighbors
   */
  distanceGuides(
    draggingRect: Rect,
    otherRects: Rect[],
    threshold = 150,
  ): DistanceGuide[] {
    const guides: DistanceGuide[] = [];

    const dLeft = draggingRect.x;
    const dRight = draggingRect.x + draggingRect.width;
    const dTop = draggingRect.y;
    const dBottom = draggingRect.y + draggingRect.height;
    const dCX = draggingRect.x + draggingRect.width / 2;
    const dCY = draggingRect.y + draggingRect.height / 2;

    // Nearest sibling per edge — track best candidate {distance, lineStart, lineEnd, linePosition}
    type Candidate = { distance: number; lineStart: number; lineEnd: number; linePosition: number };
    let bestLeft: Candidate | null = null;
    let bestRight: Candidate | null = null;
    let bestTop: Candidate | null = null;
    let bestBottom: Candidate | null = null;

    for (const other of otherRects) {
      const oLeft = other.x;
      const oRight = other.x + other.width;
      const oTop = other.y;
      const oBottom = other.y + other.height;
      const oCY = other.y + other.height / 2;
      const oCX = other.x + other.width / 2;

      // --- Left gap: sibling is to the LEFT of dragging element ---
      // The gap is between oRight and dLeft
      if (oRight <= dLeft) {
        const gap = dLeft - oRight;
        const overlapsVertically = oBottom >= dTop && oTop <= dBottom;
        if (gap <= threshold && overlapsVertically) {
          // The guide line runs horizontally at the dragging element's vertical center
          const lineY = clamp(dCY, Math.max(dTop, oTop), Math.min(dBottom, oBottom));
          if (!bestLeft || gap < bestLeft.distance) {
            bestLeft = { distance: gap, lineStart: oRight, lineEnd: dLeft, linePosition: lineY };
          }
        }
      }

      // --- Right gap: sibling is to the RIGHT ---
      if (oLeft >= dRight) {
        const gap = oLeft - dRight;
        const overlapsVertically = oBottom >= dTop && oTop <= dBottom;
        if (gap <= threshold && overlapsVertically) {
          const lineY = clamp(dCY, Math.max(dTop, oTop), Math.min(dBottom, oBottom));
          if (!bestRight || gap < bestRight.distance) {
            bestRight = { distance: gap, lineStart: dRight, lineEnd: oLeft, linePosition: lineY };
          }
        }
      }

      // --- Top gap: sibling is ABOVE ---
      if (oBottom <= dTop) {
        const gap = dTop - oBottom;
        const overlapsHorizontally = oRight >= dLeft && oLeft <= dRight;
        if (gap <= threshold && overlapsHorizontally) {
          const lineX = clamp(dCX, Math.max(dLeft, oLeft), Math.min(dRight, oRight));
          if (!bestTop || gap < bestTop.distance) {
            bestTop = { distance: gap, lineStart: oBottom, lineEnd: dTop, linePosition: lineX };
          }
        }
      }

      // --- Bottom gap: sibling is BELOW ---
      if (oTop >= dBottom) {
        const gap = oTop - dBottom;
        const overlapsHorizontally = oRight >= dLeft && oLeft <= dRight;
        if (gap <= threshold && overlapsHorizontally) {
          const lineX = clamp(dCX, Math.max(dLeft, oLeft), Math.min(dRight, oRight));
          if (!bestBottom || gap < bestBottom.distance) {
            bestBottom = { distance: gap, lineStart: dBottom, lineEnd: oTop, linePosition: lineX };
          }
        }
      }
    }

    if (bestLeft)   guides.push({ edge: "left",   ...bestLeft });
    if (bestRight)  guides.push({ edge: "right",  ...bestRight });
    if (bestTop)    guides.push({ edge: "top",    ...bestTop });
    if (bestBottom) guides.push({ edge: "bottom", ...bestBottom });

    return guides;
  }

  /**
   * Compute visual alignment guide lines against ALL nodes on canvas (cross-container).
   *
   * Unlike `snap()`, this does NOT adjust the dragging position. It only returns
   * guide lines to show horizontal/vertical alignment with any other element,
   * regardless of parent hierarchy.
   *
   * Both `draggingRect` and `otherRects` must be in the same canvas-frame
   * coordinate space (pixels from top-left of canvas frame, pre-zoom).
   *
   * @param draggingRect  Bounding rect of the element being moved/resized (canvas coords)
   * @param otherRects    All other visible node rects in canvas coords
   */
  alignmentGuides(draggingRect: Rect, otherRects: Rect[]): SnapGuide[] {
    if (!this.config.snapToComponents || otherRects.length === 0) return [];

    const guides: SnapGuide[] = [];
    const seen = new Set<string>();
    const add = (guide: SnapGuide) => {
      const key = `${guide.type}:${guide.position}`;
      if (!seen.has(key)) {
        seen.add(key);
        guides.push(guide);
      }
    };

    const { x, y, width, height } = draggingRect;
    const dragCX = x + width / 2;
    const dragCY = y + height / 2;
    const dragRight = x + width;
    const dragBottom = y + height;

    for (const other of otherRects) {
      const oCX = other.x + other.width / 2;
      const oCY = other.y + other.height / 2;
      const oRight = other.x + other.width;
      const oBottom = other.y + other.height;

      // ── Horizontal alignment guides (shared Y positions) ──────────────
      if (Math.abs(y - other.y)        < this.config.threshold) add({ type: "horizontal", position: other.y,   source: "component-edge" });
      if (Math.abs(y - oBottom)        < this.config.threshold) add({ type: "horizontal", position: oBottom,   source: "component-edge" });
      if (Math.abs(dragBottom - other.y)  < this.config.threshold) add({ type: "horizontal", position: other.y,   source: "component-edge" });
      if (Math.abs(dragBottom - oBottom)  < this.config.threshold) add({ type: "horizontal", position: oBottom,   source: "component-edge" });
      if (Math.abs(dragCY - oCY)       < this.config.threshold) add({ type: "horizontal", position: oCY,      source: "component-center" });

      // ── Vertical alignment guides (shared X positions) ────────────────
      if (Math.abs(x - other.x)        < this.config.threshold) add({ type: "vertical",   position: other.x,   source: "component-edge" });
      if (Math.abs(x - oRight)         < this.config.threshold) add({ type: "vertical",   position: oRight,    source: "component-edge" });
      if (Math.abs(dragRight - other.x)   < this.config.threshold) add({ type: "vertical",   position: other.x,   source: "component-edge" });
      if (Math.abs(dragRight - oRight)    < this.config.threshold) add({ type: "vertical",   position: oRight,    source: "component-edge" });
      if (Math.abs(dragCX - oCX)       < this.config.threshold) add({ type: "vertical",   position: oCX,       source: "component-center" });
    }

    // ── Canvas axis alignment guides ───────────────────────────────────
    if (this.config.canvasWidth != null) {
      const cw = this.config.canvasWidth;
      const canvasCX = cw / 2;

      // Vertical center of canvas
      if (Math.abs(x - canvasCX)              < this.config.threshold) add({ type: "vertical", position: canvasCX, source: "canvas-center" });
      if (Math.abs(dragCX - canvasCX)         < this.config.threshold) add({ type: "vertical", position: canvasCX, source: "canvas-center" });
      if (Math.abs(dragRight - canvasCX)      < this.config.threshold) add({ type: "vertical", position: canvasCX, source: "canvas-center" });
      // Canvas edges
      if (Math.abs(x)                         < this.config.threshold) add({ type: "vertical", position: 0,  source: "canvas-edge" });
      if (Math.abs(dragRight - cw)            < this.config.threshold) add({ type: "vertical", position: cw, source: "canvas-edge" });
    }

    return guides;
  }
}

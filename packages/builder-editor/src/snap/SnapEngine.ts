import type { Point, Rect } from "@ui-builder/shared";
import { snapToGrid, clamp } from "@ui-builder/shared";
import type { SnapGuide } from "../types";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface SnapEngineConfig {
  gridSize: number;
  snapEnabled: boolean;
  snapToGrid: boolean;
  snapToComponents: boolean;
  /** Snap threshold in pixels */
  threshold: number;
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

    return { snappedPoint: { x, y }, guides };
  }
}

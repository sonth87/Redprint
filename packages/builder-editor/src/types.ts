/**
 * builder-editor — type contracts for the visual editor.
 */

import type { Point, Rect } from "@ui-builder/shared";
import type { BuilderNode, CanvasConfig, EditorTool } from "@ui-builder/builder-core";

// Re-export so editor consumers can use it
export type { EditorTool };

// ── Canvas ────────────────────────────────────────────────────────────────

export interface ViewportState {
  zoom: number;
  panOffset: Point;
  /** Pixel dimensions of the canvas container element */
  containerSize: { width: number; height: number };
}

// ── Overlay ───────────────────────────────────────────────────────────────

export interface NodeRect {
  nodeId: string;
  rect: Rect;
  /** True if computed from DOM */
  fromDOM: boolean;
}

export interface SnapGuide {
  type: "horizontal" | "vertical";
  /** Position in canvas coordinates */
  position: number;
  /** Source: "grid" | "component-edge" | "component-center" | "spacing" */
  source: string;
  /** Relevant node IDs */
  nodeIds?: string[];
}

/**
 * A distance guide shows the gap between the dragging/resizing element
 * and its nearest sibling on one edge. Rendered as a bracketed line with a label.
 */
export interface DistanceGuide {
  /** Which edge of the dragging element this distance is measured from */
  edge: "left" | "right" | "top" | "bottom";
  /** Pixel distance between the dragging element edge and the sibling edge */
  distance: number;
  /** Canvas-coordinate start of the gap line (x for horizontal, y for vertical) */
  lineStart: number;
  /** Canvas-coordinate end of the gap line */
  lineEnd: number;
  /**
   * For a horizontal gap (left/right edges): the Y axis position of the line.
   * For a vertical gap (top/bottom edges): the X axis position of the line.
   */
  linePosition: number;
}

/** Live dimensions (width/height) of an element during drag or resize */
export interface LiveDimensions {
  width: number;
  height: number;
}

export interface SelectionState {
  selectedIds: string[];
  /** The bounding box covering all selected nodes */
  boundingBox: Rect | null;
  /** Whether we're doing rubber-band selection */
  isRubberBanding: boolean;
  rubberBandRect: Rect | null;
}

// ── Drag & Drop ───────────────────────────────────────────────────────────

export type DropIndicatorType = "before" | "after" | "inside" | "slot";

export interface DropIndicatorState {
  visible: boolean;
  rect: Rect;
  type: DropIndicatorType;
  targetNodeId: string | null;
  slotName?: string;
}

// ── Resize ────────────────────────────────────────────────────────────────

export type ResizeHandleType = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeState {
  isResizing: boolean;
  nodeId: string | null;
  handle: ResizeHandleType | null;
  startBounds: Rect | null;
  startPointer: Point | null;
  maintainAspectRatio: boolean;
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────

export interface ShortcutDefinition {
  id: string;
  label: string;
  key: string;
  /** Modifier keys required. Default: [] */
  modifiers?: ("meta" | "ctrl" | "alt" | "shift")[];
  category?: string;
  handler: () => void;
}

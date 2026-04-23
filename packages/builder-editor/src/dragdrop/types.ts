/**
 * dragdrop/types.ts — Core type contracts for the Strategy-based drag-drop system.
 *
 * Design goals:
 * - DragContext: immutable snapshot passed to every strategy method
 * - DragVisualState: pure description of overlay state (no refs, no DOM)
 * - DragStrategy: interface strategies implement — canHandle → onMove → onDrop → onCancel
 * - DropResolution: canonical output of DropTargetResolver
 */

import type React from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import type { SnapEngine } from "../snap/SnapEngine";
import type { ContainerConfigResolver } from "../hooks/dragUtils";
import type { NodeMovingSnapshot } from "../hooks/dragUtils";

export type { ContainerConfigResolver, NodeMovingSnapshot };

// ── DragContext ────────────────────────────────────────────────────────────────
// The immutable snapshot passed to every strategy method. Created once when the
// drag threshold is first crossed and reused for the entire gesture lifetime.
// Strategies are pure functions over this context — they never mutate it.

export interface DragContext {
  /** Primary dragged node id */
  nodeId: string;
  /** Component type string of the primary dragged node */
  nodeType: string;
  /** Client-space point where the pointer first crossed the DRAG_THRESHOLD */
  startPoint: { x: number; y: number };
  /** UUID grouping all dispatches from this gesture for undo batching */
  gestureGroupId: string;
  /**
   * The frame element to use for DOM queries and bounding-rect math.
   * Resolved once at gesture start: activeFrameRef.current ?? canvasFrameRef.current
   */
  frameEl: HTMLElement;
  zoom: number;
  nodes: Record<string, BuilderNode>;
  getContainerConfig: ContainerConfigResolver;
  dispatch: (action: {
    type: string;
    payload: unknown;
    groupId?: string;
    description?: string;
  }) => void;
  breakpoint: string;
  snapEngine: SnapEngine;
  rootNodeId: string;
  /**
   * The desktop-frame ref — used as canvas-space origin for snap guide positions.
   * In dual-mode (desktop + mobile side-by-side), this is always the desktop frame,
   * ensuring all guide coordinates are expressed in a consistent space.
   */
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /**
   * All moving node ids. Single-select: length 1. Multi-select: length > 1.
   * FlowDragStrategy rejects multi-select (constraint: only single-node flow drag).
   */
  movingNodeIds: string[];
  /** Per-node drag start snapshots (position, dimensions, wasAbsolute flag) */
  movingSnapshots: NodeMovingSnapshot[];
  snapEnabled: boolean;
}

// ── DragVisualState ────────────────────────────────────────────────────────────
// Pure description of what the overlay layer should render.
// No refs, no DOM — only serializable data.

export interface DragVisualState {
  snapGuides: SnapGuide[];
  distanceGuides: DistanceGuide[];
  /**
   * Non-null while the pointer is over (or inside) a valid flow/grid container.
   * Consumed by FlowDropPlaceholderLayer to render the insert indicator.
   */
  flowDropTarget: {
    containerId: string;
    insertIndex: number;
    gridCell?: { col: number; row: number };
  } | null;
  /**
   * Canvas-space (tx, ty) offset to shift SelectionOverlay during a flow drag.
   * Null when not in flow mode.
   */
  flowDragOffset: { x: number; y: number } | null;
  /**
   * Node IDs whose edges are currently aligned with an active snap guide line.
   */
  highlightedNodeIds: string[];
  liveDimensions: LiveDimensions | null;
}

export const EMPTY_VISUAL_STATE: DragVisualState = {
  snapGuides: [],
  distanceGuides: [],
  flowDropTarget: null,
  flowDragOffset: null,
  highlightedNodeIds: [],
  liveDimensions: null,
};

// ── DropResolution ─────────────────────────────────────────────────────────────
// Canonical output of DropTargetResolver.resolveDropTarget()

export interface DropResolution {
  /** The container node id that should receive the dropped item */
  parentId: string;
  /** Logical insert index among siblings */
  insertIndex: number;
  /** For grid containers: the (col, row) of the targeted cell */
  gridCell?: { col: number; row: number };
  /** What kind of visual indicator the overlay should render */
  indicator: "line" | "cell-highlight" | "none";
}

// ── DragStrategy ───────────────────────────────────────────────────────────────
// The core interface all strategies implement.

export interface DragStrategy {
  readonly name: string;

  /**
   * Called once at gesture start (after DRAG_THRESHOLD crossed).
   * Returns true if this strategy claims the gesture.
   * The DragCoordinator tries strategies in registration order — first win takes it.
   */
  canHandle(ctx: DragContext): boolean;

  /**
   * Called on every mousemove while the gesture is active.
   * Should be as side-effect-free as possible — return visual state, avoid dispatch.
   *
   * Known exception: AbsoluteDragStrategy calls ctx.dispatch(UPDATE_STYLE) on every
   * frame for live position updates. This is intentional — the alternative (batching
   * in useMoveGesture) would require useMoveGesture to understand strategy internals.
   */
  onMove(ctx: DragContext, e: MouseEvent): DragVisualState;

  /**
   * Called on mouseup. This is the only place strategies are permitted to call
   * ctx.dispatch for state-committing operations (MOVE_NODE, REORDER_NODE, etc.).
   * Receives lastVisualState so strategies can read resolved flowDropTarget without
   * re-computing.
   */
  onDrop(
    ctx: DragContext,
    e: MouseEvent,
    lastVisualState: DragVisualState,
  ): void;

  /**
   * Called when a gesture is cancelled (Escape key, pointer capture lost, etc.).
   * Should undo any in-flight style changes and clean up DOM artifacts.
   */
  onCancel(ctx: DragContext): void;

  /**
   * Optional: called on the first-move frame to attach a DOM preview clone.
   * Only FlowDragStrategy implements this — it creates a floating clone element
   * so the original node can be hidden while showing a dragging ghost.
   */
  attachPreview?(ctx: DragContext, e: MouseEvent): void;

  /**
   * Optional: called on drop or cancel to remove the preview clone and restore
   * the original node's visibility/pointer-events.
   */
  detachPreview?(): void;
}

import { useState, useEffect, useRef } from "react";
import type { SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapEngine } from "../snap/SnapEngine";
import { type NodeMovingSnapshot } from "./dragUtils";
import { DragCoordinator } from "../dragdrop/DragCoordinator";
import { FlowDragStrategy } from "../dragdrop/strategies/FlowDragStrategy";
import { AbsoluteDragStrategy } from "../dragdrop/strategies/AbsoluteDragStrategy";
import { EMPTY_VISUAL_STATE, type DragContext, type DragVisualState } from "../dragdrop/types";

interface MovingState {
  nodeId: string; // Primary anchor node
  nodes: NodeMovingSnapshot[];
  startPoint: { x: number; y: number };
  gestureGroupId: string;
  fromToolbar?: boolean;
}

interface UseMoveGestureOptions {
  zoom: number;
  breakpoint: string;
  snapEnabled: boolean;
  snapEngine: SnapEngine;
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** In dual mode: the currently-active artboard ref for snap coordinate computations */
  activeFrameRef?: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; groupId?: string; description?: string }) => void;
  /** Root canvas node id — used as fallback parent when detaching from flow */
  rootNodeId?: string;
  /**
   * Returns { layoutType, disallowedChildTypes } for a given component type.
   * Drives the flow-mode vs absolute-mode branching during drag.
   */
  getContainerConfig?: (
    nodeOrType: BuilderNode | string,
  ) => { layoutType?: string; disallowedChildTypes?: string[] } | undefined;
}

export interface UseMoveGestureReturn {
  moving: MovingState | null;
  setMoving: (state: MovingState | null) => void;
  dragStartedRef: React.MutableRefObject<boolean>;
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
  distanceGuides: DistanceGuide[];
  liveDimensions: LiveDimensions | null;
  /** Node IDs whose edges/centers are currently aligned with an active guide line */
  highlightedNodeIds: string[];
  /**
   * During a flow/grid-mode drag, the canvas-space (tx, ty) offset applied to
   * the dragged element via imperative CSS transform. Used by BuilderEditor to
   * shift the SelectionOverlay and ContextualToolbar so they track the visual
   * position of the element while the node state has not yet been updated.
   * Null when no flow-mode drag is in progress.
   */
  flowDragOffset: { x: number; y: number } | null;
  /**
   * While dragging an absolute node over a flow/grid container: tracks where
   * it would be dropped. BuilderEditor uses this to render a placeholder line.
   * Null when not hovering a valid flow container.
   */
  flowDropTarget: {
    containerId: string;
    insertIndex: number;
    /** For grid containers: (col, row) of the targeted cell */
    gridCell?: { col: number; row: number };
  } | null;
}

const DRAG_THRESHOLD = 5;

// ── Build coordinator ─────────────────────────────────────────────────────

function buildCoordinator(): DragCoordinator {
  const c = new DragCoordinator();
  c.register(new FlowDragStrategy());     // checked first
  c.register(new AbsoluteDragStrategy()); // catch-all
  return c;
}

// ── Build context ─────────────────────────────────────────────────────────

function buildContext(
  moving: MovingState,
  frameEl: HTMLElement,
  options: UseMoveGestureOptions,
): DragContext {
  const node = options.nodes[moving.nodeId];
  return {
    nodeId: moving.nodeId,
    nodeType: node?.type ?? "",
    startPoint: moving.startPoint,
    gestureGroupId: moving.gestureGroupId,
    frameEl,
    zoom: options.zoom,
    nodes: options.nodes,
    getContainerConfig: options.getContainerConfig ?? (() => undefined),
    dispatch: options.dispatch,
    breakpoint: options.breakpoint,
    snapEngine: options.snapEngine,
    rootNodeId: options.rootNodeId ?? "",
    canvasFrameRef: options.canvasFrameRef,
    movingNodeIds: moving.nodes.map((n) => n.nodeId),
    movingSnapshots: moving.nodes,
    snapEnabled: options.snapEnabled,
  };
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useMoveGesture({
  zoom,
  breakpoint,
  snapEnabled,
  snapEngine,
  nodes,
  canvasFrameRef,
  activeFrameRef,
  dispatch,
  rootNodeId,
  getContainerConfig,
}: UseMoveGestureOptions): UseMoveGestureReturn {
  const [moving, setMoving] = useState<MovingState | null>(null);
  const [visualState, setVisualState] = useState<DragVisualState>(EMPTY_VISUAL_STATE);
  const dragStartedRef = useRef(false);
  const coordinatorRef = useRef<DragCoordinator>(buildCoordinator());

  const options: UseMoveGestureOptions = {
    zoom, breakpoint, snapEnabled, snapEngine, nodes,
    canvasFrameRef, activeFrameRef, dispatch, rootNodeId, getContainerConfig,
  };
  // Keep a stable ref to options so the effect closure always sees current values
  const optionsRef = useRef(options);
  optionsRef.current = options;

  useEffect(() => {
    if (!moving) {
      dragStartedRef.current = false;
      return;
    }

    const handleMove = (e: MouseEvent) => {
      const dx = e.clientX - moving.startPoint.x;
      const dy = e.clientY - moving.startPoint.y;

      if (
        !dragStartedRef.current &&
        Math.abs(dx) < DRAG_THRESHOLD &&
        Math.abs(dy) < DRAG_THRESHOLD
      )
        return;

      const isFirstMove = !dragStartedRef.current;
      dragStartedRef.current = true;

      const opts = optionsRef.current;
      const frameEl = opts.activeFrameRef?.current ?? opts.canvasFrameRef.current;
      if (!frameEl) return;

      const ctx = buildContext(moving, frameEl, opts);

      if (isFirstMove) {
        coordinatorRef.current.startGesture(ctx);
        coordinatorRef.current.activeStrategy?.attachPreview?.(ctx, e);
      }

      setVisualState(coordinatorRef.current.onMove(e));
    };

    const handleUp = (e: MouseEvent) => {
      const opts = optionsRef.current;
      const frameEl = opts.activeFrameRef?.current ?? opts.canvasFrameRef.current;
      if (frameEl) {
        coordinatorRef.current.onDrop(e);
        // Restore DOM state on all moving nodes (cancel any leftover transforms)
        for (const mNode of moving.nodes) {
          const nodeEl = frameEl.querySelector(
            `[data-node-id="${mNode.nodeId}"]`,
          ) as HTMLElement | null;
          if (nodeEl) {
            if (nodeEl.dataset.dragOriginalTransform !== undefined) {
              nodeEl.style.transform = nodeEl.dataset.dragOriginalTransform;
              nodeEl.style.removeProperty("opacity");
              nodeEl.style.removeProperty("z-index");
              nodeEl.style.removeProperty("pointer-events");
              nodeEl.style.removeProperty("visibility");
              delete nodeEl.dataset.dragOriginalTransform;
            }
          }
        }
      } else {
        coordinatorRef.current.onDrop(e);
      }

      coordinatorRef.current = buildCoordinator();
      dragStartedRef.current = false;
      setMoving(null);
      setVisualState(EMPTY_VISUAL_STATE);
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [moving]);

  return {
    moving,
    setMoving,
    dragStartedRef,
    snapGuides: visualState.snapGuides,
    setSnapGuides: () => {},           // no-op: callers exist but no longer need it
    distanceGuides: visualState.distanceGuides,
    liveDimensions: visualState.liveDimensions,
    flowDragOffset: visualState.flowDragOffset,
    flowDropTarget: visualState.flowDropTarget,
    highlightedNodeIds: visualState.highlightedNodeIds,
  };
}

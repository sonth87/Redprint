import { useState, useEffect, useRef } from "react";
import type { SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import type { Point, Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapEngine } from "../snap/SnapEngine";
import { resolveContainerDropPosition } from "./useDropSlotResolver";
import {
  resolveContainerLayoutType,
  shouldUseFlowDrag,
  type ContainerConfigResolver,
  type NodeMovingSnapshot,
} from "./dragUtils";

interface MovingState {
  nodeId: string; // Primary anchor node
  nodes: NodeMovingSnapshot[];
  startPoint: Point;
  gestureGroupId: string;
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

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Compute where to insert the dragged node among its siblings based on
 * the cursor's canvas-space Y coordinate.
 * Returns the insertIndex (0 = before first sibling).
 */
function computeFlowInsertIndex(
  cursorCanvasY: number,
  siblings: BuilderNode[],
  frameEl: HTMLElement,
  fr: DOMRect,
  zoom: number,
): number {
  const sorted = [...siblings].sort((a, b) => a.order - b.order);
  for (let i = 0; i < sorted.length; i++) {
    const sib = sorted[i]!;
    const sibEl = frameEl.querySelector(
      `[data-node-id="${sib.id}"]`,
    ) as HTMLElement | null;
    if (!sibEl) continue;
    const sibRect = sibEl.getBoundingClientRect();
    const sibCanvasY = (sibRect.top - fr.top) / zoom;
    const sibMidY = sibCanvasY + sibRect.height / (2 * zoom);
    if (cursorCanvasY < sibMidY) return i;
  }
  return sorted.length;
}

/**
 * Walk elements under the cursor and return the first node-id that belongs to
 * a flow/grid container which can legally accept the dragged component type.
 * Returns null when no valid flow container is found.
 */
function findHoveredFlowContainer(
  clientX: number,
  clientY: number,
  draggingNodeId: string,
  draggingNodeType: string,
  currentParentId: string | null | undefined,
  nodes: Record<string, BuilderNode>,
  getContainerConfig: ContainerConfigResolver | undefined,
): string | null {
  const currentParentEl = currentParentId
    ? (globalThis.document.querySelector(`[data-node-id="${currentParentId}"]`) as HTMLElement | null)
    : null;
  const currentParentRect = currentParentEl?.getBoundingClientRect();
  const isWithinCurrentParent =
    !!currentParentRect &&
    clientX >= currentParentRect.left &&
    clientX <= currentParentRect.right &&
    clientY >= currentParentRect.top &&
    clientY <= currentParentRect.bottom;

  const elements = globalThis.document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    const id = (el as HTMLElement).getAttribute?.("data-node-id");
    if (!id) continue;
    if (id === draggingNodeId) continue;   // can't drop into itself
    if (id === currentParentId) continue;  // already in this parent

    const targetNode = nodes[id];
    if (!targetNode) continue;

    const cfg = getContainerConfig?.(targetNode);
    const layoutType = cfg?.layoutType ?? "absolute";
    if (layoutType === "absolute") continue; // not a flow/grid container

    // Check the container accepts the dragged component type
    if (cfg?.disallowedChildTypes?.includes(draggingNodeType)) continue;

    // Guard against dropping a node into one of its own descendants
    let ancestorId: string | null | undefined = targetNode.parentId;
    let isDescendant = false;
    while (ancestorId) {
      if (ancestorId === draggingNodeId) { isDescendant = true; break; }
      ancestorId = nodes[ancestorId]?.parentId;
    }
    if (isDescendant) continue;

    // When dragging inside a nested flow container, keep the current parent as
    // the target until the pointer actually leaves its bounds. Otherwise a
    // grid/flex ancestor (for example a Repeater/Grid item wrapper) hijacks
    // the drop and the node jumps out of its local stack.
    if (isWithinCurrentParent && currentParentId) {
      let parentCursor: string | null | undefined = currentParentId;
      let isAncestorOfCurrentParent = false;
      while (parentCursor) {
        if (parentCursor === id) {
          isAncestorOfCurrentParent = true;
          break;
        }
        parentCursor = nodes[parentCursor]?.parentId;
      }
      if (isAncestorOfCurrentParent) continue;
    }

    return id;
  }
  return null;
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
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [distanceGuides, setDistanceGuides] = useState<DistanceGuide[]>([]);
  const [liveDimensions, setLiveDimensions] = useState<LiveDimensions | null>(null);
  const [flowDragOffset, setFlowDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [flowDropTarget, setFlowDropTarget] = useState<{ containerId: string; insertIndex: number; gridCell?: { col: number; row: number } } | null>(null);
  const dragStartedRef = useRef(false);
  const canvasOffsetRef = useRef({ x: 0, y: 0 });
  /** Last dispatched reorder index — avoids flooding REORDER_NODE on every pixel */
  const lastReorderIndexRef = useRef<number | null>(null);
  const flowDragPreviewRef = useRef<HTMLElement | null>(null);
  /**
   * Tracks the last flow-container we transitioned into during an absolute-mode drag.
   * Prevents re-dispatching MOVE_NODE + UPDATE_STYLE on every mousemove pixel while
   * the cursor stays over the same container.
   */
  const lastEnteredFlowContainerRef = useRef<string | null>(null);

  useEffect(() => {
    if (!moving) {
      lastReorderIndexRef.current = null;
      return;
    }

    const isMultiSelect = moving.nodes.length > 1;

    const handleGlobalMouseMove = (e: MouseEvent) => {
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

      const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      if (!frameEl) return;

      const node = nodes[moving.nodeId];
      
      // ── Determine if node lives in a flow/grid parent ──────────────────
      // Multi-select dragging currently bypasses flow-mode logic (complexity)
      const isFlowParent = !isMultiSelect && shouldUseFlowDrag(node, nodes, getContainerConfig);

      // ══════════════════════════════════════════════════════════════════
      // FLOW MODE — node lives inside a Grid, Column, or other flow container
      // (Single selection only)
      // ══════════════════════════════════════════════════════════════════
      if (isFlowParent && node?.parentId) {
        const fr = frameEl.getBoundingClientRect();
        const tx = (e.clientX - moving.startPoint.x) / zoom;
        const ty = (e.clientY - moving.startPoint.y) / zoom;
        const flowNodeEl = frameEl.querySelector(`[data-node-id="${moving.nodeId}"]`) as HTMLElement | null;
        if (flowNodeEl && isFirstMove) {
          const dragPreview = flowNodeEl.cloneNode(true) as HTMLElement;
          dragPreview.removeAttribute("data-node-id");
          dragPreview.querySelectorAll("[data-node-id]").forEach((el) => el.removeAttribute("data-node-id"));
          const er = flowNodeEl.getBoundingClientRect();
          const initialLeft = (er.left - fr.left) / zoom;
          const initialTop = (er.top - fr.top) / zoom;

          dragPreview.dataset.flowDragPreview = "true";
          dragPreview.style.position = "absolute";
          dragPreview.style.left = `${initialLeft}px`;
          dragPreview.style.top = `${initialTop}px`;
          dragPreview.style.width = `${er.width / zoom}px`;
          dragPreview.style.height = `${er.height / zoom}px`;
          dragPreview.style.margin = "0";
          dragPreview.style.pointerEvents = "none";
          dragPreview.style.zIndex = "9999";
          dragPreview.style.opacity = "0.9";
          dragPreview.style.visibility = "visible";
          dragPreview.style.transform = "translate(0px, 0px)";
          dragPreview.style.transition = "none";
          frameEl.appendChild(dragPreview);
          flowDragPreviewRef.current = dragPreview;

          flowNodeEl.style.setProperty("visibility", "hidden");
          flowNodeEl.style.setProperty("pointer-events", "none");
        }
        if (flowDragPreviewRef.current) {
          flowDragPreviewRef.current.style.transform = `translate(${tx}px, ${ty}px)`;
        }

        setFlowDragOffset({ x: tx, y: ty });

        const hoveredFlowId = findHoveredFlowContainer(
          e.clientX,
          e.clientY,
          moving.nodeId,
          node.type,
          node.parentId,
          nodes,
          getContainerConfig,
        );
        const targetContainerId = hoveredFlowId ?? node.parentId;
        const targetContainerNode = nodes[targetContainerId];
        const targetContainerEl = frameEl.querySelector(
          `[data-node-id="${targetContainerId}"]`,
        ) as HTMLElement | null;

        const siblings = Object.values(nodes).filter(
          (n) => n.parentId === targetContainerId && n.id !== moving.nodeId,
        );

        if (targetContainerEl && targetContainerNode && getContainerConfig) {
          const result = resolveContainerDropPosition(
            e.clientX,
            e.clientY,
            targetContainerEl,
            targetContainerNode,
            siblings,
            getContainerConfig,
          );
          lastReorderIndexRef.current = result.insertIndex;
          setFlowDropTarget({
            containerId: targetContainerId,
            insertIndex: result.insertIndex,
            gridCell: result.gridCell,
          });
        } else {
          setFlowDropTarget(null);
          lastReorderIndexRef.current = null;
        }

        setSnapGuides([]);
        setDistanceGuides([]);
        setLiveDimensions(null);
        return;
      }

      // ══════════════════════════════════════════════════════════════════
      // ABSOLUTE MODE — existing drag logic (position:absolute, snap guides)
      // ══════════════════════════════════════════════════════════════════

      if (!isMultiSelect && node) {
        const targetFlowId = findHoveredFlowContainer(e.clientX, e.clientY, moving.nodeId, node.type, node.parentId, nodes, getContainerConfig);
        if (targetFlowId) {
          const fr2 = frameEl.getBoundingClientRect();
          const containerSiblings = Object.values(nodes).filter((n) => n.parentId === targetFlowId && n.id !== moving.nodeId);
          const targetContainerNode = nodes[targetFlowId];
          const targetContainerEl = frameEl.querySelector(`[data-node-id="${targetFlowId}"]`) as HTMLElement | null;
          let tentativeIndex = containerSiblings.length;
          let gridCell: { col: number; row: number } | undefined;
          if (targetContainerNode && targetContainerEl && getContainerConfig) {
            const result = resolveContainerDropPosition(e.clientX, e.clientY, targetContainerEl, targetContainerNode, containerSiblings, getContainerConfig);
            tentativeIndex = result.insertIndex;
            gridCell = result.gridCell;
          } else {
            tentativeIndex = computeFlowInsertIndex((e.clientY - fr2.top) / zoom, containerSiblings, frameEl, fr2, zoom);
          }
          setFlowDropTarget({ containerId: targetFlowId, insertIndex: tentativeIndex, gridCell });
        } else {
          setFlowDropTarget(null);
        }
      }

      const primarySnapshot = moving.nodes.find(n => n.nodeId === moving.nodeId)!;

      if (isFirstMove) {
        const nodeEl = frameEl.querySelector(`[data-node-id="${moving.nodeId}"]`) as HTMLElement;
        if (nodeEl) {
          const fr = frameEl.getBoundingClientRect();
          const er = nodeEl.getBoundingClientRect();
          const trueCanvasX = (er.left - fr.left) / zoom;
          const trueCanvasY = (er.top - fr.top) / zoom;
          canvasOffsetRef.current = { x: trueCanvasX - primarySnapshot.startLeft, y: trueCanvasY - primarySnapshot.startTop };
        } else {
          canvasOffsetRef.current = { x: 0, y: 0 };
        }
      }

      const rawLeft = primarySnapshot.startLeft + dx / zoom;
      const rawTop = primarySnapshot.startTop + dy / zoom;

      let finalLeft = Math.round(rawLeft);
      let finalTop = Math.round(rawTop);
      let guides: SnapGuide[] = [];

      // Snapping logic (applied to primary node)
      if (snapEnabled && canvasFrameRef.current && !isMultiSelect) {
        const nodeEl = frameEl.querySelector(`[data-node-id="${moving.nodeId}"]`) as HTMLElement;
        if (nodeEl) {
          const w = nodeEl.offsetWidth;
          const h = nodeEl.offsetHeight;
          const fr = frameEl.getBoundingClientRect();
          const rawCanvasX = rawLeft + canvasOffsetRef.current.x;
          const rawCanvasY = rawTop + canvasOffsetRef.current.y;
          const movingRectInCanvas: Rect = { x: rawCanvasX, y: rawCanvasY, width: w, height: h };
          const siblings: Rect[] = [];
          if (node?.parentId) {
            for (const n of Object.values(nodes) as BuilderNode[]) {
              if (n.parentId === node.parentId && n.id !== moving.nodeId) {
                const el = frameEl.querySelector(`[data-node-id="${n.id}"]`) as HTMLElement;
                if (el) {
                  const er = el.getBoundingClientRect();
                  siblings.push({ x: (er.left - fr.left) / zoom, y: (er.top - fr.top) / zoom, width: er.width / zoom, height: er.height / zoom });
                }
              }
            }
          }
          const result = snapEngine.snap(movingRectInCanvas, siblings);
          guides = result.guides;
          finalLeft = Math.round(result.snappedPoint.x - canvasOffsetRef.current.x);
          finalTop = Math.round(result.snappedPoint.y - canvasOffsetRef.current.y);
          const snappedMovingRectInCanvas: Rect = { x: result.snappedPoint.x, y: result.snappedPoint.y, width: w, height: h };
          const allOtherRects: Rect[] = [];
          const allNodeEls = Array.from(frameEl.querySelectorAll("[data-node-id]")) as HTMLElement[];
          for (const el of allNodeEls) {
            if (el.getAttribute("data-node-id") === moving.nodeId) continue;
            const er = el.getBoundingClientRect();
            allOtherRects.push({ x: (er.left - fr.left) / zoom, y: (er.top - fr.top) / zoom, width: er.width / zoom, height: er.height / zoom });
          }
          const crossGuides = snapEngine.alignmentGuides(snappedMovingRectInCanvas, allOtherRects);
          guides = [...guides, ...crossGuides];
          setDistanceGuides(snapEngine.distanceGuides(snappedMovingRectInCanvas, siblings));
          setLiveDimensions({ width: w, height: h });
        }
      }

      setSnapGuides(guides);

      const snapDeltaX = finalLeft - rawLeft;
      const snapDeltaY = finalTop - rawTop;

      moving.nodes.forEach(mNode => {
        const styleUpdate: Record<string, string | number> = {
          position: "absolute",
          left: `${Math.round(mNode.startLeft + dx / zoom + (mNode.nodeId === moving.nodeId ? snapDeltaX : snapDeltaX))}px`,
          top: `${Math.round(mNode.startTop + dy / zoom + (mNode.nodeId === moving.nodeId ? snapDeltaY : snapDeltaY))}px`,
        };
        // If transitioning from non-absolute, set width/height
        if (isFirstMove && !mNode.wasAbsolute && mNode.startWidth != null && mNode.startHeight != null) {
          styleUpdate.width = `${mNode.startWidth}px`;
          styleUpdate.height = `${mNode.startHeight}px`;
        }
        dispatch({
          type: "UPDATE_STYLE",
          payload: { nodeId: mNode.nodeId, style: styleUpdate, breakpoint },
          groupId: moving.gestureGroupId,
          description: isMultiSelect ? "Move multiple" : "Move",
        });
      });
    };

    const handleGlobalMouseUp = () => {
      const upFrameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      if (flowDragPreviewRef.current) {
        flowDragPreviewRef.current.remove();
        flowDragPreviewRef.current = null;
      }
      moving.nodes.forEach(mNode => {
        const upNodeEl = upFrameEl?.querySelector(`[data-node-id="${mNode.nodeId}"]`) as HTMLElement | null;
        if (upNodeEl) {
          const origTransform = upNodeEl.dataset.dragOriginalTransform ?? "";
          upNodeEl.style.transform = origTransform;
          upNodeEl.style.removeProperty("opacity");
          upNodeEl.style.removeProperty("z-index");
          upNodeEl.style.removeProperty("pointer-events");
          upNodeEl.style.removeProperty("visibility");
          delete upNodeEl.dataset.dragOriginalTransform;
        }
      });

      if (dragStartedRef.current && flowDropTarget !== null && !isMultiSelect) {
        const { containerId, insertIndex } = flowDropTarget;
        const dropNode = nodes[moving.nodeId];
        dispatch({
          type: "UPDATE_STYLE",
          payload: {
            nodeId: moving.nodeId,
            style: { position: undefined, left: undefined, top: undefined } as Record<string, unknown>,
            breakpoint,
          },
          description: "Clear position on flow drop",
        });
        if (dropNode?.parentId !== containerId) {
          dispatch({ type: "MOVE_NODE", payload: { nodeId: moving.nodeId, targetParentId: containerId, position: "inside" }, description: "Drop into flow container" });
        }
        dispatch({ type: "REORDER_NODE", payload: { nodeId: moving.nodeId, insertIndex }, description: "Reorder in flow container" });
      }
      else if (dragStartedRef.current && lastReorderIndexRef.current !== null && !isMultiSelect) {
        const n = nodes[moving.nodeId];
        const p = n?.parentId ? nodes[n.parentId] : null;
        if (resolveContainerLayoutType(p, getContainerConfig) !== "absolute") {
          dispatch({ type: "REORDER_NODE", payload: { nodeId: moving.nodeId, insertIndex: lastReorderIndexRef.current }, description: "Reorder" });
        }
      }

      setMoving(null);
      setSnapGuides([]);
      setDistanceGuides([]);
      setLiveDimensions(null);
      setFlowDragOffset(null);
      setFlowDropTarget(null);
      lastReorderIndexRef.current = null;
      lastEnteredFlowContainerRef.current = null;
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [moving, zoom, breakpoint, dispatch, snapEnabled, snapEngine, nodes, canvasFrameRef, activeFrameRef, rootNodeId, getContainerConfig, flowDropTarget]);

  return { moving, setMoving, dragStartedRef, snapGuides, setSnapGuides, distanceGuides, liveDimensions, flowDragOffset, flowDropTarget };
}

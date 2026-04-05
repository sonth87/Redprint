import { useState, useEffect, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import type { SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import type { Point, Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapEngine } from "../snap/SnapEngine";
import { resolveContainerDropPosition } from "./useDropSlotResolver";

interface MovingState {
  nodeId: string;
  startPoint: Point;
  startLeft: number;
  startTop: number;
  startWidth?: number;
  startHeight?: number;
  wasAbsolute: boolean;
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
    componentType: string,
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
  getContainerConfig: ((type: string) => { layoutType?: string; disallowedChildTypes?: string[] } | undefined) | undefined,
): string | null {
  const elements = globalThis.document.elementsFromPoint(clientX, clientY);
  for (const el of elements) {
    const id = (el as HTMLElement).getAttribute?.("data-node-id");
    if (!id) continue;
    if (id === draggingNodeId) continue;   // can't drop into itself
    if (id === currentParentId) continue;  // already in this parent

    const targetNode = nodes[id];
    if (!targetNode) continue;

    const cfg = getContainerConfig?.(targetNode.type);
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

      // ── Determine if node lives in a flow/grid parent ──────────────────
      const node = nodes[moving.nodeId];
      const parentNode = node?.parentId ? nodes[node.parentId] : null;
      const parentCfg = parentNode ? getContainerConfig?.(parentNode.type) : undefined;
      const parentLayoutType = parentCfg?.layoutType ?? "absolute";
      const isFlowParent = parentLayoutType !== "absolute";

      // ══════════════════════════════════════════════════════════════════
      // FLOW MODE — node lives inside a Grid, Column, or other flow container
      // ══════════════════════════════════════════════════════════════════
      if (isFlowParent && node?.parentId) {
        const fr = frameEl.getBoundingClientRect();
        const cursorCanvasY = (e.clientY - fr.top) / zoom;

        // ── Check if cursor has left the parent element ──────────────────
        const parentEl = frameEl.querySelector(
          `[data-node-id="${node.parentId}"]`,
        ) as HTMLElement | null;

        const outsideParent =
          !parentEl ||
          e.clientX < parentEl.getBoundingClientRect().left ||
          e.clientX > parentEl.getBoundingClientRect().right ||
          e.clientY < parentEl.getBoundingClientRect().top ||
          e.clientY > parentEl.getBoundingClientRect().bottom;

        if (outsideParent) {
          // ── Read node's actual canvas position BEFORE re-parenting ──────
          // Using the cursor position here would snap the node's top-left to
          // the cursor, causing a visible jump. Instead we read the real DOM
          // bounding rect so the node stays exactly where it was visually.
          const detachNodeEl = frameEl.querySelector(
            `[data-node-id="${moving.nodeId}"]`,
          ) as HTMLElement | null;
          let nodeCanvasX = Math.round((e.clientX - fr.left) / zoom);
          let nodeCanvasY = Math.round((e.clientY - fr.top) / zoom);
          if (detachNodeEl) {
            const er = detachNodeEl.getBoundingClientRect();
            nodeCanvasX = Math.round((er.left - fr.left) / zoom);
            nodeCanvasY = Math.round((er.top - fr.top) / zoom);
          }

          // ── Detach from flow parent → re-parent to hovered container ──
          const hoveredEls = globalThis.document.elementsFromPoint(e.clientX, e.clientY);
          const newParentEl = hoveredEls.find((el) => {
            const id = (el as HTMLElement).getAttribute?.("data-node-id");
            return id && id !== moving.nodeId && id !== node.parentId;
          }) as HTMLElement | undefined;

          const newParentId =
            newParentEl?.getAttribute("data-node-id") ?? rootNodeId ?? "";
          const newParentNode = newParentId ? nodes[newParentId] : null;
          const newParentCfg = newParentNode
            ? getContainerConfig?.(newParentNode.type)
            : undefined;
          const newParentLayoutType = newParentCfg?.layoutType ?? "absolute";

          // Re-parent the node
          dispatch({
            type: "MOVE_NODE",
            payload: {
              nodeId: moving.nodeId,
              targetParentId: newParentId,
              position: "inside",
            },
            description: "Move out of layout",
          });

          // Place node at its actual visual position — no position jump
          if (newParentLayoutType === "absolute") {
            dispatch({
              type: "UPDATE_STYLE",
              payload: {
                nodeId: moving.nodeId,
                style: {
                  position: "absolute",
                  left: `${nodeCanvasX}px`,
                  top: `${nodeCanvasY}px`,
                  ...(moving.startWidth != null && { width: `${moving.startWidth}px` }),
                  ...(moving.startHeight != null && { height: `${moving.startHeight}px` }),
                },
                breakpoint,
              },
              description: "Position after detach",
            });
          }

          // Clean up flow-mode visual styles before transitioning to absolute mode
          if (detachNodeEl) {
            const origTransform = detachNodeEl.dataset.dragOriginalTransform ?? "";
            detachNodeEl.style.transform = origTransform;
            detachNodeEl.style.removeProperty("opacity");
            detachNodeEl.style.removeProperty("z-index");
            detachNodeEl.style.removeProperty("pointer-events");
            delete detachNodeEl.dataset.dragOriginalTransform;
          }

          // Transition to absolute-mode gesture for the rest of the drag.
          // startLeft/Top == node's actual canvas position, so offset is 0.
          // We DON'T reset dragStartedRef so there's no threshold freeze.
          canvasOffsetRef.current = { x: 0, y: 0 };
          lastReorderIndexRef.current = null;
          setFlowDragOffset(null);
          setMoving({
            ...moving,
            startLeft: nodeCanvasX,
            startTop: nodeCanvasY,
            startPoint: { x: e.clientX, y: e.clientY },
            wasAbsolute: false,
            gestureGroupId: uuidv4(),
          });
          return;
        }

        // ── Visual feedback: element follows cursor via CSS transform ──────
        // (imperative DOM — no React state overhead, auto-cleaned on mouseup)
        // Cursor delta in canvas-space (element lives inside the zoom transform)
        const tx = (e.clientX - moving.startPoint.x) / zoom;
        const ty = (e.clientY - moving.startPoint.y) / zoom;

        const flowNodeEl = frameEl.querySelector(
          `[data-node-id="${moving.nodeId}"]`,
        ) as HTMLElement | null;
        if (flowNodeEl) {
          if (isFirstMove) {
            // Preserve any pre-existing transform (e.g. rotation) so we can restore it
            flowNodeEl.dataset.dragOriginalTransform = flowNodeEl.style.transform ?? "";
            flowNodeEl.style.setProperty("opacity", "0.75");
            flowNodeEl.style.setProperty("z-index", "9999");
            flowNodeEl.style.setProperty("pointer-events", "none");
          }
          const base = flowNodeEl.dataset.dragOriginalTransform ?? "";
          flowNodeEl.style.transform = base
            ? `translate(${tx}px, ${ty}px) ${base}`
            : `translate(${tx}px, ${ty}px)`;
        }

        // Keep the selection overlay (SelectionOverlay + ContextualToolbar) in sync
        // with the element's visual position. Without this, useSelectionRect won't
        // re-run (no node state change during flow drag) so the overlay stays at the
        // element's original grid position instead of following the cursor.
        setFlowDragOffset({ x: tx, y: ty });

        // ── Still within parent — compute reorder ────────────────────────
        const siblings = Object.values(nodes).filter(
          (n) => n.parentId === node.parentId && n.id !== moving.nodeId,
        );

        let insertIndex: number;
        const parentContainerEl = parentEl as HTMLElement | null;
        if (parentContainerEl && parentNode && getContainerConfig) {
          const result = resolveContainerDropPosition(
            e.clientX,
            e.clientY,
            parentContainerEl,
            parentNode,
            siblings,
            getContainerConfig,
          );
          insertIndex = result.insertIndex;
        } else {
          // Fallback: 1-D Y-midpoint
          const sorted = [...siblings].sort((a, b) => a.order - b.order);
          insertIndex = sorted.length;
          for (let i = 0; i < sorted.length; i++) {
            const sib = sorted[i]!;
            const sibEl = frameEl.querySelector(
              `[data-node-id="${sib.id}"]`,
            ) as HTMLElement | null;
            if (!sibEl) continue;
            const sibRect = sibEl.getBoundingClientRect();
            const sibMidY = (sibRect.top - fr.top) / zoom + sibRect.height / (2 * zoom);
            const cursorCanvasY = (e.clientY - fr.top) / zoom;
            if (cursorCanvasY < sibMidY) { insertIndex = i; break; }
          }
        }

        // Only update the ref — do NOT dispatch REORDER_NODE here.
        // Dispatching causes a React re-render which immediately resets the
        // imperative CSS transform we just applied above, making the element
        // jump back to its natural flow position on every pixel of movement.
        // The actual reorder is committed once in handleGlobalMouseUp.
        lastReorderIndexRef.current = insertIndex;

        setSnapGuides([]);
        setDistanceGuides([]);
        setLiveDimensions(null);
        return;
      }

      // ══════════════════════════════════════════════════════════════════
      // ABSOLUTE MODE — existing drag logic (position:absolute, snap guides)
      // ══════════════════════════════════════════════════════════════════

      // ── Check if cursor is hovering a flow/grid container ─────────────
      // We do NOT re-parent yet — just record where we'd drop, so the
      // BuilderEditor can render a placeholder line. The actual MOVE_NODE
      // is only committed on mouseup.
      if (node) {
        const targetFlowId = findHoveredFlowContainer(
          e.clientX,
          e.clientY,
          moving.nodeId,
          node.type,
          node.parentId,
          nodes,
          getContainerConfig,
        );

        if (targetFlowId) {
          // Compute tentative insert index inside the hovered container
          const fr2 = frameEl.getBoundingClientRect();
          const containerSiblings = Object.values(nodes).filter(
            (n) => n.parentId === targetFlowId && n.id !== moving.nodeId,
          );
          const targetContainerNode = nodes[targetFlowId];
          const targetContainerEl = frameEl.querySelector(
            `[data-node-id="${targetFlowId}"]`,
          ) as HTMLElement | null;

          let tentativeIndex = containerSiblings.length;
          let gridCell: { col: number; row: number } | undefined;

          if (targetContainerNode && targetContainerEl && getContainerConfig) {
            const result = resolveContainerDropPosition(
              e.clientX,
              e.clientY,
              targetContainerEl,
              targetContainerNode,
              containerSiblings,
              getContainerConfig,
            );
            tentativeIndex = result.insertIndex;
            gridCell = result.gridCell;
          } else {
            // Fallback: 1-D Y-midpoint
            const cursorCanvasY2 = (e.clientY - fr2.top) / zoom;
            tentativeIndex = computeFlowInsertIndex(
              cursorCanvasY2,
              containerSiblings,
              frameEl,
              fr2,
              zoom,
            );
          }
          setFlowDropTarget({ containerId: targetFlowId, insertIndex: tentativeIndex, gridCell });
        } else {
          setFlowDropTarget(null);
        }
      }

      if (isFirstMove) {
        const nodeEl = frameEl.querySelector(
          `[data-node-id="${moving.nodeId}"]`,
        ) as HTMLElement;
        if (nodeEl) {
          const fr = frameEl.getBoundingClientRect();
          const er = nodeEl.getBoundingClientRect();
          const trueCanvasX = (er.left - fr.left) / zoom;
          const trueCanvasY = (er.top - fr.top) / zoom;
          canvasOffsetRef.current = {
            x: trueCanvasX - moving.startLeft,
            y: trueCanvasY - moving.startTop,
          };
        } else {
          canvasOffsetRef.current = { x: 0, y: 0 };
        }
      }

      const rawLeft = moving.startLeft + dx / zoom;
      const rawTop = moving.startTop + dy / zoom;

      let finalLeft = Math.round(rawLeft);
      let finalTop = Math.round(rawTop);
      let guides: SnapGuide[] = [];

      if (snapEnabled && canvasFrameRef.current) {
        const nodeEl = frameEl.querySelector(
          `[data-node-id="${moving.nodeId}"]`,
        ) as HTMLElement;
        if (nodeEl) {
          const w = nodeEl.offsetWidth;
          const h = nodeEl.offsetHeight;
          const fr = frameEl.getBoundingClientRect();

          const rawCanvasX = rawLeft + canvasOffsetRef.current.x;
          const rawCanvasY = rawTop + canvasOffsetRef.current.y;
          const movingRectInCanvas: Rect = {
            x: rawCanvasX,
            y: rawCanvasY,
            width: w,
            height: h,
          };

          const siblings: Rect[] = [];
          if (node?.parentId) {
            for (const n of Object.values(nodes) as BuilderNode[]) {
              if (n.parentId === node.parentId && n.id !== moving.nodeId) {
                const el = frameEl.querySelector(
                  `[data-node-id="${n.id}"]`,
                ) as HTMLElement;
                if (el) {
                  const er = el.getBoundingClientRect();
                  siblings.push({
                    x: (er.left - fr.left) / zoom,
                    y: (er.top - fr.top) / zoom,
                    width: er.width / zoom,
                    height: er.height / zoom,
                  });
                }
              }
            }
          }
          const result = snapEngine.snap(movingRectInCanvas, siblings);
          guides = result.guides;

          finalLeft = Math.round(result.snappedPoint.x - canvasOffsetRef.current.x);
          finalTop = Math.round(result.snappedPoint.y - canvasOffsetRef.current.y);

          const snappedMovingRectInCanvas: Rect = {
            x: result.snappedPoint.x,
            y: result.snappedPoint.y,
            width: w,
            height: h,
          };

          const allOtherRects: Rect[] = [];
          const allNodeEls = Array.from(
            frameEl.querySelectorAll("[data-node-id]"),
          ) as HTMLElement[];
          for (const el of allNodeEls) {
            if (el.getAttribute("data-node-id") === moving.nodeId) continue;
            const er = el.getBoundingClientRect();
            allOtherRects.push({
              x: (er.left - fr.left) / zoom,
              y: (er.top - fr.top) / zoom,
              width: er.width / zoom,
              height: er.height / zoom,
            });
          }

          const crossGuides = snapEngine.alignmentGuides(
            snappedMovingRectInCanvas,
            allOtherRects,
          );
          guides = [...guides, ...crossGuides];

          setDistanceGuides(
            snapEngine.distanceGuides(snappedMovingRectInCanvas, siblings),
          );
          setLiveDimensions({ width: w, height: h });
        }
      }

      setSnapGuides(guides);

      const styleUpdate: Record<string, string | number> = {
        position: "absolute",
        left: `${finalLeft}px`,
        top: `${finalTop}px`,
      };
      if (
        isFirstMove &&
        !moving.wasAbsolute &&
        moving.startWidth != null &&
        moving.startHeight != null
      ) {
        styleUpdate.width = `${moving.startWidth}px`;
        styleUpdate.height = `${moving.startHeight}px`;
      }

      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: moving.nodeId,
          style: styleUpdate,
          breakpoint,
        },
        groupId: moving.gestureGroupId,
        description: "Move",
      });
    };

    const handleGlobalMouseUp = () => {
      // Remove any flow-mode visual overrides left on the dragged element
      const upFrameEl = activeFrameRef?.current ?? canvasFrameRef.current;
      const upNodeEl = upFrameEl?.querySelector(
        `[data-node-id="${moving.nodeId}"]`,
      ) as HTMLElement | null;
      if (upNodeEl) {
        const origTransform = upNodeEl.dataset.dragOriginalTransform ?? "";
        upNodeEl.style.transform = origTransform;
        upNodeEl.style.removeProperty("opacity");
        upNodeEl.style.removeProperty("z-index");
        upNodeEl.style.removeProperty("pointer-events");
        delete upNodeEl.dataset.dragOriginalTransform;
      }

      // ── Case 1: Dropped onto a flow/grid container from absolute mode ───
      // Commit the drop: clear absolute styles, re-parent, then reorder.
      if (dragStartedRef.current && flowDropTarget !== null) {
        const { containerId, insertIndex } = flowDropTarget;
        const dropNode = nodes[moving.nodeId];
        // Only act if the node is currently in absolute (not already in a flow parent)
        const dropParentCfg = dropNode?.parentId
          ? getContainerConfig?.(nodes[dropNode.parentId]?.type ?? "")
          : undefined;
        if ((dropParentCfg?.layoutType ?? "absolute") === "absolute") {
          dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId: moving.nodeId,
              style: { position: undefined, left: undefined, top: undefined } as Record<string, unknown>,
              breakpoint,
            },
            description: "Clear position on flow drop",
          });
          dispatch({
            type: "MOVE_NODE",
            payload: { nodeId: moving.nodeId, targetParentId: containerId, position: "inside" },
            description: "Drop into flow container",
          });
          dispatch({
            type: "REORDER_NODE",
            payload: { nodeId: moving.nodeId, insertIndex },
            description: "Reorder in flow container",
          });
        }
      }
      // ── Case 2: Reorder within existing flow/grid parent ────────────────
      // Commit the deferred flow-mode reorder now that the drag has ended.
      // We deliberately waited until mouseup because dispatching REORDER_NODE
      // during drag triggers React re-renders that wipe the CSS transform.
      else if (dragStartedRef.current && lastReorderIndexRef.current !== null) {
        const n = nodes[moving.nodeId];
        const p = n?.parentId ? nodes[n.parentId] : null;
        const cfg = p ? getContainerConfig?.(p.type) : undefined;
        if ((cfg?.layoutType ?? "absolute") !== "absolute") {
          dispatch({
            type: "REORDER_NODE",
            payload: {
              nodeId: moving.nodeId,
              insertIndex: lastReorderIndexRef.current,
            },
            description: "Reorder",
          });
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
  }, [
    moving,
    zoom,
    breakpoint,
    dispatch,
    snapEnabled,
    snapEngine,
    nodes,
    canvasFrameRef,
    activeFrameRef,
    rootNodeId,
    getContainerConfig,
  ]);

  return {
    moving,
    setMoving,
    dragStartedRef,
    snapGuides,
    setSnapGuides,
    distanceGuides,
    liveDimensions,
    flowDragOffset,
    flowDropTarget,
  };
}

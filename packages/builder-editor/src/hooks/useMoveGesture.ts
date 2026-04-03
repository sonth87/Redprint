import { useState, useEffect, useRef } from "react";
import type { SnapGuide, DistanceGuide, LiveDimensions } from "../types";
import type { Point, Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { SnapEngine } from "../snap/SnapEngine";

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
}

export interface UseMoveGestureReturn {
  moving: MovingState | null;
  setMoving: (state: MovingState | null) => void;
  dragStartedRef: React.MutableRefObject<boolean>;
  snapGuides: SnapGuide[];
  setSnapGuides: (guides: SnapGuide[]) => void;
  distanceGuides: DistanceGuide[];
  liveDimensions: LiveDimensions | null;
}

const DRAG_THRESHOLD = 5;

export function useMoveGesture({
  zoom,
  breakpoint,
  snapEnabled,
  snapEngine,
  nodes,
  canvasFrameRef,
  activeFrameRef,
  dispatch,
}: UseMoveGestureOptions): UseMoveGestureReturn {
  const [moving, setMoving] = useState<MovingState | null>(null);
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [distanceGuides, setDistanceGuides] = useState<DistanceGuide[]>([]);
  const [liveDimensions, setLiveDimensions] = useState<LiveDimensions | null>(null);
  const dragStartedRef = useRef(false);

  useEffect(() => {
    if (!moving) return;
    const handleGlobalMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - moving.startPoint.x;
      const dy = e.clientY - moving.startPoint.y;

      if (
        !dragStartedRef.current &&
        Math.abs(dx) < DRAG_THRESHOLD &&
        Math.abs(dy) < DRAG_THRESHOLD
      )
        return;

      if (!dragStartedRef.current) {
        dragStartedRef.current = true;
        if (
          !moving.wasAbsolute &&
          moving.startWidth != null &&
          moving.startHeight != null
        ) {
          dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId: moving.nodeId,
              style: {
                width: `${moving.startWidth}px`,
                height: `${moving.startHeight}px`,
              },
              breakpoint,
            },
            groupId: moving.gestureGroupId,
            description: "Lock dimensions for drag",
          });
        }
      }

      const rawLeft = moving.startLeft + dx / zoom;
      const rawTop = moving.startTop + dy / zoom;

      let finalLeft = Math.round(rawLeft);
      let finalTop = Math.round(rawTop);
      let guides: SnapGuide[] = [];

      if (snapEnabled && canvasFrameRef.current) {
        const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;
        const nodeEl = frameEl.querySelector(
          `[data-node-id="${moving.nodeId}"]`
        ) as HTMLElement;
        if (nodeEl) {
          const w = nodeEl.offsetWidth;
          const h = nodeEl.offsetHeight;
          const fr = frameEl.getBoundingClientRect();
          const movingRect: Rect = { x: rawLeft, y: rawTop, width: w, height: h };

          // ── Same-parent siblings (positional snap + distance guides) ──
          const siblings: Rect[] = [];
          const node = nodes[moving.nodeId];
          if (node?.parentId) {
            for (const n of Object.values(nodes) as BuilderNode[]) {
              if (n.parentId === node.parentId && n.id !== moving.nodeId) {
                const el = frameEl.querySelector(
                  `[data-node-id="${n.id}"]`
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
          const result = snapEngine.snap(movingRect, siblings);
          guides = result.guides;
          finalLeft = Math.round(result.snappedPoint.x);
          finalTop = Math.round(result.snappedPoint.y);

          // ── Use SNAPPED position for guides ────────────────────────────
          // Recalculate rects using snapped coordinates (not raw mouse position)
          const snappedMovingRect: Rect = { x: finalLeft, y: finalTop, width: w, height: h };

          // ── Cross-container alignment guides ──────────────────────────
          // finalLeft/finalTop are parent-relative snapped coords; add parent's canvas
          // offset so all rects share the same canvas-frame coordinate space.
          const node2 = nodes[moving.nodeId];
          const parentEl = node2?.parentId
            ? (frameEl.querySelector(`[data-node-id="${node2.parentId}"]`) as HTMLElement | null)
            : null;
          const parentOffset = parentEl
            ? {
                x: (parentEl.getBoundingClientRect().left - fr.left) / zoom,
                y: (parentEl.getBoundingClientRect().top - fr.top) / zoom,
              }
            : { x: 0, y: 0 };

          const snappedMovingRectInCanvas: Rect = {
            x: finalLeft + parentOffset.x,
            y: finalTop + parentOffset.y,
            width: w,
            height: h,
          };

          // Collect all visible node rects in a single querySelectorAll pass
          const allOtherRects: Rect[] = [];
          const allNodeEls = Array.from(
            frameEl.querySelectorAll("[data-node-id]")
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

          const crossGuides = snapEngine.alignmentGuides(snappedMovingRectInCanvas, allOtherRects);
          guides = [...guides, ...crossGuides];

          // Compute distance guides to sibling elements using SNAPPED position
          setDistanceGuides(snapEngine.distanceGuides(snappedMovingRect, siblings));

          // Update live dimensions (w/h stays fixed during drag, but update on first move)
          setLiveDimensions({ width: w, height: h });
        }
      }

      setSnapGuides(guides);
      dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: moving.nodeId,
          style: {
            position: "absolute",
            left: `${finalLeft}px`,
            top: `${finalTop}px`,
          },
          breakpoint,
        },
        groupId: moving.gestureGroupId,
        description: "Move",
      });
    };
    const handleGlobalMouseUp = () => {
      setMoving(null);
      setSnapGuides([]);
      setDistanceGuides([]);
      setLiveDimensions(null);
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [moving, zoom, breakpoint, dispatch, snapEnabled, snapEngine, nodes, canvasFrameRef, activeFrameRef]);

  return { moving, setMoving, dragStartedRef, snapGuides, setSnapGuides, distanceGuides, liveDimensions };
}

import { useCallback } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { EditorTool } from "../types";
import type { Point } from "@ui-builder/shared";
import { v4 as uuidv4 } from "uuid";
import { buildMovingSnapshots, type NodeMovingSnapshot } from "./dragUtils";

interface MovingState {
  nodeId: string; // Primary anchor node
  nodes: NodeMovingSnapshot[];
  startPoint: Point;
  gestureGroupId: string;
}

interface UsePointerDownOptions {
  activeTool: EditorTool;
  zoom: number;
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  /** In dual mode: the currently-active artboard ref for coordinate computations */
  activeFrameRef?: React.RefObject<HTMLDivElement | null>;
  dragStartedRef: React.MutableRefObject<boolean>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
  clearSelection: () => void;
  setMoving: (state: MovingState | null) => void;
  setRubberBanding: (state: { startPoint: Point; currentPoint: Point } | null) => void;
  selectedNodeIds: string[];
}

export interface UsePointerDownReturn {
  handlePointerDown: (e: React.PointerEvent) => void;
}


/**
 * Computes the union bounding rect (in screen space) of all selected nodes.
 * Returns null if no node elements were found.
 */
function computeUnionRect(
  selectedNodeIds: string[],
  frameEl: HTMLElement,
): { left: number; top: number; right: number; bottom: number } | null {
  let left   = Infinity;
  let top    = Infinity;
  let right  = -Infinity;
  let bottom = -Infinity;
  let found  = false;

  for (const id of selectedNodeIds) {
    const el = frameEl.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null;
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.left   < left)   left   = r.left;
      if (r.top    < top)    top    = r.top;
      if (r.right  > right)  right  = r.right;
      if (r.bottom > bottom) bottom = r.bottom;
      found = true;
    }
  }

  return found ? { left, top, right, bottom } : null;
}

export function usePointerDown({
  activeTool,
  zoom,
  rootNodeId,
  nodes,
  canvasFrameRef,
  activeFrameRef,
  dragStartedRef,
  dispatch,
  clearSelection,
  setMoving,
  setRubberBanding,
  selectedNodeIds,
}: UsePointerDownOptions): UsePointerDownReturn {
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      if (activeTool === "pan") return;

      const target = e.target as HTMLElement;
      if (
        target.closest("[data-resize-handle]") ||
        target.closest("[data-rotation-handle]") ||
        target.closest("[data-section-handle]") ||
        target.closest("[data-section-action]") ||
        target.closest("[data-section-handle]") ||
        target.closest("[data-section-action]")
      ) return;

      // ── PRIORITY 1: Multi-select group drag ───────────────────────────────
      // When 2+ nodes are selected, ANY click inside their union bounding box
      // should drag the whole group. This check runs FIRST — before nodeEl
      // detection — so nothing (Section type, locked state, background nodes,
      // gaps between nodes) can interfere with it.
      //
      // Bypass when Meta/Ctrl is held (user wants to toggle selection),
      // when Alt is held (cycle selection), or Shift (rubber-band extend).
      const isGroupDragEligible =
        selectedNodeIds.length > 1 &&
        !e.altKey &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.shiftKey;

      if (isGroupDragEligible) {
        const groupFrameEl = activeFrameRef?.current ?? canvasFrameRef.current;
        if (groupFrameEl) {
          const unionRect = computeUnionRect(selectedNodeIds, groupFrameEl);
          if (
            unionRect &&
            e.clientX >= unionRect.left  && e.clientX <= unionRect.right &&
            e.clientY >= unionRect.top   && e.clientY <= unionRect.bottom
          ) {
            // Filter out locked nodes from the group drag
            const movingNodeIds = selectedNodeIds.filter(id => !nodes[id]?.locked);
            if (movingNodeIds.length === 0) return; // All nodes are locked

            const groupFrameRect = groupFrameEl.getBoundingClientRect();
            const movingNodes    = buildMovingSnapshots(movingNodeIds, nodes, groupFrameEl, groupFrameRect, zoom);
            dragStartedRef.current = false;
            setMoving({
              nodeId:         movingNodeIds[0]!,
              nodes:          movingNodes,
              startPoint:     { x: e.clientX, y: e.clientY },
              gestureGroupId: uuidv4(),
            });
            return;
          }
        }
      }

      // ── PRIORITY 2: Ctrl/Cmd+Click → toggle component into/out of selection ─
      // Standard multi-select UX (like Figma): hold Ctrl/Cmd and click any
      // component to add it to the group, or click an already-selected component
      // to remove it from the group.
      if ((e.metaKey || e.ctrlKey) && !e.altKey) {
        const toggleEl = target.closest("[data-node-id]") as HTMLElement | null;
        const toggleId = toggleEl?.getAttribute("data-node-id");
        if (toggleId && toggleId !== rootNodeId) {
          const toggleNode = nodes[toggleId];
          if (toggleNode?.locked) return;
          if (selectedNodeIds.includes(toggleId)) {
            // Already selected → remove from group
            dispatch({
              type:        "DESELECT_NODE",
              payload:     { nodeId: toggleId },
              description: "Deselect",
            });
          } else {
            // Not yet selected → add to group
            dispatch({
              type:        "SELECT_NODE",
              payload:     { nodeId: toggleId, addToSelection: true },
              description: "Add to selection",
            });
          }
          return; // Consume the event — no drag initiated on toggle
        }
        // Ctrl+Click on empty space → clear selection + rubber band
        clearSelection();
        const masterFrame2 = canvasFrameRef.current;
        if (masterFrame2) {
          const r2 = masterFrame2.getBoundingClientRect();
          setRubberBanding({
            startPoint:   { x: Math.round((e.clientX - r2.left) / zoom), y: Math.round((e.clientY - r2.top) / zoom) },
            currentPoint: { x: Math.round((e.clientX - r2.left) / zoom), y: Math.round((e.clientY - r2.top) / zoom) },
          });
        }
        return;
      }

      // ── PRIORITY 3: Alt-cycle selection ──────────────────────────────────
      let nodeEl = target.closest("[data-node-id]") as HTMLElement | null;

      if (e.altKey && nodeEl && canvasFrameRef.current) {
        const elements = document.elementsFromPoint(e.clientX, e.clientY);
        const hitNodeIds = elements
          .map((el) => el.getAttribute("data-node-id"))
          .filter((id): id is string => id !== null && id !== rootNodeId);

        if (hitNodeIds.length > 0) {
          const currentSelectedIndex = hitNodeIds.findIndex((id) => selectedNodeIds.includes(id));
          if (currentSelectedIndex !== -1) {
            const nextIndex = (currentSelectedIndex + 1) % hitNodeIds.length;
            const nextId    = hitNodeIds[nextIndex];
            const nextEl    = canvasFrameRef.current.querySelector(`[data-node-id="${nextId}"]`) as HTMLElement;
            if (nextEl) nodeEl = nextEl;
          }
        }
      }

      // ── PRIORITY 4: Single-node selection & drag ──────────────────────────
      if (nodeEl) {
        const id   = nodeEl.getAttribute("data-node-id");
        if (id && id !== rootNodeId) {
          const node    = nodes[id];
          const frameEl = activeFrameRef?.current ?? canvasFrameRef.current;

          // For single-selection: check if clicked node itself is already selected.
          const isAlreadySelected = selectedNodeIds.includes(id);

          if (!isAlreadySelected) {
            if (node?.locked) return;
            dispatch({
              type:        "SELECT_NODE",
              payload:     { nodeId: id, addToSelection: e.shiftKey },
              description: "Select",
            });
          }

          // Sections can only be selected, not free-dragged
          if (node?.type === "Section") {
            if (canvasFrameRef.current) {
              const rect = canvasFrameRef.current.getBoundingClientRect();
              setRubberBanding({
                startPoint:   { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom },
                currentPoint: { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom },
              });
            }
            return;
          }

          // Check if the node is locked
          if (node?.locked) return;

          // Nodes to move:
          //  - If this node is already part of the single selection → move the selection
          //  - If shift held → append to selection and move all
          //  - Otherwise → move just this node
          const movingNodeIds = isAlreadySelected || e.shiftKey
            ? (isAlreadySelected ? selectedNodeIds : [...selectedNodeIds, id])
            : [id];

          // Filter out locked nodes from the move operation
          const unlockedMovingNodeIds = movingNodeIds.filter(nid => !nodes[nid]?.locked);
          if (unlockedMovingNodeIds.length === 0) return; // All nodes to move are locked

          const frameRect = frameEl?.getBoundingClientRect();
          const movingNodes: NodeMovingSnapshot[] = frameEl
            ? buildMovingSnapshots(unlockedMovingNodeIds, nodes, frameEl, frameRect ?? null, zoom)
            : unlockedMovingNodeIds.map((nodeId) => ({
                nodeId,
                startLeft: 0,
                startTop: 0,
                wasAbsolute: nodes[nodeId]?.style.position === "absolute",
              }));

          const anchorId = isAlreadySelected ? (selectedNodeIds[0] ?? id) : id;
          dragStartedRef.current = false;
          setMoving({
            nodeId:         anchorId,
            nodes:          movingNodes,
            startPoint:     { x: e.clientX, y: e.clientY },
            gestureGroupId: uuidv4(),
          });
          return;
        }
      }

      // ── FALLBACK: Clear selection + start rubber-band ─────────────────────
      if (!e.shiftKey) {
        clearSelection();
      }

      const masterFrame = canvasFrameRef.current;
      if (masterFrame) {
        const rect = masterFrame.getBoundingClientRect();
        const pt = {
          x: Math.round((e.clientX - rect.left) / zoom),
          y: Math.round((e.clientY - rect.top)  / zoom),
        };
        setRubberBanding({ startPoint: pt, currentPoint: pt });
      }
    },
    [
      activeTool,
      dispatch,
      clearSelection,
      zoom,
      nodes,
      rootNodeId,
      canvasFrameRef,
      activeFrameRef,
      dragStartedRef,
      setMoving,
      setRubberBanding,
      selectedNodeIds,
    ]
  );

  return { handlePointerDown };
}

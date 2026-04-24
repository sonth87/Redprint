/**
 * AbsoluteDragStrategy — handles drag for position:absolute nodes (catch-all).
 * Provides snap guides, alignment guides, section reparenting, and live position updates.
 *
 * canHandle: always true — registered last so it catches everything FlowDragStrategy
 * does not handle (multi-select, absolute-positioned nodes, nodes without a flow parent).
 *
 * Migrated from useMoveGesture.ts absolute-mode branch (lines 330–501, 540–589).
 */

import type { Rect } from "@ui-builder/shared";
import type { BuilderNode } from "@ui-builder/builder-core";
import {
  getDropTargetSection,
  resolveContainerLayoutType,
} from "../../hooks/dragUtils";
import {
  resolveContainerDropPosition,
  findHoveredFlowContainer,
  computeFlowInsertIndex,
} from "../DropTargetResolver";
import type { DragStrategy, DragContext, DragVisualState } from "../types";
import { EMPTY_VISUAL_STATE } from "../types";

export class AbsoluteDragStrategy implements DragStrategy {
  readonly name = "AbsoluteDragStrategy";

  private canvasOffset = { x: 0, y: 0 };
  private _started = false;
  private lastReorderIndex: number | null = null;

  canHandle(_ctx: DragContext): boolean {
    return true; // catch-all
  }

  onMove(ctx: DragContext, e: MouseEvent): DragVisualState {
    const isMultiSelect = ctx.movingNodeIds.length > 1;
    const node = ctx.nodes[ctx.nodeId];
    const primarySnapshot = ctx.movingSnapshots.find((n) => n.nodeId === ctx.nodeId);
    if (!primarySnapshot) return EMPTY_VISUAL_STATE;

    const frameEl = ctx.frameEl;
    const fr = frameEl.getBoundingClientRect();
    const dx = e.clientX - ctx.startPoint.x;
    const dy = e.clientY - ctx.startPoint.y;
    const isFirstMove = !this._started;
    this._started = true;

    // First-move: capture canvas offset for correct snap coordinate math
    if (isFirstMove) {
      const nodeEl = frameEl.querySelector(
        `[data-node-id="${ctx.nodeId}"]`,
      ) as HTMLElement | null;
      if (nodeEl) {
        const er = nodeEl.getBoundingClientRect();
        const trueCanvasX = (er.left - fr.left) / ctx.zoom;
        const trueCanvasY = (er.top - fr.top) / ctx.zoom;
        this.canvasOffset = {
          x: trueCanvasX - primarySnapshot.startLeft,
          y: trueCanvasY - primarySnapshot.startTop,
        };
        nodeEl.dataset.dragOriginalTransform = nodeEl.style.transform || "";
      } else {
        this.canvasOffset = { x: 0, y: 0 };
      }
    }

    // ── Flow-drop target for absolute nodes hovering over flow containers ──
    let flowDropTarget: DragVisualState["flowDropTarget"] = null;
    if (!isMultiSelect && node) {
      const targetFlowId = findHoveredFlowContainer(
        e.clientX, e.clientY,
        ctx.nodeId, ctx.nodeType,
        node.parentId ?? null,
        ctx.nodes, ctx.getContainerConfig,
      );
      if (targetFlowId) {
        const fr2 = fr;
        const containerSiblings = Object.values(ctx.nodes).filter(
          (n) => n.parentId === targetFlowId && n.id !== ctx.nodeId,
        );
        const targetContainerNode = ctx.nodes[targetFlowId];
        const targetContainerEl = frameEl.querySelector(
          `[data-node-id="${targetFlowId}"]`,
        ) as HTMLElement | null;
        let tentativeIndex = containerSiblings.length;
        let gridCell: { col: number; row: number } | undefined;
        if (targetContainerNode && targetContainerEl) {
          const result = resolveContainerDropPosition(
            e.clientX, e.clientY,
            targetContainerEl, targetContainerNode, containerSiblings,
            ctx.getContainerConfig,
          );
          tentativeIndex = result.insertIndex;
          gridCell = result.gridCell;
        } else {
          tentativeIndex = computeFlowInsertIndex(
            (e.clientY - fr2.top) / ctx.zoom,
            containerSiblings, frameEl, fr2, ctx.zoom,
          );
        }
        flowDropTarget = { containerId: targetFlowId, insertIndex: tentativeIndex, gridCell };
        this.lastReorderIndex = tentativeIndex;
      } else {
        flowDropTarget = null;
      }
    }

    const rawLeft = primarySnapshot.startLeft + dx / ctx.zoom;
    const rawTop = primarySnapshot.startTop + dy / ctx.zoom;
    let finalLeft = Math.round(rawLeft);
    let finalTop = Math.round(rawTop);
    let snapGuides: DragVisualState["snapGuides"] = [];
    let distanceGuides: DragVisualState["distanceGuides"] = [];
    let liveDimensions: DragVisualState["liveDimensions"] = null;
    let highlightedNodeIds: string[] = [];

    // ── Snap + alignment guides (single select only) ───────────────────────
    if (ctx.snapEnabled && ctx.canvasFrameRef.current && !isMultiSelect) {
      const nodeEl = frameEl.querySelector(
        `[data-node-id="${ctx.nodeId}"]`,
      ) as HTMLElement | null;
      if (nodeEl) {
        const w = nodeEl.offsetWidth;
        const h = nodeEl.offsetHeight;
        // Use desktop frame (canvasFrameRef) as canvas-space origin for dual-frame math
        const originRect = ctx.canvasFrameRef.current.getBoundingClientRect();
        const frameOffsetX = (fr.left - originRect.left) / ctx.zoom;
        const frameOffsetY = (fr.top - originRect.top) / ctx.zoom;
        const rawCanvasX = rawLeft + this.canvasOffset.x + frameOffsetX;
        const rawCanvasY = rawTop + this.canvasOffset.y + frameOffsetY;
        const movingRectInCanvas: Rect = { x: rawCanvasX, y: rawCanvasY, width: w, height: h };

        // Sibling rects for snap
        const snapSiblings: Rect[] = [];
        if (node?.parentId) {
          for (const n of Object.values(ctx.nodes) as BuilderNode[]) {
            if (n.parentId === node.parentId && n.id !== ctx.nodeId) {
              const el = frameEl.querySelector(`[data-node-id="${n.id}"]`) as HTMLElement | null;
              if (el) {
                const er = el.getBoundingClientRect();
                snapSiblings.push({
                  x: (er.left - originRect.left) / ctx.zoom,
                  y: (er.top - originRect.top) / ctx.zoom,
                  width: er.width / ctx.zoom,
                  height: er.height / ctx.zoom,
                });
              }
            }
          }
        }

        const snapResult = ctx.snapEngine.snap(movingRectInCanvas, snapSiblings);
        snapGuides = snapResult.guides;
        finalLeft = Math.round(snapResult.snappedPoint.x - this.canvasOffset.x - frameOffsetX);
        finalTop = Math.round(snapResult.snappedPoint.y - this.canvasOffset.y - frameOffsetY);
        const snappedRect: Rect = { x: snapResult.snappedPoint.x, y: snapResult.snappedPoint.y, width: w, height: h };

        // Alignment guide candidates — ancestors excluded, scope to same section
        const ancestorIds = new Set<string>();
        let ancestorCursor: string | null | undefined = node?.parentId;
        while (ancestorCursor) {
          ancestorIds.add(ancestorCursor);
          ancestorCursor = ctx.nodes[ancestorCursor]?.parentId;
        }

        let sectionSearchRoot: HTMLElement = frameEl;
        if (ctx.rootNodeId) {
          let cursor: string | null | undefined = ctx.nodeId;
          while (cursor && cursor !== ctx.rootNodeId) {
            const cursorNode: BuilderNode | undefined = ctx.nodes[cursor];
            if (cursorNode?.parentId === ctx.rootNodeId) {
              const sectionEl = frameEl.querySelector(
                `[data-node-id="${cursor}"]`,
              ) as HTMLElement | null;
              if (sectionEl) sectionSearchRoot = sectionEl;
              break;
            }
            cursor = cursorNode?.parentId;
          }
        }

        const allOtherRects: Rect[] = [];
        const allOtherIds: string[] = [];
        const allNodeEls = Array.from(
          sectionSearchRoot.querySelectorAll("[data-node-id]"),
        ) as HTMLElement[];
        for (const el of allNodeEls) {
          const elId = el.getAttribute("data-node-id");
          if (!elId || elId === ctx.nodeId || ancestorIds.has(elId)) continue;
          const er = el.getBoundingClientRect();
          allOtherRects.push({
            x: (er.left - originRect.left) / ctx.zoom,
            y: (er.top - originRect.top) / ctx.zoom,
            width: er.width / ctx.zoom,
            height: er.height / ctx.zoom,
          });
          allOtherIds.push(elId);
        }

        const crossGuides = ctx.snapEngine.alignmentGuides(snappedRect, allOtherRects);
        snapGuides = [...snapGuides, ...crossGuides];

        const EPS = 1;
        for (let i = 0; i < allOtherRects.length; i++) {
          const other = allOtherRects[i]!;
          const oRight = other.x + other.width;
          const oCX = other.x + other.width / 2;
          const oBottom = other.y + other.height;
          const oCY = other.y + other.height / 2;
          for (const guide of crossGuides) {
            if (guide.source === "canvas-edge" || guide.source === "canvas-center") continue;
            const pos = guide.position;
            const matched =
              guide.type === "vertical"
                ? Math.abs(other.x - pos) < EPS ||
                  Math.abs(oRight - pos) < EPS ||
                  Math.abs(oCX - pos) < EPS
                : Math.abs(other.y - pos) < EPS ||
                  Math.abs(oBottom - pos) < EPS ||
                  Math.abs(oCY - pos) < EPS;
            if (matched) { highlightedNodeIds.push(allOtherIds[i]!); break; }
          }
        }

        distanceGuides = ctx.snapEngine.distanceGuides(snappedRect, snapSiblings);
        liveDimensions = { width: w, height: h };
      }
    }

    // ── Dispatch live position updates ──────────────────────────────────────
    const snapDeltaX = finalLeft - rawLeft;
    const snapDeltaY = finalTop - rawTop;

    for (const mNode of ctx.movingSnapshots) {
      const styleUpdate: Record<string, string | number> = {
        position: "absolute",
        left: `${Math.round(mNode.startLeft + dx / ctx.zoom + snapDeltaX)}px`,
        top: `${Math.round(mNode.startTop + dy / ctx.zoom + snapDeltaY)}px`,
      };
      if (isFirstMove && !mNode.wasAbsolute && mNode.startWidth != null && mNode.startHeight != null) {
        styleUpdate.width = `${mNode.startWidth}px`;
        styleUpdate.height = `${mNode.startHeight}px`;
      }
      ctx.dispatch({
        type: "UPDATE_STYLE",
        payload: { nodeId: mNode.nodeId, style: styleUpdate, breakpoint: ctx.breakpoint },
        groupId: ctx.gestureGroupId,
        description: isMultiSelect ? "Move multiple" : "Move",
      });
    }

    return { snapGuides, distanceGuides, flowDropTarget, flowDragOffset: null, highlightedNodeIds, liveDimensions };
  }

  onDrop(ctx: DragContext, e: MouseEvent, lastVisualState: DragVisualState): void {
    const isMultiSelect = ctx.movingNodeIds.length > 1;
    if (!this._started) return;

    const frameEl = ctx.frameEl;
    const primaryNode = ctx.nodes[ctx.nodeId];

    if (lastVisualState.flowDropTarget !== null && !isMultiSelect) {
      // Dropped into a flow container — same as FlowDragStrategy.onDrop
      const { containerId, insertIndex } = lastVisualState.flowDropTarget;
      ctx.dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: ctx.nodeId,
          style: { position: undefined, left: undefined, top: undefined } as Record<string, unknown>,
          breakpoint: ctx.breakpoint,
        },
        description: "Clear position on flow drop",
      });
      if (primaryNode?.parentId !== containerId) {
        ctx.dispatch({
          type: "MOVE_NODE",
          payload: { nodeId: ctx.nodeId, targetParentId: containerId, position: "inside" },
          description: "Drop into flow container",
        });
      }
      ctx.dispatch({
        type: "REORDER_NODE",
        payload: { nodeId: ctx.nodeId, insertIndex },
        description: "Reorder in flow container",
      });
    } else if (ctx.rootNodeId && !isMultiSelect) {
      // Section reparenting geometric check
      let sectionHitY = e.clientY;
      // movingSnapshots carry fromToolbar info implicitly — check if node came from toolbar
      // (In the new architecture this is carried via ctx; for now we rely on mouse Y position)
      const dropSectionId = getDropTargetSection(sectionHitY, frameEl, ctx.nodes, ctx.rootNodeId);

      if (
        dropSectionId &&
        dropSectionId !== primaryNode?.parentId &&
        dropSectionId !== ctx.rootNodeId
      ) {
        const nodeEl = frameEl.querySelector(
          `[data-node-id="${ctx.nodeId}"]`,
        ) as HTMLElement | null;
        const sectionEl = frameEl.querySelector(
          `[data-node-id="${dropSectionId}"]`,
        ) as HTMLElement | null;

        if (nodeEl && sectionEl) {
          const fr = frameEl.getBoundingClientRect();
          const nodeRect = nodeEl.getBoundingClientRect();
          const sectionRect = sectionEl.getBoundingClientRect();

          const newLeft = (nodeRect.left - sectionRect.left) / ctx.zoom;
          const newTop = (nodeRect.top - sectionRect.top) / ctx.zoom;

          ctx.dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId: ctx.nodeId,
              style: { left: `${Math.round(newLeft)}px`, top: `${Math.round(newTop)}px` },
              breakpoint: ctx.breakpoint,
            },
          });
          ctx.dispatch({
            type: "MOVE_NODE",
            payload: { nodeId: ctx.nodeId, targetParentId: dropSectionId, position: "inside" },
            description: "Change Section",
          });
          const siblings = Object.values(ctx.nodes).filter((n) => n.parentId === dropSectionId);
          ctx.dispatch({
            type: "REORDER_NODE",
            payload: { nodeId: ctx.nodeId, insertIndex: siblings.length },
            description: "Bring to front",
          });
        }
      } else if (this.lastReorderIndex !== null) {
        const p = primaryNode?.parentId ? ctx.nodes[primaryNode.parentId] : null;
        if (resolveContainerLayoutType(p, ctx.getContainerConfig) !== "absolute") {
          ctx.dispatch({
            type: "REORDER_NODE",
            payload: { nodeId: ctx.nodeId, insertIndex: this.lastReorderIndex },
            description: "Reorder",
          });
        }
      }
    }

    this._reset();
  }

  onCancel(ctx: DragContext): void {
    // Restore original transform on affected node elements
    for (const mNode of ctx.movingSnapshots) {
      const nodeEl = ctx.frameEl.querySelector(
        `[data-node-id="${mNode.nodeId}"]`,
      ) as HTMLElement | null;
      if (nodeEl && nodeEl.dataset.dragOriginalTransform !== undefined) {
        nodeEl.style.transform = nodeEl.dataset.dragOriginalTransform;
        delete nodeEl.dataset.dragOriginalTransform;
      }
    }
    this._reset();
  }

  private _reset(): void {
    this._started = false;
    this.lastReorderIndex = null;
    this.canvasOffset = { x: 0, y: 0 };
  }
}

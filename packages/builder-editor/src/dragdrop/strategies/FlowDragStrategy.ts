/**
 * FlowDragStrategy — handles drag for nodes inside flex/grid (flow) containers.
 * Provides a floating preview clone and reorder-on-drop semantics.
 *
 * canHandle: single selection only, node must be a static child in a flex/grid parent.
 * Migrated from useMoveGesture.ts flow-mode branch (lines 247–328, 523–539).
 */

import { shouldUseFlowDrag, getDropTargetSection } from "../../hooks/dragUtils";
import {
  resolveContainerDropPosition,
  findHoveredFlowContainer,
} from "../DropTargetResolver";
import type { DragStrategy, DragContext, DragVisualState } from "../types";
import { EMPTY_VISUAL_STATE } from "../types";

export class FlowDragStrategy implements DragStrategy {
  readonly name = "FlowDragStrategy";

  private previewEl: HTMLElement | null = null;
  private lastReorderIndex: number | null = null;

  canHandle(ctx: DragContext): boolean {
    if (ctx.movingNodeIds.length !== 1) return false;
    const node = ctx.nodes[ctx.nodeId];
    if (!node) return false;
    return shouldUseFlowDrag(node, ctx.nodes, ctx.getContainerConfig);
  }

  attachPreview(ctx: DragContext, e: MouseEvent): void {
    const frameEl = ctx.frameEl;
    const fr = frameEl.getBoundingClientRect();
    const flowNodeEl = frameEl.querySelector(
      `[data-node-id="${ctx.nodeId}"]`,
    ) as HTMLElement | null;
    if (!flowNodeEl) return;

    const dragPreview = flowNodeEl.cloneNode(true) as HTMLElement;
    dragPreview.removeAttribute("data-node-id");
    dragPreview.querySelectorAll("[data-node-id]").forEach((el) =>
      el.removeAttribute("data-node-id"),
    );
    const er = flowNodeEl.getBoundingClientRect();
    const initialLeft = (er.left - fr.left) / ctx.zoom;
    const initialTop = (er.top - fr.top) / ctx.zoom;

    dragPreview.dataset.flowDragPreview = "true";
    dragPreview.style.position = "absolute";
    dragPreview.style.left = `${initialLeft}px`;
    dragPreview.style.top = `${initialTop}px`;
    dragPreview.style.width = `${er.width / ctx.zoom}px`;
    dragPreview.style.height = `${er.height / ctx.zoom}px`;
    dragPreview.style.margin = "0";
    dragPreview.style.pointerEvents = "none";
    dragPreview.style.zIndex = "9999";
    dragPreview.style.opacity = "0.9";
    dragPreview.style.visibility = "visible";
    dragPreview.style.transform = "translate(0px, 0px)";
    dragPreview.style.transition = "none";
    frameEl.appendChild(dragPreview);
    this.previewEl = dragPreview;

    flowNodeEl.style.setProperty("visibility", "hidden");
    flowNodeEl.style.setProperty("pointer-events", "none");
  }

  onMove(ctx: DragContext, e: MouseEvent): DragVisualState {
    const node = ctx.nodes[ctx.nodeId];
    if (!node?.parentId) return EMPTY_VISUAL_STATE;

    const tx = (e.clientX - ctx.startPoint.x) / ctx.zoom;
    const ty = (e.clientY - ctx.startPoint.y) / ctx.zoom;

    if (this.previewEl) {
      this.previewEl.style.transform = `translate(${tx}px, ${ty}px)`;
    }

    const hoveredFlowId = findHoveredFlowContainer(
      e.clientX,
      e.clientY,
      ctx.nodeId,
      ctx.nodeType,
      node.parentId,
      ctx.nodes,
      ctx.getContainerConfig,
    );

    // If no flow container found, check if cursor has left the current parent's bounds.
    // If so, show no flow overlay (will fall back to section reparenting on drop).
    if (!hoveredFlowId) {
      const parentEl = ctx.frameEl.querySelector(
        `[data-node-id="${node.parentId}"]`,
      ) as HTMLElement | null;
      const parentRect = parentEl?.getBoundingClientRect();
      const cursorInsideParent = parentRect &&
        e.clientX >= parentRect.left && e.clientX <= parentRect.right &&
        e.clientY >= parentRect.top  && e.clientY <= parentRect.bottom;

      if (!cursorInsideParent) {
        // Cursor is outside the current flow container — no flow drop target
        this.lastReorderIndex = null;
        return { ...EMPTY_VISUAL_STATE, flowDragOffset: { x: tx, y: ty } };
      }
    }

    // Either found a new flow container, or cursor is still inside current parent
    const targetContainerId = hoveredFlowId ?? node.parentId;
    const targetContainerNode = ctx.nodes[targetContainerId];
    const targetContainerEl = ctx.frameEl.querySelector(
      `[data-node-id="${targetContainerId}"]`,
    ) as HTMLElement | null;

    const siblings = Object.values(ctx.nodes).filter(
      (n) => n.parentId === targetContainerId && n.id !== ctx.nodeId,
    );

    if (targetContainerEl && targetContainerNode) {
      const result = resolveContainerDropPosition(
        e.clientX,
        e.clientY,
        targetContainerEl,
        targetContainerNode,
        siblings,
        ctx.getContainerConfig,
      );
      this.lastReorderIndex = result.insertIndex;
      return {
        ...EMPTY_VISUAL_STATE,
        flowDragOffset: { x: tx, y: ty },
        flowDropTarget: {
          containerId: targetContainerId,
          insertIndex: result.insertIndex,
          gridCell: result.gridCell,
        },
      };
    }

    this.lastReorderIndex = null;
    return {
      ...EMPTY_VISUAL_STATE,
      flowDragOffset: { x: tx, y: ty },
    };
  }

  onDrop(ctx: DragContext, e: MouseEvent, lastVisualState: DragVisualState): void {
    const { flowDropTarget } = lastVisualState;

    if (!flowDropTarget) {
      // ── Dropped outside any flow container ──────────────────────────────
      // Read preview position BEFORE _restoreOriginal() removes the clone.
      const previewRect = this.previewEl?.getBoundingClientRect() ?? null;

      this._restoreOriginal(ctx.frameEl, ctx.nodeId);

      if (!ctx.rootNodeId) return;
      const dropSectionId = getDropTargetSection(e.clientY, ctx.frameEl, ctx.nodes, ctx.rootNodeId);
      if (!dropSectionId || dropSectionId === ctx.rootNodeId) return;

      const sectionEl = ctx.frameEl.querySelector(`[data-node-id="${dropSectionId}"]`) as HTMLElement | null;
      if (!sectionEl) return;

      const sectionRect = sectionEl.getBoundingClientRect();
      const refLeft = previewRect ? previewRect.left : e.clientX;
      const refTop  = previewRect ? previewRect.top  : e.clientY;
      const newLeft = Math.round((refLeft - sectionRect.left) / ctx.zoom);
      const newTop  = Math.round((refTop  - sectionRect.top)  / ctx.zoom);

      ctx.dispatch({
        type: "UPDATE_STYLE",
        payload: {
          nodeId: ctx.nodeId,
          style: {
            position: "absolute",
            left: `${newLeft}px`,
            top: `${newTop}px`,
            gridColumn: undefined,
            gridRow: undefined,
          } as Record<string, unknown>,
          breakpoint: ctx.breakpoint,
        },
        description: "Move out of flow container",
      });
      const dropNode = ctx.nodes[ctx.nodeId];
      if (dropNode?.parentId !== dropSectionId) {
        ctx.dispatch({
          type: "MOVE_NODE",
          payload: { nodeId: ctx.nodeId, targetParentId: dropSectionId, position: "inside" },
          description: "Reparent to section",
        });
      }
      return;
    }

    // ── Dropped into a flow/grid container ────────────────────────────────
    this._restoreOriginal(ctx.frameEl, ctx.nodeId);

    const { containerId, insertIndex, gridCell } = flowDropTarget;
    const dropNode = ctx.nodes[ctx.nodeId];
    const targetContainerCfg = ctx.getContainerConfig(ctx.nodes[containerId] ?? containerId);
    const isGridTarget = targetContainerCfg?.layoutType === "grid";

    const styleUpdate: Record<string, unknown> = {
      position: undefined,
      left: undefined,
      top: undefined,
    };
    if (isGridTarget && gridCell) {
      styleUpdate.gridColumn = `${gridCell.col + 1}`;
      styleUpdate.gridRow = `${gridCell.row + 1}`;
      styleUpdate.maxWidth = "100%"; // prevent overflow from fixed widths breaking 1fr layout
    } else {
      styleUpdate.gridColumn = undefined;
      styleUpdate.gridRow = undefined;
    }

    ctx.dispatch({
      type: "UPDATE_STYLE",
      payload: { nodeId: ctx.nodeId, style: styleUpdate, breakpoint: ctx.breakpoint },
      description: "Clear position on flow drop",
    });

    if (dropNode?.parentId !== containerId) {
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
  }

  onCancel(ctx: DragContext): void {
    this._restoreOriginal(ctx.frameEl, ctx.nodeId);
    this.detachPreview();
  }

  detachPreview(): void {
    if (!this.previewEl) return;
    this.previewEl.remove();
    this.previewEl = null;
  }

  /** Restore visibility/pointer-events on the original node element. */
  private _restoreOriginal(frameEl: HTMLElement, nodeId: string): void {
    this.detachPreview();
    const origEl = frameEl.querySelector(
      `[data-node-id="${nodeId}"]`,
    ) as HTMLElement | null;
    if (origEl) {
      origEl.style.removeProperty("visibility");
      origEl.style.removeProperty("pointer-events");
    }
  }
}

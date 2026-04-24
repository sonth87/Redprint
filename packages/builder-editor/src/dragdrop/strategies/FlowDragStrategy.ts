/**
 * FlowDragStrategy — handles drag for nodes inside flex/grid (flow) containers.
 * Provides a floating preview clone and reorder-on-drop semantics.
 *
 * canHandle: single selection only, node must be a static child in a flex/grid parent.
 * Migrated from useMoveGesture.ts flow-mode branch (lines 247–328, 523–539).
 */

import { shouldUseFlowDrag } from "../../hooks/dragUtils";
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

  onDrop(ctx: DragContext, _e: MouseEvent, lastVisualState: DragVisualState): void {
    const { flowDropTarget } = lastVisualState;
    if (!flowDropTarget) return;

    const { containerId, insertIndex } = flowDropTarget;
    const dropNode = ctx.nodes[ctx.nodeId];

    ctx.dispatch({
      type: "UPDATE_STYLE",
      payload: {
        nodeId: ctx.nodeId,
        style: { position: undefined, left: undefined, top: undefined } as Record<string, unknown>,
        breakpoint: ctx.breakpoint,
      },
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

  onCancel(_ctx: DragContext): void {
    this.detachPreview();
  }

  detachPreview(): void {
    if (!this.previewEl) return;
    const nodeId = this.previewEl.closest("[data-node-id]")?.getAttribute("data-node-id");
    this.previewEl.remove();
    this.previewEl = null;
    // Restore visibility on original node (best-effort via parent frameEl)
    if (nodeId) {
      const origEl = globalThis.document?.querySelector(
        `[data-node-id="${nodeId}"]`,
      ) as HTMLElement | null;
      origEl?.style.removeProperty("visibility");
      origEl?.style.removeProperty("pointer-events");
    }
  }
}

import type { BuilderNode } from "@ui-builder/builder-core";

export interface NodeMovingSnapshot {
  nodeId: string;
  startLeft: number;
  startTop: number;
  startWidth?: number;
  startHeight?: number;
  wasAbsolute: boolean;
}

export interface ResolvedContainerConfig {
  layoutType?: string;
  disallowedChildTypes?: string[];
}

export type ContainerConfigResolver = (
  nodeOrType: BuilderNode | string,
) => ResolvedContainerConfig | undefined;

export function resolveContainerLayoutType(
  nodeOrType: BuilderNode | string | null | undefined,
  getContainerConfig?: ContainerConfigResolver,
): string {
  if (!nodeOrType || !getContainerConfig) return "absolute";
  return getContainerConfig(nodeOrType)?.layoutType ?? "absolute";
}

export function shouldUseFlowDrag(
  node: BuilderNode | null | undefined,
  nodes: Record<string, BuilderNode>,
  getContainerConfig?: ContainerConfigResolver,
): boolean {
  if (!node?.parentId) return false;
  if (node.style.position === "absolute") return false;

  const parentNode = nodes[node.parentId];
  return resolveContainerLayoutType(parentNode, getContainerConfig) !== "absolute";
}

/**
 * For statically-positioned children we must capture the rendered offset
 * relative to the containing block, because the first drag frame converts them
 * to `position:absolute`.
 */
export function buildMovingSnapshots(
  nodeIds: string[],
  nodes: Record<string, BuilderNode>,
  frameEl: HTMLElement,
  frameRect: DOMRect | null,
  zoom: number,
): NodeMovingSnapshot[] {
  return nodeIds.map((nodeId) => {
    const node = nodes[nodeId];
    const style = node?.style || {};
    const el = frameEl.querySelector(`[data-node-id="${nodeId}"]`) as HTMLElement | null;

    let startLeft = 0;
    let startTop = 0;

    if (style.position === "absolute") {
      startLeft = parseFloat(String(style.left ?? "0")) || 0;
      startTop = parseFloat(String(style.top ?? "0")) || 0;
    } else if (el) {
      startLeft = el.offsetLeft;
      startTop = el.offsetTop;

      if ((!Number.isFinite(startLeft) || !Number.isFinite(startTop)) && frameRect) {
        const elRect = el.getBoundingClientRect();
        startLeft = (elRect.left - frameRect.left) / zoom;
        startTop = (elRect.top - frameRect.top) / zoom;
      }
    }

    return {
      nodeId,
      startLeft,
      startTop,
      startWidth: el?.offsetWidth,
      startHeight: el?.offsetHeight,
      wasAbsolute: style.position === "absolute",
    };
  });
}

/**
 * Geometric hit test: find which section the pointer is hovering over,
 * or the closest section if Out Of Bounds.
 */
export function getDropTargetSection(
  clientY: number,
  frameEl: HTMLElement,
  nodes: Record<string, BuilderNode>,
  rootNodeId: string
): string {
  const sectionNodes = Object.values(nodes).filter(n => n.type === "Section" && n.parentId === rootNodeId);

  if (sectionNodes.length === 0) return rootNodeId;
  
  let closestSectionId: string | null = null;
  let minDistance = Infinity;

  for (const sn of sectionNodes) {
    const el = frameEl.querySelector(`[data-node-id="${sn.id}"]`) as HTMLElement | null;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    
    // Exact hit
    if (clientY >= rect.top && clientY <= rect.bottom) {
      return sn.id;
    }
    
    // Out of bounds distance tracking
    const distTarget = clientY < rect.top ? rect.top - clientY : clientY - rect.bottom;
    if (distTarget < minDistance) {
      minDistance = distTarget;
      closestSectionId = sn.id;
    }
  }

  return closestSectionId ?? rootNodeId;
}

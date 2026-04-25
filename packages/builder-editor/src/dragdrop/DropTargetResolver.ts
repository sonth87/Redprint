/**
 * DropTargetResolver — pure drop-position resolution for all container types.
 * No React state, no refs, no side effects.
 *
 * All logic migrated verbatim from:
 *   - useDropSlotResolver.ts:15–206 (track parsing, grid/flex resolvers)
 *   - useMoveGesture.ts:84–104 (computeFlowInsertIndex)
 *   - useMoveGesture.ts:111–177 (findHoveredFlowContainer)
 */

import type { BuilderNode } from "@ui-builder/builder-core";
import type { ContainerConfigResolver } from "../hooks/dragUtils";
import type { DropResolution } from "./types";

// ── Scale helper ──────────────────────────────────────────────────────────

function getElementScale(containerEl: HTMLElement): { scaleX: number; scaleY: number } {
  const rect = containerEl.getBoundingClientRect();
  const scaleX = containerEl.offsetWidth > 0 ? rect.width / containerEl.offsetWidth : 1;
  const scaleY = containerEl.offsetHeight > 0 ? rect.height / containerEl.offsetHeight : 1;
  return {
    scaleX: Number.isFinite(scaleX) && scaleX > 0 ? scaleX : 1,
    scaleY: Number.isFinite(scaleY) && scaleY > 0 ? scaleY : 1,
  };
}

// ── Grid track parser ─────────────────────────────────────────────────────

/**
 * Parse `getComputedStyle(el).gridTemplateColumns|Rows` into pixel sizes.
 * `getComputedStyle` resolves `fr` units to actual pixel values.
 * e.g. "200px 200px 200px"  →  [200, 200, 200]
 */
export function parseGridTracks(tracksString: string): number[] {
  if (!tracksString || tracksString === "none") return [];
  return tracksString
    .trim()
    .split(/\s+/)
    .map((s) => parseFloat(s))
    .filter((n) => !isNaN(n));
}

// ── Grid cell geometry ────────────────────────────────────────────────────

/**
 * Returns track edge objects (start, end in container-local pixels) for one axis.
 */
function buildTrackEdges(
  tracks: number[],
  gap: number,
  paddingStart: number,
): Array<{ start: number; end: number }> {
  const edges: Array<{ start: number; end: number }> = [];
  let pos = paddingStart;
  for (let i = 0; i < tracks.length; i++) {
    const size = tracks[i] ?? 0;
    edges.push({ start: pos, end: pos + size });
    pos += size + (i < tracks.length - 1 ? gap : 0);
  }
  return edges;
}

/**
 * Determine which track (cell) the cursor falls in.
 * Uses exact track bounds first; falls back to nearest track center so that
 * the cursor snaps correctly even when it is in a gap between tracks.
 */
function hitTestTrack(
  cursorRelative: number,
  edges: Array<{ start: number; end: number }>,
): number {
  // 1. Exact hit — cursor is inside a track's bounds
  for (let i = 0; i < edges.length; i++) {
    if (cursorRelative >= edges[i]!.start && cursorRelative <= edges[i]!.end) {
      return i;
    }
  }
  // 2. Cursor is in a gap or outside — pick the nearest track center
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < edges.length; i++) {
    const center = (edges[i]!.start + edges[i]!.end) / 2;
    const dist = Math.abs(cursorRelative - center);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

// ── Public: grid cell client-rect ────────────────────────────────────────

/**
 * Compute the **client-space** bounding box of a specific grid cell.
 * Returns null when grid layout info is unavailable.
 *
 * Call site converts to canvas-overlay coords using the standard formula:
 *   x = (clientLeft - fr.left) / zoom + panOffset.x / zoom
 */
export function getGridCellClientRect(
  containerEl: HTMLElement,
  col: number,
  row: number,
): { left: number; top: number; width: number; height: number } | null {
  const computed = getComputedStyle(containerEl);
  const { scaleX, scaleY } = getElementScale(containerEl);
  const colTracks = parseGridTracks(computed.gridTemplateColumns).map((track) => track * scaleX);
  if (colTracks.length === 0) return null;

  const rowTracksRaw = parseGridTracks(computed.gridTemplateRows).map((track) => track * scaleY);
  const containerRect = containerEl.getBoundingClientRect();
  const paddingLeft  = (parseFloat(computed.paddingLeft)  || 0) * scaleX;
  const paddingTop   = (parseFloat(computed.paddingTop)   || 0) * scaleY;
  const paddingBot   = (parseFloat(computed.paddingBottom)|| 0) * scaleY;
  const colGap = (parseFloat(computed.columnGap) || 0) * scaleX;
  const rowGap = (parseFloat(computed.rowGap)    || 0) * scaleY;

  const colEdges = buildTrackEdges(colTracks, colGap, paddingLeft);

  const innerH = containerRect.height - paddingTop - paddingBot;
  const rowTracks = rowTracksRaw.length > 0 ? rowTracksRaw : [innerH];
  const rowEdges = buildTrackEdges(rowTracks, rowGap, paddingTop);

  const safeCol = Math.max(0, Math.min(col, colEdges.length - 1));
  const safeRow = Math.max(0, Math.min(row, rowEdges.length - 1));
  const ce = colEdges[safeCol];
  const re = rowEdges[safeRow];
  if (!ce || !re) return null;

  return {
    left:   containerRect.left + ce.start,
    top:    containerRect.top  + re.start,
    width:  ce.end - ce.start,
    height: re.end - re.start,
  };
}

// ── Result type (backward compat) ─────────────────────────────────────────

export interface ContainerDropResult {
  /** Logical insert index among siblings */
  insertIndex: number;
  /**
   * For grid containers: the (col, row) pair of the targeted cell.
   * Absent for flex/flow containers.
   */
  gridCell?: { col: number; row: number };
}

// ── Grid drop resolution ──────────────────────────────────────────────────

function resolveGridDrop(
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
): ContainerDropResult {
  const computed = getComputedStyle(containerEl);
  const { scaleX, scaleY } = getElementScale(containerEl);
  const colTracks = parseGridTracks(computed.gridTemplateColumns).map((track) => track * scaleX);
  if (colTracks.length === 0) return { insertIndex: 0 };

  const numCols = colTracks.length;
  const rowTracksRaw = parseGridTracks(computed.gridTemplateRows).map((track) => track * scaleY);
  const containerRect = containerEl.getBoundingClientRect();
  const paddingLeft  = (parseFloat(computed.paddingLeft)  || 0) * scaleX;
  const paddingTop   = (parseFloat(computed.paddingTop)   || 0) * scaleY;
  const paddingBot   = (parseFloat(computed.paddingBottom)|| 0) * scaleY;
  const colGap = (parseFloat(computed.columnGap) || 0) * scaleX;
  const rowGap = (parseFloat(computed.rowGap)    || 0) * scaleY;

  const colEdges = buildTrackEdges(colTracks, colGap, paddingLeft);
  const innerH = containerRect.height - paddingTop - paddingBot;
  const rowTracks = rowTracksRaw.length > 0 ? rowTracksRaw : [Math.max(innerH, 40)];
  const rowEdges = buildTrackEdges(rowTracks, rowGap, paddingTop);

  const relX = clientX - containerRect.left;
  const relY = clientY - containerRect.top;

  const col = hitTestTrack(relX, colEdges);
  const row = hitTestTrack(relY, rowEdges);

  return {
    insertIndex: row * numCols + col,
    gridCell: { col, row },
  };
}

// ── Flex / flow drop resolution ───────────────────────────────────────────

function resolveFlexDrop(
  clientX: number,
  clientY: number,
  siblings: BuilderNode[],
  containerEl: HTMLElement,
): ContainerDropResult {
  const computed = getComputedStyle(containerEl);
  const flexDir = computed.flexDirection ?? "column";
  const isHorizontal = flexDir === "row" || flexDir === "row-reverse";

  const sorted = [...siblings].sort((a, b) => a.order - b.order);

  for (let i = 0; i < sorted.length; i++) {
    const sib = sorted[i]!;
    const sibEl = containerEl.querySelector(
      `[data-node-id="${sib.id}"]`,
    ) as HTMLElement | null;
    if (!sibEl) continue;
    const r = sibEl.getBoundingClientRect();
    if (isHorizontal) {
      if (clientX < r.left + r.width / 2) return { insertIndex: i };
    } else {
      if (clientY < r.top + r.height / 2) return { insertIndex: i };
    }
  }

  return { insertIndex: sorted.length };
}

// ── Flow insert index (canvas-space Y) ───────────────────────────────────

/**
 * Compute where to insert the dragged node among its siblings based on
 * the cursor's canvas-space Y coordinate.
 * Returns the insertIndex (0 = before first sibling).
 * Migrated verbatim from useMoveGesture.ts:84–104.
 */
export function computeFlowInsertIndex(
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

// ── Find hovered flow container ───────────────────────────────────────────

/**
 * Walk elements under the cursor and return the first node-id that belongs to
 * a flow/grid container which can legally accept the dragged component type.
 * Returns null when no valid flow container is found.
 * Migrated verbatim from useMoveGesture.ts:111–177.
 */
export function findHoveredFlowContainer(
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

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Resolve the drop position for any container type.
 * Returns null when no valid drop target exists under the cursor.
 *
 * - Grid       → 2-D cell index + gridCell metadata + indicator:"cell-highlight"
 * - Flex/Flow  → direction-aware 1-D midpoint index + indicator:"line"
 * - Absolute   → null (no flow-drop semantics)
 */
export function resolveDropTarget(
  clientX: number,
  clientY: number,
  draggingNodeId: string,
  draggingNodeType: string,
  currentParentId: string | null,
  frameEl: HTMLElement,
  nodes: Record<string, BuilderNode>,
  getContainerConfig: ContainerConfigResolver,
): DropResolution | null {
  const containerId = findHoveredFlowContainer(
    clientX, clientY,
    draggingNodeId, draggingNodeType,
    currentParentId,
    nodes, getContainerConfig,
  );
  if (!containerId) return null;

  const containerEl = frameEl.querySelector(`[data-node-id="${containerId}"]`) as HTMLElement | null;
  if (!containerEl) return null;

  const containerNode = nodes[containerId];
  if (!containerNode) return null;

  const cfg = getContainerConfig(containerNode);
  const layoutType = cfg?.layoutType ?? "absolute";

  if (layoutType === "grid") {
    const result = resolveGridDrop(clientX, clientY, containerEl);
    return {
      parentId: containerId,
      insertIndex: result.insertIndex,
      gridCell: result.gridCell,
      indicator: "cell-highlight",
    };
  }

  if (layoutType === "flex" || layoutType === "flow") {
    const siblings = Object.values(nodes).filter(
      (n) => n.parentId === containerId && n.id !== draggingNodeId,
    );
    const result = resolveFlexDrop(clientX, clientY, siblings, containerEl);
    return {
      parentId: containerId,
      insertIndex: result.insertIndex,
      indicator: "line",
    };
  }

  return null;
}

// ── Backward-compat export ────────────────────────────────────────────────

/**
 * Re-exported for backward compatibility.
 * Consumers (useDragHandlers, FlowDropPlaceholderLayer) can continue importing
 * from useDropSlotResolver without changes until Phase 5.
 */
export function resolveContainerDropPosition(
  clientX: number,
  clientY: number,
  containerEl: HTMLElement,
  containerNode: BuilderNode,
  siblings: BuilderNode[],
  getContainerConfig:
    | ((type: string) => { layoutType?: string } | undefined)
    | undefined,
): ContainerDropResult {
  const cfg = getContainerConfig?.(containerNode.type);
  const layoutType = cfg?.layoutType ?? "absolute";

  if (layoutType === "grid") {
    return resolveGridDrop(clientX, clientY, containerEl);
  }

  if (layoutType === "flex" || layoutType === "flow") {
    return resolveFlexDrop(clientX, clientY, siblings, containerEl);
  }

  // absolute or unknown — just append
  return { insertIndex: siblings.length };
}

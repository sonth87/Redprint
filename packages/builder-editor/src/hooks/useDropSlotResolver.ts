/**
 * useDropSlotResolver — general drop-target resolution for container components.
 *
 * Handles three container layout types automatically:
 *   - "grid"       → 2-D cell targeting using computed CSS grid tracks
 *   - "flex"/"flow"→ 1-D midpoint targeting, direction-aware (row vs column)
 *   - "absolute"   → no reordering, falls back to append
 *
 * No external registration needed. Any component whose containerConfig declares
 * layoutType inherits the correct drop behaviour automatically.
 */

import type { BuilderNode } from "@ui-builder/builder-core";

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
 * Determine which track index the cursor falls in, using midpoints so that the
 * cursor snaps to the nearest cell rather than requiring exact pixel accuracy.
 */
function hitTestTrack(
  cursorRelative: number,
  edges: Array<{ start: number; end: number }>,
): number {
  let best = edges.length - 1;
  for (let i = 0; i < edges.length; i++) {
    const mid = (edges[i]!.start + edges[i]!.end) / 2;
    if (cursorRelative <= mid) {
      best = i;
      break;
    }
  }
  return Math.max(0, Math.min(best, edges.length - 1));
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
  const colTracks = parseGridTracks(computed.gridTemplateColumns);
  if (colTracks.length === 0) return null;

  const rowTracksRaw = parseGridTracks(computed.gridTemplateRows);
  const containerRect = containerEl.getBoundingClientRect();
  const paddingLeft  = parseFloat(computed.paddingLeft)  || 0;
  const paddingTop   = parseFloat(computed.paddingTop)   || 0;
  const paddingBot   = parseFloat(computed.paddingBottom)|| 0;
  const colGap = parseFloat(computed.columnGap) || 0;
  const rowGap = parseFloat(computed.rowGap)    || 0;

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

// ── Result type ───────────────────────────────────────────────────────────

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
  const colTracks = parseGridTracks(computed.gridTemplateColumns);
  if (colTracks.length === 0) return { insertIndex: 0 };

  const numCols = colTracks.length;
  const rowTracksRaw = parseGridTracks(computed.gridTemplateRows);
  const containerRect = containerEl.getBoundingClientRect();
  const paddingLeft  = parseFloat(computed.paddingLeft)  || 0;
  const paddingTop   = parseFloat(computed.paddingTop)   || 0;
  const paddingBot   = parseFloat(computed.paddingBottom)|| 0;
  const colGap = parseFloat(computed.columnGap) || 0;
  const rowGap = parseFloat(computed.rowGap)    || 0;

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

// ── Main entry point ──────────────────────────────────────────────────────

/**
 * Resolve the drop position for any container type.
 *
 * - Grid       → 2-D cell index + gridCell metadata
 * - Flex/Flow  → direction-aware 1-D midpoint index
 * - Absolute   → append (no meaningful insert order)
 *
 * This is called from both the palette-drag path (useDragHandlers) and the
 * canvas-move path (useMoveGesture) — ensuring consistent behaviour everywhere.
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

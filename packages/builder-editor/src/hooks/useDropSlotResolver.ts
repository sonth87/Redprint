/**
 * useDropSlotResolver — re-export shim.
 * All logic has moved to dragdrop/DropTargetResolver.ts (Phase 1).
 * This file is kept so existing consumers (useMoveGesture, useDragHandlers,
 * FlowDropPlaceholderLayer) continue to work without import changes.
 */
export {
  parseGridTracks,
  getGridCellClientRect,
  resolveContainerDropPosition,
  type ContainerDropResult,
} from "../dragdrop/DropTargetResolver";

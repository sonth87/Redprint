/**
 * BuilderState and related editor/UI state types.
 */

import type { BuilderDocument } from "../document/types";
import type { Breakpoint } from "../responsive/types";
import type { Point, Rect } from "@ui-builder/shared";

// ── Editor tool ────────────────────────────────────────────────────────────

export type EditorTool = "select" | "pan" | "insert" | "comment";

// ── Drag & Drop ───────────────────────────────────────────────────────────

export type DropPosition = "before" | "after" | "inside" | "replace" | "slot";

export type DragSource =
  | { type: "existing-node"; nodeId: string }
  | { type: "new-component"; componentType: string };

export interface DropTarget {
  nodeId: string;
  position: DropPosition;
  slotName?: string;
  insertIndex?: number;
}

export interface DragOperation {
  source: DragSource;
  currentTarget: DropTarget | null;
  isValid: boolean;
  invalidReason?: string;
  startPosition: Point;
  currentPosition: Point;
  ghostOffset: Point;
}

// ── Resize ────────────────────────────────────────────────────────────────

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ResizeOperation {
  nodeId: string;
  handle: ResizeHandle;
  startBounds: Rect;
  startPoint: Point;
  currentPoint: Point;
  maintainAspectRatio: boolean;
  fromCenter: boolean;
}

// ── Clipboard ─────────────────────────────────────────────────────────────

export interface ClipboardData {
  nodeIds: string[];
  operation: "copy" | "cut";
  snapshot: Record<string, import("../document/types").BuilderNode>;
}

// ── Panel state ───────────────────────────────────────────────────────────

export interface PanelState {
  leftPanel: { visible: boolean; width: number; activeTab: string };
  rightPanel: { visible: boolean; width: number; activeTab: string };
  bottomPanel: { visible: boolean; height: number };
  topToolbar: { visible: boolean };
}

export interface QuickToolbarState {
  visible: boolean;
  targetNodeId: string | null;
  position: Point;
}

export interface Notification {
  id: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: number;
}

// ── UI state ──────────────────────────────────────────────────────────────

export interface UIState {
  panels: PanelState;
  quickToolbar: QuickToolbarState;
  notifications: Notification[];
}

// ── Editor state ──────────────────────────────────────────────────────────

export type CanvasMode = "single" | "dual";

export interface EditorState {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  activeBreakpoint: Breakpoint;
  activeTool: EditorTool;
  zoom: number;
  panOffset: Point;
  clipboard: ClipboardData | null;
  /** Display mode: single canvas (switching device) or dual side-by-side */
  canvasMode: CanvasMode;
  /**
   * When set, the editor is in inline text-edit mode for this node.
   * The ContextualToolbar is hidden and the TextEditToolbar + InlineTextEditor
   * are shown instead.
   */
  editingNodeId: string | null;
  /** The prop key being edited inline (defaults to the first richtext prop). */
  editingPropKey: string | null;
}

// ── Interaction state ─────────────────────────────────────────────────────

export interface InteractionState {
  dragOperation: DragOperation | null;
  resizeOperation: ResizeOperation | null;
  isMultiSelecting: boolean;
  multiSelectRect: Rect | null;
}

// ── BuilderState (root) ───────────────────────────────────────────────────

export interface BuilderState {
  document: BuilderDocument;
  editor: EditorState;
  interaction: InteractionState;
  ui: UIState;
}

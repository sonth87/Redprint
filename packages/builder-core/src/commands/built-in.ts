/**
 * All 18 built-in command type string constants.
 * Used as Command.type values — avoids magic strings.
 */

// Node lifecycle
export const CMD_ADD_NODE = "ADD_NODE" as const;
export const CMD_REMOVE_NODE = "REMOVE_NODE" as const;
export const CMD_REMOVE_NODES = "REMOVE_NODES" as const;
export const CMD_MOVE_NODE = "MOVE_NODE" as const;
export const CMD_REORDER_NODE = "REORDER_NODE" as const;
export const CMD_DUPLICATE_NODE = "DUPLICATE_NODE" as const;
export const CMD_DUPLICATE_NODES = "DUPLICATE_NODES" as const;

// Node state
export const CMD_UPDATE_PROPS = "UPDATE_PROPS" as const;
export const CMD_UPDATE_STYLE = "UPDATE_STYLE" as const;
export const CMD_UPDATE_RESPONSIVE_STYLE = "UPDATE_RESPONSIVE_STYLE" as const;
export const CMD_UPDATE_INTERACTIONS = "UPDATE_INTERACTIONS" as const;
export const CMD_RENAME_NODE = "RENAME_NODE" as const;
export const CMD_LOCK_NODE = "LOCK_NODE" as const;
export const CMD_UNLOCK_NODE = "UNLOCK_NODE" as const;
export const CMD_HIDE_NODE = "HIDE_NODE" as const;
export const CMD_SHOW_NODE = "SHOW_NODE" as const;

// Responsive
export const CMD_TOGGLE_RESPONSIVE_HIDDEN = "TOGGLE_RESPONSIVE_HIDDEN" as const;
export const CMD_UPDATE_RESPONSIVE_PROPS = "UPDATE_RESPONSIVE_PROPS" as const;
export const CMD_RESET_RESPONSIVE_STYLE = "RESET_RESPONSIVE_STYLE" as const;

// Group operations
export const CMD_GROUP_NODES = "GROUP_NODES" as const;
export const CMD_UNGROUP_NODES = "UNGROUP_NODES" as const;

// Document / canvas
export const CMD_SET_VARIABLE = "SET_VARIABLE" as const;
export const CMD_UPDATE_CANVAS_CONFIG = "UPDATE_CANVAS_CONFIG" as const;
export const CMD_LOAD_COMPONENT = "LOAD_COMPONENT" as const;

// Editor UI
export const CMD_SET_CANVAS_MODE = "SET_CANVAS_MODE" as const;

// Inline text editing (no undo/redo — pure UI state)
export const CMD_ENTER_TEXT_EDIT = "ENTER_TEXT_EDIT" as const;
export const CMD_EXIT_TEXT_EDIT  = "EXIT_TEXT_EDIT"  as const;

// ── Payload Types ─────────────────────────────────────────────────────────

import type { StyleConfig, CanvasConfig } from "../document/types";
import type { Breakpoint } from "../responsive/types";
import type { InteractionConfig } from "../document/interactions";
import type { Point } from "@ui-builder/shared";

export interface AddNodePayload {
  /** Optional pre-generated nodeId for predictable undo/redo */
  nodeId?: string;
  parentId: string;
  componentType: string;
  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  position?: Point;
  insertIndex?: number;
  /** Named slot to assign the new node to (for slot-based containers) */
  slotName?: string;
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  responsiveHidden?: Partial<Record<Breakpoint, boolean>>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
}

export interface RemoveNodePayload {
  nodeId: string;
}

export interface RemoveNodesPayload {
  nodeIds: string[];
}

export interface MoveNodePayload {
  nodeId: string;
  targetParentId: string;
  position: "before" | "after" | "inside" | "slot";
  insertIndex?: number;
  slotName?: string;
}

export interface ReorderNodePayload {
  nodeId: string;
  insertIndex: number;
}

export interface DuplicateNodePayload {
  nodeId: string;
  offset?: Point;
  /** Pre-generated ID for the duplicate root — enables undo */
  newNodeId?: string;
}

export interface DuplicateNodesPayload {
  nodeIds: string[];
  offset?: Point;
  /** Pre-generated IDs for the duplicate roots — enables undo */
  newNodeIds?: string[];
}

export interface UpdatePropsPayload {
  nodeId: string;
  props: Record<string, unknown>;
}

export interface UpdateStylePayload {
  nodeId: string;
  style: Partial<StyleConfig>;
  breakpoint?: Breakpoint;
}

export interface UpdateResponsiveStylePayload {
  nodeId: string;
  breakpoint: Breakpoint;
  style: Partial<StyleConfig>;
}

export interface UpdateInteractionsPayload {
  nodeId: string;
  interactions: InteractionConfig[];
}

export interface RenameNodePayload {
  nodeId: string;
  name: string;
}

export interface LockUnlockNodePayload {
  nodeId: string;
}

export interface GroupNodesPayload {
  nodeIds: string[];
  containerType?: string;
  /** Pre-generated group container ID — enables undo */
  groupId?: string;
}

export interface UngroupNodesPayload {
  nodeId: string;
}

export interface SetVariablePayload {
  key: string;
  value: unknown;
}

export interface UpdateCanvasConfigPayload {
  config: Partial<CanvasConfig>;
}

export interface LoadComponentPayload {
  manifestUrl: string;
  componentType: string;
}

export interface ToggleResponsiveHiddenPayload {
  nodeId: string;
  breakpoint: Breakpoint;
  /** true = hide on this breakpoint, false = show (remove override) */
  hidden: boolean;
}

export interface UpdateResponsivePropsPayload {
  nodeId: string;
  breakpoint: Breakpoint;
  props: Record<string, unknown>;
}

export interface ResetResponsiveStylePayload {
  nodeId: string;
  breakpoint: Breakpoint;
  /** CSS property keys to remove from the breakpoint override */
  keys: string[];
}

export interface SetCanvasModePayload {
  canvasMode: import("../state/types").CanvasMode;
}

export interface EnterTextEditPayload {
  nodeId: string;
  /** The prop key to edit inline. If omitted the engine picks the first richtext prop. */
  propKey?: string;
}

export interface ExitTextEditPayload {
  /** Optional — the final rich-text HTML to commit to the node's prop. */
  content?: string;
  /** Prop key that was being edited (required when content is provided). */
  propKey?: string;
  nodeId?: string;
}

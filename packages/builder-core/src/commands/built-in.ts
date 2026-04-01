/**
 * All 18 built-in command type string constants.
 * Used as Command.type values — avoids magic strings.
 */

// Node lifecycle
export const CMD_ADD_NODE = "ADD_NODE" as const;
export const CMD_REMOVE_NODE = "REMOVE_NODE" as const;
export const CMD_MOVE_NODE = "MOVE_NODE" as const;
export const CMD_REORDER_NODE = "REORDER_NODE" as const;
export const CMD_DUPLICATE_NODE = "DUPLICATE_NODE" as const;

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

// Group operations
export const CMD_GROUP_NODES = "GROUP_NODES" as const;
export const CMD_UNGROUP_NODES = "UNGROUP_NODES" as const;

// Document / canvas
export const CMD_SET_VARIABLE = "SET_VARIABLE" as const;
export const CMD_UPDATE_CANVAS_CONFIG = "UPDATE_CANVAS_CONFIG" as const;
export const CMD_LOAD_COMPONENT = "LOAD_COMPONENT" as const;

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
}

export interface RemoveNodePayload {
  nodeId: string;
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

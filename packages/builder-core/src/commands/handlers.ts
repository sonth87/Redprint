/**
 * Built-in command handler implementations.
 *
 * All handlers are pure functions: (state, payload) => newState.
 * They never mutate the input state.
 *
 * Register via registerAllHandlers(engine, registry).
 */

import { v4 as uuidv4 } from "uuid";
import type { ClipboardData } from "../state/types";
import type { BuilderNode, NodeMetadata, StyleConfig } from "../document/types";
import type { CommandEngine } from "./CommandEngine";
import type { ComponentRegistry } from "../registry/ComponentRegistry";
import type { EventBus } from "../events/EventBus";
import type { Breakpoint } from "../responsive/types";
import { DUPLICATE_OFFSET } from "../constants";
import {
  CMD_ADD_NODE,
  CMD_REMOVE_NODE,
  CMD_DUPLICATE_NODE,
  CMD_UPDATE_PROPS,
  CMD_UPDATE_STYLE,
  CMD_UPDATE_RESPONSIVE_STYLE,
  CMD_UPDATE_INTERACTIONS,
  CMD_RENAME_NODE,
  CMD_LOCK_NODE,
  CMD_UNLOCK_NODE,
  CMD_HIDE_NODE,
  CMD_SHOW_NODE,
  CMD_REORDER_NODE,
  CMD_MOVE_NODE,
  CMD_GROUP_NODES,
  CMD_UNGROUP_NODES,
  CMD_SET_VARIABLE,
  CMD_UPDATE_CANVAS_CONFIG,
  CMD_TOGGLE_RESPONSIVE_HIDDEN,
  CMD_UPDATE_RESPONSIVE_PROPS,
  CMD_RESET_RESPONSIVE_STYLE,
  CMD_SET_CANVAS_MODE,
  CMD_ENTER_TEXT_EDIT,
  CMD_EXIT_TEXT_EDIT,
  type AddNodePayload,
  type RemoveNodePayload,
  type DuplicateNodePayload,
  type UpdatePropsPayload,
  type UpdateStylePayload,
  type UpdateResponsiveStylePayload,
  type UpdateInteractionsPayload,
  type RenameNodePayload,
  type LockUnlockNodePayload,
  type ReorderNodePayload,
  type MoveNodePayload,
  type GroupNodesPayload,
  type UngroupNodesPayload,
  type SetVariablePayload,
  type UpdateCanvasConfigPayload,
  type ToggleResponsiveHiddenPayload,
  type UpdateResponsivePropsPayload,
  type ResetResponsiveStylePayload,
  type SetCanvasModePayload,
  type EnterTextEditPayload,
  type ExitTextEditPayload,
} from "./built-in";

// ── Editor-only command types (no undo/redo) ─────────────────────────────

export const CMD_SELECT_NODE = "SELECT_NODE" as const;
export const CMD_SELECT_NODES = "SELECT_NODES" as const;
export const CMD_DESELECT_NODE = "DESELECT_NODE" as const;
export const CMD_CLEAR_SELECTION = "CLEAR_SELECTION" as const;
export const CMD_SET_BREAKPOINT = "SET_BREAKPOINT" as const;
export const CMD_SET_CLIPBOARD = "SET_CLIPBOARD" as const;
export const CMD_COMPONENT_RENDER_ERROR = "COMPONENT_RENDER_ERROR" as const;

export interface SelectNodePayload {
  nodeId: string;
  addToSelection?: boolean;
}

export interface SelectNodesPayload {
  nodeIds: string[];
}

export interface DeselectNodePayload {
  nodeId: string;
}

export interface SetBreakpointPayload {
  breakpoint: Breakpoint;
}

// ── Helpers ───────────────────────────────────────────────────────────────

/**
 * Collect all descendant node IDs (not including the node itself).
 */
function collectDescendants(nodeId: string, nodes: Record<string, BuilderNode>): string[] {
  const result: string[] = [];
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const node of Object.values(nodes)) {
      if (node.parentId === current) {
        result.push(node.id);
        queue.push(node.id);
      }
    }
  }
  return result;
}

/**
 * Deep-clone a subtree, generating new UUIDs for each node.
 * Returns new nodes map and the new root node ID.
 */
function cloneSubtree(
  rootNodeId: string,
  nodes: Record<string, BuilderNode>,
  offset: { x: number; y: number } = DUPLICATE_OFFSET,
  overrideRootId?: string,
): { newNodes: Record<string, BuilderNode>; newRootId: string } {
  const now = new Date().toISOString();
  const idMap = new Map<string, string>();

  // Collect all nodes in order (BFS)
  const allIds = [rootNodeId, ...collectDescendants(rootNodeId, nodes)];
  for (const id of allIds) {
    idMap.set(id, id === rootNodeId && overrideRootId ? overrideRootId : uuidv4());
  }

  const newNodes: Record<string, BuilderNode> = {};
  for (const oldId of allIds) {
    const oldNode = nodes[oldId];
    if (!oldNode) continue;
    const newId = idMap.get(oldId)!;
    const newParentId = oldNode.parentId !== null ? (idMap.get(oldNode.parentId) ?? oldNode.parentId) : null;

    let style = { ...oldNode.style };
    // Offset the root node position
    if (oldId === rootNodeId && style.position === "absolute") {
      const left = parseFloat(String(style.left ?? "0")) || 0;
      const top = parseFloat(String(style.top ?? "0")) || 0;
      style = { ...style, left: `${left + offset.x}px`, top: `${top + offset.y}px` };
    }

    newNodes[newId] = {
      ...oldNode,
      id: newId,
      parentId: newParentId,
      style,
      responsiveStyle: { ...oldNode.responsiveStyle },
      interactions: [...oldNode.interactions],
      metadata: { ...oldNode.metadata, createdAt: now, updatedAt: now },
    };
  }

  return { newNodes, newRootId: idMap.get(rootNodeId)! };
}

// ── Main registration ─────────────────────────────────────────────────────

/**
 * Register all built-in command handlers + editor-only commands
 * on the provided CommandEngine.
 *
 * @param engine - The CommandEngine instance
 * @param registry - The ComponentRegistry (for defaultProps/defaultStyle lookup)
 */
export function registerAllHandlers(engine: CommandEngine, registry: ComponentRegistry, eventBus?: EventBus): void {
  const now = () => new Date().toISOString();
  // Explicitly typed return ensures TypeScript preserves required `createdAt`
  // and handles nodes where metadata may have been omitted.
  const updateMeta = (meta: NodeMetadata | undefined): NodeMetadata => {
    const ts = now();
    return { ...meta, createdAt: meta?.createdAt ?? ts, updatedAt: ts };
  };

  /**
   * Merge two style objects, removing keys whose value is `undefined`.
   * This ensures that undo correctly deletes properties that didn't exist
   * before the command (e.g. restoring a flow-positioned node after drag).
   */
  const mergeStyle = (
    base: Partial<StyleConfig>,
    override: Partial<StyleConfig>,
  ): Partial<StyleConfig> =>
    Object.fromEntries(
      Object.entries({ ...base, ...override }).filter(([, v]) => v !== undefined),
    ) as Partial<StyleConfig>;

  // ── ADD_NODE ────────────────────────────────────────────────────────────
  engine.registerHandler<AddNodePayload>(
    CMD_ADD_NODE,
    (state, payload) => {
      const def = registry.getComponent(payload.componentType);
      const nodeId = payload.nodeId ?? uuidv4();
      const timestamp = now();

      const siblings = Object.values(state.document.nodes).filter(
        (n) => n.parentId === payload.parentId,
      );
      const order =
        payload.insertIndex !== undefined ? payload.insertIndex : siblings.length;

      // Shift existing siblings to make room when inserting at a specific index
      const shiftedSiblings: Record<string, BuilderNode> = {};
      if (payload.insertIndex !== undefined) {
        for (const sib of siblings) {
          if (sib.order >= payload.insertIndex) {
            shiftedSiblings[sib.id] = { ...sib, order: sib.order + 1 };
          }
        }
      }

      const newNode: BuilderNode = {
        id: nodeId,
        type: payload.componentType,
        parentId: payload.parentId,
        order,
        props: { ...(def?.defaultProps ?? {}), ...(payload.props ?? {}) },
        style: { ...(def?.defaultStyle ?? {}), ...(payload.style ?? {}) },
        responsiveStyle: payload.responsiveStyle ?? {},
        interactions: [],
        hidden: false,
        locked: false,
        name: def?.name ?? payload.componentType,
        metadata: { createdAt: timestamp, updatedAt: timestamp },
        ...(payload.slotName ? { slot: payload.slotName } : {}),
        ...(payload.responsiveHidden ? { responsiveHidden: payload.responsiveHidden } : {}),
        ...(payload.responsiveProps ? { responsiveProps: payload.responsiveProps } : {}),
      };

      // Apply absolute positioning if position provided
      if (payload.position) {
        newNode.style = {
          ...newNode.style,
          position: "absolute",
          left: `${Math.round(payload.position.x)}px`,
          top: `${Math.round(payload.position.y)}px`,
        };
      }

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes: { ...state.document.nodes, ...shiftedSiblings, [nodeId]: newNode },
        },
        editor: { ...state.editor, selectedNodeIds: [nodeId] },
      };
    },
    // Inverse: remove the added node — returns undefined if nodeId was not pre-supplied
    (state, payload) => {
      if (!payload.nodeId) return undefined;
      return { type: CMD_REMOVE_NODE, payload: { nodeId: payload.nodeId } };
    },
  );

  // ── REMOVE_NODE ─────────────────────────────────────────────────────────
  engine.registerHandler<RemoveNodePayload>(
    CMD_REMOVE_NODE,
    (state, payload) => {
      const { nodeId } = payload;
      const toRemove = new Set([nodeId, ...collectDescendants(nodeId, state.document.nodes)]);

      const newNodes: Record<string, BuilderNode> = {};
      for (const [id, node] of Object.entries(state.document.nodes)) {
        if (!toRemove.has(id)) {
          newNodes[id] = node;
        }
      }

      const newSelectedIds = state.editor.selectedNodeIds.filter((id) => !toRemove.has(id));

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: newNodes,
        },
        editor: { ...state.editor, selectedNodeIds: newSelectedIds },
      };
    },
    // Inverse: re-add all removed nodes (captured from current state)
    (state, payload) => {
      const { nodeId } = payload;
      const toRemove = [nodeId, ...collectDescendants(nodeId, state.document.nodes)];
      const snapshot: Record<string, BuilderNode> = {};
      for (const id of toRemove) {
        if (state.document.nodes[id]) {
          snapshot[id] = state.document.nodes[id]!;
        }
      }
      return {
        type: "RESTORE_NODES",
        payload: { snapshot, selectNodeId: nodeId },
      };
    },
  );

  // ── RESTORE_NODES (internal inverse of REMOVE_NODE) ───────────────────
  engine.registerHandler<{ snapshot: Record<string, BuilderNode>; selectNodeId: string }>(
    "RESTORE_NODES",
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        nodes: { ...state.document.nodes, ...payload.snapshot },
      },
      editor: { ...state.editor, selectedNodeIds: [payload.selectNodeId] },
    }),
  );

  // ── DUPLICATE_NODE ──────────────────────────────────────────────────────
  engine.registerHandler<DuplicateNodePayload>(
    CMD_DUPLICATE_NODE,
    (state, payload) => {
      const { nodeId, offset = DUPLICATE_OFFSET, newNodeId } = payload;
      if (!state.document.nodes[nodeId]) return state;

      const { newNodes, newRootId } = cloneSubtree(nodeId, state.document.nodes, offset, newNodeId);

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: { ...state.document.nodes, ...newNodes },
        },
        editor: { ...state.editor, selectedNodeIds: [newRootId] },
      };
    },
    // Inverse: remove the duplicated subtree by its pre-generated root ID
    (_state, payload) => {
      if (!payload.newNodeId) return undefined;
      return { type: CMD_REMOVE_NODE, payload: { nodeId: payload.newNodeId } };
    },
  );

  // ── REORDER_NODE ────────────────────────────────────────────────────────
  engine.registerHandler<ReorderNodePayload>(
    CMD_REORDER_NODE,
    (state, payload) => {
      const { nodeId, insertIndex } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      // Get all siblings (same parent) sorted by current order
      const allSiblings = Object.values(state.document.nodes)
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order);

      // Remove the node from sorted list, then insert at target position
      const withoutNode = allSiblings.filter((n) => n.id !== nodeId);
      const targetIndex = Math.max(0, Math.min(insertIndex, withoutNode.length));
      withoutNode.splice(targetIndex, 0, node);

      // Reassign sequential order values (0, 1, 2, ...) to all siblings
      const newNodes = { ...state.document.nodes };
      withoutNode.forEach((n, i) => {
        newNodes[n.id] = { ...n, order: i };
      });

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: newNodes,
        },
      };
    },
    (state, payload) => {
      // Capture current position in sorted sibling list for undo
      const node = state.document.nodes[payload.nodeId];
      if (!node) return undefined;
      const siblings = Object.values(state.document.nodes)
        .filter((n) => n.parentId === node.parentId)
        .sort((a, b) => a.order - b.order);
      const currentIndex = siblings.findIndex((n) => n.id === payload.nodeId);
      return {
        type: CMD_REORDER_NODE,
        payload: { nodeId: payload.nodeId, insertIndex: currentIndex >= 0 ? currentIndex : (node.order ?? 0) },
      };
    },
  );

  // ── MOVE_NODE ───────────────────────────────────────────────────────────
  engine.registerHandler<MoveNodePayload>(
    CMD_MOVE_NODE,
    (state, payload) => {
      const { nodeId, targetParentId, insertIndex } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const siblings = Object.values(state.document.nodes).filter(
        (n) => n.parentId === targetParentId,
      );
      const order = insertIndex !== undefined ? insertIndex : siblings.length;
      const slotUpdate = payload.slotName !== undefined ? { slot: payload.slotName } : {};

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: { ...node, parentId: targetParentId, order, ...slotUpdate },
          },
        },
      };
    },
    (state, payload) => ({
      type: CMD_MOVE_NODE,
      payload: {
        nodeId: payload.nodeId,
        targetParentId: state.document.nodes[payload.nodeId]?.parentId ?? state.document.rootNodeId,
        position: "inside",
        insertIndex: state.document.nodes[payload.nodeId]?.order,
      },
    }),
  );

  // ── UPDATE_PROPS ────────────────────────────────────────────────────────
  engine.registerHandler<UpdatePropsPayload>(
    CMD_UPDATE_PROPS,
    (state, payload) => {
      const { nodeId, props } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              props: { ...node.props, ...props },
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      // Capture only the keys we're overwriting
      const oldProps: Record<string, unknown> = {};
      for (const key of Object.keys(payload.props)) {
        oldProps[key] = node?.props[key];
      }
      return {
        type: CMD_UPDATE_PROPS,
        payload: { nodeId: payload.nodeId, props: oldProps },
      };
    },
  );

  // ── UPDATE_STYLE ────────────────────────────────────────────────────────
  engine.registerHandler<UpdateStylePayload>(
    CMD_UPDATE_STYLE,
    (state, payload) => {
      const { nodeId, style, breakpoint } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const isBaseStyle = !breakpoint || breakpoint === "desktop";

      if (isBaseStyle) {
        return {
          ...state,
          document: {
            ...state.document,
            updatedAt: now(),
            nodes: {
              ...state.document.nodes,
              [nodeId]: {
                ...node,
                style: mergeStyle(node.style, style),
                metadata: updateMeta(node.metadata),
              },
            },
          },
        };
      }

      // Responsive override
      const currentResponsive = node.responsiveStyle[breakpoint] ?? {};
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              responsiveStyle: {
                ...node.responsiveStyle,
                [breakpoint]: mergeStyle(currentResponsive, style),
              },
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      const isBaseStyle = !payload.breakpoint || payload.breakpoint === "desktop";
      const oldStyle: Partial<StyleConfig> = {};

      for (const key of Object.keys(payload.style) as Array<keyof StyleConfig>) {
        if (isBaseStyle) {
          oldStyle[key] = node?.style[key] as never;
        } else {
          oldStyle[key] = (node?.responsiveStyle[payload.breakpoint!] ?? {})[key] as never;
        }
      }

      return {
        type: CMD_UPDATE_STYLE,
        payload: { nodeId: payload.nodeId, style: oldStyle, breakpoint: payload.breakpoint },
      };
    },
  );

  // ── UPDATE_RESPONSIVE_STYLE ─────────────────────────────────────────────
  engine.registerHandler<UpdateResponsiveStylePayload>(
    CMD_UPDATE_RESPONSIVE_STYLE,
    (state, payload) => {
      const { nodeId, breakpoint, style } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const currentResponsive = node.responsiveStyle[breakpoint] ?? {};
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              responsiveStyle: {
                ...node.responsiveStyle,
                [breakpoint]: mergeStyle(currentResponsive, style),
              },
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      const oldStyle = node?.responsiveStyle[payload.breakpoint] ?? {};
      return {
        type: CMD_UPDATE_RESPONSIVE_STYLE,
        payload: { nodeId: payload.nodeId, breakpoint: payload.breakpoint, style: oldStyle },
      };
    },
  );

  // ── UPDATE_INTERACTIONS ─────────────────────────────────────────────────
  engine.registerHandler<UpdateInteractionsPayload>(
    CMD_UPDATE_INTERACTIONS,
    (state, payload) => {
      const { nodeId, interactions } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              interactions,
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => ({
      type: CMD_UPDATE_INTERACTIONS,
      payload: {
        nodeId: payload.nodeId,
        interactions: state.document.nodes[payload.nodeId]?.interactions ?? [],
      },
    }),
  );

  // ── RENAME_NODE ─────────────────────────────────────────────────────────
  engine.registerHandler<RenameNodePayload>(
    CMD_RENAME_NODE,
    (state, payload) => {
      const { nodeId, name } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: { ...node, name, metadata: updateMeta(node.metadata) },
          },
        },
      };
    },
    (state, payload) => ({
      type: CMD_RENAME_NODE,
      payload: { nodeId: payload.nodeId, name: state.document.nodes[payload.nodeId]?.name ?? "" },
    }),
  );

  // ── LOCK_NODE / UNLOCK_NODE ─────────────────────────────────────────────
  engine.registerHandler<LockUnlockNodePayload>(
    CMD_LOCK_NODE,
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: { ...state.document.nodes, [payload.nodeId]: { ...node, locked: true } },
        },
      };
    },
    (_state, payload) => ({ type: CMD_UNLOCK_NODE, payload }),
  );

  engine.registerHandler<LockUnlockNodePayload>(
    CMD_UNLOCK_NODE,
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: { ...state.document.nodes, [payload.nodeId]: { ...node, locked: false } },
        },
      };
    },
    (_state, payload) => ({ type: CMD_LOCK_NODE, payload }),
  );

  // ── HIDE_NODE / SHOW_NODE ───────────────────────────────────────────────
  engine.registerHandler<LockUnlockNodePayload>(
    CMD_HIDE_NODE,
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: { ...state.document.nodes, [payload.nodeId]: { ...node, hidden: true } },
        },
      };
    },
    (_state, payload) => ({ type: CMD_SHOW_NODE, payload }),
  );

  engine.registerHandler<LockUnlockNodePayload>(
    CMD_SHOW_NODE,
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      if (!node) return state;
      return {
        ...state,
        document: {
          ...state.document,
          nodes: { ...state.document.nodes, [payload.nodeId]: { ...node, hidden: false } },
        },
      };
    },
    (_state, payload) => ({ type: CMD_HIDE_NODE, payload }),
  );

  // ── GROUP_NODES ─────────────────────────────────────────────────────────
  engine.registerHandler<GroupNodesPayload>(
    CMD_GROUP_NODES,
    (state, payload) => {
      const { nodeIds, containerType = "Container" } = payload;
      if (nodeIds.length === 0) return state;

      const firstNode = state.document.nodes[nodeIds[0]!];
      if (!firstNode) return state;

      // Use pre-generated groupId from payload for deterministic undo support
      const groupId = payload.groupId ?? uuidv4();
      const timestamp = now();
      const def = registry.getComponent(containerType);

      const groupNode: BuilderNode = {
        id: groupId,
        type: containerType,
        parentId: firstNode.parentId,
        order: firstNode.order,
        props: { ...(def?.defaultProps ?? {}) },
        style: { ...(def?.defaultStyle ?? {}), position: "absolute" },
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Group",
        metadata: { createdAt: timestamp, updatedAt: timestamp },
      };

      const newNodes = { ...state.document.nodes, [groupId]: groupNode };
      let childOrder = 0;
      for (const nodeId of nodeIds) {
        const node = newNodes[nodeId];
        if (node) {
          newNodes[nodeId] = { ...node, parentId: groupId, order: childOrder++ };
        }
      }

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes: newNodes,
        },
        editor: { ...state.editor, selectedNodeIds: [groupId] },
      };
    },
    // Inverse: restore child nodes to pre-group state and remove the group container
    (state, payload) => {
      if (!payload.groupId) return undefined;
      const snapshot: Record<string, BuilderNode> = {};
      for (const nodeId of payload.nodeIds) {
        if (state.document.nodes[nodeId]) {
          snapshot[nodeId] = state.document.nodes[nodeId]!;
        }
      }
      return {
        type: "UNGROUP_RESTORE",
        payload: { snapshot, groupId: payload.groupId, selectNodeIds: payload.nodeIds },
      };
    },
  );

  // ── UNGROUP_RESTORE (internal inverse of GROUP_NODES) ───────────────────
  engine.registerHandler<{ snapshot: Record<string, BuilderNode>; groupId: string; selectNodeIds: string[] }>(
    "UNGROUP_RESTORE",
    (state, payload) => {
      const newNodes = { ...state.document.nodes };
      delete newNodes[payload.groupId];
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: { ...newNodes, ...payload.snapshot },
        },
        editor: { ...state.editor, selectedNodeIds: payload.selectNodeIds },
      };
    },
  );

  // ── UNGROUP_NODES ───────────────────────────────────────────────────────
  engine.registerHandler<UngroupNodesPayload>(
    CMD_UNGROUP_NODES,
    (state, payload) => {
      const { nodeId } = payload;
      const groupNode = state.document.nodes[nodeId];
      if (!groupNode) return state;

      const children = Object.values(state.document.nodes).filter(
        (n) => n.parentId === nodeId,
      );

      const newNodes = { ...state.document.nodes };
      delete newNodes[nodeId];

      for (const child of children) {
        newNodes[child.id] = { ...child, parentId: groupNode.parentId };
      }

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: newNodes,
        },
        editor: { ...state.editor, selectedNodeIds: children.map((c) => c.id) },
      };
    },
    // Inverse: restore the group container + all children with their original parentIds
    (state, payload) => {
      const { nodeId } = payload;
      const groupNode = state.document.nodes[nodeId];
      if (!groupNode) return undefined;

      const children = Object.values(state.document.nodes).filter(
        (n) => n.parentId === nodeId,
      );

      const snapshot: Record<string, BuilderNode> = { [nodeId]: groupNode };
      for (const child of children) {
        snapshot[child.id] = child;
      }

      return {
        type: "RESTORE_NODES",
        payload: { snapshot, selectNodeId: nodeId },
      };
    },
  );

  // ── SET_VARIABLE ────────────────────────────────────────────────────────
  engine.registerHandler<SetVariablePayload>(
    CMD_SET_VARIABLE,
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        variables: {
          ...state.document.variables,
          [payload.key]: {
            key: payload.key,
            type: typeof payload.value === "string" ? "string"
              : typeof payload.value === "number" ? "number"
              : typeof payload.value === "boolean" ? "boolean"
              : Array.isArray(payload.value) ? "array"
              : "object",
            defaultValue: payload.value,
          },
        },
      },
    }),
    (state, payload) => ({
      type: CMD_SET_VARIABLE,
      payload: {
        key: payload.key,
        value: state.document.variables[payload.key]?.defaultValue,
      },
    }),
  );

  // ── UPDATE_CANVAS_CONFIG ────────────────────────────────────────────────
  engine.registerHandler<UpdateCanvasConfigPayload>(
    CMD_UPDATE_CANVAS_CONFIG,
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        canvasConfig: { ...state.document.canvasConfig, ...payload.config },
      },
    }),
    (state, _payload) => ({
      type: CMD_UPDATE_CANVAS_CONFIG,
      payload: { config: state.document.canvasConfig },
    }),
  );

  // ── LOAD_COMPONENT (async — no-op in command layer) ────────────────────
  engine.registerHandler(
    "LOAD_COMPONENT",
    (state) => state, // actual loading handled by plugin/async middleware
  );

  // ── COMPONENT_RENDER_ERROR (no-op, just for event emission) ────────────
  engine.registerHandler(
    CMD_COMPONENT_RENDER_ERROR,
    (state) => state,
  );

  // ── Editor-only commands (no undo/redo — don't register inverse) ────────

  engine.registerHandler<SelectNodePayload>(
    CMD_SELECT_NODE,
    (state, payload) => {
      const { nodeId, addToSelection = false } = payload;
      // Don't select locked nodes
      const node = state.document.nodes[nodeId];
      if (node?.locked) return state;

      const newSelectedIds = addToSelection
        ? state.editor.selectedNodeIds.includes(nodeId)
          ? state.editor.selectedNodeIds
          : [...state.editor.selectedNodeIds, nodeId]
        : [nodeId];

      return {
        ...state,
        editor: { ...state.editor, selectedNodeIds: newSelectedIds },
      };
    },
  );

  engine.registerHandler<SelectNodesPayload>(
    CMD_SELECT_NODES,
    (state, payload) => {
      const { nodeIds } = payload;
      const validIds = nodeIds.filter((id) => {
        const node = state.document.nodes[id];
        return node && !node.locked;
      });
      return {
        ...state,
        editor: { ...state.editor, selectedNodeIds: validIds },
      };
    },
  );

  engine.registerHandler<DeselectNodePayload>(
    CMD_DESELECT_NODE,
    (state, payload) => ({
      ...state,
      editor: {
        ...state.editor,
        selectedNodeIds: state.editor.selectedNodeIds.filter((id) => id !== payload.nodeId),
      },
    }),
  );

  engine.registerHandler(
    CMD_CLEAR_SELECTION,
    (state) => ({
      ...state,
      editor: { ...state.editor, selectedNodeIds: [] },
    }),
  );

  engine.registerHandler<SetBreakpointPayload>(
    CMD_SET_BREAKPOINT,
    (state, payload) => {
      // Emit breakpoint:changed event so plugins & consumers can react
      eventBus?.emit("breakpoint:changed", { breakpoint: payload.breakpoint });
      return {
        ...state,
        editor: { ...state.editor, activeBreakpoint: payload.breakpoint },
      };
    },
  );

  engine.registerHandler<{ data: ClipboardData | null }>(
    CMD_SET_CLIPBOARD,
    (state, payload) => ({
      ...state,
      editor: { ...state.editor, clipboard: payload.data },
    }),
  );

  // ── TOGGLE_RESPONSIVE_HIDDEN ─────────────────────────────────────────────
  engine.registerHandler<ToggleResponsiveHiddenPayload>(
    CMD_TOGGLE_RESPONSIVE_HIDDEN,
    (state, payload) => {
      const { nodeId, breakpoint, hidden } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const currentResponsiveHidden = node.responsiveHidden ?? {};
      const updatedHidden = { ...currentResponsiveHidden };
      if (hidden) {
        updatedHidden[breakpoint] = true;
      } else {
        delete updatedHidden[breakpoint];
      }

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              responsiveHidden: Object.keys(updatedHidden).length > 0 ? updatedHidden : undefined,
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => ({
      type: CMD_TOGGLE_RESPONSIVE_HIDDEN,
      payload: {
        nodeId: payload.nodeId,
        breakpoint: payload.breakpoint,
        hidden: state.document.nodes[payload.nodeId]?.responsiveHidden?.[payload.breakpoint] === true,
      },
    }),
  );

  // ── UPDATE_RESPONSIVE_PROPS ──────────────────────────────────────────────
  engine.registerHandler<UpdateResponsivePropsPayload>(
    CMD_UPDATE_RESPONSIVE_PROPS,
    (state, payload) => {
      const { nodeId, breakpoint, props } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const currentResponsiveProps = node.responsiveProps?.[breakpoint] ?? {};
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              responsiveProps: {
                ...(node.responsiveProps ?? {}),
                [breakpoint]: { ...currentResponsiveProps, ...props },
              },
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      const oldProps: Record<string, unknown> = {};
      for (const key of Object.keys(payload.props)) {
        oldProps[key] = node?.responsiveProps?.[payload.breakpoint]?.[key];
      }
      return {
        type: CMD_UPDATE_RESPONSIVE_PROPS,
        payload: { nodeId: payload.nodeId, breakpoint: payload.breakpoint, props: oldProps },
      };
    },
  );

  // ── RESET_RESPONSIVE_STYLE ───────────────────────────────────────────────
  engine.registerHandler<ResetResponsiveStylePayload>(
    CMD_RESET_RESPONSIVE_STYLE,
    (state, payload) => {
      const { nodeId, breakpoint, keys } = payload;
      const node = state.document.nodes[nodeId];
      if (!node) return state;

      const currentOverride = { ...(node.responsiveStyle[breakpoint] ?? {}) };
      for (const key of keys) {
        delete (currentOverride as Record<string, unknown>)[key];
      }

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: {
            ...state.document.nodes,
            [nodeId]: {
              ...node,
              responsiveStyle: {
                ...node.responsiveStyle,
                [breakpoint]: Object.keys(currentOverride).length > 0 ? currentOverride : undefined,
              },
              metadata: updateMeta(node.metadata),
            },
          },
        },
      };
    },
    (state, payload) => {
      const node = state.document.nodes[payload.nodeId];
      const oldStyle: Partial<StyleConfig> = {};
      for (const key of payload.keys as Array<keyof StyleConfig>) {
        oldStyle[key] = (node?.responsiveStyle[payload.breakpoint] ?? {})[key] as never;
      }
      return {
        type: CMD_UPDATE_RESPONSIVE_STYLE,
        payload: { nodeId: payload.nodeId, breakpoint: payload.breakpoint, style: oldStyle },
      };
    },
  );

  // ── SET_CANVAS_MODE (editor-only, no undo/redo) ──────────────────────────
  engine.registerHandler<SetCanvasModePayload>(
    CMD_SET_CANVAS_MODE,
    (state, payload) => ({
      ...state,
      editor: { ...state.editor, canvasMode: payload.canvasMode },
    }),
  );

  // ── ENTER_TEXT_EDIT (editor-only, no undo/redo) ──────────────────────────
  engine.registerHandler<EnterTextEditPayload>(
    CMD_ENTER_TEXT_EDIT,
    (state, payload) => ({
      ...state,
      editor: {
        ...state.editor,
        editingNodeId: payload.nodeId,
        editingPropKey: payload.propKey ?? null,
        // Auto-select the node when entering edit mode
        selectedNodeIds: [payload.nodeId],
      },
    }),
  );

  // ── EXIT_TEXT_EDIT (editor-only — optionally commits content) ────────────
  engine.registerHandler<ExitTextEditPayload>(
    CMD_EXIT_TEXT_EDIT,
    (state, payload) => {
      const baseEditor = { ...state.editor, editingNodeId: null, editingPropKey: null };

      // If a content update was bundled, apply it to the node's props
      if (payload.content !== undefined && payload.propKey && payload.nodeId) {
        const node = state.document.nodes[payload.nodeId];
        if (node) {
          return {
            ...state,
            editor: baseEditor,
            document: {
              ...state.document,
              updatedAt: now(),
              nodes: {
                ...state.document.nodes,
                [payload.nodeId]: {
                  ...node,
                  props: { ...node.props, [payload.propKey]: payload.content },
                  metadata: updateMeta(node.metadata),
                },
              },
            },
          };
        }
      }

      return { ...state, editor: baseEditor };
    },
  );
}

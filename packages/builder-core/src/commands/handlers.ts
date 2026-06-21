/**
 * Built-in command handler implementations.
 *
 * All handlers are pure functions: (state, payload) => newState.
 * They never mutate the input state.
 *
 * Register via registerAllHandlers(engine, registry).
 */

import { v4 as uuidv4 } from "uuid";
import type { BuilderState, ClipboardData } from "../state/types";
import type { BuilderNode, NodeMetadata, StyleConfig } from "../document/types";
import type { PopupDefinition, PopupNodeTemplate, PopupLocaleContent } from "../document/popups";
import { createDefaultPopupDefinition } from "../document/popups";
import type { CommandEngine } from "./CommandEngine";
import type { ComponentRegistry } from "../registry/ComponentRegistry";
import type { EventBus } from "../events/EventBus";
import type { Breakpoint } from "../responsive/types";
import { DUPLICATE_OFFSET } from "../constants";
import {
  CMD_ADD_NODE,
  CMD_REMOVE_NODE,
  CMD_REMOVE_NODES,
  CMD_DUPLICATE_NODE,
  CMD_DUPLICATE_NODES,
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
  CMD_CREATE_POPUP,
  CMD_UPDATE_POPUP,
  CMD_DELETE_POPUP,
  CMD_DUPLICATE_POPUP,
  CMD_ENABLE_POPUP,
  CMD_DISABLE_POPUP,
  CMD_TOGGLE_RESPONSIVE_HIDDEN,
  CMD_UPDATE_RESPONSIVE_PROPS,
  CMD_RESET_RESPONSIVE_STYLE,
  CMD_ADD_POPUP_GOAL,
  CMD_UPDATE_POPUP_GOAL,
  CMD_REMOVE_POPUP_GOAL,
  CMD_ADD_POPUP_VARIANT,
  CMD_UPDATE_POPUP_VARIANT,
  CMD_REMOVE_POPUP_VARIANT,
  CMD_RESTORE_POPUP_VARIANT,
  CMD_UPDATE_POPUP_EXPERIMENT,
  CMD_ADD_POPUP_LOCALE,
  CMD_UPDATE_POPUP_LOCALE,
  CMD_REMOVE_POPUP_LOCALE,
  CMD_RESTORE_POPUP_LOCALE,
  CMD_UPDATE_POPUP_TARGETING,
  CMD_UPDATE_POPUP_SCHEDULE,
  CMD_UPDATE_POPUP_FREQUENCY,
  CMD_SET_CANVAS_MODE,
  CMD_SET_ACTIVE_POPUP,
  CMD_SET_ACTIVE_POPUP_SELECTION,
  CMD_SET_ACTIVE_POPUP_VARIANT,
  CMD_SET_ACTIVE_POPUP_LOCALE,
  CMD_ENTER_TEXT_EDIT,
  CMD_EXIT_TEXT_EDIT,
  CMD_SET_THEME_COLORS,
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
  type CreatePopupPayload,
  type UpdatePopupPayload,
  type DeletePopupPayload,
  type DuplicatePopupPayload,
  type EnableDisablePopupPayload,
  type ToggleResponsiveHiddenPayload,
  type UpdateResponsivePropsPayload,
  type ResetResponsiveStylePayload,
  type SetCanvasModePayload,
  type SetActivePopupPayload,
  type SetActivePopupSelectionPayload,
  type AddPopupGoalPayload,
  type UpdatePopupGoalPayload,
  type RemovePopupGoalPayload,
  type AddPopupVariantPayload,
  type UpdatePopupVariantPayload,
  type RemovePopupVariantPayload,
  type RestorePopupVariantPayload,
  type UpdatePopupExperimentPayload,
  type SetActivePopupVariantPayload,
  type AddPopupLocalePayload,
  type UpdatePopupLocalePayload,
  type RemovePopupLocalePayload,
  type RestorePopupLocalePayload,
  type UpdatePopupTargetingPayload,
  type UpdatePopupSchedulePayload,
  type UpdatePopupFrequencyPayload,
  type SetActivePopupLocalePayload,
  type EnterTextEditPayload,
  type ExitTextEditPayload,
  type SetThemeColorsPayload,
} from "./built-in";
import type { PopupGoal, PopupVariant, PopupTargeting, PopupSchedule, PopupFrequencyConfig } from "../document/popups";

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

function collectSubtreeSnapshot(
  rootNodeId: string,
  nodes: Record<string, BuilderNode>,
): Record<string, BuilderNode> {
  const ids = [rootNodeId, ...collectDescendants(rootNodeId, nodes)];
  const snapshot: Record<string, BuilderNode> = {};
  for (const id of ids) {
    const node = nodes[id];
    if (node) snapshot[id] = node;
  }
  return snapshot;
}

/**
 * V4+V5: all content roots owned by a popup — base root + variant roots + locale roots.
 * Used for cascade-delete and deep-clone-on-duplicate so no content orphans.
 */
function popupOwnedRoots(popup: PopupDefinition): string[] {
  const roots = [popup.rootNodeId];
  for (const variant of popup.variants ?? []) {
    if (variant.rootNodeId) roots.push(variant.rootNodeId);
  }
  for (const locale of popup.locales ?? []) {
    if (locale.rootNodeId) roots.push(locale.rootNodeId);
  }
  return roots;
}

/**
 * V4: shallow-merge fields onto a popup (preserving id/rootNodeId/metadata),
 * bumping `updatedAt`. Used by the goal/variant/experiment handlers that mutate
 * popup-level config only (no node changes).
 */
function setPopup(
  state: BuilderState,
  popupId: string,
  patch: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">>,
): BuilderState {
  const popup = state.document.popups?.[popupId];
  if (!popup) return state;
  const timestamp = new Date().toISOString();
  return {
    ...state,
    document: {
      ...state.document,
      updatedAt: timestamp,
      popups: {
        ...(state.document.popups ?? {}),
        [popupId]: {
          ...popup,
          ...patch,
          id: popup.id,
          rootNodeId: popup.rootNodeId,
          metadata: { ...popup.metadata, updatedAt: timestamp },
        },
      },
    },
  };
}

function isNodeInSubtree(
  nodeId: string,
  rootNodeId: string,
  nodes: Record<string, BuilderNode>,
): boolean {
  if (nodeId === rootNodeId) return true;
  let current = nodes[nodeId];
  while (current?.parentId) {
    if (current.parentId === rootNodeId) return true;
    current = nodes[current.parentId];
  }
  return false;
}

function isPopupContentSelection(
  nodeIds: string[],
  state: BuilderState,
): boolean {
  const activePopupId = state.editor.activePopupId;
  const popup = activePopupId ? state.document.popups?.[activePopupId] : undefined;
  return !!popup && nodeIds.some((nodeId) => isNodeInSubtree(nodeId, popup.rootNodeId, state.document.nodes));
}

function buildPopupNodeTree(
  rootNodeId: string,
  rootTemplate: PopupNodeTemplate | undefined,
  registry: ComponentRegistry,
  timestamp: string,
): Record<string, BuilderNode> {
  const nodes: Record<string, BuilderNode> = {};

  const createNode = (
    template: PopupNodeTemplate,
    nodeId: string,
    parentId: string | null,
    order: number,
  ) => {
    const def = registry.getComponent(template.componentType);
    const node: BuilderNode = {
      id: nodeId,
      type: template.componentType,
      parentId,
      order,
      props: { ...(def?.defaultProps ?? {}), ...(template.props ?? {}) },
      style: { ...(def?.defaultStyle ?? {}), ...(template.style ?? {}) },
      responsiveStyle: template.responsiveStyle ?? {},
      responsiveProps: template.responsiveProps,
      interactions: [],
      hidden: false,
      locked: false,
      name: template.name ?? def?.name ?? template.componentType,
      metadata: { createdAt: timestamp, updatedAt: timestamp },
    };
    nodes[nodeId] = node;

    template.children?.forEach((child, index) => {
      createNode(child, uuidv4(), nodeId, index);
    });
  };

  createNode(
    rootTemplate ?? {
      componentType: "PopupContent",
      props: {},
      style: {
        width: "100%",
        minHeight: "220px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      },
    },
    rootNodeId,
    null,
    0,
  );

  return nodes;
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
        payload: { snapshot, selectNodeIds: [nodeId] },
      };
    },
  );

  // ── REMOVE_NODES (Batch) ────────────────────────────────────────────────
  engine.registerHandler<{ nodeIds: string[] }>(
    CMD_REMOVE_NODES,
    (state, payload) => {
      const { nodeIds } = payload;
      const allToRemove = new Set<string>();
      nodeIds.forEach((id) => {
        if (state.document.nodes[id]) {
          allToRemove.add(id);
          collectDescendants(id, state.document.nodes).forEach((dId) => allToRemove.add(dId));
        }
      });

      const newNodes = { ...state.document.nodes };
      allToRemove.forEach((id) => delete newNodes[id]);

      const newSelectedIds = state.editor.selectedNodeIds.filter((id) => !allToRemove.has(id));

      return {
        ...state,
        document: { ...state.document, updatedAt: now(), nodes: newNodes },
        editor: { ...state.editor, selectedNodeIds: newSelectedIds },
      };
    },
    (state, payload) => {
      const { nodeIds } = payload;
      const snapshot: Record<string, BuilderNode> = {};
      nodeIds.forEach((id) => {
        const node = state.document.nodes[id];
        if (node) {
          snapshot[id] = node;
          collectDescendants(id, state.document.nodes).forEach((dId) => {
            snapshot[dId] = state.document.nodes[dId]!;
          });
        }
      });
      if (Object.keys(snapshot).length === 0) return undefined;

      return { type: "RESTORE_NODES", payload: { snapshot, selectNodeIds: nodeIds } };
    },
  );

  // ── RESTORE_NODES (internal inverse of REMOVE_NODE) ───────────────────
  engine.registerHandler<{ snapshot: Record<string, BuilderNode>; selectNodeIds: string[] }>(
    "RESTORE_NODES",
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        nodes: { ...state.document.nodes, ...payload.snapshot },
      },
      editor: { ...state.editor, selectedNodeIds: payload.selectNodeIds },
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

  // ── DUPLICATE_NODES (Batch) ─────────────────────────────────────────────
  engine.registerHandler<{ nodeIds: string[]; offset?: { x: number; y: number }; newNodeIds?: string[] }>(
    CMD_DUPLICATE_NODES,
    (state, payload) => {
      const { nodeIds, offset = DUPLICATE_OFFSET, newNodeIds = [] } = payload;
      const combinedNewNodes: Record<string, BuilderNode> = {};
      const newRootIds: string[] = [];

      nodeIds.forEach((nodeId, i) => {
        if (state.document.nodes[nodeId]) {
          const { newNodes, newRootId } = cloneSubtree(
            nodeId,
            state.document.nodes,
            offset,
            newNodeIds[i],
          );
          Object.assign(combinedNewNodes, newNodes);
          newRootIds.push(newRootId);
        }
      });

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          nodes: { ...state.document.nodes, ...combinedNewNodes },
        },
        editor: { ...state.editor, selectedNodeIds: newRootIds },
      };
    },
    (_state, payload) => {
      // Logic for inverse: we need the IDs of the new roots to remove them.
      // Since they are generated or passed in payload, we can use them.
      // We'll need a way to ensure we have them. If not passed, we can't undo reliably.
      // But in our system, we should pre-generate them.
      if (!payload.newNodeIds || payload.newNodeIds.length === 0) return undefined;
      return { type: CMD_REMOVE_NODES, payload: { nodeIds: payload.newNodeIds } };
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

  // ── CREATE_POPUP ───────────────────────────────────────────────────────
  engine.registerHandler<CreatePopupPayload>(
    CMD_CREATE_POPUP,
    (state, payload) => {
      const timestamp = now();
      const popupId = payload.popupId ?? uuidv4();
      const rootNodeId = payload.rootNodeId ?? uuidv4();
      if (state.document.popups?.[popupId]) {
        throw new Error(`Popup "${popupId}" already exists.`);
      }
      if (state.document.nodes[rootNodeId]) {
        throw new Error(`Popup root node "${rootNodeId}" already exists.`);
      }

      const base = createDefaultPopupDefinition({
        id: popupId,
        name: payload.name,
        rootNodeId,
        kind: payload.kind,
        placement: payload.placement,
        timestamp,
      });
      const popup: PopupDefinition = {
        ...base,
        ...(payload.popup ?? {}),
        id: popupId,
        rootNodeId,
        metadata: { createdAt: timestamp, updatedAt: timestamp },
      };
      const popupNodes = buildPopupNodeTree(rootNodeId, payload.root, registry, timestamp);

      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes: { ...state.document.nodes, ...popupNodes },
          popups: { ...(state.document.popups ?? {}), [popupId]: popup },
        },
        editor: { ...state.editor, activePopupId: popupId, activePopupSelection: "shell", selectedNodeIds: [] },
      };
    },
    (_state, payload) => {
      if (!payload.popupId) return undefined;
      return { type: CMD_DELETE_POPUP, payload: { popupId: payload.popupId } };
    },
  );

  // ── UPDATE_POPUP ───────────────────────────────────────────────────────
  engine.registerHandler<UpdatePopupPayload>(
    CMD_UPDATE_POPUP,
    (state, payload) => {
      const current = state.document.popups?.[payload.popupId];
      if (!current) return state;
      const timestamp = now();
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: {
              ...current,
              ...payload.popup,
              id: current.id,
              rootNodeId: current.rootNodeId,
              metadata: { ...current.metadata, updatedAt: timestamp },
            },
          },
        },
      };
    },
    (state, payload) => {
      const current = state.document.popups?.[payload.popupId];
      if (!current) return undefined;
      const previous: Partial<Omit<PopupDefinition, "id" | "rootNodeId" | "metadata">> = {};
      for (const key of Object.keys(payload.popup) as Array<keyof typeof previous>) {
        previous[key] = current[key] as never;
      }
      return { type: CMD_UPDATE_POPUP, payload: { popupId: payload.popupId, popup: previous } };
    },
  );

  // ── DELETE_POPUP ───────────────────────────────────────────────────────
  engine.registerHandler<DeletePopupPayload>(
    CMD_DELETE_POPUP,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      // V4: cascade-delete the base root AND every variant-owned content root.
      const toRemove = new Set<string>();
      for (const root of popupOwnedRoots(popup)) {
        toRemove.add(root);
        for (const id of collectDescendants(root, state.document.nodes)) toRemove.add(id);
      }
      const nodes = { ...state.document.nodes };
      for (const id of toRemove) delete nodes[id];
      const popups = { ...(state.document.popups ?? {}) };
      delete popups[payload.popupId];
      return {
        ...state,
        document: { ...state.document, updatedAt: now(), nodes, popups },
        editor: {
          ...state.editor,
          activePopupId: state.editor.activePopupId === payload.popupId ? null : state.editor.activePopupId,
          activePopupSelection: state.editor.activePopupId === payload.popupId ? null : state.editor.activePopupSelection,
          selectedNodeIds: state.editor.selectedNodeIds.filter((id) => !toRemove.has(id)),
        },
      };
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return undefined;
      // V4: snapshot the base root AND every variant-owned root so undo restores
      // variant content too.
      const snapshot: Record<string, BuilderNode> = {};
      for (const root of popupOwnedRoots(popup)) {
        Object.assign(snapshot, collectSubtreeSnapshot(root, state.document.nodes));
      }
      return { type: "RESTORE_POPUP", payload: { popup, snapshot } };
    },
  );

  engine.registerHandler<{ popup: PopupDefinition; snapshot: Record<string, BuilderNode> }>(
    "RESTORE_POPUP",
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        nodes: { ...state.document.nodes, ...payload.snapshot },
        popups: { ...(state.document.popups ?? {}), [payload.popup.id]: payload.popup },
      },
      editor: { ...state.editor, activePopupId: payload.popup.id, activePopupSelection: "shell", selectedNodeIds: [] },
    }),
  );

  // ── DUPLICATE_POPUP ────────────────────────────────────────────────────
  engine.registerHandler<DuplicatePopupPayload>(
    CMD_DUPLICATE_POPUP,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const timestamp = now();
      const newPopupId = payload.newPopupId ?? uuidv4();
      const { newNodes, newRootId } = cloneSubtree(
        popup.rootNodeId,
        state.document.nodes,
        { x: 0, y: 0 },
        payload.newRootNodeId,
      );
      const allNewNodes: Record<string, BuilderNode> = { ...newNodes };

      // V4: deep-clone each variant's owned content root and remap variant roots.
      const newVariants = popup.variants?.map((variant) => {
        if (!variant.rootNodeId) return { ...variant };
        const cloned = cloneSubtree(variant.rootNodeId, state.document.nodes, { x: 0, y: 0 });
        Object.assign(allNewNodes, cloned.newNodes);
        return { ...variant, rootNodeId: cloned.newRootId };
      });

      // V4: regenerate goal ids so the duplicate has independent goals.
      const newGoals = popup.goals?.map((goal) => ({ ...goal, id: uuidv4() }));

      // V5: deep-clone each locale's owned content root and remap locale roots.
      const newLocales = popup.locales?.map((locale) => {
        if (!locale.rootNodeId) return { ...locale };
        const cloned = cloneSubtree(locale.rootNodeId, state.document.nodes, { x: 0, y: 0 });
        Object.assign(allNewNodes, cloned.newNodes);
        return { ...locale, rootNodeId: cloned.newRootId };
      });

      const duplicated: PopupDefinition = {
        ...popup,
        id: newPopupId,
        name: payload.name ?? `${popup.name} Copy`,
        rootNodeId: newRootId,
        ...(newVariants ? { variants: newVariants } : {}),
        ...(newGoals ? { goals: newGoals } : {}),
        ...(popup.experiment ? { experiment: { ...popup.experiment } } : {}),
        ...(newLocales ? { locales: newLocales } : {}),
        metadata: { ...popup.metadata, createdAt: timestamp, updatedAt: timestamp },
      };
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes: { ...state.document.nodes, ...allNewNodes },
          popups: { ...(state.document.popups ?? {}), [newPopupId]: duplicated },
        },
        editor: { ...state.editor, activePopupId: newPopupId, activePopupSelection: "shell", selectedNodeIds: [] },
      };
    },
    (_state, payload) => {
      if (!payload.newPopupId) return undefined;
      return { type: CMD_DELETE_POPUP, payload: { popupId: payload.newPopupId } };
    },
  );

  engine.registerHandler<EnableDisablePopupPayload>(
    CMD_ENABLE_POPUP,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: { ...popup, enabled: true, metadata: { ...popup.metadata, updatedAt: now() } },
          },
        },
      };
    },
    (state, payload) => ({
      type: state.document.popups?.[payload.popupId]?.enabled ? CMD_ENABLE_POPUP : CMD_DISABLE_POPUP,
      payload: { popupId: payload.popupId },
    }),
  );

  engine.registerHandler<EnableDisablePopupPayload>(
    CMD_DISABLE_POPUP,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: now(),
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: { ...popup, enabled: false, metadata: { ...popup.metadata, updatedAt: now() } },
          },
        },
      };
    },
    (state, payload) => ({
      type: state.document.popups?.[payload.popupId]?.enabled ? CMD_ENABLE_POPUP : CMD_DISABLE_POPUP,
      payload: { popupId: payload.popupId },
    }),
  );

  // ── V4: GOALS ──────────────────────────────────────────────────────────
  engine.registerHandler<AddPopupGoalPayload>(
    CMD_ADD_POPUP_GOAL,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const goal: PopupGoal = {
        id: payload.goalId ?? uuidv4(),
        name: payload.goal?.name ?? "New goal",
        type: payload.goal?.type ?? "click",
        targetNodeId: payload.goal?.targetNodeId,
        eventName: payload.goal?.eventName,
        urlPattern: payload.goal?.urlPattern,
      };
      return setPopup(state, payload.popupId, { goals: [...(popup.goals ?? []), goal] });
    },
    (_state, payload) => {
      if (!payload.goalId) return undefined;
      return { type: CMD_REMOVE_POPUP_GOAL, payload: { popupId: payload.popupId, goalId: payload.goalId } };
    },
  );

  engine.registerHandler<UpdatePopupGoalPayload>(
    CMD_UPDATE_POPUP_GOAL,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup?.goals) return state;
      const goals = popup.goals.map((g) =>
        g.id === payload.goalId ? { ...g, ...payload.goal, id: g.id } : g,
      );
      return setPopup(state, payload.popupId, { goals });
    },
    (state, payload) => {
      const current = state.document.popups?.[payload.popupId]?.goals?.find((g) => g.id === payload.goalId);
      if (!current) return undefined;
      const previous: Partial<Omit<PopupGoal, "id">> = {};
      for (const key of Object.keys(payload.goal) as Array<keyof typeof previous>) {
        previous[key] = current[key] as never;
      }
      return { type: CMD_UPDATE_POPUP_GOAL, payload: { popupId: payload.popupId, goalId: payload.goalId, goal: previous } };
    },
  );

  engine.registerHandler<RemovePopupGoalPayload>(
    CMD_REMOVE_POPUP_GOAL,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup?.goals) return state;
      return setPopup(state, payload.popupId, { goals: popup.goals.filter((g) => g.id !== payload.goalId) });
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      const goal = popup?.goals?.find((g) => g.id === payload.goalId);
      if (!goal) return undefined;
      const { id, ...rest } = goal;
      return { type: CMD_ADD_POPUP_GOAL, payload: { popupId: payload.popupId, goalId: id, goal: rest } };
    },
  );

  // ── V4: VARIANTS ───────────────────────────────────────────────────────
  engine.registerHandler<AddPopupVariantPayload>(
    CMD_ADD_POPUP_VARIANT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const variantId = payload.variantId ?? uuidv4();
      let nodes = state.document.nodes;
      let rootNodeId: string | undefined;

      if (payload.cloneFromBase) {
        const cloned = cloneSubtree(popup.rootNodeId, state.document.nodes, { x: 0, y: 0 }, payload.rootNodeId);
        nodes = { ...state.document.nodes, ...cloned.newNodes };
        rootNodeId = cloned.newRootId;
      }

      const variant: PopupVariant = {
        id: variantId,
        name: payload.name ?? `Variant ${(popup.variants?.length ?? 0) + 1}`,
        weight: payload.weight ?? 1,
        enabled: true,
        ...(payload.popupPatch ? { popupPatch: payload.popupPatch } : {}),
        ...(rootNodeId ? { rootNodeId } : {}),
      };

      const timestamp = now();
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes,
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: {
              ...popup,
              variants: [...(popup.variants ?? []), variant],
              metadata: { ...popup.metadata, updatedAt: timestamp },
            },
          },
        },
      };
    },
    (_state, payload) => {
      if (!payload.variantId) return undefined;
      return { type: CMD_REMOVE_POPUP_VARIANT, payload: { popupId: payload.popupId, variantId: payload.variantId } };
    },
  );

  engine.registerHandler<UpdatePopupVariantPayload>(
    CMD_UPDATE_POPUP_VARIANT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup?.variants) return state;
      const variants = popup.variants.map((v) =>
        v.id === payload.variantId ? { ...v, ...payload.variant, id: v.id } : v,
      );
      return setPopup(state, payload.popupId, { variants });
    },
    (state, payload) => {
      const current = state.document.popups?.[payload.popupId]?.variants?.find((v) => v.id === payload.variantId);
      if (!current) return undefined;
      const previous: Partial<Omit<PopupVariant, "id">> = {};
      for (const key of Object.keys(payload.variant) as Array<keyof typeof previous>) {
        previous[key] = current[key] as never;
      }
      return { type: CMD_UPDATE_POPUP_VARIANT, payload: { popupId: payload.popupId, variantId: payload.variantId, variant: previous } };
    },
  );

  engine.registerHandler<RemovePopupVariantPayload>(
    CMD_REMOVE_POPUP_VARIANT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup?.variants) return state;
      const variant = popup.variants.find((v) => v.id === payload.variantId);
      if (!variant) return state;

      const nodes = { ...state.document.nodes };
      if (variant.rootNodeId) {
        const toRemove = new Set([variant.rootNodeId, ...collectDescendants(variant.rootNodeId, state.document.nodes)]);
        for (const id of toRemove) delete nodes[id];
      }
      const timestamp = now();
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes,
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: {
              ...popup,
              variants: popup.variants.filter((v) => v.id !== payload.variantId),
              metadata: { ...popup.metadata, updatedAt: timestamp },
            },
          },
        },
        editor: {
          ...state.editor,
          activePopupVariantId:
            state.editor.activePopupVariantId === payload.variantId ? null : state.editor.activePopupVariantId,
        },
      };
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      const index = popup?.variants?.findIndex((v) => v.id === payload.variantId) ?? -1;
      const variant = index >= 0 ? popup!.variants![index] : undefined;
      if (!variant) return undefined;
      const restorePayload: RestorePopupVariantPayload = {
        popupId: payload.popupId,
        variant,
        index,
        ...(variant.rootNodeId
          ? { nodes: collectSubtreeSnapshot(variant.rootNodeId, state.document.nodes) }
          : {}),
      };
      return { type: CMD_RESTORE_POPUP_VARIANT, payload: restorePayload };
    },
  );

  engine.registerHandler<RestorePopupVariantPayload>(
    CMD_RESTORE_POPUP_VARIANT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const variants = [...(popup.variants ?? [])];
      const index = payload.index ?? variants.length;
      variants.splice(index, 0, payload.variant);
      const timestamp = now();
      return {
        ...state,
        document: {
          ...state.document,
          updatedAt: timestamp,
          nodes: { ...state.document.nodes, ...(payload.nodes ?? {}) },
          popups: {
            ...(state.document.popups ?? {}),
            [payload.popupId]: { ...popup, variants, metadata: { ...popup.metadata, updatedAt: timestamp } },
          },
        },
      };
    },
    (_state, payload) => ({
      type: CMD_REMOVE_POPUP_VARIANT,
      payload: { popupId: payload.popupId, variantId: payload.variant.id },
    }),
  );

  engine.registerHandler<UpdatePopupExperimentPayload>(
    CMD_UPDATE_POPUP_EXPERIMENT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const experiment = {
        enabled: popup.experiment?.enabled ?? false,
        assignment: popup.experiment?.assignment ?? "random",
        ...popup.experiment,
        ...payload.experiment,
      };
      return setPopup(state, payload.popupId, { experiment });
    },
    (state, payload) => {
      const current = state.document.popups?.[payload.popupId]?.experiment;
      return {
        type: CMD_UPDATE_POPUP_EXPERIMENT,
        payload: {
          popupId: payload.popupId,
          experiment: current ?? { enabled: false, assignment: "random" },
        },
      };
    },
  );

  // ── V4: editor-only — active variant being edited (no undo) ─────────────
  engine.registerHandler<SetActivePopupVariantPayload>(
    CMD_SET_ACTIVE_POPUP_VARIANT,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup || state.editor.activePopupId !== payload.popupId) return state;
      const valid = payload.variantId
        ? popup.variants?.some((v) => v.id === payload.variantId && v.rootNodeId)
        : true;
      return {
        ...state,
        editor: {
          ...state.editor,
          activePopupVariantId: valid ? payload.variantId : null,
          activePopupSelection: "content",
          selectedNodeIds: [],
        },
      };
    },
  );

  // ── V5: locale commands ────────────────────────────────────────────────────

  engine.registerHandler<AddPopupLocalePayload>(
    CMD_ADD_POPUP_LOCALE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const existing = popup.locales?.find((l) => l.locale === payload.locale);
      if (existing) return state; // locale already exists
      let rootNodeId: string | undefined;
      let newNodes = {};
      if (payload.cloneFromBase) {
        const cloned = cloneSubtree(
          popup.rootNodeId,
          state.document.nodes,
          { x: 0, y: 0 },
          payload.rootNodeId,
        );
        rootNodeId = cloned.newRootId;
        newNodes = cloned.newNodes;
      } else {
        rootNodeId = payload.rootNodeId;
      }
      const localeEntry: PopupLocaleContent = {
        locale: payload.locale,
        ...(rootNodeId ? { rootNodeId } : {}),
        ...(payload.popupPatch ? { popupPatch: payload.popupPatch } : {}),
      };
      return {
        ...setPopup(state, payload.popupId, {
          locales: [...(popup.locales ?? []), localeEntry],
        }),
        document: {
          ...setPopup(state, payload.popupId, {
            locales: [...(popup.locales ?? []), localeEntry],
          }).document,
          nodes: { ...state.document.nodes, ...newNodes },
        },
      };
    },
    (state, payload) => ({
      type: CMD_REMOVE_POPUP_LOCALE,
      payload: { popupId: payload.popupId, locale: payload.locale } as RemovePopupLocalePayload,
    }),
  );

  engine.registerHandler<UpdatePopupLocalePayload>(
    CMD_UPDATE_POPUP_LOCALE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const oldEntry = popup.locales?.find((l) => l.locale === payload.locale);
      if (!oldEntry) return state;
      return setPopup(state, payload.popupId, {
        locales: (popup.locales ?? []).map((l) =>
          l.locale === payload.locale ? { ...l, ...payload.patch } : l,
        ),
      });
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      const oldEntry = popup?.locales?.find((l) => l.locale === payload.locale);
      if (!oldEntry) return undefined;
      return {
        type: CMD_UPDATE_POPUP_LOCALE,
        payload: {
          popupId: payload.popupId,
          locale: payload.locale,
          patch: { rootNodeId: oldEntry.rootNodeId, popupPatch: oldEntry.popupPatch },
        } as UpdatePopupLocalePayload,
      };
    },
  );

  engine.registerHandler<RemovePopupLocalePayload>(
    CMD_REMOVE_POPUP_LOCALE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const entry = popup.locales?.find((l) => l.locale === payload.locale);
      if (!entry) return state;
      let newNodes = { ...state.document.nodes };
      if (entry.rootNodeId && newNodes[entry.rootNodeId]) {
        const toRemove = new Set<string>([
          entry.rootNodeId,
          ...collectDescendants(entry.rootNodeId, newNodes),
        ]);
        for (const id of toRemove) delete newNodes[id];
      }
      const nextState = setPopup(state, payload.popupId, {
        locales: (popup.locales ?? []).filter((l) => l.locale !== payload.locale),
      });
      return { ...nextState, document: { ...nextState.document, nodes: newNodes } };
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      const entry = popup?.locales?.find((l) => l.locale === payload.locale);
      if (!entry) return undefined;
      const index = popup?.locales?.findIndex((l) => l.locale === payload.locale) ?? -1;
      const nodeSnapshot = entry.rootNodeId
        ? collectSubtreeSnapshot(entry.rootNodeId, state.document.nodes)
        : undefined;
      return {
        type: CMD_RESTORE_POPUP_LOCALE,
        payload: {
          popupId: payload.popupId,
          localeContent: entry,
          nodes: nodeSnapshot,
          index,
        } as RestorePopupLocalePayload,
      };
    },
  );

  engine.registerHandler<RestorePopupLocalePayload>(
    CMD_RESTORE_POPUP_LOCALE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const locales = [...(popup.locales ?? [])];
      const insertAt = payload.index !== undefined && payload.index >= 0
        ? Math.min(payload.index, locales.length)
        : locales.length;
      locales.splice(insertAt, 0, payload.localeContent);
      const nextState = setPopup(state, payload.popupId, { locales });
      const restoredNodes = payload.nodes ?? {};
      return {
        ...nextState,
        document: {
          ...nextState.document,
          nodes: { ...nextState.document.nodes, ...restoredNodes },
        },
      };
    },
    (state, payload) => ({
      type: CMD_REMOVE_POPUP_LOCALE,
      payload: { popupId: payload.popupId, locale: payload.localeContent.locale } as RemovePopupLocalePayload,
    }),
  );

  engine.registerHandler<UpdatePopupTargetingPayload>(
    CMD_UPDATE_POPUP_TARGETING,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const prev = popup.rules.targeting as PopupTargeting | undefined;
      return setPopup(state, payload.popupId, {
        rules: { ...popup.rules, targeting: prev ? { ...prev, ...payload.targeting } : (payload.targeting as PopupTargeting) },
      });
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return undefined;
      // Restore exact prior rules (including undefined fields) via UPDATE_POPUP
      const prevRules = popup.rules;
      return {
        type: CMD_UPDATE_POPUP,
        payload: { popupId: payload.popupId, popup: { rules: prevRules } } as UpdatePopupPayload,
      };
    },
  );

  engine.registerHandler<UpdatePopupSchedulePayload>(
    CMD_UPDATE_POPUP_SCHEDULE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const prev = popup.rules.scheduling as PopupSchedule | undefined;
      return setPopup(state, payload.popupId, {
        rules: { ...popup.rules, scheduling: prev ? { ...prev, ...payload.schedule } : (payload.schedule as PopupSchedule) },
      });
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return undefined;
      const prevRules = popup.rules;
      return {
        type: CMD_UPDATE_POPUP,
        payload: { popupId: payload.popupId, popup: { rules: prevRules } } as UpdatePopupPayload,
      };
    },
  );

  engine.registerHandler<UpdatePopupFrequencyPayload>(
    CMD_UPDATE_POPUP_FREQUENCY,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return state;
      const prev = popup.rules.frequency as PopupFrequencyConfig | undefined;
      return setPopup(state, payload.popupId, {
        rules: { ...popup.rules, frequency: prev ? { ...prev, ...payload.frequency } : (payload.frequency as PopupFrequencyConfig) },
      });
    },
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup) return undefined;
      const prevRules = popup.rules;
      return {
        type: CMD_UPDATE_POPUP,
        payload: { popupId: payload.popupId, popup: { rules: prevRules } } as UpdatePopupPayload,
      };
    },
  );

  // ── V5: editor-only — active locale being edited (no undo) ────────────────
  engine.registerHandler<SetActivePopupLocalePayload>(
    CMD_SET_ACTIVE_POPUP_LOCALE,
    (state, payload) => {
      const popup = state.document.popups?.[payload.popupId];
      if (!popup || state.editor.activePopupId !== payload.popupId) return state;
      const valid = payload.locale
        ? popup.locales?.some((l) => l.locale === payload.locale && l.rootNodeId)
        : true;
      return {
        ...state,
        editor: {
          ...state.editor,
          activePopupLocale: valid ? payload.locale : null,
          activePopupSelection: "content",
          selectedNodeIds: [],
        },
      };
    },
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
        editor: {
          ...state.editor,
          selectedNodeIds: newSelectedIds,
          activePopupSelection: isPopupContentSelection(newSelectedIds, state) ? "content" : state.editor.activePopupSelection,
        },
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
        editor: {
          ...state.editor,
          selectedNodeIds: validIds,
          activePopupSelection: isPopupContentSelection(validIds, state) ? "content" : state.editor.activePopupSelection,
        },
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

  engine.registerHandler<SetActivePopupPayload>(
    CMD_SET_ACTIVE_POPUP,
    (state, payload) => {
      const popup = payload.popupId ? state.document.popups?.[payload.popupId] : undefined;
      return {
        ...state,
        editor: {
          ...state.editor,
          activePopupId: payload.popupId,
          activePopupSelection: popup ? "shell" : null,
          activePopupVariantId: null,
          activePopupLocale: null,
          selectedNodeIds: [],
        },
      };
    },
  );

  engine.registerHandler<SetActivePopupSelectionPayload>(
    CMD_SET_ACTIVE_POPUP_SELECTION,
    (state, payload) => {
      const popup = state.editor.activePopupId
        ? state.document.popups?.[state.editor.activePopupId]
        : undefined;
      const selection = popup ? payload.selection : null;
      return {
        ...state,
        editor: {
          ...state.editor,
          activePopupSelection: selection,
          selectedNodeIds:
            selection === "content" && popup
              ? state.editor.selectedNodeIds.length > 0
                ? state.editor.selectedNodeIds
                : [popup.rootNodeId]
              : [],
        },
      };
    },
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

  // ── SET_THEME_COLORS ───────────────────────────────────────────────────────
  engine.registerHandler<SetThemeColorsPayload>(
    CMD_SET_THEME_COLORS,
    (state, payload) => ({
      ...state,
      document: {
        ...state.document,
        updatedAt: now(),
        themeColors: payload.colors,
      },
    }),
    (state) => ({
      type: CMD_SET_THEME_COLORS,
      payload: { colors: state.document.themeColors ?? [] },
    }),
  );
}

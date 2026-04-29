/**
 * normalizeAICommands — shared utility for transforming raw AI command
 * suggestions into the shape the CommandEngine expects.
 *
 * Steps:
 *  1. Remap payload.type → payload.componentType for ADD_NODE (model compat)
 *  2. Resolve temporary IDs (temp-*) to real UUIDs so nested ADD_NODE chains work
 *  3. Extract payload.name → follow-up RENAME_NODE commands
 *
 * Used by both AIAssistant (chat) and AISectionPopover (section generation).
 */

import type { AICommandSuggestion } from "./types";

/**
 * Component types that act as layout containers (can have children).
 * Exported for use in applyAICommandsProgressive (batch-by-depth rendering).
 */
export const CONTAINER_COMPONENT_TYPES = new Set([
  "Section", "Container", "Grid", "Column", "Repeater",
]);

/**
 * @param suggestions - Raw commands from the AI response
 * @param rootNodeId  - The node to treat as "root" / "ROOT" / "root-node" parentId aliases.
 *                      For the chat assistant this is the document's rootNodeId.
 *                      For section generation this is the section nodeId.
 */
export function normalizeAICommands(
  suggestions: AICommandSuggestion[],
  rootNodeId: string,
): AICommandSuggestion[] {

  // Map temp-id → real UUID
  // Pre-seed common root aliases so the AI can reference the root/section easily
  const idMap = new Map<string, string>();
  idMap.set("root", rootNodeId);
  idMap.set("ROOT", rootNodeId);
  idMap.set("root-node", rootNodeId);
  idMap.set("section", rootNodeId);
  idMap.set("SECTION", rootNodeId);

  const resolveId = (id: string | undefined | null): string | undefined => {
    if (!id) return undefined;
    if (idMap.has(id)) return idMap.get(id)!;
    return id;
  };

  const normalized: AICommandSuggestion[] = [];

  for (const s of suggestions) {
    const payload = { ...s.payload };

    if (s.type === "ADD_NODE") {
      // ── Fix field name: payload.type → payload.componentType ──
      if (!payload.componentType && payload.type) {
        payload.componentType = payload.type;
        delete payload.type;
      }

      // ── Resolve temp parentId → real UUID ──
      if (typeof payload.parentId === "string") {
        payload.parentId = resolveId(payload.parentId) ?? payload.parentId;
      }

      // ── Assign real UUID, track temp → real mapping ──
      const realId = crypto.randomUUID();
      const tempId = payload.nodeId as string | undefined;
      if (tempId) {
        idMap.set(tempId, realId);
      } else if (CONTAINER_COMPONENT_TYPES.has(String(payload.componentType))) {
        // Safety: If this is a container but has no nodeId, auto-assign one
        // This handles AI edge cases where nodeId is forgotten
      }
      payload.nodeId = realId;

      // ── Extract name → follow-up RENAME_NODE ──
      const nodeName = payload.name as string | undefined;
      delete payload.name;

      normalized.push({ ...s, payload });

      if (nodeName) {
        normalized.push({
          type: "RENAME_NODE",
          payload: { nodeId: realId, name: nodeName },
          description: `Rename → ${nodeName}`,
        });
      }
    } else {
      // For all other commands, resolve any nodeId that references a temp ID
      if (typeof payload.nodeId === "string") {
        payload.nodeId = resolveId(payload.nodeId) ?? payload.nodeId;
      }
      normalized.push({ ...s, payload });
    }
  }

  return normalized;
}

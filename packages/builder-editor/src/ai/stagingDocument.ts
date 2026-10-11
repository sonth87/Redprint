import type { BuilderDocument, Command } from "@ui-builder/builder-core";
import { createBuilder } from "@ui-builder/builder-core";

export interface AIChangeGroup {
  id: string;
  title: string;
  type: string;
  commands: Command[];
  enabled: boolean;
}

/**
 * Deep-clones a BuilderDocument for safe staging without mutating the original.
 */
export function createStagingDocument(baseDoc: BuilderDocument): BuilderDocument {
  return JSON.parse(JSON.stringify(baseDoc));
}

/**
 * Groups raw AI commands into human-readable logical change groups (e.g. by section, node, or action).
 */
export function groupCommandsByTarget(commands: Command[], document: BuilderDocument): AIChangeGroup[] {
  const groupsMap = new Map<string, Command[]>();

  for (const cmd of commands) {
    const payload = (cmd.payload ?? {}) as Record<string, unknown>;
    const targetId = String(payload.nodeId || payload.id || payload.parentId || "global");
    const node = document.nodes[targetId];

    let groupTitle: string;
    if (node) {
      const typeLabel = node.type || "Component";
      const nameLabel = node.props.name || node.props.text || targetId.slice(0, 8);
      groupTitle = `${typeLabel}: ${String(nameLabel).slice(0, 20)}`;
    } else if (targetId === document.rootNodeId) {
      groupTitle = "Page / Root Layout";
    } else {
      groupTitle = `New Element (${cmd.type})`;
    }

    if (!groupsMap.has(groupTitle)) {
      groupsMap.set(groupTitle, []);
    }
    groupsMap.get(groupTitle)!.push(cmd);
  }

  return Array.from(groupsMap.entries()).map(([title, cmds], index) => ({
    id: `group-${index}`,
    title,
    type: cmds[0]?.type ?? "UPDATE",
    commands: cmds,
    enabled: true,
  }));
}

/**
 * Applies a list of commands onto an isolated in-memory sandbox without touching the main document.
 */
export function applyCommandsToStaging(
  baseDoc: BuilderDocument,
  commands: Command[],
): {
  nextDoc: BuilderDocument;
  groups: AIChangeGroup[];
  success: boolean;
} {
  const groups = groupCommandsByTarget(commands, baseDoc);
  const clonedDoc = createStagingDocument(baseDoc);
  const sandbox = createBuilder({ document: clonedDoc });

  let allSuccess = true;
  for (const cmd of commands) {
    try {
      const res = sandbox.dispatch(cmd);
      if (!res.success) {
        allSuccess = false;
        console.warn("[StagingSandbox] Command execution rejected:", cmd.type, res.error);
      }
    } catch (err) {
      allSuccess = false;
      console.warn("[StagingSandbox] Command execution threw:", err);
    }
  }

  const nextDoc = sandbox.getState().document;
  return {
    nextDoc,
    groups,
    success: allSuccess,
  };
}

/**
 * Re-applies only enabled change groups to a cloned document.
 */
export function applySelectedGroupsToStaging(
  baseDoc: BuilderDocument,
  groups: AIChangeGroup[],
): BuilderDocument {
  const enabledCommands = groups.filter((g) => g.enabled).flatMap((g) => g.commands);
  const clonedDoc = createStagingDocument(baseDoc);
  const sandbox = createBuilder({ document: clonedDoc });

  for (const cmd of enabledCommands) {
    try {
      sandbox.dispatch(cmd);
    } catch (err) {
      console.warn("[StagingSandbox] Failed to apply enabled command:", cmd.type, err);
    }
  }

  return sandbox.getState().document;
}

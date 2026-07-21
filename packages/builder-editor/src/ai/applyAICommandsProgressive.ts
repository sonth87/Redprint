/**
 * applyAICommandsProgressive — applies normalized AI commands in two render phases.
 *
 * Prelude (synchronous): REMOVE_NODE commands used by full-page regeneration
 * Phase 1 (synchronous): container ADD_NODEs (Section, Grid, Column, ...)
 *   → React renders layout skeleton immediately
 *
 * Phase 2 (next requestAnimationFrame): leaf ADD_NODEs + all other commands
 *   → content fills in after containers are in the DOM
 *
 * This creates a progressive "build-up" effect instead of the entire section
 * appearing at once. Used by all three AI entry points:
 *   - usePageGenerator   (generate-page SSE, fire-and-forget per section)
 *   - useAISectionState  (ai-section popover, awaited)
 *   - AIAssistant        (chat assistant, awaited)
 *
 * Transactional apply (roadmap 02/07): when a `groupId` is provided, every
 * dispatched command carries that `groupId` plus `coalesce: false`, so the whole
 * batch collapses into a single atomic undo/redo block (one Ctrl+Z reverts a
 * section) — while still keeping each command's own inverse. If a command fails
 * mid-batch and `onGroupFailed` is provided, the caller can roll the partial
 * group back (see usePageGenerator).
 */

import { CONTAINER_COMPONENT_TYPES } from "./normalizeAICommands";
import type { AICommandSuggestion } from "./types";

export interface ApplyProgressiveOptions {
  preserveOrder?: boolean;
  /**
   * Atomic-undo group id for this batch (roadmap 02/07). When set, each dispatch
   * gets `{ groupId, coalesce: false }`. Omit to keep the pre-02/07 behavior
   * (each command is its own history entry).
   */
  groupId?: string;
  /**
   * Called if any command in the batch failed to dispatch. The caller decides
   * whether to roll back the partial group (e.g. `builder.undo()`) before
   * applying fallback content. Receives the `groupId` (if any).
   */
  onGroupFailed?: (groupId: string | undefined) => void;
}

export async function applyAICommandsProgressive(
  commands: AICommandSuggestion[],
  dispatch: (cmd: { type: string; payload: Record<string, unknown>; groupId?: string; coalesce?: boolean }) => void,
  filter: (cmd: AICommandSuggestion) => boolean = () => true,
  options: ApplyProgressiveOptions = {},
): Promise<void> {
  const { groupId, onGroupFailed } = options;
  let failed = false;

  // Dispatch one command with the group tag; record failures for rollback.
  const send = (cmd: AICommandSuggestion, phase: string) => {
    try {
      dispatch(
        groupId
          ? { type: cmd.type, payload: cmd.payload, groupId, coalesce: false }
          : { type: cmd.type, payload: cmd.payload },
      );
    } catch (err) {
      failed = true;
      console.warn(`[AI] ${phase} command failed (${cmd.type}):`, err);
    }
  };

  const finish = () => {
    if (failed) onGroupFailed?.(groupId);
  };

  if (options.preserveOrder) {
    for (const cmd of commands) {
      if (!filter(cmd)) continue;
      send(cmd, "Ordered");
    }
    finish();
    return;
  }

  const containers: AICommandSuggestion[] = [];
  const leaves: AICommandSuggestion[] = [];
  const prelude: AICommandSuggestion[] = [];

  for (const cmd of commands) {
    if (!filter(cmd)) continue;
    if (cmd.type === "REMOVE_NODE") {
      prelude.push(cmd);
      continue;
    }
    const isContainer =
      cmd.type === "ADD_NODE" &&
      CONTAINER_COMPONENT_TYPES.has(String(cmd.payload.componentType));
    (isContainer ? containers : leaves).push(cmd);
  }

  // Prelude: clear existing page content before adding the new skeleton.
  for (const cmd of prelude) send(cmd, "Prelude");

  // Phase 1: layout containers establish the structural skeleton
  for (const cmd of containers) send(cmd, "Container");

  if (leaves.length === 0) {
    finish();
    return;
  }

  // Yield to React so it can render containers before we add their children
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Phase 2: leaf nodes and non-ADD_NODE commands fill in content
  for (const cmd of leaves) send(cmd, "Leaf");
  finish();
}

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
 */

import { CONTAINER_COMPONENT_TYPES } from "./normalizeAICommands";
import type { AICommandSuggestion } from "./types";

/**
 * @param commands  Already-normalized commands (output of normalizeAICommands).
 * @param dispatch  Builder dispatch function.
 * @param filter    Allowlist predicate — return false to skip a command.
 *                  Defaults to allowing all commands.
 */
export async function applyAICommandsProgressive(
  commands: AICommandSuggestion[],
  dispatch: (cmd: { type: string; payload: Record<string, unknown> }) => void,
  filter: (cmd: AICommandSuggestion) => boolean = () => true,
  options: { preserveOrder?: boolean } = {},
): Promise<void> {
  if (options.preserveOrder) {
    for (const cmd of commands) {
      if (!filter(cmd)) continue;
      try {
        dispatch({ type: cmd.type, payload: cmd.payload });
      } catch (err) {
        console.warn(`[AI] Command failed (${cmd.type}):`, err);
      }
    }
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
  for (const cmd of prelude) {
    try {
      dispatch({ type: cmd.type, payload: cmd.payload });
    } catch (err) {
      console.warn(`[AI] Prelude command failed (${cmd.type}):`, err);
    }
  }

  // Phase 1: layout containers establish the structural skeleton
  for (const cmd of containers) {
    try {
      dispatch({ type: cmd.type, payload: cmd.payload });
    } catch (err) {
      console.warn(`[AI] Container command failed (${cmd.type}):`, err);
    }
  }

  if (leaves.length === 0) return;

  // Yield to React so it can render containers before we add their children
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // Phase 2: leaf nodes and non-ADD_NODE commands fill in content
  for (const cmd of leaves) {
    try {
      dispatch({ type: cmd.type, payload: cmd.payload });
    } catch (err) {
      console.warn(`[AI] Leaf command failed (${cmd.type}):`, err);
    }
  }
}

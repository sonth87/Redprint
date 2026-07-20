/**
 * ALLOWED_AI_COMMANDS — the single, shared whitelist of builder command types an AI
 * suggestion may dispatch. Destructive/system commands (MOVE_NODE, REMOVE_NODES,
 * popup/campaign commands, SET_THEME_COLORS, ...) are intentionally excluded —
 * deny-by-default. Adding a command here requires:
 *   1. Documenting it in apps/api/src/services/command-reference.ts (what the LLM is taught)
 *   2. Adding it here (what the client will actually dispatch)
 *   3. A test asserting the two stay in sync (see AIAssistant tests)
 *   4. Updating .claude/docs/AI_ASSISTANT.md
 * in the same change. See docs/roadmap/00-bugfixes/05-command-whitelist-mismatch.md.
 *
 * Previously this set was duplicated independently in AIAssistant.tsx (chat path) and
 * usePageGenerator.ts (full-page path), and the two had drifted: the chat copy was
 * missing TOGGLE_RESPONSIVE_HIDDEN and RESET_RESPONSIVE_STYLE, silently dropping valid
 * LLM output that the server's COMMAND_REFERENCE explicitly taught the model to use.
 */
export const ALLOWED_AI_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "TOGGLE_RESPONSIVE_HIDDEN",
  "RESET_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  // Only generated internally by fullPageMode (REMOVE_NODE for existing root children),
  // never suggested by the LLM directly — see command-reference.ts.
  "REMOVE_NODE",
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_INTERACTIONS",
]);

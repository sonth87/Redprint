import { describe, expect, it } from "vitest";
import { COMMAND_REFERENCE } from "./command-reference.js";

/**
 * Contract test — see docs/roadmap/00-bugfixes/05-command-whitelist-mismatch.md.
 *
 * The client's whitelist (packages/builder-editor/src/ai/allowedCommands.ts) must allow
 * every command type this file teaches the LLM to emit, plus REMOVE_NODE (backend-only,
 * generated for fullPageMode — never taught here, but must still be dispatchable).
 * apps/api cannot import client source (separate workspace), so the client mirrors this
 * same expected list in allowedCommands.test.ts — keep the two in sync.
 */
function extractTaughtCommandTypes(reference: string): string[] {
  const matches = [...reference.matchAll(/^### ([A-Z_]+) —/gm)];
  return matches.map((m) => m[1]!);
}

describe("COMMAND_REFERENCE", () => {
  it("teaches exactly the command types the client whitelist expects (minus internal-only REMOVE_NODE)", () => {
    const taught = extractTaughtCommandTypes(COMMAND_REFERENCE).sort();
    const expected = [
      "ADD_NODE",
      "UPDATE_STYLE",
      "UPDATE_PROPS",
      "RENAME_NODE",
      "UPDATE_RESPONSIVE_STYLE",
      "UPDATE_RESPONSIVE_PROPS",
      "TOGGLE_RESPONSIVE_HIDDEN",
      "RESET_RESPONSIVE_STYLE",
      "DUPLICATE_NODE",
      "UPDATE_CANVAS_CONFIG",
      "UPDATE_INTERACTIONS",
    ].sort();
    expect(taught).toEqual(expected);
  });

  it("never teaches REMOVE_NODE (backend-only, generated internally for fullPageMode)", () => {
    expect(extractTaughtCommandTypes(COMMAND_REFERENCE)).not.toContain("REMOVE_NODE");
  });
});

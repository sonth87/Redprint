import { describe, expect, it } from "vitest";
import { normalizeAICommands } from "./normalizeAICommands";
import type { AICommandSuggestion } from "./types";

describe("normalizeAICommands", () => {
  it("preserves backend-stable ai-prefixed node IDs", () => {
    const commands: AICommandSuggestion[] = [
      {
        type: "ADD_NODE",
        payload: { nodeId: "ai-job-0-hero", componentType: "Section", parentId: "root" },
        description: "section",
      },
      {
        type: "ADD_NODE",
        payload: { nodeId: "ai-job-0-container", componentType: "Container", parentId: "ai-job-0-hero" },
        description: "container",
      },
    ];

    const normalized = normalizeAICommands(commands, "root-real");

    expect(normalized[0]?.payload.nodeId).toBe("ai-job-0-hero");
    expect(normalized[0]?.payload.parentId).toBe("root-real");
    expect(normalized[1]?.payload.nodeId).toBe("ai-job-0-container");
    expect(normalized[1]?.payload.parentId).toBe("ai-job-0-hero");
  });

  it("still resolves temp IDs to generated IDs", () => {
    const commands: AICommandSuggestion[] = [
      {
        type: "ADD_NODE",
        payload: { nodeId: "temp-grid", componentType: "Grid", parentId: "root" },
        description: "grid",
      },
      {
        type: "ADD_NODE",
        payload: { componentType: "Text", parentId: "temp-grid" },
        description: "text",
      },
    ];

    const normalized = normalizeAICommands(commands, "root-real");

    expect(normalized[0]?.payload.nodeId).not.toBe("temp-grid");
    expect(normalized[1]?.payload.parentId).toBe(normalized[0]?.payload.nodeId);
  });
});

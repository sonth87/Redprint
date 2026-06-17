import { describe, expect, it } from "vitest";
import { applyAICommandsProgressive } from "./applyAICommandsProgressive";
import type { AICommandSuggestion } from "./types";

describe("applyAICommandsProgressive", () => {
  it("dispatches REMOVE_NODE before container skeleton commands", async () => {
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;

    const commands: AICommandSuggestion[] = [
      { type: "REMOVE_NODE", payload: { nodeId: "old" }, description: "remove" },
      { type: "ADD_NODE", payload: { nodeId: "ai-section", componentType: "Section", parentId: "root" }, description: "section" },
      { type: "ADD_NODE", payload: { nodeId: "ai-text", componentType: "Text", parentId: "ai-section" }, description: "text" },
    ];
    const order: string[] = [];

    await applyAICommandsProgressive(commands, (cmd) => order.push(`${cmd.type}:${cmd.payload.nodeId}`));

    expect(order).toEqual(["REMOVE_NODE:old", "ADD_NODE:ai-section", "ADD_NODE:ai-text"]);
    globalThis.requestAnimationFrame = originalRaf;
  });
});

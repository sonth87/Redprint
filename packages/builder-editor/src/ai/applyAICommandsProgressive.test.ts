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

  // ── Transactional apply (roadmap 02/07) ──────────────────────────────────

  function syncRaf<T>(fn: () => Promise<T>): Promise<T> {
    const original = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as typeof requestAnimationFrame;
    return fn().finally(() => {
      globalThis.requestAnimationFrame = original;
    });
  }

  it("tags every command with the groupId and coalesce:false when a groupId is given", async () => {
    const commands: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "s", componentType: "Section", parentId: "root" }, description: "" },
      { type: "ADD_NODE", payload: { nodeId: "t", componentType: "Text", parentId: "s" }, description: "" },
    ];
    const seen: Array<{ groupId?: string; coalesce?: boolean }> = [];
    await syncRaf(() =>
      applyAICommandsProgressive(commands, (cmd) => seen.push({ groupId: cmd.groupId, coalesce: cmd.coalesce }), undefined, {
        groupId: "ai-sec-1",
      }),
    );
    expect(seen).toHaveLength(2);
    expect(seen.every((c) => c.groupId === "ai-sec-1" && c.coalesce === false)).toBe(true);
  });

  it("does NOT tag commands when no groupId is given (pre-02/07 behavior)", async () => {
    const commands: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "s", componentType: "Section", parentId: "root" }, description: "" },
    ];
    const seen: Array<{ groupId?: string; coalesce?: boolean }> = [];
    await syncRaf(() => applyAICommandsProgressive(commands, (cmd) => seen.push({ groupId: cmd.groupId, coalesce: cmd.coalesce })));
    expect(seen[0]).toEqual({ groupId: undefined, coalesce: undefined });
  });

  it("calls onGroupFailed when a command throws mid-batch (rollback hook)", async () => {
    const commands: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "s", componentType: "Section", parentId: "root" }, description: "" },
      { type: "ADD_NODE", payload: { nodeId: "bad", componentType: "Text", parentId: "s" }, description: "" },
    ];
    let failedGroup: string | undefined | "not-called" = "not-called";
    await syncRaf(() =>
      applyAICommandsProgressive(
        commands,
        (cmd) => {
          if (cmd.payload.nodeId === "bad") throw new Error("boom");
        },
        undefined,
        { groupId: "ai-sec-2", onGroupFailed: (g) => (failedGroup = g) },
      ),
    );
    expect(failedGroup).toBe("ai-sec-2");
  });

  it("does not call onGroupFailed when all commands succeed", async () => {
    const commands: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "s", componentType: "Section", parentId: "root" }, description: "" },
    ];
    let called = false;
    await syncRaf(() =>
      applyAICommandsProgressive(commands, () => {}, undefined, { groupId: "g", onGroupFailed: () => (called = true) }),
    );
    expect(called).toBe(false);
  });
});

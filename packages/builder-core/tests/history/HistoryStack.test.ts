import { describe, it, expect } from "vitest";
import { HistoryStack } from "../../src/history/HistoryStack";
import type { HistoryEntry } from "../../src/history/types";

function makeEntry(groupId?: string): HistoryEntry {
  return {
    id: Math.random().toString(),
    command: { type: "TEST", payload: null },
    inverseCommand: { type: "TEST_INVERSE", payload: null },
    timestamp: Date.now(),
    groupId,
    description: "Test",
  };
}

describe("HistoryStack", () => {
  it("canUndo is false when empty", () => {
    const stack = new HistoryStack();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it("push + undo returns the pushed entry", () => {
    const stack = new HistoryStack();
    const entry = makeEntry();
    stack.push(entry);
    const undone = stack.undo();
    expect(undone).toHaveLength(1);
    expect(undone[0]).toBe(entry);
  });

  it("undo empties past stack", () => {
    const stack = new HistoryStack();
    stack.push(makeEntry());
    stack.undo();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
  });

  it("redo re-applies undone entry", () => {
    const stack = new HistoryStack();
    const entry = makeEntry();
    stack.push(entry);
    stack.undo();
    const redone = stack.redo();
    expect(redone).toHaveLength(1);
    expect(redone[0]).toBe(entry);
  });

  it("pushing after undo clears future stack", () => {
    const stack = new HistoryStack();
    stack.push(makeEntry());
    stack.undo();
    stack.push(makeEntry());
    expect(stack.canRedo).toBe(false);
  });

  it("respects maxSize — oldest entries are dropped", () => {
    const stack = new HistoryStack(3);
    stack.push(makeEntry());
    stack.push(makeEntry());
    stack.push(makeEntry());
    stack.push(makeEntry()); // should trim oldest
    expect(stack.pastCount).toBe(3);
  });

  it("groups entries with same groupId for atomic undo", () => {
    const stack = new HistoryStack();
    const g = "g1";
    const e1 = makeEntry(g);
    const e2 = makeEntry(g);
    const e3 = makeEntry(g);
    stack.push(e1);
    stack.push(e2);
    stack.push(e3);
    const undone = stack.undo();
    // All 3 should undo together
    expect(undone).toHaveLength(3);
    expect(stack.canUndo).toBe(false);
  });

  it("undo returns empty array when nothing to undo", () => {
    const stack = new HistoryStack();
    expect(stack.undo()).toEqual([]);
  });

  it("redo returns empty array when nothing to redo", () => {
    const stack = new HistoryStack();
    expect(stack.redo()).toEqual([]);
  });

  it("clear resets all stacks", () => {
    const stack = new HistoryStack();
    stack.push(makeEntry());
    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });
});

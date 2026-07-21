import { describe, it, expect } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import type { ComponentDefinition } from "../../src/registry/types";

const textComp: ComponentDefinition = {
  type: "text",
  name: "Text",
  defaultProps: {},
  defaultStyle: {},
  component: () => null as never,
};

function makeBuilder() {
  const b = createBuilder();
  b.registry.registerComponent(textComp);
  return b;
}

describe("undo/redo integration — CommandEngine + HistoryStack", () => {
  it("undo does not push REMOVE_NODE to history so redo still works", () => {
    const builder = makeBuilder();
    const root = builder.getState().document.rootNodeId;

    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n1", parentId: root, componentType: "text" } });
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n2", parentId: root, componentType: "text" } });
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n3", parentId: root, componentType: "text" } });

    expect(builder.canUndo).toBe(true);
    expect(builder.canRedo).toBe(false);
    expect(builder.getState().document.nodes["n3"]).toBeDefined();

    // Undo #1: should remove n3
    builder.undo();
    expect(builder.getState().document.nodes["n3"]).toBeUndefined();
    expect(builder.canUndo).toBe(true);
    expect(builder.canRedo).toBe(true);

    // Undo #2: should remove n2, NOT restore n3
    builder.undo();
    expect(builder.getState().document.nodes["n3"]).toBeUndefined();
    expect(builder.getState().document.nodes["n2"]).toBeUndefined();
    expect(builder.canUndo).toBe(true);
    expect(builder.canRedo).toBe(true);

    // Undo #3: should remove n1
    builder.undo();
    expect(builder.getState().document.nodes["n1"]).toBeUndefined();
    expect(builder.canUndo).toBe(false);
    expect(builder.canRedo).toBe(true);

    // Redo #1: should restore n1
    builder.redo();
    expect(builder.getState().document.nodes["n1"]).toBeDefined();
    expect(builder.getState().document.nodes["n2"]).toBeUndefined();
    expect(builder.canRedo).toBe(true);

    // Redo #2: should restore n2
    builder.redo();
    expect(builder.getState().document.nodes["n2"]).toBeDefined();
    expect(builder.getState().document.nodes["n3"]).toBeUndefined();

    // Redo #3: should restore n3
    builder.redo();
    expect(builder.getState().document.nodes["n3"]).toBeDefined();
    expect(builder.canRedo).toBe(false);
  });

  it("adding after undo clears redo future", () => {
    const builder = makeBuilder();
    const root = builder.getState().document.rootNodeId;

    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n1", parentId: root, componentType: "text" } });
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n2", parentId: root, componentType: "text" } });

    builder.undo(); // undo n2
    expect(builder.canRedo).toBe(true);

    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n3", parentId: root, componentType: "text" } });
    // Adding after undo should kill redo
    expect(builder.canRedo).toBe(false);
  });

  it("undo/redo of REMOVE_NODE works correctly", () => {
    const builder = makeBuilder();
    const root = builder.getState().document.rootNodeId;

    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n1", parentId: root, componentType: "text" } });
    builder.dispatch({ type: "REMOVE_NODE", payload: { nodeId: "n1" } });

    expect(builder.getState().document.nodes["n1"]).toBeUndefined();

    builder.undo(); // should restore n1
    expect(builder.getState().document.nodes["n1"]).toBeDefined();

    builder.redo(); // should remove n1 again
    expect(builder.getState().document.nodes["n1"]).toBeUndefined();
  });
});

describe("grouped undo — batch vs gesture coalescing (roadmap 02/07)", () => {
  it("a batch of ADD_NODEs sharing a groupId with coalesce:false undoes atomically", () => {
    const builder = makeBuilder();
    const root = builder.getState().document.rootNodeId;
    const groupId = "ai-section-1";

    // Three DIFFERENT nodes under one groupId, opting out of coalescing.
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n1", parentId: root, componentType: "text" }, groupId, coalesce: false });
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n2", parentId: root, componentType: "text" }, groupId, coalesce: false });
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n3", parentId: root, componentType: "text" }, groupId, coalesce: false });

    expect(builder.getState().document.nodes["n1"]).toBeDefined();
    expect(builder.getState().document.nodes["n2"]).toBeDefined();
    expect(builder.getState().document.nodes["n3"]).toBeDefined();

    // A single undo must remove ALL three (atomic group), not just the last.
    builder.undo();
    expect(builder.getState().document.nodes["n1"]).toBeUndefined();
    expect(builder.getState().document.nodes["n2"]).toBeUndefined();
    expect(builder.getState().document.nodes["n3"]).toBeUndefined();
    expect(builder.canUndo).toBe(false);

    // A single redo restores all three.
    builder.redo();
    expect(builder.getState().document.nodes["n1"]).toBeDefined();
    expect(builder.getState().document.nodes["n2"]).toBeDefined();
    expect(builder.getState().document.nodes["n3"]).toBeDefined();
  });

  it("a gesture stream (same node, default coalesce) stays a single history entry", () => {
    const builder = makeBuilder();
    const root = builder.getState().document.rootNodeId;
    builder.dispatch({ type: "ADD_NODE", payload: { nodeId: "n1", parentId: root, componentType: "text" } });

    const gestureGroupId = "gesture-1";
    // Rapid updates to the SAME node under one groupId (no coalesce flag = default true).
    builder.dispatch({ type: "UPDATE_STYLE", payload: { nodeId: "n1", style: { left: "10px" } }, groupId: gestureGroupId });
    builder.dispatch({ type: "UPDATE_STYLE", payload: { nodeId: "n1", style: { left: "20px" } }, groupId: gestureGroupId });
    builder.dispatch({ type: "UPDATE_STYLE", payload: { nodeId: "n1", style: { left: "30px" } }, groupId: gestureGroupId });

    expect(builder.getState().document.nodes["n1"]!.style?.left).toBe("30px");

    // One undo reverts the whole gesture back to pre-gesture (no left set).
    builder.undo();
    expect(builder.getState().document.nodes["n1"]!.style?.left).toBeUndefined();
    // The node itself is still there (only the gesture was undone).
    expect(builder.getState().document.nodes["n1"]).toBeDefined();
  });
});

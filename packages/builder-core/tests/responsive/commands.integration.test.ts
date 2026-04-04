import { describe, it, expect } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import type { ComponentDefinition } from "../../src/registry/types";

const textComp: ComponentDefinition = {
  type: "text",
  name: "Text",
  defaultProps: { text: "Hello" },
  defaultStyle: { fontSize: "16px" },
  component: () => null as never,
};

function makeBuilder() {
  const b = createBuilder();
  b.registry.registerComponent(textComp);
  return b;
}

function addNode(b: ReturnType<typeof makeBuilder>, nodeId: string) {
  const root = b.getState().document.rootNodeId;
  b.dispatch({ type: "ADD_NODE", payload: { nodeId, parentId: root, componentType: "text" } });
}

// ── TOGGLE_RESPONSIVE_HIDDEN ─────────────────────────────────────────────

describe("CMD_TOGGLE_RESPONSIVE_HIDDEN", () => {
  it("sets responsiveHidden[mobile]=true for given nodeId", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: true } });
    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveHidden?.mobile).toBe(true);
  });

  it("removes responsiveHidden[mobile] when hidden=false", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: true } });
    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: false } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveHidden?.mobile).toBeUndefined();
  });

  it("sets responsiveHidden to undefined when all keys removed", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: true } });
    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: false } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveHidden).toBeUndefined();
  });

  it("does not affect desktop visibility when hiding on mobile", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: true } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveHidden?.desktop).toBeUndefined();
    expect(node?.hidden).toBeFalsy();
  });

  it("is reversible via undo", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "n1", breakpoint: "mobile", hidden: true } });
    expect(b.getState().document.nodes["n1"]?.responsiveHidden?.mobile).toBe(true);

    b.undo();
    expect(b.getState().document.nodes["n1"]?.responsiveHidden?.mobile).toBeFalsy();
  });

  it("ignores unknown nodeId gracefully", () => {
    const b = makeBuilder();
    expect(() => {
      b.dispatch({ type: "TOGGLE_RESPONSIVE_HIDDEN", payload: { nodeId: "nonexistent", breakpoint: "mobile", hidden: true } });
    }).not.toThrow();
  });
});

// ── UPDATE_RESPONSIVE_PROPS ──────────────────────────────────────────────

describe("CMD_UPDATE_RESPONSIVE_PROPS", () => {
  it("sets responsiveProps override for given breakpoint", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { text: "Mobile text" } } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveProps?.mobile?.text).toBe("Mobile text");
  });

  it("merges into existing override (does not replace unrelated keys)", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { text: "Mobile text" } } });
    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { color: "red" } } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveProps?.mobile?.text).toBe("Mobile text");
    expect(node?.responsiveProps?.mobile?.color).toBe("red");
  });

  it("does not affect base node.props", () => {
    const b = makeBuilder();
    addNode(b, "n1");
    const basePropsBefore = { ...b.getState().document.nodes["n1"]?.props };

    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { text: "Override" } } });

    expect(b.getState().document.nodes["n1"]?.props).toEqual(basePropsBefore);
  });

  it("different breakpoints are stored independently", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { text: "Mobile" } } });
    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "tablet", props: { text: "Tablet" } } });

    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveProps?.mobile?.text).toBe("Mobile");
    expect(node?.responsiveProps?.tablet?.text).toBe("Tablet");
  });

  it("is reversible via undo", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_PROPS", payload: { nodeId: "n1", breakpoint: "mobile", props: { text: "Override" } } });
    expect(b.getState().document.nodes["n1"]?.responsiveProps?.mobile?.text).toBe("Override");

    b.undo();
    // After undo the override should no longer be "Override" (restored to prior state = undefined)
    expect(b.getState().document.nodes["n1"]?.responsiveProps?.mobile?.text).toBeUndefined();
  });
});

// ── RESET_RESPONSIVE_STYLE ───────────────────────────────────────────────

describe("CMD_RESET_RESPONSIVE_STYLE", () => {
  it("removes specified keys from responsiveStyle[breakpoint]", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    // First add a mobile style override
    b.dispatch({ type: "UPDATE_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", style: { fontSize: "12px", color: "red" } } });
    expect(b.getState().document.nodes["n1"]?.responsiveStyle.mobile?.fontSize).toBe("12px");

    // Reset only fontSize
    b.dispatch({ type: "RESET_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", keys: ["fontSize"] } });
    const node = b.getState().document.nodes["n1"];
    expect(node?.responsiveStyle.mobile?.fontSize).toBeUndefined();
    expect(node?.responsiveStyle.mobile?.color).toBe("red"); // untouched
  });

  it("removes responsiveStyle[breakpoint] entirely when all keys deleted", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", style: { fontSize: "12px" } } });
    b.dispatch({ type: "RESET_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", keys: ["fontSize"] } });

    expect(b.getState().document.nodes["n1"]?.responsiveStyle.mobile).toBeUndefined();
  });

  it("is reversible via undo", () => {
    const b = makeBuilder();
    addNode(b, "n1");

    b.dispatch({ type: "UPDATE_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", style: { fontSize: "12px" } } });
    b.dispatch({ type: "RESET_RESPONSIVE_STYLE", payload: { nodeId: "n1", breakpoint: "mobile", keys: ["fontSize"] } });

    expect(b.getState().document.nodes["n1"]?.responsiveStyle.mobile?.fontSize).toBeUndefined();

    b.undo();
    expect(b.getState().document.nodes["n1"]?.responsiveStyle.mobile?.fontSize).toBe("12px");
  });
});

// ── SET_CANVAS_MODE ──────────────────────────────────────────────────────

describe("CMD_SET_CANVAS_MODE", () => {
  it("sets canvasMode to dual", () => {
    const b = makeBuilder();
    b.dispatch({ type: "SET_CANVAS_MODE", payload: { canvasMode: "dual" } });
    expect(b.getState().editor.canvasMode).toBe("dual");
  });

  it("sets canvasMode back to single", () => {
    const b = makeBuilder();
    b.dispatch({ type: "SET_CANVAS_MODE", payload: { canvasMode: "dual" } });
    b.dispatch({ type: "SET_CANVAS_MODE", payload: { canvasMode: "single" } });
    expect(b.getState().editor.canvasMode).toBe("single");
  });

  it("defaults to single on init", () => {
    const b = makeBuilder();
    expect(b.getState().editor.canvasMode).toBe("single");
  });

  it("is not undoable (editor-only state change)", () => {
    const b = makeBuilder();
    b.dispatch({ type: "SET_CANVAS_MODE", payload: { canvasMode: "dual" } });
    b.undo(); // Nothing to undo (no reversible ops), canvasMode should stay
    // Either undo does nothing (no reversible ops pushed) or remains:
    expect(b.getState().editor.canvasMode).toBe("dual");
  });
});

import { describe, it, expect } from "vitest";
import { ComponentRegistry } from "../../src/registry/ComponentRegistry";
import type { ComponentDefinition } from "../../src/registry/types";

function makeDef(type: string, category = "basic"): ComponentDefinition {
  return {
    type,
    name: type,
    category,
    version: "1.0.0",
    capabilities: {
      canContainChildren: false,
      canResize: true,
      canTriggerEvents: true,
      canBindData: false,
      canBeHidden: true,
      canBeLocked: true,
    },
    propSchema: [],
    defaultProps: {},
    editorRenderer: () => null,
    runtimeRenderer: () => null,
  };
}

describe("ComponentRegistry", () => {
  it("registers and retrieves a component", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text"));
    expect(reg.getComponent("text")?.type).toBe("text");
  });

  it("returns undefined for unknown type", () => {
    const reg = new ComponentRegistry();
    expect(reg.getComponent("unknown")).toBeUndefined();
  });

  it("unregisters a component", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("image"));
    expect(reg.unregisterComponent("image")).toBe(true);
    expect(reg.getComponent("image")).toBeUndefined();
  });

  it("unregisterComponent returns false for unknown type", () => {
    const reg = new ComponentRegistry();
    expect(reg.unregisterComponent("none")).toBe(false);
  });

  it("listComponents returns all components", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text", "text"));
    reg.registerComponent(makeDef("image", "media"));
    expect(reg.listComponents()).toHaveLength(2);
  });

  it("filters by category", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text", "text"));
    reg.registerComponent(makeDef("image", "media"));
    expect(reg.listComponents({ category: "media" })).toHaveLength(1);
    expect(reg.listComponents({ category: "media" })[0]!.type).toBe("image");
  });

  it("filters by search", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text-block", "text"));
    reg.registerComponent(makeDef("button", "ui"));
    expect(reg.listComponents({ search: "text" })).toHaveLength(1);
  });

  it("has() returns correct result", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text"));
    expect(reg.has("text")).toBe(true);
    expect(reg.has("other")).toBe(false);
  });

  it("getCategories returns unique categories", () => {
    const reg = new ComponentRegistry();
    reg.registerComponent(makeDef("text", "basic"));
    reg.registerComponent(makeDef("image", "basic"));
    reg.registerComponent(makeDef("video", "media"));
    const cats = reg.getCategories();
    expect(cats).toHaveLength(2);
    expect(cats).toContain("basic");
    expect(cats).toContain("media");
  });
});

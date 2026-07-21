import { describe, expect, it } from "vitest";
import { createBuilder } from "@ui-builder/builder-core";
import type { ComponentDefinition } from "@ui-builder/builder-core";
import { buildAIContext } from "./buildAIContext";

function makeComponent(overrides: Partial<ComponentDefinition> & { type: string }): ComponentDefinition {
  return {
    name: overrides.type,
    category: "content",
    version: "1.0.0",
    capabilities: { canContainChildren: false, canResize: true, canTriggerEvents: false, canBindData: false, canBeHidden: true, canBeLocked: true },
    propSchema: [],
    defaultProps: {},
    editorRenderer: () => null,
    runtimeRenderer: () => null,
    ...overrides,
  };
}

describe("buildAIContext — aiHints (roadmap 03/01)", () => {
  it("serializes aiHints onto availableComponents when present", () => {
    const builder = createBuilder();
    const withHints = makeComponent({
      type: "PricingTable",
      aiHints: {
        purpose: "Displays pricing tiers.",
        bestFor: ["pricing sections"],
        sectionAffinity: ["pricing"],
        contentSlots: { heading: "title" },
        fallbackTo: ["Grid"],
        examples: ["3-tier pricing table"],
      },
    });

    const ctx = buildAIContext(builder.getState(), [withHints]);
    const entry = ctx.availableComponents.find((c) => c.type === "PricingTable");
    expect(entry?.aiHints).toEqual({
      purpose: "Displays pricing tiers.",
      bestFor: ["pricing sections"],
      sectionAffinity: ["pricing"],
      contentSlots: { heading: "title" },
      fallbackTo: ["Grid"],
      examples: ["3-tier pricing table"],
    });
  });

  it("omits aiHints for a component that doesn't declare it", () => {
    const builder = createBuilder();
    const plain = makeComponent({ type: "PlainThing" });
    const ctx = buildAIContext(builder.getState(), [plain]);
    expect(ctx.availableComponents.find((c) => c.type === "PlainThing")?.aiHints).toBeUndefined();
  });

  it("caps bestFor to 5 and examples to 3", () => {
    const builder = createBuilder();
    const verbose = makeComponent({
      type: "Verbose",
      aiHints: {
        purpose: "x",
        bestFor: ["a", "b", "c", "d", "e", "f", "g"],
        examples: ["1", "2", "3", "4", "5"],
      },
    });
    const ctx = buildAIContext(builder.getState(), [verbose]);
    const hints = ctx.availableComponents.find((c) => c.type === "Verbose")?.aiHints;
    expect(hints?.bestFor).toHaveLength(5);
    expect(hints?.examples).toHaveLength(3);
  });

  it("excludes components with excludeFromAI:true from availableComponents, manifest, and nesting rules", () => {
    const builder = createBuilder();
    const visible = makeComponent({ type: "Visible", capabilities: { canContainChildren: true, canResize: true, canTriggerEvents: false, canBindData: false, canBeHidden: true, canBeLocked: true } });
    const hidden = makeComponent({
      type: "InternalOnly",
      aiHints: { purpose: "internal", bestFor: [], excludeFromAI: true },
    });

    const ctx = buildAIContext(builder.getState(), [visible, hidden]);

    expect(ctx.availableComponents.map((c) => c.type)).toEqual(["Visible"]);
    expect(ctx.availableComponents.map((c) => c.type)).not.toContain("InternalOnly");
    expect(ctx.componentsManifest).not.toContain("InternalOnly");
  });
});

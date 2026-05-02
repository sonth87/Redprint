import { describe, expect, it } from "vitest";
import { documentToPreset, presetToDocument } from "../../src/presets/document-adapter";
import type { PresetDefinition } from "../../src/presets/schema";

describe("preset document adapter", () => {
  it("builds a BuilderDocument from a preset and preserves rich node data", () => {
    const preset: PresetDefinition = {
      id: "section.hero.split-left",
      version: "2.0.0",
      kind: "section",
      componentType: "Section",
      name: "Hero Split Left",
      root: {
        id: "root",
        componentType: "Section",
        role: "hero-root",
        style: { paddingTop: "80px" },
        children: [
          {
            id: "title",
            componentType: "Text",
            name: "Title",
            props: { text: "<h1>Hello</h1>" },
            responsiveProps: {
              mobile: { text: "<h2>Hello</h2>" },
            },
            responsiveStyle: {
              mobile: { fontSize: "32px" },
            },
            interactions: [
              {
                id: "click-1",
                trigger: "click",
                actions: [{ type: "emit", event: "hero:title-click" }],
              },
            ],
            slot: "content",
            editor: {
              label: "Hero Title",
              editable: true,
            },
            constraints: {
              allowedTransforms: ["replace"],
            },
          },
        ],
      },
    };

    const doc = presetToDocument(preset);
    const titleNode = doc.nodes.title;

    expect(doc.rootNodeId).toBe("root");
    expect(titleNode.responsiveProps?.mobile).toEqual({ text: "<h2>Hello</h2>" });
    expect(titleNode.responsiveStyle?.mobile).toEqual({ fontSize: "32px" });
    expect(titleNode.interactions).toHaveLength(1);
    expect(titleNode.slot).toBe("content");
    expect(titleNode.metadata?.pluginData?.["@ui-builder/preset-node"]).toBeDefined();
  });

  it("round-trips a preset through document conversion", () => {
    const preset: PresetDefinition = {
      id: "composite.testimonial.card",
      version: "2.0.0",
      kind: "composite",
      componentType: "Container",
      name: "Testimonial Card",
      category: "cards",
      tags: ["testimonial"],
      purpose: "testimonials",
      root: {
        id: "root",
        componentType: "Container",
        children: [
          {
            id: "quote",
            componentType: "Text",
            role: "quote",
            props: { text: "<p>Fast and flexible.</p>" },
          },
        ],
      },
    };

    const roundTripped = documentToPreset(presetToDocument(preset), preset);

    expect(roundTripped).toEqual(preset);
  });
});

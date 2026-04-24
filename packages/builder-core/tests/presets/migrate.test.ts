import { describe, expect, it } from "vitest";
import { detectPresetVersion, migrateComponentPreset, migratePaletteItem, migratePreset } from "../../src/presets/migrate";
import type { PaletteItem } from "../../src/presets/palette-types";
import type { PresetDefinition } from "../../src/presets/schema";
import type { ComponentPreset } from "../../src/presets/types";

describe("preset migrations", () => {
  it("migrates a legacy ComponentPreset into a PresetDefinition", () => {
    const legacy: ComponentPreset = {
      id: "button-primary",
      componentType: "Button",
      name: "Primary Button",
      category: "buttons",
      props: { text: "Buy now" },
      style: { borderRadius: "999px" },
      tags: ["button", "cta"],
    };

    const migrated = migrateComponentPreset(legacy);

    expect(migrated.kind).toBe("variant");
    expect(migrated.category).toBe("buttons");
    expect(migrated.root.props).toEqual({ text: "Buy now" });
    expect(migrated.root.style).toEqual({ borderRadius: "999px" });
    expect(migrated.authoring?.mode).toBe("variant");
  });

  it("migrates a legacy palette item with children into a section preset", () => {
    const legacy: PaletteItem & {
      children: Array<{
        componentType: string;
        name?: string;
        props?: Record<string, unknown>;
        style?: Record<string, unknown>;
        children?: Array<{
          componentType: string;
          name?: string;
          props?: Record<string, unknown>;
        }>;
      }>;
    } = {
      id: "hero-split",
      type: "group",
      componentType: "Section",
      name: "Hero Split",
      props: { anchor: "hero" },
      style: { paddingTop: "80px" },
      responsiveStyle: {
        mobile: { paddingTop: "40px" },
      },
      children: [
        {
          componentType: "Container",
          name: "Hero Container",
          props: { fluid: false },
          style: { display: "grid" },
          children: [
            {
              componentType: "Text",
              name: "Title",
              props: { text: "<h1>Hello</h1>" },
            },
          ],
        },
      ],
      tags: ["hero"],
      purpose: "hero",
      layoutVariant: "split-left",
      i18n: {
        vi: { name: "Hero trái phải" },
      },
    };

    const migrated = migratePaletteItem(legacy);

    expect(migrated.kind).toBe("section");
    expect(migrated.purpose).toBe("hero");
    expect(migrated.layoutVariant).toBe("split-left");
    expect(migrated.root.responsiveStyle?.mobile).toEqual({ paddingTop: "40px" });
    expect(migrated.root.children?.[0]?.children?.[0]?.componentType).toBe("Text");
    expect(migrated.root.children?.[0]?.children?.[0]?.id).toBe("root.0.0");
    expect(migrated.authoring?.treeMode).toBe("semantic");
  });

  it("passes through the new schema unchanged", () => {
    const current: PresetDefinition = {
      id: "section.hero.split-left",
      version: "2.0.0",
      kind: "section",
      componentType: "Section",
      name: "Hero Split Left",
      root: {
        id: "root",
        componentType: "Section",
      },
    };

    expect(migratePreset(current)).toBe(current);
    expect(detectPresetVersion(current)).toBe("2.0.0");
  });

  it("detects legacy objects without version metadata", () => {
    expect(detectPresetVersion({ id: "legacy" })).toBe("1.0.0");
  });
});

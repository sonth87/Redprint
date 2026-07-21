import { afterEach, describe, expect, it } from "vitest";
import {
  buildPresetIndex,
  presetCommand,
  presetFirstEnabled,
  resolvePresetById,
  resolvePresetByHeuristic,
} from "./preset-catalog.js";
import type { AIPresetGroup } from "../types/ai.types.js";

const CATALOG: AIPresetGroup[] = [
  {
    group: "Elements",
    types: [
      {
        type: "Button",
        items: [
          { id: "btn-primary", name: "Primary", componentType: "Button", props: { label: "Go", variant: "primary" }, style: { backgroundColor: "#7c3aed" }, tags: ["cta", "primary"] },
          { id: "btn-themed", name: "Themed", componentType: "Button", props: { label: "Go" }, style: { backgroundColor: "#000" }, tags: ["cta", "themable"] },
        ],
      },
      {
        type: "Text",
        items: [
          { id: "text-h1", name: "H1", componentType: "Text", props: { text: "<p>x</p>", tag: "h1" }, style: { fontSize: "60px" }, tags: ["heading", "h1"] },
        ],
      },
      {
        // componentType not in registry → dropped
        type: "Widget",
        items: [{ id: "w-1", name: "W", componentType: "FancyWidget", props: {}, tags: [] }],
      },
    ],
  },
];

const AVAILABLE = new Set(["Button", "Text", "Image"]);

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("buildPresetIndex", () => {
  it("indexes by id and componentType, dropping presets whose type isn't available", () => {
    const idx = buildPresetIndex(CATALOG, AVAILABLE);
    expect(idx.size).toBe(3);
    expect(idx.byId.get("btn-primary")?.name).toBe("Primary");
    expect(idx.byComponentType.get("Button")?.length).toBe(2);
    expect(idx.byId.has("w-1")).toBe(false); // FancyWidget not available
  });

  it("returns an empty index for no catalog", () => {
    expect(buildPresetIndex(undefined, AVAILABLE).size).toBe(0);
  });
});

describe("resolvePresetById / resolvePresetByHeuristic", () => {
  const idx = buildPresetIndex(CATALOG, AVAILABLE);

  it("resolves by id", () => {
    expect(resolvePresetById(idx, "text-h1")?.componentType).toBe("Text");
    expect(resolvePresetById(idx, "nope")).toBeNull();
  });

  it("picks a preset by componentType + tag match", () => {
    expect(resolvePresetByHeuristic(idx, "Button", ["cta"])?.id).toMatch(/^btn-/);
    expect(resolvePresetByHeuristic(idx, "Button", ["nonexistent-tag"])).toBeNull();
    expect(resolvePresetByHeuristic(idx, "Image", ["cta"])).toBeNull(); // no Image presets
  });

  it("seed rotates the heuristic choice deterministically", () => {
    const a = resolvePresetByHeuristic(idx, "Button", ["cta"], 0)?.id;
    const b = resolvePresetByHeuristic(idx, "Button", ["cta"], 1)?.id;
    expect(a).not.toBe(b); // two cta buttons → different pick
    expect(resolvePresetByHeuristic(idx, "Button", ["cta"], 2)?.id).toBe(a); // wraps
  });
});

describe("presetCommand", () => {
  const idx = buildPresetIndex(CATALOG, AVAILABLE);

  it("patches content props over the preset props and keeps preset style (non-themable)", () => {
    const preset = resolvePresetById(idx, "btn-primary")!;
    const cmd = presetCommand("n1", "p1", preset, { props: { label: "<p>Click</p>" } }, { primaryColor: "#ff0000" });
    expect(cmd.payload.componentType).toBe("Button");
    expect((cmd.payload.props as Record<string, unknown>).label).toBe("<p>Click</p>");
    expect((cmd.payload.props as Record<string, unknown>).variant).toBe("primary"); // preset prop kept
    // non-themable → design token does NOT override style
    expect((cmd.payload.style as Record<string, unknown>).backgroundColor).toBe("#7c3aed");
    expect(cmd.payload.presetId).toBe("btn-primary");
  });

  it("applies design-token overrides to a themable preset", () => {
    const preset = resolvePresetById(idx, "btn-themed")!;
    const cmd = presetCommand("n2", "p1", preset, {}, { primaryColor: "#ff0000", textColor: "#111" });
    expect((cmd.payload.style as Record<string, unknown>).backgroundColor).toBe("#ff0000"); // overridden
    expect((cmd.payload.style as Record<string, unknown>).color).toBe("#111");
  });
});

describe("presetFirstEnabled", () => {
  it("is on by default and off when AI_PRESET_FIRST=false", () => {
    delete process.env.AI_PRESET_FIRST;
    expect(presetFirstEnabled()).toBe(true);
    process.env.AI_PRESET_FIRST = "false";
    expect(presetFirstEnabled()).toBe(false);
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { resolveVariant, hasVariants, isLayoutVarietyEnabled, SECTION_VARIANTS } from "./layout-variants.js";

const ALL = new Set(["Section", "Container", "Grid", "Column", "Text", "Button", "Image"]);
const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("hasVariants", () => {
  it("recognizes types with variants", () => {
    expect(hasVariants("hero")).toBe(true);
    expect(hasVariants("services")).toBe(true);
    expect(hasVariants("cta")).toBe(true);
    expect(hasVariants("footer")).toBe(false);
  });
});

describe("resolveVariant", () => {
  it("honors a valid LLM-requested variant", () => {
    expect(resolveVariant({ type: "hero", requested: "centered-stack", seedKey: "j:hero", availableTypes: ALL })).toBe("centered-stack");
  });

  it("falls back to a seed-pick for an invalid/free-text requested variant", () => {
    const v = resolveVariant({ type: "hero", requested: "super-fancy-layout", seedKey: "j1:hero", availableTypes: ALL });
    expect(SECTION_VARIANTS.hero as readonly string[]).toContain(v);
  });

  it("is stable for the same seedKey (retry safety)", () => {
    const a = resolveVariant({ type: "hero", seedKey: "jobX:hero", availableTypes: ALL });
    const b = resolveVariant({ type: "hero", seedKey: "jobX:hero", availableTypes: ALL });
    expect(a).toBe(b);
  });

  it("varies across different seed keys (at least sometimes)", () => {
    const picks = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((j) =>
        resolveVariant({ type: "hero", seedKey: `${j}:hero`, availableTypes: ALL }),
      ),
    );
    expect(picks.size).toBeGreaterThan(1);
  });

  it("filters out variants whose required components are unavailable", () => {
    // No Grid/Image → split-media-* and full-bleed-media are ineligible; only
    // centered-stack qualifies.
    const noMedia = new Set(["Section", "Container", "Text", "Button"]);
    const v = resolveVariant({ type: "hero", seedKey: "j:hero", availableTypes: noMedia });
    expect(v).toBe("centered-stack");
  });

  it("returns the default (first) variant when variety is disabled", () => {
    process.env.AI_LAYOUT_VARIETY = "off";
    expect(isLayoutVarietyEnabled()).toBe(false);
    expect(resolveVariant({ type: "hero", requested: "full-bleed-media", seedKey: "j:hero", availableTypes: ALL })).toBe(SECTION_VARIANTS.hero[0]);
    expect(resolveVariant({ type: "services", seedKey: "j:services", availableTypes: ALL })).toBe(SECTION_VARIANTS.services[0]);
  });

  it("returns empty string for a type without variants", () => {
    expect(resolveVariant({ type: "footer", seedKey: "j:footer", availableTypes: ALL })).toBe("");
  });
});

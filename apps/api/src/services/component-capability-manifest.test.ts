import { describe, expect, it } from "vitest";
import {
  buildComponentCapabilityManifest,
  filterPreferredComponents,
  formatComponentManifestForPrompt,
} from "./component-capability-manifest.js";
import type { GeneratePageRequest } from "../types/ai.types.js";

const components: GeneratePageRequest["availableComponents"] = [
  { type: "Section", name: "Section", category: "layout" },
  { type: "NavigationMenu", name: "Navigation Menu", category: "navigation" },
  { type: "GalleryPro", name: "Gallery Pro", category: "media" },
  { type: "MadeUp", name: "Unknown", category: "custom" },
];

describe("component capability manifest", () => {
  it("includes every available component and merges curated metadata when known", () => {
    const manifest = buildComponentCapabilityManifest(components);
    const types = manifest.map((component) => component.type);

    expect(types).toEqual(["Section", "NavigationMenu", "GalleryPro", "MadeUp"]);
    expect(types).not.toContain("GalleryGrid");
    expect(manifest.find((component) => component.type === "NavigationMenu")?.contractSource).toBe("merged");
    expect(manifest.find((component) => component.type === "MadeUp")?.contractSource).toBe("propSchema");
  });

  it("formats compact prompt lines without raw prop schema", () => {
    const manifest = buildComponentCapabilityManifest(components);
    const promptText = formatComponentManifestForPrompt(manifest);

    expect(promptText).toContain("NavigationMenu");
    expect(promptText).toContain("fallbackTo");
    expect(promptText).not.toContain("propSchema");
  });

  it("drops invalid or unavailable preferred components", () => {
    const manifest = buildComponentCapabilityManifest(components);

    expect(filterPreferredComponents(["GalleryGrid", "GalleryPro", "GalleryPro", "Missing"], manifest)).toEqual(["GalleryPro"]);
  });
});

describe("aiHints priority (roadmap 03/01)", () => {
  it("a component's own aiHints override CURATED purpose/bestFor/fallbackTo", () => {
    const withHints: GeneratePageRequest["availableComponents"] = [
      {
        type: "NavigationMenu",
        name: "Navigation Menu",
        category: "navigation",
        aiHints: {
          purpose: "Custom nav purpose from aiHints.",
          bestFor: ["custom use case"],
          fallbackTo: ["Text"],
        },
      },
    ];
    const manifest = buildComponentCapabilityManifest(withHints);
    const nav = manifest.find((c) => c.type === "NavigationMenu");
    expect(nav?.purpose).toBe("Custom nav purpose from aiHints.");
    expect(nav?.bestFor).toEqual(["custom use case"]);
    expect(nav?.fallbackTo).toEqual(["Text"]);
    expect(nav?.contractSource).toBe("aiHints");
  });

  it("an unknown component with only aiHints (no CURATED entry) still gets aiHints priority", () => {
    const pricingTable: GeneratePageRequest["availableComponents"] = [
      {
        type: "PricingTable",
        name: "Pricing Table",
        category: "content",
        propSchema: [{ key: "tiers", label: "Tiers", type: "json" }],
        aiHints: {
          purpose: "Displays side-by-side pricing tiers.",
          bestFor: ["pricing comparison"],
          sectionAffinity: ["pricing"],
          fallbackTo: ["Grid"],
        },
      },
    ];
    const manifest = buildComponentCapabilityManifest(pricingTable);
    const entry = manifest.find((c) => c.type === "PricingTable");
    expect(entry?.purpose).toBe("Displays side-by-side pricing tiers.");
    expect(entry?.contractSource).toBe("aiHints");
  });

  it("falls back to CURATED when a known component declares no aiHints", () => {
    const manifest = buildComponentCapabilityManifest(components);
    const nav = manifest.find((c) => c.type === "NavigationMenu");
    expect(nav?.contractSource).toBe("merged");
  });
});

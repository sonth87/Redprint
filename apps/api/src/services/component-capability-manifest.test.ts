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

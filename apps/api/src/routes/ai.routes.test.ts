import { describe, expect, it } from "vitest";
import { buildChatSystemPrompt } from "./ai.routes.js";
import type { ChatRequest } from "../types/ai.types.js";

function baseCtx(): ChatRequest["builderContext"] {
  return {
    document: { name: "My Page", nodeCount: 3, rootNodeId: "root-1" },
    selectedNode: null,
    availableComponents: [{ type: "Text", name: "Text", category: "content" }],
    activeBreakpoint: "desktop",
  };
}

describe("buildChatSystemPrompt — popup context (roadmap 00/03)", () => {
  it("does not render a Popups block when the document has no popups", () => {
    const prompt = buildChatSystemPrompt(baseCtx());
    expect(prompt).not.toContain("## Popups");
  });

  it("lists available popups with real ids when the document has popups", () => {
    const ctx: ChatRequest["builderContext"] = {
      ...baseCtx(),
      availablePopups: [
        { id: "popup-abc", name: "Promo Modal", enabled: true, kind: "modal", placement: "center", rootNodeId: "popup-abc-root", autoTrigger: "manual" },
        { id: "popup-def", name: "Cookie Bar", enabled: false, kind: "bar", placement: "bottom", rootNodeId: "popup-def-root", autoTrigger: "pageLoad" },
      ],
    };
    const prompt = buildChatSystemPrompt(ctx);

    expect(prompt).toContain("## Popups");
    expect(prompt).toContain('id: "popup-abc"');
    expect(prompt).toContain('id: "popup-def"');
    expect(prompt).toContain("Promo Modal");
    expect(prompt).toContain("never invent an id");
  });

  it("defaults active surface to the page root when no surface is provided", () => {
    const ctx: ChatRequest["builderContext"] = {
      ...baseCtx(),
      availablePopups: [
        { id: "popup-abc", name: "Promo Modal", enabled: true, kind: "modal", placement: "center", rootNodeId: "popup-abc-root", autoTrigger: "manual" },
      ],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('Active surface: page (rootId: "root-1")');
  });

  it("tells the model to parent new nodes under the popup root when editing popup content", () => {
    const ctx: ChatRequest["builderContext"] = {
      ...baseCtx(),
      activeSurface: { type: "popup", popupId: "popup-abc", rootNodeId: "popup-abc-root", selection: "content" },
      availablePopups: [
        { id: "popup-abc", name: "Promo Modal", enabled: true, kind: "modal", placement: "center", rootNodeId: "popup-abc-root", autoTrigger: "manual" },
      ],
    };
    const prompt = buildChatSystemPrompt(ctx);
    expect(prompt).toContain('editing popup "popup-abc"');
    expect(prompt).toContain('rootId: "popup-abc-root"');
  });
});

describe("buildChatSystemPrompt — component retrieval (roadmap 03/03)", () => {
  it("uses the client's precomputed componentsManifest unchanged below the retrieval threshold", () => {
    const ctx: ChatRequest["builderContext"] = {
      ...baseCtx(),
      componentsManifest: "PRECOMPUTED_MANIFEST_STRING",
    };
    const prompt = buildChatSystemPrompt(ctx, "add a button");
    expect(prompt).toContain("PRECOMPUTED_MANIFEST_STRING");
  });

  it("rebuilds a filtered manifest server-side when the catalog is above the threshold", () => {
    const big = Array.from({ length: 40 }, (_, i) => ({ type: `Filler${i}`, name: `Filler${i}`, category: "content" }));
    const ctx: ChatRequest["builderContext"] = {
      ...baseCtx(),
      availableComponents: [...baseCtx().availableComponents, ...big],
      componentsManifest: "STALE_FULL_CATALOG_MANIFEST",
    };
    const prompt = buildChatSystemPrompt(ctx, "add a button");
    // Retrieval kicked in — the stale client-precomputed string (built for the
    // full, non-filtered catalog) must NOT be used verbatim.
    expect(prompt).not.toContain("STALE_FULL_CATALOG_MANIFEST");
  });
});

import { afterEach, describe, expect, it } from "vitest";
import { selectComponentsForSection, selectComponentsForPrompt } from "./component-retrieval.js";
import type { AIAvailableComponent, CreativeBrief, PagePlanSection } from "../types/ai.types.js";

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

function component(type: string, overrides: Partial<AIAvailableComponent> = {}): AIAvailableComponent {
  return { type, name: type, category: "content", ...overrides };
}

function brief(overrides: Partial<CreativeBrief> = {}): CreativeBrief {
  return {
    rawPrompt: "",
    inferredIndustry: "",
    inferredPageType: "landing",
    primaryGoal: "collect_leads",
    targetAudience: "general",
    tone: "friendly",
    styleDirection: "clean",
    assumedBusinessDetails: [],
    requiredContentAreas: [],
    ...overrides,
  } as CreativeBrief;
}

function section(overrides: Partial<PagePlanSection> = {}): PagePlanSection {
  return {
    id: "sec-1",
    index: 0,
    type: "pricing",
    title: "Pricing",
    purpose: "",
    priority: "required",
    layoutIntent: "",
    contentRequirements: [],
    ...overrides,
  } as PagePlanSection;
}

const CORE = ["Section", "Container", "Grid", "Row", "Column", "Text", "Button", "Image"];

describe("selectComponentsForSection — bypass below threshold", () => {
  it("returns everything unchanged when catalog is at/under the threshold (byte-identical to pre-03/03)", () => {
    const components = [...CORE, "Divider", "Shape"].map((t) => component(t));
    const result = selectComponentsForSection(components, "pricing", brief(), section());
    expect(result.retrievalUsed).toBe(false);
    expect(result.selected).toEqual(components); // same objects, same order
    expect(result.candidateCount).toBe(components.length);
  });

  it("honors AI_RETRIEVAL_THRESHOLD override", () => {
    process.env.AI_RETRIEVAL_THRESHOLD = "2";
    const components = [component("Section"), component("Text"), component("Button")];
    const result = selectComponentsForSection(components, "pricing", brief(), section());
    expect(result.retrievalUsed).toBe(true);
  });
});

describe("selectComponentsForSection — retrieval above threshold", () => {
  function bigCatalog(extra: AIAvailableComponent[]): AIAvailableComponent[] {
    const base = CORE.map((t) => component(t));
    const filler = Array.from({ length: 40 }, (_, i) => component(`Filler${i}`, { category: "misc" }));
    return [...base, ...filler, ...extra];
  }

  it("PricingTable (fake, sectionAffinity=pricing) lands in the top-6 contract candidates for a pricing section", () => {
    const pricingTable = component("PricingTable", {
      category: "content",
      aiHints: { purpose: "Displays pricing tiers.", bestFor: ["pricing"], sectionAffinity: ["pricing"] },
    });
    const catalog = bigCatalog([pricingTable]);
    expect(catalog.length).toBeGreaterThan(30);

    const result = selectComponentsForSection(catalog, "pricing", brief(), section());
    expect(result.retrievalUsed).toBe(true);
    expect(result.selected.map((c) => c.type)).toContain("PricingTable");
    // Core layout primitives are always included regardless of score.
    for (const type of CORE) expect(result.selected.map((c) => c.type)).toContain(type);
  });

  it("keyword overlap between bestFor/purpose and section contentRequirements boosts score", () => {
    const bookingWidget = component("BookingWidget", {
      aiHints: { purpose: "Lets visitors book an appointment.", bestFor: ["appointment booking", "scheduling"] },
    });
    const catalog = bigCatalog([bookingWidget]);
    const bookingSection = section({ type: "cta", contentRequirements: ["appointment booking cta"] });
    const result = selectComponentsForSection(catalog, "cta", brief(), bookingSection);
    expect(result.selected.map((c) => c.type)).toContain("BookingWidget");
  });

  it("a component with no matching signal at all can be excluded from the top-k", () => {
    const irrelevant = component("RandomUnrelatedThing999", { category: "misc" });
    const catalog = bigCatalog([irrelevant]);
    const result = selectComponentsForSection(catalog, "pricing", brief(), section());
    // Not guaranteed to be excluded, but at minimum retrieval must have run and
    // candidateCount must be less than the full catalog.
    expect(result.retrievalUsed).toBe(true);
    expect(result.candidateCount).toBeLessThan(catalog.length);
  });
});

describe("selectComponentsForPrompt — chat path", () => {
  function bigChatCatalog(extra: AIAvailableComponent[] = []): AIAvailableComponent[] {
    const base = CORE.map((t) => component(t));
    const filler = Array.from({ length: 40 }, (_, i) => component(`Filler${i}`));
    return [...base, ...filler, ...extra];
  }

  it("force-includes a component named verbatim in the user prompt even with a low score", () => {
    const honeycomb = component("HoneycombGallery", { category: "misc" }); // no aiHints, would score 0
    const catalog = bigChatCatalog([honeycomb]);
    const result = selectComponentsForPrompt(catalog, "please use HoneycombGallery for this section");
    expect(result.selected.map((c) => c.type)).toContain("HoneycombGallery");
  });

  it("bypasses retrieval below the threshold", () => {
    const small = CORE.map((t) => component(t));
    const result = selectComponentsForPrompt(small, "add a button");
    expect(result.retrievalUsed).toBe(false);
    expect(result.selected).toEqual(small);
  });

  it("scores by keyword overlap with the prompt when above threshold", () => {
    const testimonialCard = component("TestimonialCard", {
      aiHints: { purpose: "Shows a customer testimonial quote.", bestFor: ["testimonials", "reviews"] },
    });
    const catalog = bigChatCatalog([testimonialCard]);
    const result = selectComponentsForPrompt(catalog, "add a section with customer testimonials and reviews");
    expect(result.selected.map((c) => c.type)).toContain("TestimonialCard");
  });
});

import { describe, expect, it } from "vitest";
import { buildDeterministicPagePlan } from "./page-plan-generator.js";
import type { GeneratePageRequest } from "../types/ai.types.js";

const request: GeneratePageRequest = {
  prompt: "tôi muốn tạo 1 trang web về các dịch vụ cho thú cưng",
  availableComponents: [
    { type: "Section", name: "Section", category: "layout" },
    { type: "Container", name: "Container", category: "layout" },
    { type: "Grid", name: "Grid", category: "layout" },
    { type: "Text", name: "Text", category: "content" },
    { type: "Button", name: "Button", category: "interactive" },
  ],
  generationOptions: {
    tone: { id: "playful", label: "Playful", description: "Fun and friendly" },
    colorPalette: { name: "Orange Warm", primary: "#ea580c", secondary: "#fef3c7", accent: "#f59e0b" },
  },
};

describe("buildDeterministicPagePlan", () => {
  it("expands a short pet-services prompt into a standard complete page plan", () => {
    const plan = buildDeterministicPagePlan(request, "job-12345678");
    const sectionTypes = plan.sections.map((section) => section.type);

    expect(plan.complexity).toBe("standard");
    expect(plan.sections.length).toBeGreaterThanOrEqual(7);
    expect(plan.sections.length).toBeLessThanOrEqual(10);
    expect(sectionTypes).toContain("hero");
    expect(sectionTypes).toContain("services");
    expect(sectionTypes).toContain("gallery");
    expect(sectionTypes).toContain("trust");
    expect(sectionTypes).toContain("cta");
    expect(sectionTypes).toContain("footer");
    expect(plan.brief.tone).toBe("Playful");
    expect(plan.brief.styleDirection).toContain("#ea580c");
  });

  it("assigns stable ai-prefixed section IDs in page order", () => {
    const plan = buildDeterministicPagePlan(request, "job-abcdef12");

    expect(plan.sections.every((section, index) => section.id.startsWith(`ai-job-abcd`) && section.index === index)).toBe(true);
  });
});

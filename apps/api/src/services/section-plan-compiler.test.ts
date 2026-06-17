import { describe, expect, it } from "vitest";
import { buildDeterministicPagePlan } from "./page-plan-generator.js";
import { buildSkeletonCommands, compileFallbackSection, compileSection } from "./section-plan-compiler.js";
import type { GeneratePageRequest, SectionPlan } from "../types/ai.types.js";

const availableComponents = [
  { type: "Section", name: "Section", category: "layout" },
  { type: "Container", name: "Container", category: "layout" },
  { type: "Grid", name: "Grid", category: "layout" },
  { type: "Text", name: "Text", category: "content" },
  { type: "Button", name: "Button", category: "interactive" },
  { type: "Image", name: "Image", category: "media" },
  { type: "Divider", name: "Divider", category: "content" },
];

const richAvailableComponents = [
  ...availableComponents,
  { type: "Row", name: "Row", category: "layout" },
  { type: "Column", name: "Column", category: "layout" },
  { type: "NavigationMenu", name: "Navigation Menu", category: "navigation" },
  { type: "GalleryPro", name: "Gallery Pro", category: "media" },
  { type: "GalleryGrid", name: "Gallery Grid", category: "media" },
  { type: "GallerySlider", name: "Gallery Slider", category: "media" },
  { type: "CollapsibleText", name: "Collapsible Text", category: "content" },
  { type: "TextMarquee", name: "Text Marquee", category: "content" },
  { type: "TextMask", name: "Text Mask", category: "content" },
  { type: "Shape", name: "Shape", category: "decorative" },
];

function makeRequest(): GeneratePageRequest {
  return {
    prompt: "Landing page for pet services",
    fullPageMode: true,
    rootNodeId: "root-real",
    availableComponents,
    designTokens: {
      primaryColor: "#ea580c",
      secondaryColor: "#fff7ed",
      accentColor: "#f59e0b",
      textColor: "#111827",
      borderRadius: "14px",
    },
    pageNodes: {
      "root-real": { id: "root-real", type: "Root", parentId: null, order: 0, props: {}, style: {} },
      old: { id: "old", type: "Section", parentId: "root-real", order: 0, props: {}, style: {} },
    },
  };
}

function makeRichRequest(): GeneratePageRequest {
  return {
    ...makeRequest(),
    availableComponents: richAvailableComponents,
    generationOptions: {
      tone: { id: "playful", label: "Playful" },
      colorPalette: { name: "Red Yellow", primary: "#dc2626", secondary: "#fef3c7", accent: "#f59e0b" },
    },
  };
}

function componentTypes(commands: ReturnType<typeof compileFallbackSection>): string[] {
  return commands
    .filter((cmd) => cmd.type === "ADD_NODE")
    .map((cmd) => String(cmd.payload.componentType));
}

describe("section-plan compiler", () => {
  it("creates root-level Section skeleton commands and uses nodeId for removal", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-22222222");
    const commands = buildSkeletonCommands(plan, request);

    expect(commands[0]).toMatchObject({ type: "REMOVE_NODE", payload: { nodeId: "old" } });

    const sectionAdds = commands.filter((cmd) => cmd.type === "ADD_NODE");
    expect(sectionAdds.length).toBe(plan.sections.length);
    expect(sectionAdds.every((cmd) => cmd.payload.componentType === "Section")).toBe(true);
    expect(sectionAdds.every((cmd) => cmd.payload.parentId === "root")).toBe(true);
  });

  it("compiles fallback section content without orphan parents", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-33333333");
    const section = plan.sections.find((item) => item.type === "services") ?? plan.sections[0];
    const commands = compileFallbackSection(section, plan, request);
    const knownIds = new Set([section.id]);

    for (const cmd of commands) {
      if (cmd.type !== "ADD_NODE") continue;
      expect(request.availableComponents.map((item) => item.type)).toContain(String(cmd.payload.componentType));
      expect(knownIds.has(String(cmd.payload.parentId))).toBe(true);
      knownIds.add(String(cmd.payload.nodeId));
    }
  });

  it("uses a diverse valid component set across fallback page sections", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-44444444");
    const commands = plan.sections.flatMap((section) => compileFallbackSection(section, plan, request));
    const componentTypes = new Set(
      commands
        .filter((cmd) => cmd.type === "ADD_NODE")
        .map((cmd) => String(cmd.payload.componentType)),
    );

    expect(componentTypes).toContain("Container");
    expect(componentTypes).toContain("Grid");
    expect(componentTypes).toContain("Text");
    expect(componentTypes).toContain("Button");
    expect(componentTypes).toContain("Image");
    expect(componentTypes).toContain("Divider");
    expect([...componentTypes].every((type) => request.availableComponents.some((item) => item.type === type))).toBe(true);
  });

  it("uses NavigationMenu for header when the component is available", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-55555555");
    const section = plan.sections.find((item) => item.type === "header") ?? plan.sections[0];
    const commands = compileFallbackSection(section, plan, request);

    expect(componentTypes(commands)).toContain("NavigationMenu");
  });

  it("uses rich gallery components for gallery and service sections when available", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-66666666");
    const sections = plan.sections.filter((item) => item.type === "gallery" || item.type === "services");
    const commands = sections.flatMap((section) => compileFallbackSection(section, plan, request));
    const types = componentTypes(commands);

    expect(types).toContain("GalleryPro");
    expect(new Set(types).size).toBeGreaterThanOrEqual(5);
  });

  it("uses CollapsibleText for FAQ when available", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-77777777");
    const section = plan.sections.find((item) => item.type === "faq") ?? plan.sections[0];
    const commands = compileFallbackSection(section, plan, request);

    expect(componentTypes(commands)).toContain("CollapsibleText");
  });

  it("ignores unavailable preferred components and falls back to an available gallery safely", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-88888888");
    const section = plan.sections.find((item) => item.type === "gallery") ?? plan.sections[0];
    const sectionPlan: SectionPlan = {
      sectionId: section.id,
      type: section.type,
      heading: "Pet care moments",
      body: "A visual look at grooming, daycare, walking, and boarding.",
      preferredComponents: ["MadeUp", "GalleryPro"],
      interactionIntent: "gallery",
      mediaItems: [{ alt: "Happy pet getting gentle care" }],
      items: [],
    };
    const commands = compileSection(sectionPlan, section, plan, request);
    const gallery = commands.find((cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "GalleryPro");

    expect(gallery).toBeTruthy();
    const items = gallery?.payload.props && typeof gallery.payload.props === "object"
      ? (gallery.payload.props as { items?: Array<{ src?: string }> }).items
      : undefined;
    expect(items?.[0]?.src).toMatch(/^https:\/\//);
  });

  it("uses componentIntents as adapter preferences", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-aaaaaaa1");
    const section = plan.sections.find((item) => item.type === "gallery") ?? plan.sections[0];
    const sectionPlan: SectionPlan = {
      sectionId: section.id,
      type: section.type,
      heading: "Pet care carousel",
      body: "A visual look at warm, playful pet care moments.",
      preferredComponents: [],
      componentIntents: [
        {
          role: "gallery_carousel",
          componentType: "GallerySlider",
          variant: "carousel",
          contentSource: "mediaItems",
          priority: "preferred",
        },
      ],
      interactionIntent: "carousel",
      mediaItems: [{ alt: "Happy pet at daycare" }, { alt: "Gentle grooming moment" }, { alt: "Safe boarding room" }],
      items: [],
    };
    const commands = compileSection(sectionPlan, section, plan, request);

    expect(componentTypes(commands)).toContain("GallerySlider");
  });

  it("falls back to basic components when rich components are unavailable", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-99999999");
    const section = plan.sections.find((item) => item.type === "faq") ?? plan.sections[0];
    const commands = compileFallbackSection(section, plan, request);
    const types = componentTypes(commands);

    expect(types).not.toContain("CollapsibleText");
    expect(types.every((type) => request.availableComponents.some((component) => component.type === type))).toBe(true);
  });
});

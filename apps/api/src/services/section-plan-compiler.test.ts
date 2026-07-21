import { describe, expect, it } from "vitest";
import { buildDeterministicPagePlan } from "./page-plan-generator.js";
import { buildSkeletonCommands, compileFallbackSection, compileSection, compileSectionWithMeta } from "./section-plan-compiler.js";
import type { AIPresetGroup, GeneratePageRequest, SectionPlan } from "../types/ai.types.js";

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

  it("never uses pet fallback images for non-pet industries in services/testimonials cards", () => {
    const request: GeneratePageRequest = { ...makeRequest(), prompt: "Landing page for an accounting SaaS platform" };
    const plan = buildDeterministicPagePlan(request, "job-bbbbbbb2");
    const sections = plan.sections.filter((item) => item.type === "services" || item.type === "testimonials");
    const commands = sections.flatMap((section) => compileFallbackSection(section, plan, request));

    const imageSrcs = commands
      .filter((cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "Image")
      .map((cmd) => String((cmd.payload.props as { src?: string })?.src ?? ""));

    expect(imageSrcs.length).toBeGreaterThan(0);
    const petImageUrls = new Set([
      "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=900&q=80",
      "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=900&q=80",
      "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=80",
      "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&q=80",
      "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&q=80",
    ]);
    for (const src of imageSrcs) {
      expect(petImageUrls.has(src)).toBe(false);
    }
  });

  it("still uses pet pool images for services cards when the industry is pet care", () => {
    const request = makeRequest(); // prompt: "Landing page for pet services"
    const plan = buildDeterministicPagePlan(request, "job-ccccccc3");
    const section = plan.sections.find((item) => item.type === "services") ?? plan.sections[0];
    const commands = compileFallbackSection(section, plan, request);

    const imageSrcs = commands
      .filter((cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "Image")
      .map((cmd) => String((cmd.payload.props as { src?: string })?.src ?? ""));

    expect(imageSrcs.some((src) => src.includes("images.unsplash.com"))).toBe(true);
  });

  it("gives every Section a stable anchorId derived from its type", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-ddddddd4");
    const skeleton = buildSkeletonCommands(plan, request);
    const sectionAdds = skeleton.filter((cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "Section");

    expect(sectionAdds.length).toBe(plan.sections.length);
    const anchorIds = sectionAdds.map((cmd) => String((cmd.payload.props as { anchorId?: string })?.anchorId ?? ""));
    expect(anchorIds.every((id) => id.length > 0)).toBe(true);
    // No two sections should collide on the same anchor.
    expect(new Set(anchorIds).size).toBe(anchorIds.length);
    // Anchors are derived from section type, so a services section anchors to "services".
    const servicesSection = plan.sections.find((s) => s.type === "services");
    if (servicesSection) {
      const servicesCommand = sectionAdds.find((cmd) => cmd.payload.nodeId === servicesSection.id);
      expect((servicesCommand?.payload.props as { anchorId?: string })?.anchorId).toBe("services");
    }
  });

  it("every header/footer NavigationMenu anchor href resolves to a real Section anchorId in the same batch", () => {
    const request = makeRichRequest();
    const plan = buildDeterministicPagePlan(request, "job-eeeeeee5");
    const skeleton = buildSkeletonCommands(plan, request);
    const sectionAnchorIds = new Set(
      skeleton
        .filter((cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "Section")
        .map((cmd) => String((cmd.payload.props as { anchorId?: string })?.anchorId ?? "")),
    );

    const allCommands = [
      ...skeleton,
      ...plan.sections.flatMap((section) => compileFallbackSection(section, plan, request)),
    ];
    const navMenus = allCommands.filter(
      (cmd) => cmd.type === "ADD_NODE" && cmd.payload.componentType === "NavigationMenu",
    );
    expect(navMenus.length).toBeGreaterThan(0);

    for (const navMenu of navMenus) {
      const items = (navMenu.payload.props as { items?: Array<{ target?: { type: string; anchorId?: string } }> })?.items ?? [];
      const anchorTargets = items.filter((item) => item.target?.type === "anchor");
      expect(anchorTargets.length).toBeGreaterThan(0);
      for (const item of anchorTargets) {
        expect(sectionAnchorIds.has(String(item.target?.anchorId))).toBe(true);
      }
    }
  });

  // ── Locale (roadmap 02/03) ──────────────────────────────────────────────

  function allText(commands: ReturnType<typeof compileFallbackSection>): string {
    return commands
      .filter((cmd) => cmd.type === "ADD_NODE")
      .map((cmd) => JSON.stringify(cmd.payload.props ?? {}))
      .join(" ");
  }

  it("uses Vietnamese fallback content when generationOptions.locale='vi' despite an English prompt", () => {
    const request: GeneratePageRequest = {
      ...makeRequest(),
      prompt: "Landing page for a pet grooming shop", // English, no diacritics
      generationOptions: { locale: "vi" },
    };
    const plan = buildDeterministicPagePlan(request, "job-locale-vi");
    const commands = plan.sections.flatMap((section) => compileFallbackSection(section, plan, request));
    const text = allText(commands);
    // pet-care pack `vi` locale copy should appear.
    expect(text).toMatch(/Dịch vụ|Đặt lịch|thú cưng|Spa/);
  });

  it("uses English fallback content when generationOptions.locale='en' despite a Vietnamese prompt", () => {
    const request: GeneratePageRequest = {
      ...makeRequest(),
      prompt: "Trang cho tiệm chăm sóc thú cưng", // Vietnamese diacritics
      generationOptions: { locale: "en" },
    };
    const plan = buildDeterministicPagePlan(request, "job-locale-en");
    const services = plan.sections.find((s) => s.type === "services") ?? plan.sections[0];
    const text = allText(compileFallbackSection(services, plan, request));
    // English pet-care `_default` copy; must not contain Vietnamese diacritics.
    expect(text).not.toMatch(/[àáạảãăằắđịệộủ]/);
    expect(text).toMatch(/Grooming|Daycare|Care/i);
  });

  // ── Preset-first compile (roadmap 02/01) ────────────────────────────────

  const PRESETS: AIPresetGroup[] = [
    {
      group: "Elements",
      types: [
        {
          type: "Button",
          items: [
            { id: "btn-fancy", name: "Fancy CTA", componentType: "Button", props: { variant: "pill", size: "xl" }, style: { backgroundColor: "#123456", borderRadius: "999px" }, tags: ["cta", "primary"] },
          ],
        },
      ],
    },
  ];

  function heroPlan(presetRefs?: SectionPlan["presetRefs"]): SectionPlan {
    return {
      sectionId: "sec-hero",
      type: "hero",
      heading: "Welcome to our service",
      body: "We help you get things done.",
      ctaLabel: "Get started",
      items: [],
      preferredComponents: [],
      presetRefs,
    } as SectionPlan;
  }

  function heroSectionOf(request: GeneratePageRequest) {
    const plan = buildDeterministicPagePlan(request, "job-preset");
    return plan.sections.find((s) => s.type === "hero") ?? plan.sections[0];
  }

  it("instantiates a preset for the CTA when the catalog has a matching preset", () => {
    const request: GeneratePageRequest = { ...makeRequest(), availablePresets: PRESETS };
    const section = heroSectionOf(request);
    const plan = buildDeterministicPagePlan(request, "job-preset");
    const { commands, presetUsed } = compileSectionWithMeta(heroPlan(), section, plan, request);

    const ctaCmd = commands.find((c) => c.type === "ADD_NODE" && c.payload.presetId === "btn-fancy");
    expect(ctaCmd).toBeTruthy();
    // content patch applied over preset props
    expect((ctaCmd!.payload.props as { label?: string }).label).toContain("Get started");
    // preset's own props preserved
    expect((ctaCmd!.payload.props as { variant?: string }).variant).toBe("pill");
    expect(presetUsed).toContain("btn-fancy");
  });

  it("honors an explicit presetRef by role", () => {
    const request: GeneratePageRequest = { ...makeRequest(), availablePresets: PRESETS };
    const section = heroSectionOf(request);
    const plan = buildDeterministicPagePlan(request, "job-preset");
    const { presetUsed } = compileSectionWithMeta(heroPlan([{ role: "hero_cta", presetId: "btn-fancy" }]), section, plan, request);
    expect(presetUsed).toContain("btn-fancy");
  });

  it("falls back to the hardcoded adapter when no presets are available", () => {
    const request = makeRequest(); // no availablePresets
    const section = heroSectionOf(request);
    const plan = buildDeterministicPagePlan(request, "job-preset");
    const { commands, presetUsed } = compileSectionWithMeta(heroPlan(), section, plan, request);
    expect(presetUsed).toHaveLength(0);
    // a Button CTA still gets emitted (via buttonCommand), just without a presetId
    const cta = commands.find((c) => c.type === "ADD_NODE" && c.payload.componentType === "Button");
    expect(cta).toBeTruthy();
    expect(cta!.payload.presetId).toBeUndefined();
  });

  it("ignores a bogus presetRef id (not in catalog) and still compiles", () => {
    const request: GeneratePageRequest = { ...makeRequest(), availablePresets: PRESETS };
    const section = heroSectionOf(request);
    const plan = buildDeterministicPagePlan(request, "job-preset");
    // bogus ref → falls through to heuristic, which still finds btn-fancy by tag
    const { commands } = compileSectionWithMeta(heroPlan([{ role: "hero_cta", presetId: "does-not-exist" }]), section, plan, request);
    // still produces valid commands (no crash), CTA present
    expect(commands.find((c) => c.payload.componentType === "Button")).toBeTruthy();
  });

  it("AI_PRESET_FIRST=false disables preset instantiation", () => {
    const request: GeneratePageRequest = { ...makeRequest(), availablePresets: PRESETS };
    const section = heroSectionOf(request);
    const plan = buildDeterministicPagePlan(request, "job-preset");
    process.env.AI_PRESET_FIRST = "false";
    try {
      const { presetUsed } = compileSectionWithMeta(heroPlan(), section, plan, request);
      expect(presetUsed).toHaveLength(0);
    } finally {
      delete process.env.AI_PRESET_FIRST;
    }
  });
});

// ── Layout variants (roadmap 02/05) ────────────────────────────────────────

describe("layout variants", () => {
  function nodeIds(commands: ReturnType<typeof compileSection>): string[] {
    return commands.filter((c) => c.type === "ADD_NODE").map((c) => String(c.payload.nodeId));
  }
  function heroWith(variant: string): SectionPlan {
    return {
      sectionId: "sec-hero", type: "hero", heading: "Welcome", body: "Body copy here.",
      ctaLabel: "Start", items: [], preferredComponents: [], layoutVariant: variant,
    } as SectionPlan;
  }

  it("reports the LLM-requested variant via variantUsed", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v1");
    const hero = plan.sections.find((s) => s.type === "hero")!;
    const { variantUsed } = compileSectionWithMeta(heroWith("centered-stack"), hero, plan, request);
    expect(variantUsed).toBe("centered-stack");
  });

  it("produces structurally different node sets for different hero variants", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v2");
    const hero = plan.sections.find((s) => s.type === "hero")!;
    const split = nodeIds(compileSectionWithMeta(heroWith("split-media-right"), hero, plan, request).commands);
    const centered = nodeIds(compileSectionWithMeta(heroWith("centered-stack"), hero, plan, request).commands);
    const fullBleed = nodeIds(compileSectionWithMeta(heroWith("full-bleed-media"), hero, plan, request).commands);
    // split uses a grid; centered-stack does not; full-bleed adds an overlay.
    expect(split).toContain(`${hero.id}-hero-grid`);
    expect(centered).not.toContain(`${hero.id}-hero-grid`);
    expect(fullBleed.some((id) => id.includes("overlay"))).toBe(true);
  });

  it("falls back to a valid variant when the LLM requests a bogus one", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v3");
    const hero = plan.sections.find((s) => s.type === "hero")!;
    const { variantUsed } = compileSectionWithMeta(heroWith("not-a-real-variant"), hero, plan, request);
    expect(["split-media-right", "split-media-left", "centered-stack", "full-bleed-media"]).toContain(variantUsed);
  });

  it("AI_LAYOUT_VARIETY=off always uses the default hero variant", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v4");
    const hero = plan.sections.find((s) => s.type === "hero")!;
    process.env.AI_LAYOUT_VARIETY = "off";
    try {
      const { variantUsed } = compileSectionWithMeta(heroWith("full-bleed-media"), hero, plan, request);
      expect(variantUsed).toBe("split-media-right");
    } finally {
      delete process.env.AI_LAYOUT_VARIETY;
    }
  });

  it("services alternating-rows variant emits row containers instead of only a card grid", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v5");
    const services = plan.sections.find((s) => s.type === "services")!;
    const servicesPlan = {
      sectionId: services.id, type: "services", heading: "What we do", body: "x",
      items: [{ title: "A", body: "aa" }, { title: "B", body: "bb" }], preferredComponents: [],
      layoutVariant: "alternating-rows",
    } as SectionPlan;
    const { commands, variantUsed } = compileSectionWithMeta(servicesPlan, services, plan, request);
    expect(variantUsed).toBe("alternating-rows");
    expect(nodeIds(commands).some((id) => id.includes("-row-"))).toBe(true);
  });

  it("conversion visualEmphasis repeats the CTA at the section end", () => {
    const request = makeRequest();
    const plan = buildDeterministicPagePlan(request, "job-v6");
    const hero = plan.sections.find((s) => s.type === "hero")!;
    const p = { ...heroWith("centered-stack"), visualEmphasis: "conversion" } as SectionPlan;
    const ids = nodeIds(compileSectionWithMeta(p, hero, plan, request).commands);
    expect(ids).toContain(`${hero.id}-cta-closing`);
  });
});

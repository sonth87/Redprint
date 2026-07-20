/**
 * Section Plan Compiler — deterministic translation from SectionPlan to builder commands.
 */
import type {
  AICommandSuggestion,
  CreativeBrief,
  DesignTokens,
  GeneratePageRequest,
  PagePlan,
  PagePlanSection,
  PageSectionType,
  SectionPlan,
  SectionPlanItem,
  SectionPlanMediaItem,
  SectionPlanNavItem,
} from "../types/ai.types.js";
import { resolveComponentContracts, type ComponentContract } from "./component-contract-resolver.js";
import { validatePropsAgainstContract } from "./prop-schema-validator.js";
import { safeLinkUrl, safeMediaUrl } from "./url-guard.js";

interface CompileContext {
  availableTypes: Set<string>;
  designTokens: DesignTokens;
  brief: CreativeBrief;
  contractsByType: Map<string, ComponentContract>;
  /** Full page plan — needed to resolve nav anchors against real Section ids (see sectionAnchor). */
  pagePlan: PagePlan;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=1200&q=80";
const PET_IMAGES = [
  "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?w=900&q=80",
  "https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=900&q=80",
  "https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=900&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&q=80",
  "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=900&q=80",
  "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=900&q=80",
];
const GENERIC_IMAGES = [
  DEFAULT_IMAGE,
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=900&q=80",
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&q=80",
  "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=900&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=80",
];

const RICH_COMPONENT_TYPES = new Set([
  "NavigationMenu",
  "GalleryPro",
  "GallerySlider",
  "GalleryGrid",
  "CollapsibleText",
  "TextMarquee",
  "TextMask",
  "Shape",
  "Row",
  "Column",
  "Repeater",
]);

const LEAF_COMPONENT_TYPES = new Set([
  "Text",
  "Button",
  "Image",
  "Divider",
  "TextMarquee",
  "CollapsibleText",
  "TextMask",
  "GalleryPro",
  "GallerySlider",
  "GalleryGrid",
  "Shape",
  "NavigationMenu",
  "Anchor",
]);

const REQUIRED_PROPS: Record<string, string[]> = {
  Text: ["text"],
  Button: ["label"],
  Image: ["src", "alt"],
  TextMask: ["text"],
  TextMarquee: ["text"],
  CollapsibleText: ["text"],
  GalleryPro: ["items"],
  GallerySlider: ["slideCount"],
  GalleryGrid: ["imageCount"],
  NavigationMenu: ["items"],
  Shape: ["shape"],
};

type GalleryLayoutMode = "grid" | "masonry" | "collage" | "slider" | "slideshow" | "strip" | "stacked";

function html(text: string): string {
  return `<p>${text.replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] ?? ch)}</p>`;
}

function command(type: string, payload: Record<string, unknown>, description: string): AICommandSuggestion {
  return { type, payload, description };
}

function colors(tokens: DesignTokens) {
  return {
    primary: tokens.primaryColor ?? "#111827",
    secondary: tokens.secondaryColor ?? tokens.backgroundColor ?? "#ffffff",
    accent: tokens.accentColor ?? tokens.primaryColor ?? "#2563eb",
    text: tokens.textColor ?? "#111827",
    muted: "#4b5563",
    surface: "#ffffff",
    border: "rgba(15, 23, 42, 0.12)",
    radius: tokens.borderRadius ?? "12px",
    font: tokens.fontFamily,
    headingFont: tokens.headingFontFamily ?? tokens.fontFamily,
  };
}

function has(ctx: CompileContext, type: string): boolean {
  return ctx.availableTypes.size === 0 || ctx.availableTypes.has(type);
}

function firstAvailable(ctx: CompileContext, types: string[]): string | null {
  return types.find((type) => has(ctx, type)) ?? null;
}

function prefers(plan: SectionPlan, type: string): boolean {
  return plan.preferredComponents?.includes(type) ?? false;
}

function componentIntentTypes(plan: SectionPlan): string[] {
  return (plan.componentIntents ?? []).map((intent) => intent.componentType);
}

function adapterCandidatesFor(section: PagePlanSection, plan: SectionPlan): string[] {
  const intentTypes = componentIntentTypes(plan);
  if (intentTypes.length > 0) return intentTypes;
  return plan.preferredComponents ?? defaultPreferredComponents(section.type);
}

function fallbackImagePool(brief: CreativeBrief): string[] {
  return isPetCare(brief) ? PET_IMAGES : GENERIC_IMAGES;
}

function fallbackAlt(section: PagePlanSection, plan: SectionPlan, index: number): string {
  const labels: Record<PageSectionType, string> = {
    header: "Navigation detail",
    hero: "Featured brand visual",
    services: "Service preview",
    features: "Feature preview",
    trust: "Trust signal",
    process: "Process step",
    stats: "Results highlight",
    gallery: "Gallery image",
    testimonials: "Customer story",
    pricing: "Package highlight",
    faq: "Helpful answer",
    cta: "Booking moment",
    footer: "Business detail",
    custom: "Page detail",
  };
  return `${labels[section.type] ?? plan.heading} ${index + 1}`;
}

function normalizeMediaItem(
  item: SectionPlanMediaItem | undefined,
  section: PagePlanSection,
  plan: SectionPlan,
  index: number,
  pool: string[],
): Required<Pick<SectionPlanMediaItem, "src" | "alt">> & Pick<SectionPlanMediaItem, "caption" | "link"> {
  const fallback = pool[index % pool.length] ?? DEFAULT_IMAGE;
  const src = safeMediaUrl(item?.src) ?? fallback;
  const alt = item?.alt?.trim() || fallbackAlt(section, plan, index);
  return {
    src,
    alt,
    caption: item?.caption?.trim() || undefined,
    link: safeLinkUrl(item?.link) ?? undefined,
  };
}

function mediaItemsFor(
  plan: SectionPlan,
  section: PagePlanSection,
  brief: CreativeBrief,
  options: { min: number; max: number },
) {
  const pool = fallbackImagePool(brief);
  const source = plan.mediaItems ?? [];
  const items = source
    .slice(0, options.max)
    .map((item, index) => normalizeMediaItem(item, section, plan, index, pool));

  while (items.length < options.min) {
    const index = items.length;
    items.push(normalizeMediaItem(undefined, section, plan, index, pool));
  }

  return items.slice(0, options.max);
}

/**
 * Anchor id shared between the Section skeleton (buildSkeletonCommands) and every
 * nav item that targets it, so NavigationMenu smooth-scroll always finds a real
 * element. Keyed by section TYPE (not title/content) so it stays stable across
 * locales and LLM-authored copy. Suffixed with `-2`, `-3`, ... when a page plan
 * repeats a section type (rare, but the compiler must not silently produce two
 * Sections with the same id).
 */
function sectionAnchor(section: PagePlanSection, allSections: PagePlanSection[]): string {
  const sameType = allSections.filter((s) => s.type === section.type);
  const position = sameType.findIndex((s) => s.id === section.id);
  return position <= 0 ? section.type : `${section.type}-${position + 1}`;
}

/**
 * Nav items pointing at OTHER sections of the same page plan — used for header/footer
 * NavigationMenu defaults. Only anchors that a Section in this plan actually owns
 * are ever emitted; sections without a nav-worthy label (hero, cta, footer, custom)
 * are skipped.
 */
function navigableSections(pagePlan: PagePlan): PagePlanSection[] {
  const skip = new Set<PageSectionType>(["header", "hero", "cta", "footer", "custom"]);
  return pagePlan.sections.filter((s) => !skip.has(s.type));
}

function navItemsFor(plan: SectionPlan, section: PagePlanSection, pagePlan: PagePlan): SectionPlanNavItem[] {
  const anchorsInPlan = new Set(pagePlan.sections.map((s) => sectionAnchor(s, pagePlan.sections)));
  const fromPlan = (plan.navItems ?? []).filter((item) => {
    if (!item.label.trim() || !item.href.trim()) return false;
    if (!item.href.startsWith("#")) return true; // non-anchor hrefs (external/page links) pass through
    return anchorsInPlan.has(item.href.slice(1));
  });
  if (fromPlan.length > 0) return fromPlan.slice(0, 6);

  const defaults = navigableSections(pagePlan)
    .slice(0, 4)
    .map((navSection) => ({
      label: navSection.title,
      href: `#${sectionAnchor(navSection, pagePlan.sections)}`,
    }));
  return defaults.length > 0 ? defaults : [{ label: "Home", href: "#home" }];
}

function richTextBlock(title: string, body: string): string {
  return `<h3>${title.replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] ?? ch)}</h3>${html(body)}`;
}

function textCommand(
  id: string,
  parentId: string,
  text: string,
  tag: "p" | "span" | "h1" | "h2" | "h3" | "h4",
  style: Record<string, unknown>,
): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Text",
      parentId,
      props: { text: html(text), tag },
      style,
      responsiveStyle: tag === "h1" || tag === "h2" ? { mobile: { fontSize: tag === "h1" ? "34px" : "28px", lineHeight: "1.2" } } : undefined,
    },
    `Add ${tag} text`,
  );
}

function buttonCommand(id: string, parentId: string, label: string, ctx: CompileContext): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Button",
      parentId,
      props: { label: html(label), variant: "primary", size: "lg", iconPosition: "end", icon: "arrow-right" },
      style: {
        backgroundColor: c.primary,
        color: "#ffffff",
        borderRadius: c.radius,
        padding: "12px 20px",
        fontWeight: "700",
      },
      responsiveProps: label.length > 20 ? { mobile: { label: html(label.slice(0, 18).trim()) } } : undefined,
    },
    `Add CTA ${label}`,
  );
}

function containerCommand(
  id: string,
  parentId: string,
  props: Record<string, unknown>,
  style: Record<string, unknown>,
): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Container",
      parentId,
      props: { display: "flex", direction: "column", gap: "16px", padding: "0px", showPlaceholder: false, ...props },
      style: { width: "100%", position: "relative", ...style },
    },
    "Add layout container",
  );
}

function gridCommand(id: string, parentId: string, columns: number): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Grid",
      parentId,
      props: {
        columns,
        rows: 1,
        columnTemplate: "custom",
        customTemplate: `repeat(${columns}, minmax(0, 1fr))`,
        columnGap: 20,
        rowGap: 20,
        padding: 0,
        showPlaceholder: false,
      },
      style: { display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gap: "20px", width: "100%", minHeight: "0px" },
      responsiveStyle: { mobile: { gridTemplateColumns: "1fr" }, tablet: { gridTemplateColumns: columns > 2 ? "1fr 1fr" : "1fr" } },
    },
    "Add responsive grid",
  );
}

function imageCommand(
  id: string,
  parentId: string,
  src: string,
  alt: string,
  style: Record<string, unknown>,
): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Image",
      parentId,
      props: { src, alt, objectFit: "cover" },
      style,
      responsiveStyle: { mobile: { width: "100%", height: "180px" } },
    },
    "Add supporting image",
  );
}

function dividerCommand(id: string, parentId: string, ctx: CompileContext): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Divider",
      parentId,
      props: { orientation: "horizontal" },
      style: { width: "100%", height: "1px", backgroundColor: c.border, margin: "8px 0" },
    },
    "Add divider",
  );
}

function rowCommand(
  id: string,
  parentId: string,
  props: Record<string, unknown>,
  style: Record<string, unknown>,
): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Row",
      parentId,
      props: { gap: 16, padding: 0, alignItems: "center", justifyContent: "flex-start", flexWrap: "wrap", ...props },
      style: { display: "flex", flexDirection: "row", width: "100%", gap: "16px", ...style },
    },
    "Add responsive row",
  );
}

function columnCommand(
  id: string,
  parentId: string,
  props: Record<string, unknown>,
  style: Record<string, unknown>,
): AICommandSuggestion {
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Column",
      parentId,
      props: { gap: 16, padding: 0, alignItems: "stretch", justifyContent: "flex-start", direction: "column", ...props },
      style: { display: "flex", flexDirection: "column", width: "100%", gap: "16px", ...style },
    },
    "Add responsive column",
  );
}

function navMenuCommand(
  id: string,
  parentId: string,
  items: SectionPlanNavItem[],
  ctx: CompileContext,
  layout: "horizontal" | "vertical" = "horizontal",
): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  const toTarget = (href: string) => {
    const safe = safeLinkUrl(href);
    if (!safe) return { type: "none" };
    if (safe.startsWith("#")) return { type: "anchor", anchorId: safe.slice(1), behavior: "smooth" };
    if (safe.startsWith("/")) return { type: "page", path: safe };
    return { type: "url", url: safe, target: "_self" };
  };
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "NavigationMenu",
      parentId,
      props: {
        items: items.map((item, index) => ({ id: `nav-${index}-${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "item"}`, label: item.label, target: toTarget(item.href) })),
        orientation: layout,
        layout,
        mobileBehavior: "hamburger",
        mobileHamburger: true,
        hamburgerMode: "fullscreen",
        widthMode: layout === "vertical" ? "wrap" : "fullWidth",
        overflowMode: "wrap",
        fillItems: false,
        alignment: layout === "vertical" ? "left" : "right",
        dropdownMode: "flyout",
        dropdownWidthMode: "fitToMenu",
        dropdownColumns: 3,
        itemStyle: layout === "vertical" ? "underline" : "pill",
        textColor: c.text,
        activeColor: c.primary,
        activeBg: c.accent,
        itemBg: "",
        navBg: "",
        navBorder: "",
        navBorderRadius: c.radius,
        navPadding: "0px",
        fontSize: "14px",
        gap: layout === "vertical" ? 10 : 18,
        itemGap: layout === "vertical" ? 10 : 18,
        rowGap: 8,
        activeIndex: 0,
        activeMode: "auto",
        floatingMode: "static",
      },
      style: { width: "100%", display: "flex", justifyContent: layout === "vertical" ? "flex-start" : "flex-end" },
    },
    "Add navigation menu",
  );
}

function textMarqueeCommand(id: string, parentId: string, text: string, ctx: CompileContext): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "TextMarquee",
      parentId,
      props: { text, speed: 22, direction: "left", separator: "  •  " },
      style: {
        width: "100%",
        overflow: "hidden",
        whiteSpace: "nowrap",
        fontSize: "16px",
        fontWeight: "800",
        color: c.primary,
        padding: "10px 0",
      },
    },
    "Add marquee strip",
  );
}

function textMaskCommand(id: string, parentId: string, text: string, ctx: CompileContext): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "TextMask",
      parentId,
      props: {
        text,
        gradient: `linear-gradient(135deg, ${c.primary} 0%, ${c.accent} 52%, ${c.text} 100%)`,
        backgroundImage: "",
        fontSize: "56px",
        fontWeight: "900",
      },
      responsiveProps: { mobile: { fontSize: "36px" } },
      style: { width: "100%", padding: "0px", textAlign: "left", lineHeight: "1.05" },
    },
    "Add expressive masked heading",
  );
}

function collapsibleTextCommand(id: string, parentId: string, item: SectionPlanItem, ctx: CompileContext): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  const vi = isVietnamese(ctx.brief);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "CollapsibleText",
      parentId,
      props: {
        text: richTextBlock(item.title, item.body),
        previewLines: 2,
        expandLabel: vi ? "Xem thêm" : "Read more",
        collapseLabel: vi ? "Thu gọn" : "Show less",
      },
      style: {
        width: "100%",
        fontSize: "16px",
        color: c.muted,
        lineHeight: "1.65",
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        padding: "18px 20px",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
      },
    },
    "Add expandable FAQ item",
  );
}

function shapeCommand(
  id: string,
  parentId: string,
  shape: "circle" | "star" | "heart" | "blob" | "hexagon",
  ctx: CompileContext,
  style: Record<string, unknown>,
): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "Shape",
      parentId,
      props: { shape, fill: c.accent, stroke: "transparent", strokeWidth: 0 },
      style: { width: "54px", height: "54px", opacity: 0.28, ...style },
    },
    "Add bounded decorative shape",
  );
}

function galleryProCommand(
  id: string,
  parentId: string,
  items: ReturnType<typeof mediaItemsFor>,
  layoutMode: GalleryLayoutMode,
  ctx: CompileContext,
): AICommandSuggestion {
  const c = colors(ctx.designTokens);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "GalleryPro",
      parentId,
      props: {
        layoutMode,
        gap: layoutMode === "slider" || layoutMode === "slideshow" ? 0 : 14,
        columns: layoutMode === "collage" || layoutMode === "strip" ? 3 : Math.min(4, Math.max(2, items.length >= 4 ? 4 : items.length)),
        aspectRatio: sectionAspectRatio(layoutMode),
        imageFit: "cover",
        borderRadius: Number.parseInt(String(c.radius), 10) || 12,
        items: items.map((item, index) => ({
          id: `${id}-item-${index}`,
          src: item.src,
          alt: item.alt,
          title: item.caption || item.alt,
          description: item.caption,
          link: item.link,
        })),
        carouselConfig: {
          navigation: { enabled: true },
          pagination: { enabled: true },
          autoplay: { enabled: layoutMode === "slider" || layoutMode === "slideshow", delay: 3500, stopOnInteraction: true },
          loopMode: "loop",
        },
      },
      style: { width: "100%", minHeight: layoutMode === "slider" || layoutMode === "slideshow" ? "320px" : "260px" },
      responsiveStyle: { mobile: { minHeight: "220px" } },
    },
    `Add ${layoutMode} gallery`,
  );
}

function gallerySliderCommand(
  id: string,
  parentId: string,
  items: ReturnType<typeof mediaItemsFor>,
): AICommandSuggestion {
  const props: Record<string, unknown> = {
    slideCount: items.length,
    autoPlay: true,
    autoPlaySpeed: 3500,
    loop: true,
    showArrows: true,
    showDots: true,
    aspectRatio: "16/9",
  };
  items.forEach((item, index) => {
    props[`slide${index}_src`] = item.src;
    props[`slide${index}_alt`] = item.alt;
    props[`slide${index}_caption`] = item.caption ?? "";
    props[`slide${index}_link`] = item.link ?? "";
  });
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "GallerySlider",
      parentId,
      props,
      style: { width: "100%", minHeight: "320px", borderRadius: "14px", overflow: "hidden" },
      responsiveStyle: { mobile: { minHeight: "220px" } },
    },
    "Add gallery slider",
  );
}

function galleryGridCommand(
  id: string,
  parentId: string,
  items: ReturnType<typeof mediaItemsFor>,
): AICommandSuggestion {
  const props: Record<string, unknown> = {
    columns: Math.min(3, Math.max(2, items.length)),
    gap: 12,
    imageCount: items.length,
    aspectRatio: "4/3",
    layout: items.length > 4 ? "masonry" : "grid",
  };
  items.forEach((item, index) => {
    props[`slot${index}_src`] = item.src;
    props[`slot${index}_alt`] = item.alt;
    props[`slot${index}_caption`] = item.caption ?? "";
  });
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "GalleryGrid",
      parentId,
      props,
      style: { width: "100%", padding: "0px" },
    },
    "Add gallery grid",
  );
}

function sectionAspectRatio(layoutMode: GalleryLayoutMode): string {
  if (layoutMode === "slider" || layoutMode === "slideshow") return "16/9";
  if (layoutMode === "strip") return "4/3";
  return "1/1";
}

function chooseGalleryLayout(section: PagePlanSection, plan: SectionPlan): GalleryLayoutMode {
  if (plan.interactionIntent === "carousel") return "slider";
  if (section.type === "testimonials") return "slider";
  if (section.type === "hero" || section.type === "cta") return "strip";
  if (section.type === "gallery" || plan.interactionIntent === "gallery") return prefers(plan, "GalleryPro") ? "collage" : "grid";
  if (section.type === "services") return "collage";
  return "grid";
}

function addRichGallery(
  commands: AICommandSuggestion[],
  id: string,
  parentId: string,
  section: PagePlanSection,
  plan: SectionPlan,
  ctx: CompileContext,
  options: { min: number; max: number },
): boolean {
  const items = mediaItemsFor(plan, section, ctx.brief, options);
  const preferred = firstAvailable(ctx, adapterCandidatesFor(section, plan).filter((type) => ["GalleryPro", "GallerySlider", "GalleryGrid"].includes(type)));

  if (preferred === "GallerySlider") {
    commands.push(gallerySliderCommand(id, parentId, items));
    return true;
  }
  if (preferred === "GalleryGrid") {
    commands.push(galleryGridCommand(id, parentId, items));
    return true;
  }
  if (has(ctx, "GalleryPro")) {
    commands.push(galleryProCommand(id, parentId, items, chooseGalleryLayout(section, plan), ctx));
    return true;
  }
  if (has(ctx, "GallerySlider") && (plan.interactionIntent === "carousel" || section.type === "testimonials")) {
    commands.push(gallerySliderCommand(id, parentId, items));
    return true;
  }
  if (has(ctx, "GalleryGrid")) {
    commands.push(galleryGridCommand(id, parentId, items));
    return true;
  }
  return false;
}

function getBusinessName(brief: CreativeBrief): string {
  const detail = brief.assumedBusinessDetails.find((item) => item.toLowerCase().includes("business name"));
  return detail?.split(":").at(1)?.trim() || brief.inferredIndustry || "Your Brand";
}

function isPetCare(brief: CreativeBrief): boolean {
  const text = `${brief.rawPrompt} ${brief.inferredIndustry} ${brief.targetAudience}`.toLowerCase();
  return /pet|thú cưng|thu cung|chó|cho|mèo|meo|groom|boarding|daycare/.test(text);
}

function isVietnamese(brief: CreativeBrief): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(brief.rawPrompt);
}

function isPlayfulTone(brief: CreativeBrief): boolean {
  return /(playful|fun|friendly|vui|tươi|dễ thương|cute)/i.test(`${brief.tone} ${brief.styleDirection} ${brief.rawPrompt}`);
}

function addActions(
  commands: AICommandSuggestion[],
  section: PagePlanSection,
  parentId: string,
  plan: SectionPlan,
  ctx: CompileContext,
  centered: boolean,
) {
  if (!has(ctx, "Button") || (!plan.ctaLabel && !plan.secondaryCtaLabel)) return;

  const c = colors(ctx.designTokens);
  const actionsId = `${section.id}-actions`;
  commands.push(
    containerCommand(
      actionsId,
      parentId,
      { direction: "row", gap: "12px", padding: "0px", showPlaceholder: false },
      { display: "flex", flexDirection: "row", flexWrap: "wrap", justifyContent: centered ? "center" : "flex-start" },
    ),
  );
  if (plan.ctaLabel) commands.push(buttonCommand(`${section.id}-cta-primary`, actionsId, plan.ctaLabel, ctx));
  if (plan.secondaryCtaLabel) {
    commands.push(
      command(
        "ADD_NODE",
        {
          nodeId: `${section.id}-cta-secondary`,
          componentType: "Button",
          parentId: actionsId,
          props: { label: html(plan.secondaryCtaLabel), variant: "outline", size: "lg" },
          style: { backgroundColor: "transparent", color: c.primary, border: `1px solid ${c.primary}`, borderRadius: c.radius, padding: "12px 20px", fontWeight: "700" },
        },
        `Add secondary CTA ${plan.secondaryCtaLabel}`,
      ),
    );
  }
}

function addIntro(
  commands: AICommandSuggestion[],
  section: PagePlanSection,
  parentId: string,
  plan: SectionPlan,
  ctx: CompileContext,
  options: { centered: boolean; compact?: boolean } = { centered: false },
) {
  const c = colors(ctx.designTokens);
  if (plan.eyebrow && has(ctx, "Text")) {
    commands.push(textCommand(`${section.id}-eyebrow`, parentId, plan.eyebrow, "span", { color: c.accent, fontSize: "13px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }));
  }
  if (has(ctx, "Text")) {
    commands.push(
      textCommand(`${section.id}-heading`, parentId, plan.heading, section.type === "hero" ? "h1" : "h2", {
        color: c.text,
        fontSize: section.type === "hero" ? "56px" : options.compact ? "30px" : "38px",
        lineHeight: "1.08",
        fontWeight: "800",
        maxWidth: options.centered ? "760px" : "860px",
        fontFamily: c.headingFont,
      }),
    );
    commands.push(textCommand(`${section.id}-body`, parentId, plan.body, "p", { color: c.muted, fontSize: options.compact ? "16px" : "18px", lineHeight: "1.75", maxWidth: "760px" }));
  }
  if (has(ctx, "Divider") && !options.compact && section.type !== "hero" && section.type !== "cta") {
    commands.push(dividerCommand(`${section.id}-divider`, parentId, ctx));
  }
}

function sectionBackground(type: PageSectionType, index: number, ctx: CompileContext): string {
  const c = colors(ctx.designTokens);
  if (type === "hero" || type === "cta") return c.secondary;
  if (index % 2 === 1) return "#f8fafc";
  return c.surface;
}

function sectionSpacing(type: PageSectionType): { minHeight: string; paddingTop: string; paddingBottom: string } {
  if (type === "header") return { minHeight: "72px", paddingTop: "18px", paddingBottom: "18px" };
  if (type === "hero") return { minHeight: "520px", paddingTop: "72px", paddingBottom: "72px" };
  if (type === "cta") return { minHeight: "320px", paddingTop: "56px", paddingBottom: "56px" };
  if (type === "footer") return { minHeight: "220px", paddingTop: "48px", paddingBottom: "48px" };
  return { minHeight: "auto", paddingTop: "64px", paddingBottom: "64px" };
}

export function buildSkeletonCommands(plan: PagePlan, request: GeneratePageRequest): AICommandSuggestion[] {
  const rootParentId = "root";
  const designTokens = request.designTokens ?? {};
  const c = colors(designTokens);
  const commands: AICommandSuggestion[] = [];

  if (request.fullPageMode && request.pageNodes) {
    const rootNodeId = request.rootNodeId;
    const childrenToRemove = Object.values(request.pageNodes).filter((node) => node.parentId === rootNodeId);
    for (const node of childrenToRemove) {
      commands.push(command("REMOVE_NODE", { nodeId: node.id }, `Remove ${node.type}`));
    }
  }

  for (const section of plan.sections) {
    const spacing = sectionSpacing(section.type);
    commands.push(
      command(
        "ADD_NODE",
        {
          nodeId: section.id,
          componentType: "Section",
          parentId: rootParentId,
          name: section.title,
          props: { fullWidthBackground: false, anchorId: sectionAnchor(section, plan.sections) },
          style: {
            backgroundColor: sectionBackground(section.type, section.index, { availableTypes: new Set(), designTokens, brief: plan.brief, contractsByType: new Map(), pagePlan: plan }),
            color: c.text,
            minHeight: spacing.minHeight,
            paddingTop: spacing.paddingTop,
            paddingBottom: spacing.paddingBottom,
          },
          responsiveStyle: {
            mobile: { paddingTop: "44px", paddingBottom: "44px", paddingLeft: "16px", paddingRight: "16px", minHeight: "auto" },
          },
        },
        `Create ${section.title} section`,
      ),
    );
  }

  return commands;
}

function defaultItems(section: PagePlanSection, brief: CreativeBrief): SectionPlanItem[] {
  const industry = brief.inferredIndustry || "your business";
  const pet = isPetCare(brief);
  const vi = isVietnamese(brief);

  if (section.type === "header") {
    return vi
      ? [
          { title: "Dịch vụ", body: "Các gói chăm sóc nổi bật" },
          { title: "Bảng giá", body: "Chi phí rõ ràng" },
          { title: "Đánh giá", body: "Khách hàng tin chọn" },
          { title: "FAQ", body: "Câu hỏi thường gặp" },
        ]
      : [
          { title: "Services", body: "Featured care options" },
          { title: "Pricing", body: "Transparent packages" },
          { title: "Reviews", body: "Trusted customers" },
          { title: "FAQ", body: "Common questions" },
        ];
  }

  if (section.type === "services") {
    if (pet && vi) {
      return [
        { title: "Spa tắm thơm và cắt tỉa", body: "Tắm sấy, vệ sinh tai móng và tạo kiểu nhẹ nhàng cho từng bé." },
        { title: "Trông giữ theo giờ", body: "Không gian chơi an toàn, có người theo dõi và cập nhật hình ảnh." },
        { title: "Khách sạn thú cưng", body: "Phòng nghỉ sạch sẽ, lịch ăn ngủ riêng và chăm sóc qua đêm." },
        { title: "Dắt đi dạo và vận động", body: "Lịch đi dạo linh hoạt giúp bé vui khỏe và bớt căng thẳng." },
      ];
    }
    return [
      { title: "Grooming and Care", body: `Gentle, detail-focused care tailored to every pet's comfort and routine.` },
      { title: "Daycare and Boarding", body: `Safe supervised spaces for play, rest, and overnight stays.` },
      { title: "Walking and Training", body: `Friendly support for healthier habits, confidence, and daily exercise.` },
    ];
  }
  if (section.type === "pricing") {
    if (pet && vi) {
      return [
        { title: "Gói Tắm Thơm", body: "Tắm, sấy, chải lông và vệ sinh cơ bản cho chó mèo nhỏ.", meta: "Từ 199k" },
        { title: "Gói Spa Toàn Diện", body: "Thêm cắt tỉa, dưỡng lông và chăm sóc móng tai nhẹ nhàng.", meta: "Từ 399k" },
        { title: "Gói Lưu Trú", body: "Trông giữ ban ngày hoặc qua đêm với cập nhật hình ảnh định kỳ.", meta: "Từ 249k/ngày" },
      ];
    }
    return [
      { title: "Essential", body: "Core service package for regular care.", meta: "From $29" },
      { title: "Complete", body: "Most popular plan with extra attention and flexible scheduling.", meta: "From $79" },
      { title: "Premium", body: "Personalized care for special routines and advanced needs.", meta: "Custom" },
    ];
  }
  if (section.type === "process") {
    if (pet && vi) {
      return [
        { title: "Chọn dịch vụ phù hợp", body: "Chia sẻ giống, cân nặng, thói quen và nhu cầu của bé." },
        { title: "Nhận tư vấn lịch hẹn", body: "Đội ngũ gợi ý gói chăm sóc, thời lượng và lưu ý chuẩn bị." },
        { title: "Đưa bé đến vui chơi", body: "Bạn nhận cập nhật sau buổi chăm sóc và lời khuyên tại nhà." },
      ];
    }
    return [
      { title: "Tell us what you need", body: "Share your goals, schedule, and any special care notes." },
      { title: "Meet the care team", body: "We confirm the right service path and answer practical questions." },
      { title: "Book with confidence", body: "Choose a time and receive clear next steps before the visit." },
    ];
  }
  if (section.type === "trust") {
    if (pet && vi) {
      return [
        { title: "Nhân viên yêu động vật", body: "Mỗi bé được làm quen nhẹ nhàng trước khi bắt đầu chăm sóc." },
        { title: "Không gian sạch và an toàn", body: "Dụng cụ được vệ sinh riêng, khu chơi có giám sát liên tục." },
        { title: "Cập nhật minh bạch", body: "Gửi ảnh, tình trạng ăn uống và ghi chú sau mỗi lần sử dụng dịch vụ." },
      ];
    }
    return [
      { title: "Trained specialists", body: `A careful team familiar with ${industry} needs and safety standards.` },
      { title: "Clean safe spaces", body: "Every visit is supported by clear routines and attentive supervision." },
      { title: "Transparent updates", body: "Customers know what happened, what changed, and what to do next." },
    ];
  }
  return [
    { title: "Clear value", body: "A focused message that helps visitors understand the offer quickly." },
    { title: "Helpful details", body: "Practical information that answers the next natural question." },
    { title: "Easy next step", body: "A direct path to contact, book, buy, or learn more." },
  ];
}

function defaultPreferredComponents(sectionType: PageSectionType): string[] {
  const map: Partial<Record<PageSectionType, string[]>> = {
    header: ["NavigationMenu"],
    hero: ["TextMask", "TextMarquee", "Image"],
    services: ["GalleryPro", "GalleryGrid"],
    gallery: ["GalleryPro", "GallerySlider", "GalleryGrid"],
    testimonials: ["GalleryPro", "GallerySlider"],
    faq: ["CollapsibleText"],
    cta: ["TextMarquee", "Image"],
    footer: ["NavigationMenu", "Divider"],
  };
  return map[sectionType] ?? [];
}

function defaultInteractionIntent(sectionType: PageSectionType): SectionPlan["interactionIntent"] {
  if (sectionType === "gallery") return "gallery";
  if (sectionType === "testimonials") return "carousel";
  if (sectionType === "faq") return "expandable";
  if (sectionType === "hero" || sectionType === "cta") return "marquee";
  return "static";
}

function defaultVisualEmphasis(sectionType: PageSectionType): SectionPlan["visualEmphasis"] {
  if (sectionType === "hero") return "balanced";
  if (sectionType === "gallery" || sectionType === "services") return "media";
  if (sectionType === "testimonials" || sectionType === "trust") return "proof";
  if (sectionType === "cta") return "conversion";
  return "copy";
}

function defaultComponentIntents(sectionType: PageSectionType): SectionPlan["componentIntents"] {
  return defaultPreferredComponents(sectionType).map((componentType, index) => ({
    role: `${sectionType}_${componentType.toLowerCase()}`,
    componentType,
    priority: index === 0 ? "preferred" : "optional",
    contentSource: componentType.includes("Gallery") || componentType === "Image" ? "mediaItems" : "sectionPlan",
    reason: `Default ${sectionType} strategy can use ${componentType}.`,
  }));
}

/** Localized label for a navigable section type — only used when the plan lacks LLM-authored navItems. */
function navLabelFor(type: PageSectionType, vi: boolean): string {
  const labels: Partial<Record<PageSectionType, { vi: string; en: string }>> = {
    services: { vi: "Dịch vụ", en: "Services" },
    features: { vi: "Tính năng", en: "Features" },
    gallery: { vi: "Hình ảnh", en: "Gallery" },
    pricing: { vi: "Bảng giá", en: "Pricing" },
    testimonials: { vi: "Đánh giá", en: "Reviews" },
    faq: { vi: "FAQ", en: "FAQ" },
    trust: { vi: "Vì sao chọn chúng tôi", en: "Why Us" },
    process: { vi: "Quy trình", en: "How It Works" },
    stats: { vi: "Kết quả", en: "Results" },
  };
  const entry = labels[type];
  return vi ? entry?.vi ?? type : entry?.en ?? type;
}

/**
 * Default nav items generated from the SECTIONS ACTUALLY PRESENT in the page plan
 * (not a hardcoded guess) — every href is guaranteed to match a real Section's
 * anchorId. Used only as a fallback when neither the LLM nor a content pack
 * supplied navItems.
 */
function defaultNavItems(brief: CreativeBrief, pagePlan: PagePlan): SectionPlanNavItem[] {
  const vi = isVietnamese(brief);
  const fromPlan = navigableSections(pagePlan)
    .slice(0, 5)
    .map((navSection) => ({
      label: navLabelFor(navSection.type, vi),
      href: `#${sectionAnchor(navSection, pagePlan.sections)}`,
    }));
  if (fromPlan.length > 0) return fromPlan;

  return vi
    ? [
        { label: "Dịch vụ", href: "#services" },
        { label: "Hình ảnh", href: "#gallery" },
        { label: "Bảng giá", href: "#pricing" },
        { label: "Đánh giá", href: "#testimonials" },
        { label: "FAQ", href: "#faq" },
      ]
    : [
        { label: "Services", href: "#services" },
        { label: "Gallery", href: "#gallery" },
        { label: "Pricing", href: "#pricing" },
        { label: "Reviews", href: "#testimonials" },
        { label: "FAQ", href: "#faq" },
      ];
}

function defaultMediaItems(section: PagePlanSection, brief: CreativeBrief): SectionPlanMediaItem[] {
  const vi = isVietnamese(brief);
  const pool = fallbackImagePool(brief);
  const count = section.type === "gallery" ? 6 : section.type === "services" ? 4 : section.type === "testimonials" ? 3 : 1;
  return Array.from({ length: count }, (_, index) => ({
    src: pool[index % pool.length],
    alt: vi ? `Không gian chăm sóc thú cưng ${index + 1}` : fallbackAlt(section, { heading: section.title } as SectionPlan, index),
    caption:
      section.type === "services"
        ? vi
          ? ["Spa sạch thơm", "Khu chơi an toàn", "Lưu trú ấm cúng", "Dắt đi dạo vui khỏe"][index] ?? section.title
          : ["Gentle grooming", "Safe daycare", "Cozy boarding", "Healthy walks"][index] ?? section.title
        : section.type === "testimonials"
        ? vi
          ? "Khách hàng tin chọn dịch vụ chăm sóc nhẹ nhàng."
          : "Customers trust the team for calm, thoughtful care."
        : undefined,
  }));
}

export function buildFallbackSectionPlan(section: PagePlanSection, brief: CreativeBrief, pagePlan: PagePlan): SectionPlan {
  const pet = isPetCare(brief);
  const vi = isVietnamese(brief);

  if (pet && vi) {
    const byType: Partial<Record<PageSectionType, Pick<SectionPlan, "heading" | "body" | "faqs" | "testimonials" | "mediaPrompt">>> = {
      header: {
        heading: "PawJoy Pet Care",
        body: "Spa, trông giữ và chăm sóc thú cưng thân thiện.",
      },
      hero: {
        heading: "Spa và chăm sóc thú cưng vui khỏe mỗi ngày",
        body: "Từ tắm thơm, cắt tỉa đến trông giữ qua đêm, PawJoy giúp các bé được chăm sóc an toàn, sạch sẽ và đầy yêu thương.",
        mediaPrompt: "Happy dog and cat in a bright playful pet spa with warm red and yellow accents",
      },
      services: {
        heading: "Dịch vụ dành riêng cho từng bé",
        body: "Chọn nhanh các gói chăm sóc phổ biến cho chó mèo, từ làm đẹp đến vui chơi và lưu trú.",
      },
      gallery: {
        heading: "Một ngày vui khỏe tại PawJoy",
        body: "Hình ảnh dịch vụ giúp chủ nuôi thấy rõ không gian, quy trình và sự thoải mái của các bé.",
        mediaPrompt: "Playful pet care gallery with grooming, daycare, boarding, and walking moments",
      },
      trust: {
        heading: "Vì sao các sen yên tâm gửi bé?",
        body: "Quy trình chăm sóc rõ ràng, không gian sạch và đội ngũ hiểu tính cách từng bé.",
      },
      process: {
        heading: "Đặt lịch đơn giản trong 3 bước",
        body: "Bạn chỉ cần gửi nhu cầu, chọn lịch phù hợp và nhận cập nhật sau buổi chăm sóc.",
      },
      pricing: {
        heading: "Gói dịch vụ rõ ràng, dễ chọn",
        body: "Bắt đầu từ những gói cơ bản đến chăm sóc toàn diện cho từng kích thước và thói quen.",
      },
      testimonials: {
        heading: "Khách hàng nói gì về PawJoy",
        body: "Những trải nghiệm thật từ các chủ nuôi đã gửi gắm thú cưng.",
        testimonials: [
          { title: "Bé về nhà thơm sạch và vui vẻ", body: "Mình nhận được ảnh cập nhật trong lúc bé spa, rất yên tâm.", meta: "Chị Mai, nuôi Poodle" },
          { title: "Dịch vụ trông giữ rất có tâm", body: "Bé mèo nhà mình nhát nhưng được chăm sóc nhẹ nhàng, lần sau sẽ quay lại.", meta: "Anh Nam, nuôi mèo Anh lông ngắn" },
        ],
      },
      faq: {
        heading: "Câu hỏi thường gặp",
        body: "Một vài điều chủ nuôi thường hỏi trước khi đặt lịch.",
        faqs: [
          { title: "Tôi cần chuẩn bị gì trước khi đưa bé đến?", body: "Bạn nên mang sổ tiêm, thức ăn quen thuộc nếu bé lưu trú và ghi chú thói quen đặc biệt." },
          { title: "Có nhận chó mèo nhạy cảm hoặc nhút nhát không?", body: "Có. Đội ngũ sẽ làm quen chậm, giảm tiếng ồn và điều chỉnh quy trình theo tính cách của bé." },
          { title: "Tôi có được nhận ảnh cập nhật không?", body: "Có. Với dịch vụ trông giữ và lưu trú, bạn sẽ nhận ảnh hoặc ghi chú trong ngày." },
        ],
      },
      cta: {
        heading: "Sẵn sàng cho bé một ngày thật vui?",
        body: "Đặt lịch để đội ngũ PawJoy tư vấn gói chăm sóc phù hợp nhất cho thú cưng của bạn.",
        mediaPrompt: "Playful pet care booking scene with happy dog owner and warm colors",
      },
      footer: {
        heading: "PawJoy Pet Care",
        body: "Dịch vụ spa, trông giữ, lưu trú và chăm sóc chó mèo tại địa phương.",
      },
    };

    const content = byType[section.type];
    return {
      sectionId: section.id,
      type: section.type,
      eyebrow: section.type === "hero" ? "Dịch vụ thú cưng" : section.title,
      layoutVariant: section.type === "gallery" ? "collage gallery" : undefined,
      preferredComponents: defaultPreferredComponents(section.type),
      componentIntents: defaultComponentIntents(section.type),
      interactionIntent: defaultInteractionIntent(section.type),
      visualEmphasis: defaultVisualEmphasis(section.type),
      heading: content?.heading ?? section.title,
      body: content?.body ?? section.purpose,
      ctaLabel: section.type === "hero" || section.type === "cta" || section.type === "header" ? "Đặt lịch ngay" : undefined,
      secondaryCtaLabel: section.type === "hero" ? "Xem dịch vụ" : undefined,
      items: defaultItems(section, brief),
      faqs: content?.faqs,
      testimonials: content?.testimonials,
      mediaItems: defaultMediaItems(section, brief),
      navItems: defaultNavItems(brief, pagePlan),
      mediaPrompt: content?.mediaPrompt,
    };
  }

  return {
    sectionId: section.id,
    type: section.type,
    eyebrow: section.type === "hero" ? brief.inferredPageType : section.title,
    layoutVariant: section.type === "gallery" ? "collage gallery" : undefined,
    preferredComponents: defaultPreferredComponents(section.type),
    componentIntents: defaultComponentIntents(section.type),
    interactionIntent: defaultInteractionIntent(section.type),
    visualEmphasis: defaultVisualEmphasis(section.type),
    heading:
      section.type === "hero"
        ? `Reliable ${brief.inferredIndustry} made simple`
        : section.title,
    body:
      section.purpose ||
      `A practical section for ${brief.targetAudience}, written in a ${brief.tone} tone.`,
    ctaLabel: section.type === "hero" || section.type === "cta" ? "Book a visit" : undefined,
    secondaryCtaLabel: section.type === "hero" ? "View services" : undefined,
    items: defaultItems(section, brief),
    faqs:
      section.type === "faq"
        ? [
            { title: "How do I get started?", body: "Choose a service, share a few details, and the team will confirm availability." },
            { title: "Can I customize the service?", body: "Yes. The page can highlight packages and flexible options for different needs." },
            { title: "What should I prepare?", body: "Bring any relevant notes, preferences, and contact details before the first visit." },
          ]
        : undefined,
    testimonials:
      section.type === "testimonials"
        ? [
            { title: "A calmer experience", body: "The team made the whole process easy, warm, and incredibly professional.", meta: "Mai T., customer" },
            { title: "Reliable every time", body: "Clear communication and thoughtful service gave us complete confidence.", meta: "Daniel P., customer" },
          ]
        : undefined,
    mediaItems: defaultMediaItems(section, brief),
    navItems: defaultNavItems(brief, pagePlan),
  };
}

function addCard(commands: AICommandSuggestion[], cardId: string, parentId: string, item: SectionPlanItem, ctx: CompileContext, imageSrc?: string) {
  const c = colors(ctx.designTokens);
  commands.push(
    containerCommand(
      cardId,
      parentId,
      { gap: "10px", padding: "20px" },
      {
        backgroundColor: c.surface,
        border: `1px solid ${c.border}`,
        borderRadius: c.radius,
        boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
        minHeight: "150px",
      },
    ),
  );
  if (imageSrc && has(ctx, "Image")) {
    commands.push(imageCommand(`${cardId}-image`, cardId, imageSrc, item.title, { width: "100%", height: "150px", borderRadius: c.radius }));
  }
  if (item.meta && has(ctx, "Text")) {
    commands.push(textCommand(`${cardId}-meta`, cardId, item.meta, "span", { color: c.accent, fontWeight: "700", fontSize: "13px" }));
  }
  if (has(ctx, "Text")) {
    commands.push(textCommand(`${cardId}-title`, cardId, item.title, "h3", { color: c.text, fontSize: "22px", lineHeight: "1.25", fontWeight: "700" }));
    commands.push(textCommand(`${cardId}-body`, cardId, item.body, "p", { color: c.muted, fontSize: "15px", lineHeight: "1.7" }));
  }
}

function compileHeaderSection(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const c = colors(ctx.designTokens);
  const commands: AICommandSuggestion[] = [];
  const rootId = `${section.id}-content`;

  if (!has(ctx, "Container")) return commands;

  commands.push(
    has(ctx, "Row")
      ? rowCommand(
          rootId,
          section.id,
          { gap: 24, padding: 0, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" },
          { maxWidth: "1120px", margin: "0 auto", alignItems: "center", justifyContent: "space-between", fontFamily: c.font },
        )
      : containerCommand(
          rootId,
          section.id,
          { direction: "row", gap: "24px", padding: "0px", showPlaceholder: false },
          {
            maxWidth: "1120px",
            margin: "0 auto",
            alignItems: "center",
            justifyContent: "space-between",
            fontFamily: c.font,
          },
        ),
  );

  if (has(ctx, "Text")) {
    commands.push(textCommand(`${section.id}-brand`, rootId, getBusinessName(ctx.brief), "span", { color: c.text, fontSize: "22px", fontWeight: "800" }));
  }

  if (has(ctx, "NavigationMenu")) {
    commands.push(navMenuCommand(`${section.id}-nav-menu`, rootId, navItemsFor(plan, section, ctx.pagePlan), ctx));
    if (has(ctx, "Button")) {
      commands.push(buttonCommand(`${section.id}-nav-cta`, rootId, plan.ctaLabel || (isVietnamese(ctx.brief) ? "Đặt lịch" : "Book now"), ctx));
    }
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  const navId = `${section.id}-nav`;
  commands.push(
    has(ctx, "Row")
      ? rowCommand(navId, rootId, { gap: 18, padding: 0, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }, { alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" })
      : containerCommand(navId, rootId, { direction: "row", gap: "18px", padding: "0px", showPlaceholder: false }, { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }),
  );
  const navItems = (plan.items.length ? plan.items : defaultItems(section, ctx.brief)).slice(0, 4);
  if (has(ctx, "Text")) {
    navItems.forEach((item, index) => {
      commands.push(textCommand(`${section.id}-nav-${index}`, navId, item.title, "span", { color: c.muted, fontSize: "14px", fontWeight: "700" }));
    });
  }
  if (has(ctx, "Button")) {
    commands.push(buttonCommand(`${section.id}-nav-cta`, navId, plan.ctaLabel || "Book now", ctx));
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

function compileHeroSection(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const c = colors(ctx.designTokens);
  const commands: AICommandSuggestion[] = [];
  const rootId = `${section.id}-content`;
  const heroMedia = mediaItemsFor(plan, section, ctx.brief, { min: 1, max: 4 });

  if (!has(ctx, "Container")) return commands;

  commands.push(
    containerCommand(
      rootId,
      section.id,
      { gap: "28px", padding: "0px", showPlaceholder: false },
      { maxWidth: "1120px", margin: "0 auto", alignItems: "stretch", textAlign: "left", fontFamily: c.font },
    ),
  );

  if (has(ctx, "Grid")) {
    const gridId = `${section.id}-hero-grid`;
    const copyId = `${section.id}-copy`;
    const mediaId = `${section.id}-media`;
    commands.push(gridCommand(gridId, rootId, 2));
    commands.push(
      has(ctx, "Column")
        ? columnCommand(copyId, gridId, { gap: 22, padding: 0, alignItems: "stretch" }, { justifyContent: "center" })
        : containerCommand(copyId, gridId, { gap: "22px", padding: "0px", showPlaceholder: false }, { justifyContent: "center" }),
    );
    commands.push(containerCommand(mediaId, gridId, { gap: "12px", padding: "0px", showPlaceholder: false }, { justifyContent: "center" }));
    if (has(ctx, "Text") && plan.eyebrow) {
      commands.push(textCommand(`${section.id}-eyebrow`, copyId, plan.eyebrow, "span", { color: c.accent, fontSize: "13px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em" }));
    }
    if (has(ctx, "TextMask") && (prefers(plan, "TextMask") || isPlayfulTone(ctx.brief))) {
      commands.push(textMaskCommand(`${section.id}-mask-heading`, copyId, plan.heading, ctx));
      if (has(ctx, "Text")) {
        commands.push(textCommand(`${section.id}-body`, copyId, plan.body, "p", { color: c.muted, fontSize: "18px", lineHeight: "1.75", maxWidth: "720px" }));
      }
    } else {
      addIntro(commands, section, copyId, plan, ctx, { centered: false });
    }
    addActions(commands, section, copyId, plan, ctx, false);
    if (has(ctx, "Image")) {
      const image = heroMedia[0]!;
      commands.push(
        command(
          "ADD_NODE",
          {
            nodeId: `${section.id}-image`,
            componentType: "Image",
            parentId: mediaId,
            props: { src: image.src, alt: image.alt || plan.mediaPrompt || plan.heading, objectFit: "cover" },
            style: { width: "100%", height: "420px", borderRadius: c.radius, boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)" },
            responsiveStyle: { mobile: { width: "100%", height: "240px" } },
          },
          "Add hero image",
        ),
      );
    }
    if (has(ctx, "Shape") && isPlayfulTone(ctx.brief)) {
      commands.push(shapeCommand(`${section.id}-accent-shape`, mediaId, isPetCare(ctx.brief) ? "heart" : "blob", ctx, { alignSelf: "flex-end", marginTop: "-42px", marginRight: "20px" }));
    }
  } else {
    addIntro(commands, section, rootId, plan, ctx, { centered: false });
    addActions(commands, section, rootId, plan, ctx, false);
  }

  if (has(ctx, "TextMarquee") && (prefers(plan, "TextMarquee") || isPlayfulTone(ctx.brief))) {
    commands.push(
      textMarqueeCommand(
        `${section.id}-marquee`,
        rootId,
        isVietnamese(ctx.brief)
          ? "Spa tắm thơm • Trông giữ an toàn • Cập nhật hình ảnh • Đặt lịch nhanh"
          : "Gentle grooming • Safe daycare • Photo updates • Easy booking",
        ctx,
      ),
    );
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

function compileFooterSection(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const c = colors(ctx.designTokens);
  const commands: AICommandSuggestion[] = [];
  const rootId = `${section.id}-content`;

  if (!has(ctx, "Container")) return commands;

  commands.push(containerCommand(rootId, section.id, { gap: "22px", padding: "0px", showPlaceholder: false }, { maxWidth: "1120px", margin: "0 auto", fontFamily: c.font }));
  if (has(ctx, "Grid")) {
    const gridId = `${section.id}-grid`;
    commands.push(gridCommand(gridId, rootId, 3));
    const items = (plan.items.length ? plan.items : defaultItems(section, ctx.brief)).slice(0, 3);
    const first = { title: getBusinessName(ctx.brief), body: plan.body };
    [first, ...items].slice(0, 3).forEach((item, index) => {
      addCard(commands, `${section.id}-footer-card-${index}`, gridId, item, ctx);
    });
  } else {
    addIntro(commands, section, rootId, plan, ctx, { centered: false, compact: true });
  }
  if (has(ctx, "NavigationMenu")) {
    commands.push(navMenuCommand(`${section.id}-footer-menu`, rootId, navItemsFor(plan, section, ctx.pagePlan), ctx, "horizontal"));
  }
  if (has(ctx, "Divider")) commands.push(dividerCommand(`${section.id}-divider`, rootId, ctx));
  if (has(ctx, "Text")) {
    commands.push(textCommand(`${section.id}-copyright`, rootId, `© ${new Date().getFullYear()} ${getBusinessName(ctx.brief)}. All rights reserved.`, "p", { color: c.muted, fontSize: "13px" }));
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

function compileGenericSection(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const c = colors(ctx.designTokens);
  const commands: AICommandSuggestion[] = [];
  const rootId = `${section.id}-content`;

  if (!has(ctx, "Container")) return commands;

  const centered = section.type === "cta" || section.type === "faq" || section.type === "testimonials";
  commands.push(
    containerCommand(
      rootId,
      section.id,
      { gap: section.type === "hero" ? "24px" : "20px", padding: "0px", showPlaceholder: false },
      {
        maxWidth: "1120px",
        margin: "0 auto",
        alignItems: centered ? "center" : "stretch",
        textAlign: centered ? "center" : "left",
        fontFamily: c.font,
      },
    ),
  );

  addIntro(commands, section, rootId, plan, ctx, { centered });
  addActions(commands, section, rootId, plan, ctx, centered);

  if (section.type === "gallery") {
    const usedGallery = addRichGallery(commands, `${section.id}-gallery`, rootId, section, plan, ctx, { min: 6, max: 8 });
    if (!usedGallery && has(ctx, "Grid")) {
      const fallbackGridId = `${section.id}-image-grid`;
      const images = mediaItemsFor(plan, section, ctx.brief, { min: 6, max: 6 });
      commands.push(gridCommand(fallbackGridId, rootId, 3));
      images.forEach((item, index) => {
        if (has(ctx, "Image")) {
          commands.push(imageCommand(`${section.id}-image-${index}`, fallbackGridId, item.src, item.alt, { width: "100%", height: "190px", borderRadius: c.radius }));
        }
      });
    }
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  if (section.type === "services") {
    addRichGallery(commands, `${section.id}-service-gallery`, rootId, section, plan, ctx, { min: 4, max: 6 });
  }

  if (section.type === "testimonials" && (has(ctx, "GalleryPro") || has(ctx, "GallerySlider") || has(ctx, "GalleryGrid"))) {
    addRichGallery(commands, `${section.id}-testimonial-gallery`, rootId, section, { ...plan, interactionIntent: plan.interactionIntent ?? "carousel" }, ctx, { min: 3, max: 5 });
  }

  if (section.type === "faq" && has(ctx, "CollapsibleText")) {
    const faqItems = plan.faqs?.length ? plan.faqs : defaultItems(section, ctx.brief);
    const faqGridId = `${section.id}-faq-list`;
    if (has(ctx, "Grid")) {
      commands.push(gridCommand(faqGridId, rootId, 1));
      faqItems.slice(0, 5).forEach((item, index) => {
        commands.push(collapsibleTextCommand(`${section.id}-faq-${index}`, faqGridId, item, ctx));
      });
    } else {
      faqItems.slice(0, 5).forEach((item, index) => {
        commands.push(collapsibleTextCommand(`${section.id}-faq-${index}`, rootId, item, ctx));
      });
    }
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  if (section.type === "cta") {
    if (has(ctx, "TextMarquee") && (prefers(plan, "TextMarquee") || isPlayfulTone(ctx.brief))) {
      commands.push(
        textMarqueeCommand(
          `${section.id}-marquee`,
          rootId,
          isVietnamese(ctx.brief)
            ? "Đặt lịch hôm nay • Tư vấn nhanh • Bé được chăm sóc như ở nhà"
            : "Book today • Friendly guidance • Care that feels personal",
          ctx,
        ),
      );
    }
    if (has(ctx, "Image")) {
      const image = mediaItemsFor(plan, section, ctx.brief, { min: 1, max: 1 })[0]!;
      commands.push(imageCommand(`${section.id}-image`, rootId, image.src, image.alt || plan.mediaPrompt || plan.heading, { width: "100%", maxWidth: "720px", height: "240px", borderRadius: c.radius, marginTop: "12px" }));
    }
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  const list =
    section.type === "faq" && plan.faqs?.length
      ? plan.faqs
      : section.type === "testimonials" && plan.testimonials?.length
      ? plan.testimonials
      : section.type === "stats" && plan.stats?.length
      ? plan.stats
      : plan.items;

  if (list.length > 0 && has(ctx, "Grid")) {
    const columns = section.type === "faq" ? 1 : Math.min(3, Math.max(2, list.length));
    const gridId = `${section.id}-grid`;
    commands.push(gridCommand(gridId, rootId, columns));
    const cardImages =
      section.type === "services" || section.type === "testimonials"
        ? mediaItemsFor(plan, section, ctx.brief, { min: list.length, max: 6 })
        : undefined;
    list.slice(0, 6).forEach((item, index) => {
      const imageSrc = cardImages?.[index]?.src;
      addCard(commands, `${section.id}-card-${index}`, gridId, item, ctx, imageSrc);
    });
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

export function compileSectionPlan(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  if (section.type === "header") return compileHeaderSection(plan, section, ctx);
  if (section.type === "hero") return compileHeroSection(plan, section, ctx);
  if (section.type === "footer") return compileFooterSection(plan, section, ctx);
  return compileGenericSection(plan, section, ctx);
}

/** Why a command was rejected by the validation gate. Written for both logs and AI/user feedback. */
export type DroppedCommandReason =
  | "missing_fields"
  | "duplicate_id"
  | "unknown_type"
  | "root_non_section"
  | "orphan_parent"
  | "leaf_parent"
  | "invalid_props"
  | "missing_required_props"
  | "invalid_enum";

export interface DroppedCommand {
  type: string;
  componentType?: string;
  reason: DroppedCommandReason;
}

export interface ValidateCommandsReport {
  valid: AICommandSuggestion[];
  dropped: DroppedCommand[];
}

/**
 * Same validation as {@link validateCompiledCommands} but also reports *which* commands were
 * dropped and *why*, so callers can surface rejections loudly (blueprint 18: "reject loud,
 * never silent-drop") instead of silently discarding LLM output.
 */
export function validateCompiledCommandsWithReport(
  commands: AICommandSuggestion[],
  availableTypes: Set<string>,
  initialParentIds: Set<string>,
  contractsByType: Map<string, ComponentContract> = new Map(),
  /** Real types of pre-existing nodes (chat path). Defaults each known id to "Section". */
  initialParentTypes: Map<string, string> = new Map(),
): ValidateCommandsReport {
  const knownIds = new Set(initialParentIds);
  const knownTypes = new Map<string, string>();
  for (const id of initialParentIds) knownTypes.set(id, initialParentTypes.get(id) ?? "Section");
  const valid: AICommandSuggestion[] = [];
  const dropped: DroppedCommand[] = [];

  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") {
      valid.push(cmd);
      continue;
    }

    const componentType = String(cmd.payload.componentType ?? "");
    const parentId = String(cmd.payload.parentId ?? "");
    const nodeId = String(cmd.payload.nodeId ?? "");

    const drop = (reason: DroppedCommandReason) => {
      dropped.push({ type: cmd.type, componentType: componentType || undefined, reason });
    };

    if (!componentType || !nodeId || !parentId) { drop("missing_fields"); continue; }
    if (knownIds.has(nodeId)) { drop("duplicate_id"); continue; }
    if (availableTypes.size > 0 && !availableTypes.has(componentType)) { drop("unknown_type"); continue; }
    if (parentId === "root" && componentType !== "Section") { drop("root_non_section"); continue; }
    if (!knownIds.has(parentId) && parentId !== "root") { drop("orphan_parent"); continue; }
    const parentType = knownTypes.get(parentId);
    if (parentType && LEAF_COMPONENT_TYPES.has(parentType)) { drop("leaf_parent"); continue; }
    const props = cmd.payload.props && typeof cmd.payload.props === "object"
      ? (cmd.payload.props as Record<string, unknown>)
      : {};
    const propValidation = validatePropsAgainstContract(contractsByType.get(componentType), props);
    if (!propValidation.valid) { drop("invalid_props"); continue; }
    cmd.payload.props = propValidation.repairedProps;
    if (!hasRequiredProps(componentType, cmd.payload.props)) { drop("missing_required_props"); continue; }
    if (!hasValidEnumProps(componentType, cmd.payload.props)) { drop("invalid_enum"); continue; }

    knownIds.add(nodeId);
    knownTypes.set(nodeId, componentType);
    valid.push(cmd);
  }

  return { valid, dropped };
}

export function validateCompiledCommands(
  commands: AICommandSuggestion[],
  availableTypes: Set<string>,
  initialParentIds: Set<string>,
  contractsByType: Map<string, ComponentContract> = new Map(),
): AICommandSuggestion[] {
  return validateCompiledCommandsWithReport(commands, availableTypes, initialParentIds, contractsByType).valid;
}

function hasRequiredProps(componentType: string, props: unknown): boolean {
  const required = REQUIRED_PROPS[componentType];
  if (!required || required.length === 0) return true;
  if (!props || typeof props !== "object") return false;
  const data = props as Record<string, unknown>;
  return required.every((key) => {
    const value = data[key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

function hasValidEnumProps(componentType: string, props: unknown): boolean {
  if (!props || typeof props !== "object") return true;
  const data = props as Record<string, unknown>;
  if (componentType === "NavigationMenu") {
    const layout = String(data.layout ?? "horizontal");
    const itemStyle = String(data.itemStyle ?? "plain");
    return ["horizontal", "vertical", "hamburger"].includes(layout) &&
      ["plain", "underline", "underline-all", "boxed", "boxed-all", "pill", "pill-outlined", "pill-all", "filled", "button-all", "block-vertical", "serif-panel", "dark-panel", "pastel-panel", "icon-hamburger", "labeled-hamburger"].includes(itemStyle);
  }
  if (componentType === "GalleryPro") {
    return ["grid", "masonry", "collage", "slider", "slideshow", "strip", "stacked"].includes(String(data.layoutMode ?? "grid"));
  }
  if (componentType === "GalleryGrid") {
    return ["grid", "masonry"].includes(String(data.layout ?? "grid"));
  }
  if (componentType === "GallerySlider") {
    return ["16/9", "4/3", "1/1", "3/4"].includes(String(data.aspectRatio ?? "16/9"));
  }
  if (componentType === "TextMarquee") {
    return ["left", "right"].includes(String(data.direction ?? "left"));
  }
  if (componentType === "TextMask") {
    return ["700", "900"].includes(String(data.fontWeight ?? "900"));
  }
  if (componentType === "Shape") {
    return ["rectangle", "circle", "triangle", "star", "heart", "hexagon", "diamond", "arrow-right", "arrow-left", "arrow-up", "arrow-down", "blob"].includes(String(data.shape ?? "rectangle"));
  }
  return true;
}

export function compileFallbackSection(section: PagePlanSection, pagePlan: PagePlan, request: GeneratePageRequest): AICommandSuggestion[] {
  const ctx = buildCompileContext(pagePlan, request);
  return compileSectionPlan(buildFallbackSectionPlan(section, pagePlan.brief, pagePlan), section, ctx);
}

export function compileSection(sectionPlan: SectionPlan, section: PagePlanSection, pagePlan: PagePlan, request: GeneratePageRequest): AICommandSuggestion[] {
  const ctx = buildCompileContext(pagePlan, request);
  return compileSectionPlan(normalizeComponentIntentPreferences(sectionPlan), section, ctx);
}

/**
 * Resolve a `componentType → ComponentContract` map from the request's available components.
 * Shared by the generate-page compiler and the chat validation gate (which has no PagePlan).
 */
export function buildContractsByType(
  availableComponents: GeneratePageRequest["availableComponents"],
): Map<string, ComponentContract> {
  const contracts = resolveComponentContracts(
    availableComponents,
    availableComponents.map((component) => component.type),
  );
  return new Map(contracts.map((contract) => [contract.type, contract]));
}

function buildCompileContext(pagePlan: PagePlan, request: GeneratePageRequest): CompileContext {
  return {
    availableTypes: new Set(request.availableComponents.map((c) => c.type)),
    designTokens: request.designTokens ?? {},
    brief: pagePlan.brief,
    contractsByType: buildContractsByType(request.availableComponents),
    pagePlan,
  };
}

function normalizeComponentIntentPreferences(sectionPlan: SectionPlan): SectionPlan {
  const preferredComponents = Array.from(new Set([...(sectionPlan.preferredComponents ?? []), ...componentIntentTypes(sectionPlan)]));
  return { ...sectionPlan, preferredComponents };
}

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
import {
  matchContentPack,
  packAccentShape,
  packMarquee,
  packNavItems,
  packNavLabel,
  packSection,
  type ContentPack,
} from "../data/content-packs/loader.js";
import {
  buildPresetIndex,
  presetCommand,
  presetFirstEnabled,
  resolvePresetById,
  resolvePresetByHeuristic,
  type PresetIndex,
} from "./preset-catalog.js";
import { hasVariants, isLayoutVarietyEnabled, resolveVariant } from "./layout-variants.js";
import type { ImageResult } from "./image-provider.js";
import { compileGenericComponent, genericAdapterEnabled, mapContentToProps, type GenericAdapterContent } from "./generic-adapter.js";

interface CompileContext {
  availableTypes: Set<string>;
  designTokens: DesignTokens;
  brief: CreativeBrief;
  contractsByType: Map<string, ComponentContract>;
  /** Full page plan — needed to resolve nav anchors against real Section ids (see sectionAnchor). */
  pagePlan: PagePlan;
  /** Industry content pack for fallback content + image pool (roadmap 02/02). */
  pack: ContentPack;
  /** Resolved locale key into the pack (`vi` / `_default`). Owned by 02/03; for now derived from the brief. */
  locale: string;
  /** Designer preset catalog index for preset-first compile (roadmap 02/01). */
  presetIndex: PresetIndex;
  /** LLM-chosen preset refs for the current section (by role). */
  presetRefsByRole: Map<string, string>;
  /** Seed for heuristic preset variety (per section). */
  presetSeed: number;
  /** Sink: ids of presets actually instantiated (for logging `presetUsed`). */
  presetUsed: Set<string>;
  /** Resolved layout variant for the current section (roadmap 02/05). */
  variant: string;
  /** Provider-fetched images for this section (roadmap 02/06); [] = use pool. */
  providerImages: ImageResult[];
  /** Sink: `{componentType, strategy}` for each componentIntent instantiation (roadmap 03/02 — logged as adapterUsed). */
  intentAdapterLog: Array<{ componentType: string; strategy: "preset" | "generic" | "fallback" }>;
}

const DEFAULT_IMAGE = "https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=1200&q=80";

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

type GalleryLayoutMode = "grid" | "masonry" | "collage" | "slider" | "slideshow" | "strip" | "stacked";

function html(text: string): string {
  return `<p>${text.replace(/[<>&]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" })[ch] ?? ch)}</p>`;
}

function command(type: string, payload: Record<string, unknown>, description: string): AICommandSuggestion {
  return { type, payload, description };
}

/**
 * Preset-first leaf compile (roadmap 02/01). Returns a preset-instantiated
 * ADD_NODE command when a designer preset matches this role/type — either the
 * one the LLM referenced by role, or a heuristic pick by componentType + tags —
 * else null so the caller uses its hardcoded adapter. `contentProps` is the
 * text/label/src patch. Records the used preset id for logging.
 */
function tryPresetLeaf(
  ctx: CompileContext,
  role: string,
  componentType: string,
  tags: string[],
  contentProps: Record<string, unknown>,
  nodeId: string,
  parentId: string,
): AICommandSuggestion | null {
  if (!presetFirstEnabled() || ctx.presetIndex.size === 0) return null;

  const refId = ctx.presetRefsByRole.get(role);
  let preset = resolvePresetById(ctx.presetIndex, refId);
  // Only honor an LLM ref whose componentType matches this slot.
  if (preset && preset.componentType !== componentType) preset = null;
  if (!preset) {
    preset = resolvePresetByHeuristic(ctx.presetIndex, componentType, tags, ctx.presetSeed);
  }
  if (!preset) return null;

  ctx.presetUsed.add(preset.id);
  return presetCommand(nodeId, parentId, preset, { props: contentProps }, ctx.designTokens);
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

function fallbackImagePool(pack: ContentPack): string[] {
  return pack.imagePool;
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
  providerImages: ImageResult[],
): Required<Pick<SectionPlanMediaItem, "src" | "alt">> & Pick<SectionPlanMediaItem, "caption" | "link"> {
  // Priority: valid LLM-supplied src → provider result → content-pack pool
  // (roadmap 02/06). Provider urls are already `safeMediaUrl`-checked upstream.
  const providerImage = providerImages[index];
  const fallback = providerImage?.url ?? pool[index % pool.length] ?? DEFAULT_IMAGE;
  const src = safeMediaUrl(item?.src) ?? fallback;
  const usingProvider = src === providerImage?.url && !item?.src;
  const alt = item?.alt?.trim() || (usingProvider ? providerImage?.alt : undefined) || fallbackAlt(section, plan, index);
  const credit = usingProvider && providerImage?.credit ? `Photo: ${providerImage.credit.name} / Unsplash` : undefined;
  return {
    src,
    alt,
    caption: item?.caption?.trim() || credit || undefined,
    link: safeLinkUrl(item?.link) ?? undefined,
  };
}

function mediaItemsFor(
  plan: SectionPlan,
  section: PagePlanSection,
  ctx: CompileContext,
  options: { min: number; max: number },
) {
  const pool = fallbackImagePool(ctx.pack);
  const provider = ctx.providerImages;
  const source = plan.mediaItems ?? [];
  const items = source
    .slice(0, options.max)
    .map((item, index) => normalizeMediaItem(item, section, plan, index, pool, provider));

  while (items.length < options.min) {
    const index = items.length;
    items.push(normalizeMediaItem(undefined, section, plan, index, pool, provider));
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
  const strings = compilerStrings(ctx.locale);
  return command(
    "ADD_NODE",
    {
      nodeId: id,
      componentType: "CollapsibleText",
      parentId,
      props: {
        text: richTextBlock(item.title, item.body),
        previewLines: 2,
        expandLabel: strings.readMore,
        collapseLabel: strings.showLess,
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
  const items = mediaItemsFor(plan, section, ctx, options);
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

function hasVietnameseDiacritics(text: string): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
}

/**
 * Resolve the content locale for a generation request (roadmap 02/03). Priority:
 *   1. Explicit `generationOptions.locale` (UI dropdown; "auto"/empty = infer).
 *   2. Script heuristic on the prompt — Vietnamese diacritics, then CJK ranges.
 *   3. Fallback `en`.
 * Returns a short code (`vi`, `en`, `ja`, `ko`, `zh`, …). Content-pack lookups
 * fall back to `_default` for any locale a pack does not define, so unknown
 * locales still yield complete fallback content (in the pack's default language)
 * while the LLM writes copy in the requested locale.
 */
export function resolveLocale(request: GeneratePageRequest, brief?: CreativeBrief): string {
  const explicit = request.generationOptions?.locale?.trim().toLowerCase();
  if (explicit && explicit !== "auto") return explicit;

  const prompt = brief?.rawPrompt ?? request.prompt ?? "";
  if (hasVietnameseDiacritics(prompt)) return "vi";
  if (/[぀-ヿ]/.test(prompt)) return "ja"; // hiragana/katakana
  if (/[가-힯]/.test(prompt)) return "ko"; // hangul
  if (/[一-鿿]/.test(prompt)) return "zh"; // CJK unified ideographs
  return "en";
}

/** Human-readable language name for a locale code, for LLM prompt instructions. */
const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  vi: "Vietnamese",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  fr: "French",
  es: "Spanish",
  de: "German",
};

export function localeLabel(code: string): string {
  return LOCALE_LABELS[code] ?? code;
}

/**
 * UI strings the compiler emits directly (not LLM-authored) — localized per
 * resolved locale. Any locale without an entry falls back to `en`.
 */
const COMPILER_STRINGS: Record<string, { readMore: string; showLess: string; bookNow: string }> = {
  en: { readMore: "Read more", showLess: "Show less", bookNow: "Book now" },
  vi: { readMore: "Xem thêm", showLess: "Thu gọn", bookNow: "Đặt lịch" },
};

function compilerStrings(locale: string): (typeof COMPILER_STRINGS)["en"] {
  return COMPILER_STRINGS[locale] ?? COMPILER_STRINGS.en;
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
  if (plan.ctaLabel) {
    const preset = tryPresetLeaf(
      ctx,
      `${section.type}_cta`,
      "Button",
      ["cta", "primary", "button"],
      { label: html(plan.ctaLabel) },
      `${section.id}-cta-primary`,
      actionsId,
    );
    commands.push(preset ?? buttonCommand(`${section.id}-cta-primary`, actionsId, plan.ctaLabel, ctx));
  }
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
    const headingTag = section.type === "hero" ? "h1" : "h2";
    const headingPreset = tryPresetLeaf(
      ctx,
      `${section.type}_heading`,
      "Text",
      ["heading", headingTag, "title"],
      { text: html(plan.heading), tag: headingTag },
      `${section.id}-heading`,
      parentId,
    );
    commands.push(
      headingPreset ??
        textCommand(`${section.id}-heading`, parentId, plan.heading, headingTag, {
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

function sectionBackground(type: PageSectionType, index: number, designTokens: DesignTokens): string {
  const c = colors(designTokens);
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
            backgroundColor: sectionBackground(section.type, section.index, designTokens),
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

/**
 * Fallback items for a section, sourced from the matched content pack (with
 * `_generic` filling any section the pack omits). `{industry}` placeholders are
 * interpolated from the brief. Roadmap 02/02.
 */
function defaultItems(section: PagePlanSection, pack: ContentPack, locale: string, brief: CreativeBrief): SectionPlanItem[] {
  const industry = brief.inferredIndustry || "your business";
  const content = packSection(pack, locale, section.type);
  const items = content.items ?? packSection(pack, locale, "custom").items ?? [];
  return items.map((item) => ({
    ...item,
    body: item.body.replace(/\{industry\}/g, industry),
  }));
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

/** Localized label for a navigable section type, from the content pack (roadmap 02/02). */
function navLabelFor(type: PageSectionType, pack: ContentPack, locale: string): string {
  return packNavLabel(pack, locale, type) ?? type;
}

/**
 * Default nav items generated from the SECTIONS ACTUALLY PRESENT in the page plan
 * (not a hardcoded guess) — every href is guaranteed to match a real Section's
 * anchorId. Used only as a fallback when neither the LLM nor a content pack
 * supplied navItems. Falls back to the pack's static navItems if the page plan
 * has no navigable sections.
 */
function defaultNavItems(pack: ContentPack, locale: string, pagePlan: PagePlan): SectionPlanNavItem[] {
  const fromPlan = navigableSections(pagePlan)
    .slice(0, 5)
    .map((navSection) => ({
      label: navLabelFor(navSection.type, pack, locale),
      href: `#${sectionAnchor(navSection, pagePlan.sections)}`,
    }));
  if (fromPlan.length > 0) return fromPlan;

  return packNavItems(pack, locale);
}

function defaultMediaItems(section: PagePlanSection, pack: ContentPack, locale: string): SectionPlanMediaItem[] {
  const pool = fallbackImagePool(pack);
  const content = packSection(pack, locale, section.type);
  const altStem = content.mediaAlt;
  const count = section.type === "gallery" ? 6 : section.type === "services" ? 4 : section.type === "testimonials" ? 3 : 1;
  return Array.from({ length: count }, (_, index) => ({
    src: pool[index % pool.length],
    alt: altStem ? `${altStem} ${index + 1}` : fallbackAlt(section, { heading: section.title } as SectionPlan, index),
    caption: content.mediaCaptions?.[index] ?? content.mediaCaption ?? undefined,
  }));
}

/**
 * Build a deterministic fallback SectionPlan from the matched content pack
 * (roadmap 02/02). All copy comes from the pack + `_generic` merge; `{industry}`
 * placeholders are interpolated from the brief. No industry is hardcoded here.
 */
export function buildFallbackSectionPlan(
  section: PagePlanSection,
  brief: CreativeBrief,
  pagePlan: PagePlan,
  pack: ContentPack,
  locale: string,
): SectionPlan {
  const industry = brief.inferredIndustry || "your business";
  const content = packSection(pack, locale, section.type);
  const interpolate = (s: string | undefined) => s?.replace(/\{industry\}/g, industry);

  const heading =
    interpolate(content.heading) ??
    (section.type === "hero" ? interpolate(brief.inferredPageType) ?? section.title : section.title);
  const body =
    interpolate(content.body) ??
    (section.purpose ||
      `A practical section for ${brief.targetAudience}, written in a ${brief.tone} tone.`);

  const eyebrowDefault = section.type === "hero" ? interpolate(brief.inferredPageType) : section.title;

  return {
    sectionId: section.id,
    type: section.type,
    eyebrow: content.eyebrow ?? eyebrowDefault,
    layoutVariant: section.type === "gallery" ? "collage gallery" : undefined,
    preferredComponents: defaultPreferredComponents(section.type),
    componentIntents: defaultComponentIntents(section.type),
    interactionIntent: defaultInteractionIntent(section.type),
    visualEmphasis: defaultVisualEmphasis(section.type),
    heading,
    body,
    ctaLabel: content.ctaLabel,
    secondaryCtaLabel: content.secondaryCtaLabel,
    items: defaultItems(section, pack, locale, brief),
    faqs: section.type === "faq" ? content.faqs : undefined,
    testimonials: section.type === "testimonials" ? content.testimonials : undefined,
    mediaItems: defaultMediaItems(section, pack, locale),
    navItems: defaultNavItems(pack, locale, pagePlan),
    mediaPrompt: content.mediaPrompt,
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
      commands.push(buttonCommand(`${section.id}-nav-cta`, rootId, plan.ctaLabel || compilerStrings(ctx.locale).bookNow, ctx));
    }
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  const navId = `${section.id}-nav`;
  commands.push(
    has(ctx, "Row")
      ? rowCommand(navId, rootId, { gap: 18, padding: 0, alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }, { alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" })
      : containerCommand(navId, rootId, { direction: "row", gap: "18px", padding: "0px", showPlaceholder: false }, { display: "flex", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap" }),
  );
  const navItems = (plan.items.length ? plan.items : defaultItems(section, ctx.pack, ctx.locale, ctx.brief)).slice(0, 4);
  if (has(ctx, "Text")) {
    navItems.forEach((item, index) => {
      commands.push(textCommand(`${section.id}-nav-${index}`, navId, item.title, "span", { color: c.muted, fontSize: "14px", fontWeight: "700" }));
    });
  }
  if (has(ctx, "Button")) {
    commands.push(buttonCommand(`${section.id}-nav-cta`, navId, plan.ctaLabel || compilerStrings(ctx.locale).bookNow, ctx));
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

/**
 * Apply a `visualEmphasis` modifier after a section's variant is laid out
 * (roadmap 02/05). `conversion` repeats the CTA at the section end; `proof`
 * appends a compact stats row when the plan carries stats. `media`/`copy`/
 * `balanced` are expressed through variant selection, not here.
 */
function applyVisualEmphasis(commands: AICommandSuggestion[], section: PagePlanSection, rootId: string, plan: SectionPlan, ctx: CompileContext) {
  if (!isLayoutVarietyEnabled()) return;
  const emphasis = plan.visualEmphasis;

  if (emphasis === "conversion" && plan.ctaLabel && has(ctx, "Button")) {
    // Avoid duplicating if this exact CTA node id already exists.
    const closingId = `${section.id}-cta-closing`;
    if (!commands.some((cmd) => cmd.payload?.nodeId === closingId)) {
      const preset = tryPresetLeaf(ctx, `${section.type}_cta`, "Button", ["cta", "primary", "button"], { label: html(plan.ctaLabel) }, closingId, rootId);
      commands.push(preset ?? buttonCommand(closingId, rootId, plan.ctaLabel, ctx));
    }
  }

  if (emphasis === "proof" && plan.stats?.length && has(ctx, "Grid") && has(ctx, "Text")) {
    const c = colors(ctx.designTokens);
    const statsId = `${section.id}-stats`;
    const stats = plan.stats.slice(0, 4);
    commands.push(gridCommand(statsId, rootId, Math.min(4, Math.max(2, stats.length))));
    stats.forEach((stat, index) => {
      const cellId = `${section.id}-stat-${index}`;
      commands.push(containerCommand(cellId, statsId, { gap: "4px", padding: "12px", showPlaceholder: false }, { textAlign: "center", alignItems: "center" }));
      commands.push(textCommand(`${cellId}-value`, cellId, stat.title, "span", { color: c.accent, fontSize: "30px", fontWeight: "800" }));
      commands.push(textCommand(`${cellId}-label`, cellId, stat.body, "span", { color: c.muted, fontSize: "14px" }));
    });
  }
}

/** Emit a card grid of items into `rootId`. Shared by services grid-cards + generic. */
function emitCardGrid(commands: AICommandSuggestion[], rootId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, items: SectionPlanItem[], withImages: boolean) {
  if (items.length === 0 || !has(ctx, "Grid")) return;
  const columns = Math.min(3, Math.max(2, items.length));
  const gridId = `${section.id}-grid`;
  commands.push(gridCommand(gridId, rootId, columns));
  const cardImages = withImages ? mediaItemsFor(plan, section, ctx, { min: items.length, max: 6 }) : undefined;
  items.slice(0, 6).forEach((item, index) => {
    addCard(commands, `${section.id}-card-${index}`, gridId, item, ctx, cardImages?.[index]?.src);
  });
}

/** services variant dispatch (roadmap 02/05): grid-cards | gallery-showcase | alternating-rows. */
function compileServicesVariant(commands: AICommandSuggestion[], rootId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext) {
  const c = colors(ctx.designTokens);
  const items = plan.items.length > 0 ? plan.items : defaultItems(section, ctx.pack, ctx.locale, ctx.brief);

  switch (ctx.variant) {
    case "gallery-showcase": {
      const used = addRichGallery(commands, `${section.id}-service-gallery`, rootId, section, plan, ctx, { min: 4, max: 6 });
      // Still list the offerings compactly beneath the showcase.
      emitCardGrid(commands, rootId, section, plan, ctx, items, !used);
      break;
    }
    case "alternating-rows": {
      const rowImages = has(ctx, "Image") ? mediaItemsFor(plan, section, ctx, { min: items.length, max: 6 }) : [];
      items.slice(0, 4).forEach((item, index) => {
        const rowId = `${section.id}-row-${index}`;
        const mediaFirst = index % 2 === 1;
        if (has(ctx, "Grid")) commands.push(gridCommand(rowId, rootId, 2));
        else commands.push(containerCommand(rowId, rootId, { direction: "row", gap: "24px", padding: "0px", showPlaceholder: false }, { alignItems: "center" }));
        const copyId = `${rowId}-copy`;
        const mediaId = `${rowId}-media`;
        commands.push(containerCommand(copyId, rowId, { gap: "8px", padding: "0px", showPlaceholder: false }, { justifyContent: "center", ...(mediaFirst ? { order: 2 } : {}) }));
        if (has(ctx, "Text")) {
          commands.push(textCommand(`${copyId}-title`, copyId, item.title, "h3", { color: c.text, fontSize: "22px", fontWeight: "700" }));
          commands.push(textCommand(`${copyId}-body`, copyId, item.body, "p", { color: c.muted, fontSize: "16px", lineHeight: "1.7" }));
        }
        if (has(ctx, "Image") && rowImages[index]) {
          commands.push(containerCommand(mediaId, rowId, { gap: "0px", padding: "0px", showPlaceholder: false }, { ...(mediaFirst ? { order: 1 } : {}) }));
          commands.push(imageCommand(`${mediaId}-img`, mediaId, rowImages[index]!.src, rowImages[index]!.alt, { width: "100%", height: "240px", borderRadius: c.radius }));
        }
      });
      break;
    }
    case "grid-cards":
    default:
      emitCardGrid(commands, rootId, section, plan, ctx, items, true);
      break;
  }
}

/** Emit a hero image into `parentId`. Shared by hero variants. */
function heroImage(commands: AICommandSuggestion[], parentId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, media: ReturnType<typeof mediaItemsFor>, style: Record<string, unknown>) {
  if (!has(ctx, "Image")) return;
  const image = media[0]!;
  commands.push(
    command(
      "ADD_NODE",
      {
        nodeId: `${section.id}-image`,
        componentType: "Image",
        parentId,
        props: { src: image.src, alt: image.alt || plan.mediaPrompt || plan.heading, objectFit: "cover" },
        style,
        responsiveStyle: { mobile: { width: "100%", height: "240px" } },
      },
      "Add hero image",
    ),
  );
}

/** Emit hero copy (eyebrow/heading/body via TextMask or addIntro) into `parentId`. */
function heroCopy(commands: AICommandSuggestion[], parentId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, centered: boolean) {
  const c = colors(ctx.designTokens);
  if (has(ctx, "Text") && plan.eyebrow) {
    commands.push(textCommand(`${section.id}-eyebrow`, parentId, plan.eyebrow, "span", { color: c.accent, fontSize: "13px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.08em", ...(centered ? { textAlign: "center" } : {}) }));
  }
  if (has(ctx, "TextMask") && (prefers(plan, "TextMask") || isPlayfulTone(ctx.brief))) {
    commands.push(textMaskCommand(`${section.id}-mask-heading`, parentId, plan.heading, ctx));
    if (has(ctx, "Text")) {
      commands.push(textCommand(`${section.id}-body`, parentId, plan.body, "p", { color: c.muted, fontSize: "18px", lineHeight: "1.75", maxWidth: "720px", ...(centered ? { textAlign: "center", marginLeft: "auto", marginRight: "auto" } : {}) }));
    }
  } else {
    addIntro(commands, section, parentId, plan, ctx, { centered });
  }
}

/** hero split-media variant (media on right or left). The original hero path. */
function heroSplitMedia(commands: AICommandSuggestion[], rootId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, mediaSide: "left" | "right", media: ReturnType<typeof mediaItemsFor>) {
  const c = colors(ctx.designTokens);
  const gridId = `${section.id}-hero-grid`;
  const copyId = `${section.id}-copy`;
  const mediaId = `${section.id}-media`;
  commands.push(gridCommand(gridId, rootId, 2));
  const pushCopy = () =>
    commands.push(
      has(ctx, "Column")
        ? columnCommand(copyId, gridId, { gap: 22, padding: 0, alignItems: "stretch" }, { justifyContent: "center", ...(mediaSide === "left" ? { order: 2 } : {}) })
        : containerCommand(copyId, gridId, { gap: "22px", padding: "0px", showPlaceholder: false }, { justifyContent: "center", ...(mediaSide === "left" ? { order: 2 } : {}) }),
    );
  const pushMedia = () =>
    commands.push(containerCommand(mediaId, gridId, { gap: "12px", padding: "0px", showPlaceholder: false }, { justifyContent: "center", ...(mediaSide === "left" ? { order: 1 } : {}) }));
  // Emit media/copy in DOM order but use CSS order for the left variant.
  pushCopy();
  pushMedia();
  heroCopy(commands, copyId, section, plan, ctx, false);
  addActions(commands, section, copyId, plan, ctx, false);
  heroImage(commands, mediaId, section, plan, ctx, media, { width: "100%", height: "420px", borderRadius: c.radius, boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)" });
  if (has(ctx, "Shape") && isPlayfulTone(ctx.brief)) {
    commands.push(shapeCommand(`${section.id}-accent-shape`, mediaId, packAccentShape(ctx.pack) as Parameters<typeof shapeCommand>[2], ctx, { alignSelf: "flex-end", marginTop: "-42px", marginRight: "20px" }));
  }
}

/** hero centered-stack variant: copy centered, optional image below. */
function heroCenteredStack(commands: AICommandSuggestion[], rootId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, media: ReturnType<typeof mediaItemsFor>) {
  const c = colors(ctx.designTokens);
  heroCopy(commands, rootId, section, plan, ctx, true);
  addActions(commands, section, rootId, plan, ctx, true);
  heroImage(commands, rootId, section, plan, ctx, media, { width: "100%", maxWidth: "820px", height: "360px", borderRadius: c.radius, margin: "8px auto 0", boxShadow: "0 24px 60px rgba(15, 23, 42, 0.16)" });
}

/** hero full-bleed-media variant: large image, copy overlaid/stacked. */
function heroFullBleed(commands: AICommandSuggestion[], rootId: string, section: PagePlanSection, plan: SectionPlan, ctx: CompileContext, media: ReturnType<typeof mediaItemsFor>) {
  const c = colors(ctx.designTokens);
  heroImage(commands, rootId, section, plan, ctx, media, { width: "100%", height: "480px", borderRadius: c.radius, objectFit: "cover" });
  const overlayId = `${section.id}-overlay`;
  commands.push(containerCommand(overlayId, rootId, { gap: "18px", padding: "32px", showPlaceholder: false }, { textAlign: "center", alignItems: "center", marginTop: "-120px", position: "relative" }));
  heroCopy(commands, overlayId, section, plan, ctx, true);
  addActions(commands, section, overlayId, plan, ctx, true);
}

function compileHeroSection(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const c = colors(ctx.designTokens);
  const commands: AICommandSuggestion[] = [];
  const rootId = `${section.id}-content`;
  const heroMedia = mediaItemsFor(plan, section, ctx, { min: 1, max: 4 });

  if (!has(ctx, "Container")) return commands;

  const centeredVariant = ctx.variant === "centered-stack" || ctx.variant === "full-bleed-media";
  commands.push(
    containerCommand(
      rootId,
      section.id,
      { gap: "28px", padding: "0px", showPlaceholder: false },
      { maxWidth: "1120px", margin: "0 auto", alignItems: centeredVariant ? "center" : "stretch", textAlign: centeredVariant ? "center" : "left", fontFamily: c.font },
    ),
  );

  switch (ctx.variant) {
    case "centered-stack":
      heroCenteredStack(commands, rootId, section, plan, ctx, heroMedia);
      break;
    case "full-bleed-media":
      heroFullBleed(commands, rootId, section, plan, ctx, heroMedia);
      break;
    case "split-media-left":
      heroSplitMedia(commands, rootId, section, plan, ctx, "left", heroMedia);
      break;
    case "split-media-right":
    default:
      if (has(ctx, "Grid")) {
        heroSplitMedia(commands, rootId, section, plan, ctx, "right", heroMedia);
      } else {
        heroCenteredStack(commands, rootId, section, plan, ctx, heroMedia);
      }
      break;
  }

  applyVisualEmphasis(commands, section, rootId, plan, ctx);

  const heroMarquee = packMarquee(ctx.pack, ctx.locale, "hero");
  if (heroMarquee && has(ctx, "TextMarquee") && (prefers(plan, "TextMarquee") || isPlayfulTone(ctx.brief))) {
    commands.push(textMarqueeCommand(`${section.id}-marquee`, rootId, heroMarquee, ctx));
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
    const items = (plan.items.length ? plan.items : defaultItems(section, ctx.pack, ctx.locale, ctx.brief)).slice(0, 3);
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

/** Build the shared per-section content object the generic adapter maps onto props. */
function sectionContentFor(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): GenericAdapterContent {
  const items =
    section.type === "faq" && plan.faqs?.length
      ? plan.faqs
      : section.type === "testimonials" && plan.testimonials?.length
      ? plan.testimonials
      : section.type === "stats" && plan.stats?.length
      ? plan.stats
      : plan.items;
  const media = has(ctx, "Image") ? mediaItemsFor(plan, section, ctx, { min: 1, max: 6 }) : [];
  return {
    heading: plan.heading,
    body: plan.body,
    ctaLabel: plan.ctaLabel,
    items,
    media: media.map((m) => ({ src: m.src, alt: m.alt })),
  };
}

/**
 * Compile one componentIntent by strategy, in priority order (roadmap 03/02):
 *   1. Matched preset (roadmap 02/01) — if a preset resolves for this exact
 *      componentType, prefer it (design > generic mapping).
 *   2. Generic adapter — map section content onto the component's own
 *      `contentSlots`, then validate through its real contract.
 *   3. `fallbackTo` chain from the component's aiHints — retry the same
 *      content against each fallback type in order.
 * Returns `null` if nothing in the chain produces a valid command (caller
 * drops the intent — never emits a broken/guessed node).
 */
function compileIntentComponent(
  ctx: CompileContext,
  nodeId: string,
  parentId: string,
  componentType: string,
  content: GenericAdapterContent,
  visited: Set<string> = new Set(),
): AICommandSuggestion | null {
  if (visited.has(componentType) || !has(ctx, componentType)) return null;
  visited.add(componentType);

  const contract = ctx.contractsByType.get(componentType);
  if (!contract) return null;

  // 1. Preset match for this exact type (patch mapped content onto it).
  const mappedProps = mapContentToProps(contract.contentSlots, content);
  const preset = tryPresetLeaf(ctx, `intent_${componentType}`, componentType, [], mappedProps, nodeId, parentId);
  if (preset) {
    ctx.intentAdapterLog.push({ componentType, strategy: "preset" });
    return preset;
  }

  // 2. Generic adapter — content mapped via this component's own contentSlots.
  const generic = compileGenericComponent({
    id: nodeId,
    parentId,
    componentType,
    contract,
    contentSlots: contract.contentSlots,
    content,
    tokens: ctx.designTokens,
  });
  if (generic) {
    ctx.intentAdapterLog.push({ componentType, strategy: "generic" });
    return generic;
  }

  // 3. Fall back to the next type in this component's own fallback chain.
  for (const fallbackType of contract.fallbackTo) {
    const fallback = compileIntentComponent(ctx, nodeId, parentId, fallbackType, content, visited);
    if (fallback) {
      ctx.intentAdapterLog.push({ componentType: fallbackType, strategy: "fallback" });
      return fallback;
    }
  }

  return null;
}

/**
 * Try each of a section's LLM-chosen `componentIntents` that a special-cased
 * section branch hasn't already handled (roadmap 03/02). Capped at 3 intents
 * per section (required > preferred > optional) to bound compile cost against
 * a spammy LLM response. Returns the commands produced; empty if none of the
 * intents resolved (caller keeps its own default rendering as the fallback).
 */
function tryComponentIntents(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  const intents = plan.componentIntents ?? [];
  if (intents.length === 0) return [];

  const priorityRank: Record<string, number> = { required: 0, preferred: 1, optional: 2 };
  const ordered = [...intents]
    .sort((a, b) => (priorityRank[a.priority ?? "optional"] ?? 2) - (priorityRank[b.priority ?? "optional"] ?? 2))
    .slice(0, 3);

  const content = sectionContentFor(plan, section, ctx);
  const commands: AICommandSuggestion[] = [];
  ordered.forEach((intent, index) => {
    const nodeId = `${section.id}-intent-${index}`;
    const cmd = compileIntentComponent(ctx, nodeId, `${section.id}-content`, intent.componentType, content);
    if (cmd) commands.push(cmd);
  });
  return commands;
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
      const images = mediaItemsFor(plan, section, ctx, { min: 6, max: 6 });
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
    compileServicesVariant(commands, rootId, section, plan, ctx);
    applyVisualEmphasis(commands, section, rootId, plan, ctx);
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  if (section.type === "testimonials" && (has(ctx, "GalleryPro") || has(ctx, "GallerySlider") || has(ctx, "GalleryGrid"))) {
    addRichGallery(commands, `${section.id}-testimonial-gallery`, rootId, section, { ...plan, interactionIntent: plan.interactionIntent ?? "carousel" }, ctx, { min: 3, max: 5 });
  }

  if (section.type === "faq" && has(ctx, "CollapsibleText")) {
    const faqItems = plan.faqs?.length ? plan.faqs : defaultItems(section, ctx.pack, ctx.locale, ctx.brief);
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
    const ctaMarquee = packMarquee(ctx.pack, ctx.locale, "cta");
    if (ctaMarquee && has(ctx, "TextMarquee") && (prefers(plan, "TextMarquee") || isPlayfulTone(ctx.brief))) {
      commands.push(textMarqueeCommand(`${section.id}-marquee`, rootId, ctaMarquee, ctx));
    }
    // split-with-media: image beside the copy (only if an Image is available and
    // the variant was chosen); centered-band (default): image below the band.
    if (ctx.variant === "split-with-media" && has(ctx, "Image")) {
      const image = mediaItemsFor(plan, section, ctx, { min: 1, max: 1 })[0]!;
      commands.push(imageCommand(`${section.id}-image`, rootId, image.src, image.alt || plan.mediaPrompt || plan.heading, { width: "100%", maxWidth: "520px", height: "300px", borderRadius: c.radius, margin: "16px auto 0" }));
    } else if (has(ctx, "Image")) {
      const image = mediaItemsFor(plan, section, ctx, { min: 1, max: 1 })[0]!;
      commands.push(imageCommand(`${section.id}-image`, rootId, image.src, image.alt || plan.mediaPrompt || plan.heading, { width: "100%", maxWidth: "720px", height: "240px", borderRadius: c.radius, marginTop: "12px" }));
    }
    applyVisualEmphasis(commands, section, rootId, plan, ctx);
    return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
  }

  // Generic adapter (roadmap 03/02): give the LLM's own componentIntents a
  // chance before falling back to the generic card grid below. Only runs for
  // section types that reach this far (gallery/services/faq/cta already
  // returned above with their own specialized rendering).
  if (genericAdapterEnabled()) {
    const intentCommands = tryComponentIntents(plan, section, ctx);
    if (intentCommands.length > 0) {
      commands.push(...intentCommands);
      applyVisualEmphasis(commands, section, rootId, plan, ctx);
      return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
    }
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
      section.type === "testimonials"
        ? mediaItemsFor(plan, section, ctx, { min: list.length, max: 6 })
        : undefined;
    list.slice(0, 6).forEach((item, index) => {
      const imageSrc = cardImages?.[index]?.src;
      addCard(commands, `${section.id}-card-${index}`, gridId, item, ctx, imageSrc);
    });
  }

  return validateCompiledCommands(commands, ctx.availableTypes, new Set([section.id]), ctx.contractsByType);
}

export function compileSectionPlan(plan: SectionPlan, section: PagePlanSection, ctx: CompileContext): AICommandSuggestion[] {
  // Per-section preset state (roadmap 02/01): LLM-chosen refs by role + a stable
  // seed for heuristic variety derived from the section id.
  ctx.presetRefsByRole = new Map((plan.presetRefs ?? []).map((ref) => [ref.role, ref.presetId]));
  ctx.presetSeed = hashString(section.id);

  // Resolve layout variant (roadmap 02/05): LLM choice validated, else seed-pick.
  ctx.variant = hasVariants(section.type)
    ? resolveVariant({
        type: section.type,
        requested: plan.layoutVariant,
        seedKey: `${ctx.pagePlan.jobId}:${section.type}`,
        availableTypes: ctx.availableTypes,
      })
    : "";

  if (section.type === "header") return compileHeaderSection(plan, section, ctx);
  if (section.type === "hero") return compileHeroSection(plan, section, ctx);
  if (section.type === "footer") return compileFooterSection(plan, section, ctx);
  return compileGenericSection(plan, section, ctx);
}

/** Small deterministic string hash → non-negative int (for preset variety seed). */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
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
    const parentContract = parentType ? contractsByType.get(parentType) : undefined;
    // canContainChildren comes from the component's technical capabilities
    // (roadmap 03/01) — a structural fact, never overridden by aiHints. When
    // the parent type has no contract (unknown to this request), default to
    // permissive (fall through to the other checks) rather than guessing leaf.
    if (parentContract && !parentContract.canContainChildren) { drop("leaf_parent"); continue; }
    const props = cmd.payload.props && typeof cmd.payload.props === "object"
      ? (cmd.payload.props as Record<string, unknown>)
      : {};
    const contract = contractsByType.get(componentType);
    const propValidation = validatePropsAgainstContract(contract, props);
    if (!propValidation.valid) { drop("invalid_props"); continue; }
    cmd.payload.props = propValidation.repairedProps;
    if (!hasRequiredProps(contract, cmd.payload.props)) { drop("missing_required_props"); continue; }

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

/**
 * Required-prop check driven entirely by the component's contract (roadmap
 * 03/01) — `contract.requiredProps` comes from real propSchema `required: true`
 * declarations (see the audit in packages/builder-components), no hardcoded
 * per-type table. Enum/option validation for these same props is already
 * handled by `validatePropsAgainstContract` (contract-based `select` option
 * checks) just before this call, so there is no separate enum table either.
 */
function hasRequiredProps(contract: ComponentContract | undefined, props: unknown): boolean {
  if (!contract || contract.requiredProps.length === 0) return true;
  if (!props || typeof props !== "object") return false;
  const data = props as Record<string, unknown>;
  return contract.requiredProps.every((prop) => {
    const value = data[prop.key];
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "string") return value.trim().length > 0;
    return value !== undefined && value !== null;
  });
}

export function compileFallbackSection(section: PagePlanSection, pagePlan: PagePlan, request: GeneratePageRequest): AICommandSuggestion[] {
  const ctx = buildCompileContext(pagePlan, request);
  return compileSectionPlan(buildFallbackSectionPlan(section, pagePlan.brief, pagePlan, ctx.pack, ctx.locale), section, ctx);
}

export function compileSection(sectionPlan: SectionPlan, section: PagePlanSection, pagePlan: PagePlan, request: GeneratePageRequest): AICommandSuggestion[] {
  return compileSectionWithMeta(sectionPlan, section, pagePlan, request).commands;
}

/** Result of {@link compileSectionWithMeta}: commands + compile metadata. */
export interface CompileSectionResult {
  commands: AICommandSuggestion[];
  /** Preset ids instantiated in this section (roadmap 02/01 — logged as presetUsed). */
  presetUsed: string[];
  /** Layout variant actually used (roadmap 02/05 — logged as variantUsed). */
  variantUsed: string;
  /** Per componentIntent compile strategy (roadmap 03/02 — logged as adapterUsed). */
  intentAdapterLog: Array<{ componentType: string; strategy: "preset" | "generic" | "fallback" }>;
}

/** Like {@link compileSection} but also reports compile metadata (presets, variant). */
export function compileSectionWithMeta(
  sectionPlan: SectionPlan,
  section: PagePlanSection,
  pagePlan: PagePlan,
  request: GeneratePageRequest,
  /** Provider-fetched images for this section (roadmap 02/06). */
  providerImages: ImageResult[] = [],
): CompileSectionResult {
  const ctx = buildCompileContext(pagePlan, request);
  ctx.providerImages = providerImages;
  const commands = compileSectionPlan(normalizeComponentIntentPreferences(sectionPlan), section, ctx);
  return { commands, presetUsed: [...ctx.presetUsed], variantUsed: ctx.variant, intentAdapterLog: ctx.intentAdapterLog };
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
  const availableTypes = new Set(request.availableComponents.map((c) => c.type));
  return {
    availableTypes,
    designTokens: request.designTokens ?? {},
    brief: pagePlan.brief,
    contractsByType: buildContractsByType(request.availableComponents),
    pagePlan,
    pack: matchContentPack(pagePlan.brief),
    locale: resolveLocale(request, pagePlan.brief),
    presetIndex: buildPresetIndex(request.availablePresets, availableTypes),
    presetRefsByRole: new Map(),
    presetSeed: 0,
    presetUsed: new Set<string>(),
    variant: "",
    providerImages: [],
    intentAdapterLog: [],
  };
}

function normalizeComponentIntentPreferences(sectionPlan: SectionPlan): SectionPlan {
  const preferredComponents = Array.from(new Set([...(sectionPlan.preferredComponents ?? []), ...componentIntentTypes(sectionPlan)]));
  return { ...sectionPlan, preferredComponents };
}

import type { GeneratePageRequest } from "../types/ai.types.js";

export interface ComponentCapability {
  type: string;
  name?: string;
  category?: string;
  isContainer?: boolean;
  purpose: string;
  bestFor: string[];
  requiredProps: string[];
  keyProps: Record<string, string | string[]>;
  variants: string[];
  fallbackTo: string[];
  contractSource?: "propSchema" | "curated" | "merged";
}

export type ComponentCatalogSummary = ComponentCapability;

type AvailableComponent = GeneratePageRequest["availableComponents"][number];

export const CURATED_COMPONENT_CAPABILITIES: Record<string, Omit<ComponentCapability, "type">> = {
  Section: {
    purpose: "Top-level page band. Full page generation should create Section nodes directly under root.",
    bestFor: ["page skeleton", "major landing page bands"],
    requiredProps: [],
    keyProps: { fullWidthBackground: "boolean" },
    variants: ["standard", "alternate background", "conversion band"],
    fallbackTo: [],
  },
  Container: {
    purpose: "Flexible content wrapper inside sections.",
    bestFor: ["copy stacks", "button rows", "bounded layouts"],
    requiredProps: [],
    keyProps: { direction: ["column", "row"], gap: "spacing", padding: "spacing" },
    variants: ["column", "row"],
    fallbackTo: ["Grid", "Column"],
  },
  Row: {
    purpose: "Horizontal flex layout container.",
    bestFor: ["header rows", "CTA action rows", "compact feature rows"],
    requiredProps: [],
    keyProps: { gap: "number", alignItems: "enum", justifyContent: "enum", flexWrap: "enum" },
    variants: ["nowrap", "wrap"],
    fallbackTo: ["Container"],
  },
  Column: {
    purpose: "Vertical or horizontal flex stack.",
    bestFor: ["card content", "copy stacks", "media/copy columns"],
    requiredProps: [],
    keyProps: { gap: "number", padding: "number", direction: ["column", "row"] },
    variants: ["column", "row"],
    fallbackTo: ["Container"],
  },
  Grid: {
    purpose: "Responsive grid container.",
    bestFor: ["cards", "pricing", "features", "fallback galleries"],
    requiredProps: [],
    keyProps: { columns: "number", columnGap: "number", rowGap: "number" },
    variants: ["2-column", "3-column", "single-column mobile"],
    fallbackTo: ["Container"],
  },
  Repeater: {
    purpose: "Repeats a child template for collection-like sections.",
    bestFor: ["repeatable cards", "data-driven grids"],
    requiredProps: [],
    keyProps: { count: "number", columns: "number", gap: "number" },
    variants: ["card grid", "collection preview"],
    fallbackTo: ["Grid"],
  },
  Text: {
    purpose: "Rich text content.",
    bestFor: ["headings", "body copy", "eyebrows", "labels"],
    requiredProps: ["text"],
    keyProps: { text: "rich text html", tag: ["p", "span", "h1", "h2", "h3", "h4"] },
    variants: ["heading", "paragraph", "label"],
    fallbackTo: [],
  },
  TextMask: {
    purpose: "Expressive masked heading with gradient or image fill.",
    bestFor: ["playful hero heading", "brand statement", "editorial emphasis"],
    requiredProps: ["text"],
    keyProps: { text: "plain text", gradient: "css gradient", fontSize: "css size", fontWeight: ["700", "900"] },
    variants: ["gradient text", "image masked text"],
    fallbackTo: ["Text"],
  },
  TextMarquee: {
    purpose: "Animated scrolling text strip.",
    bestFor: ["playful announcements", "social proof ticker", "CTA energy"],
    requiredProps: ["text"],
    keyProps: { text: "plain text", speed: "seconds", direction: ["left", "right"], separator: "string" },
    variants: ["announcement strip", "proof ticker"],
    fallbackTo: ["Text"],
  },
  Button: {
    purpose: "Clickable call-to-action.",
    bestFor: ["primary CTA", "secondary CTA", "booking buttons"],
    requiredProps: ["label"],
    keyProps: { label: "rich text html", variant: "enum", size: "enum" },
    variants: ["primary", "outline", "secondary"],
    fallbackTo: ["Text"],
  },
  Image: {
    purpose: "Single image block.",
    bestFor: ["hero media", "service thumbnails", "CTA media"],
    requiredProps: ["src", "alt"],
    keyProps: { src: "url", alt: "string", objectFit: ["cover", "contain"] },
    variants: ["cover image", "thumbnail", "banner"],
    fallbackTo: ["Shape"],
  },
  GalleryPro: {
    purpose: "Advanced responsive image gallery with multiple layout modes.",
    bestFor: ["visual service showcase", "portfolio", "venue/gallery", "testimonials with imagery"],
    requiredProps: ["items"],
    keyProps: {
      items: "array of {id, src, alt, title, description, link}",
      layoutMode: ["grid", "masonry", "collage", "slider", "slideshow", "strip", "stacked"],
      columns: "number",
      gap: "number",
    },
    variants: ["grid", "masonry", "collage", "slider", "slideshow", "strip", "stacked"],
    fallbackTo: ["GallerySlider", "GalleryGrid", "Grid", "Image"],
  },
  GalleryGrid: {
    purpose: "Legacy image grid gallery with captions.",
    bestFor: ["service image grid", "simple visual proof", "gallery fallback"],
    requiredProps: ["imageCount"],
    keyProps: { imageCount: "number", columns: "number", layout: ["grid", "masonry"], "slotN_src": "url" },
    variants: ["grid", "masonry"],
    fallbackTo: ["Grid", "Image"],
  },
  GallerySlider: {
    purpose: "Legacy image carousel/slideshow.",
    bestFor: ["carousel", "testimonial visuals", "compact gallery"],
    requiredProps: ["slideCount"],
    keyProps: { slideCount: "number", autoPlay: "boolean", showArrows: "boolean", showDots: "boolean", "slideN_src": "url" },
    variants: ["carousel", "slideshow"],
    fallbackTo: ["GalleryGrid", "Grid", "Image"],
  },
  NavigationMenu: {
    purpose: "Responsive navigation menu with anchor/page/url targets, nested submenu items, overflow handling, and hamburger overlay.",
    bestFor: ["header navigation", "footer links", "anchor navigation", "multi-page navigation", "mobile hamburger menus"],
    requiredProps: ["items"],
    keyProps: {
      items: "tree array of {id,label,target,hidden?,children?}; target is anchor/page/url/none",
      orientation: ["horizontal", "vertical"],
      hamburgerMode: ["fullscreen", "drawer", "dropdown"],
      overflowMode: ["wrap", "scroll", "collapse"],
      dropdownMode: ["flyout", "columns"],
      dropdownStyle: "dropdownPadding/dropdownRadius/dropdownMinWidth/dropdownShadow/dropdownBg/dropdownBorderColor/dropdownItemHoverBg/dropdownOffsetX/dropdownOffsetY",
      itemStyle: "enum",
    },
    variants: ["horizontal", "vertical", "hamburger", "submenu", "pill", "underline", "vertical panel"],
    fallbackTo: ["Row", "Text", "Button"],
  },
  CollapsibleText: {
    purpose: "Expandable text block for compact long-form content.",
    bestFor: ["FAQ", "policies", "long answers", "accordion-like sections"],
    requiredProps: ["text"],
    keyProps: { text: "rich text html", previewLines: "number", expandLabel: "string", collapseLabel: "string" },
    variants: ["FAQ item", "read-more block"],
    fallbackTo: ["Text", "Grid"],
  },
  Divider: {
    purpose: "Visual separator.",
    bestFor: ["footer separation", "section rhythm", "card boundaries"],
    requiredProps: [],
    keyProps: { orientation: ["horizontal", "vertical"] },
    variants: ["horizontal", "vertical"],
    fallbackTo: [],
  },
  Shape: {
    purpose: "Bounded decorative SVG accent.",
    bestFor: ["subtle playful accents", "background detail", "visual filler when media is unavailable"],
    requiredProps: ["shape"],
    keyProps: { shape: ["circle", "star", "heart", "blob", "hexagon"], fill: "color", stroke: "color" },
    variants: ["circle", "star", "heart", "blob"],
    fallbackTo: ["Divider"],
  },
};

function supportedDefinition(type: string): Omit<ComponentCapability, "type"> | null {
  return CURATED_COMPONENT_CAPABILITIES[type] ?? null;
}

function flattenPropSchema(component: AvailableComponent): NonNullable<AvailableComponent["propSchema"]> {
  const out: NonNullable<AvailableComponent["propSchema"]> = [];
  const visit = (entries: NonNullable<AvailableComponent["propSchema"]>) => {
    for (const entry of entries) {
      if (entry.children?.length) {
        visit(entry.children);
      } else {
        out.push(entry);
      }
    }
  };
  visit(component.propSchema ?? []);
  return out;
}

function inferPurpose(component: AvailableComponent): string {
  if (component.category === "layout") return `${component.name} layout component.`;
  if (component.category === "media") return `${component.name} media component.`;
  if (component.category === "navigation") return `${component.name} navigation component.`;
  if (component.category === "decorative") return `${component.name} decorative component.`;
  return `${component.name} ${component.category} component.`;
}

function inferBestFor(component: AvailableComponent): string[] {
  const type = component.type.toLowerCase();
  const category = component.category.toLowerCase();
  if (category === "layout") return ["layout structure", "section composition"];
  if (category === "media") return ["visual content", "image/media presentation"];
  if (category === "navigation") return ["navigation", "links", "page anchors"];
  if (type.includes("button")) return ["calls to action", "conversion"];
  if (type.includes("text")) return ["copy", "headings", "content"];
  return [category || "content"];
}

function inferFallbackTo(component: AvailableComponent): string[] {
  if (component.category === "media") return ["Image", "Grid"];
  if (component.category === "navigation") return ["Text", "Button"];
  if (component.category === "layout") return component.type === "Container" ? ["Grid"] : ["Container"];
  if (component.category === "decorative") return ["Divider"];
  return ["Text"];
}

function propSchemaCapability(component: AvailableComponent): ComponentCapability {
  const props = flattenPropSchema(component);
  const requiredProps = props.filter((prop) => prop.required).map((prop) => prop.key);
  const selectVariants = props
    .filter((prop) => prop.type === "select" && prop.options?.length)
    .flatMap((prop) => prop.options?.map((option) => option.value) ?? [])
    .slice(0, 12);
  const keyProps = Object.fromEntries(
    props.slice(0, 8).map((prop) => [
      prop.key,
      prop.options?.length ? prop.options.map((option) => option.value).slice(0, 8) : prop.type,
    ]),
  ) as Record<string, string | string[]>;

  return {
    type: component.type,
    name: component.name,
    category: component.category,
    isContainer: component.capabilities?.includes("canContainChildren") ?? false,
    purpose: inferPurpose(component),
    bestFor: inferBestFor(component),
    requiredProps,
    keyProps,
    variants: selectVariants,
    fallbackTo: inferFallbackTo(component),
    contractSource: "propSchema",
  };
}

function mergeCapability(component: AvailableComponent): ComponentCapability {
  const fromSchema = propSchemaCapability(component);
  const curated = supportedDefinition(component.type);
  if (!curated) return fromSchema;

  return {
    ...fromSchema,
    ...curated,
    name: component.name,
    category: component.category,
    isContainer: fromSchema.isContainer,
    requiredProps: Array.from(new Set([...fromSchema.requiredProps, ...curated.requiredProps])),
    keyProps: { ...fromSchema.keyProps, ...curated.keyProps },
    variants: Array.from(new Set([...fromSchema.variants, ...curated.variants])),
    fallbackTo: curated.fallbackTo.length > 0 ? curated.fallbackTo : fromSchema.fallbackTo,
    contractSource: "merged",
  };
}

export function buildComponentCapabilityManifest(availableComponents: AvailableComponent[]): ComponentCapability[] {
  const seen = new Set<string>();
  const manifest: ComponentCapability[] = [];

  for (const component of availableComponents) {
    if (seen.has(component.type)) continue;
    seen.add(component.type);
    manifest.push(mergeCapability(component));
  }

  return manifest;
}

export function formatComponentManifestForPrompt(manifest: ComponentCapability[]): string {
  if (manifest.length === 0) return "No component capability manifest was provided.";

  return manifest
    .map((component) => {
      const props = Object.entries(component.keyProps)
        .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join("|") : value}`)
        .join(", ");
      return [
        `- ${component.type}`,
        `purpose: ${component.purpose}`,
        `bestFor: ${component.bestFor.join(", ")}`,
        `requiredProps: ${component.requiredProps.join(", ") || "none"}`,
        `keyProps: ${props || "none"}`,
        `variants: ${component.variants.join(", ") || "none"}`,
        `fallbackTo: ${component.fallbackTo.join(", ") || "none"}`,
      ].join(" | ");
    })
    .join("\n");
}

export function filterPreferredComponents(preferredComponents: string[] | undefined, manifest: ComponentCapability[]): string[] {
  const available = new Set(manifest.map((component) => component.type));
  return (preferredComponents ?? []).filter((type, index, list) => available.has(type) && list.indexOf(type) === index);
}

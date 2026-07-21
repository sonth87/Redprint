/**
 * Section Plan Generator — asks the LLM for section content intent only.
 *
 * The model never emits builder commands here. Commands are produced by the
 * deterministic compiler after this schema validates.
 */
import { z } from "zod";
import { callLLMWithUsage } from "./llm-client.js";
import type { JobAccountant } from "./llm-accounting.js";
import {
  buildComponentCapabilityManifest,
  filterPreferredComponents,
  formatComponentManifestForPrompt,
} from "./component-capability-manifest.js";
import {
  candidateComponentsForSection,
  formatComponentContractsForPrompt,
  resolveComponentContracts,
} from "./component-contract-resolver.js";
import { extractJSON, formatZodError } from "./json-utils.js";
import { resolveLocale, localeLabel } from "./section-plan-compiler.js";
import { SECTION_VARIANTS, hasVariants } from "./layout-variants.js";
import type { GeneratePageRequest, PagePlan, PagePlanSection, SectionPlan } from "../types/ai.types.js";

const OptionalStringSchema = z.preprocess((value) => (value === null ? undefined : value), z.string().optional());

const OptionalItemArraySchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(
    z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      meta: OptionalStringSchema,
    }),
  ).optional(),
);

const SectionPlanItemSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  meta: OptionalStringSchema,
});

const ItemArraySchema = z.preprocess(
  (value) => (value === null ? undefined : value),
  z.array(SectionPlanItemSchema).default([]),
);

const StringArraySchema = z.preprocess(
  (value) => (value === null || value === undefined ? [] : value),
  z.array(z.string()).default([]),
);

const MediaItemsSchema = z.preprocess(
  (value) => (value === null || value === undefined ? [] : value),
  z.array(
    z.object({
      src: OptionalStringSchema,
      alt: z.string().min(1),
      caption: OptionalStringSchema,
      link: OptionalStringSchema,
    }),
  ).default([]),
);

const NavItemsSchema = z.preprocess(
  (value) => (value === null || value === undefined ? [] : value),
  z.array(
    z.object({
      label: z.string().min(1),
      href: z.string().min(1),
    }),
  ).default([]),
);

const ComponentIntentSchema = z.object({
  role: z.string().min(1),
  componentType: z.string().min(1),
  variant: OptionalStringSchema,
  contentSource: OptionalStringSchema,
  priority: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.enum(["required", "preferred", "optional"]).optional(),
  ),
  reason: OptionalStringSchema,
});

const ComponentIntentsSchema = z.preprocess(
  (value) => (value === null || value === undefined ? [] : value),
  z.array(ComponentIntentSchema).default([]),
);

const SectionPlanSchema = z.object({
  sectionId: z.string().min(1),
  type: z.string().min(1),
  layoutVariant: OptionalStringSchema,
  preferredComponents: StringArraySchema,
  componentIntents: ComponentIntentsSchema,
  presetRefs: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .array(z.object({ role: z.string().min(1), presetId: z.string().min(1) }))
      .optional(),
  ),
  interactionIntent: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.enum(["static", "carousel", "expandable", "marquee", "gallery"]).optional(),
  ),
  mediaItems: MediaItemsSchema,
  navItems: NavItemsSchema,
  visualEmphasis: z.preprocess(
    (value) => (value === null ? undefined : value),
    z.enum(["copy", "media", "balanced", "proof", "conversion"]).optional(),
  ),
  eyebrow: OptionalStringSchema,
  heading: z.string().min(1),
  body: z.string().min(1),
  ctaLabel: OptionalStringSchema,
  secondaryCtaLabel: OptionalStringSchema,
  items: ItemArraySchema,
  faqs: OptionalItemArraySchema,
  stats: OptionalItemArraySchema,
  testimonials: OptionalItemArraySchema,
  mediaPrompt: OptionalStringSchema,
});

/**
 * Compact preset list scoped to this section's candidate component types
 * (roadmap 02/01). Only id/componentType/tags — never props/style — so the LLM
 * can reference a preset by id without the token cost of full preset data.
 * Capped at 30 to bound prompt growth.
 */
function buildSectionPresetBlock(
  request: GeneratePageRequest,
  candidateTypes: string[],
): string {
  const groups = request.availablePresets;
  if (!groups || groups.length === 0) return "";
  const candidateSet = new Set(candidateTypes);
  const lines: string[] = [];
  for (const group of groups) {
    for (const type of group.types ?? []) {
      for (const item of type.items ?? []) {
        if (!item?.id || !item.componentType) continue;
        if (candidateSet.size > 0 && !candidateSet.has(item.componentType)) continue;
        const tags = item.tags?.length ? `,${item.tags.join("|")}` : "";
        lines.push(`${item.id}(${item.componentType}${tags})`);
        if (lines.length >= 30) break;
      }
      if (lines.length >= 30) break;
    }
    if (lines.length >= 30) break;
  }
  if (lines.length === 0) return "";
  return `\nAvailable presets for this section (reference by id in presetRefs; never invent an id):\n${lines.join(", ")}\n`;
}

function buildSystemPrompt(pagePlan: PagePlan, section: PagePlanSection, request: GeneratePageRequest): string {
  const componentManifest = buildComponentCapabilityManifest(request.availableComponents ?? []);
  const candidateTypes = candidateComponentsForSection(section.type, request.availableComponents ?? []);
  const componentContracts = resolveComponentContracts(request.availableComponents ?? [], candidateTypes);
  const presetBlock = buildSectionPresetBlock(request, candidateTypes);
  const variantList = hasVariants(section.type)
    ? `\nlayoutVariant for this ${section.type} section — choose ONE that best fits the content (or omit to let the system pick): ${(SECTION_VARIANTS[section.type] as readonly string[]).join(" | ")}. Pick by content: many images → a gallery/media-heavy variant; a process/steps feel → alternating rows; a simple message → a centered/stacked variant.\n`
    : "";
  return `You are a professional landing page section copywriter and UX planner.
Generate content intent for exactly one section. Do NOT return HTML/CSS. Do NOT return builder commands.

Return ONLY JSON:
{
  "sectionId": "${section.id}",
  "type": "${section.type}",
  "layoutVariant": "optional compact layout name",
  "preferredComponents": ["ComponentType"],
  "componentIntents": [{ "role": "hero_media", "componentType": "Image", "variant": "cover", "contentSource": "mediaItems", "priority": "preferred", "reason": "why this component fits" }],
  "presetRefs": [{ "role": "hero_cta", "presetId": "id-from-the-preset-list-below" }],
  "interactionIntent": "static|carousel|expandable|marquee|gallery",
  "mediaItems": [{ "src": "optional image URL", "alt": "specific alt text", "caption": "optional", "link": "optional" }],
  "navItems": [{ "label": "Services", "href": "#services" }],
  "visualEmphasis": "copy|media|balanced|proof|conversion",
  "eyebrow": "optional short label",
  "heading": "specific headline",
  "body": "specific supporting copy",
  "ctaLabel": "optional CTA",
  "secondaryCtaLabel": "optional secondary CTA",
  "items": [{ "title": "...", "body": "...", "meta": "optional" }],
  "faqs": [{ "title": "question", "body": "answer" }],
  "stats": [{ "title": "metric", "body": "meaning" }],
  "testimonials": [{ "title": "quote summary", "body": "quote", "meta": "name" }],
  "mediaPrompt": "optional image search description — ALWAYS in English, concrete subject (e.g. 'happy dog in a bright pet grooming salon')"
}

Available component capability manifest:
${formatComponentManifestForPrompt(componentManifest)}

Detailed component contracts for this section:
${formatComponentContractsForPrompt(componentContracts)}
${presetBlock}${variantList}
Page brief:
${JSON.stringify(pagePlan.brief, null, 2)}

Section spec:
${JSON.stringify(section, null, 2)}

Design and tone:
- User prompt: ${request.prompt}
- Tone: ${pagePlan.brief.tone}
- Style: ${pagePlan.brief.styleDirection}
- Design tokens: ${JSON.stringify(request.designTokens ?? {}, null, 2)}

Rules:
- Prefer rich components when they match section intent.
- Only choose component types listed in the component capability manifest.
- If using componentIntents, use only componentType values present in the detailed contracts for this section.
- Optionally set presetRefs to reuse a designed preset for a slot — use ONLY ids from the preset list above; omit presetRefs if none fit. Never invent a preset id.
- Return component intent and content only; never return builder commands or raw component props.
- If media is needed but no real image is available, include useful alt/caption and describe media intent; the compiler may use safe fallback images.
- Write mediaPrompt in English with a concrete visual subject — it is used to search stock photos for this section.
- Write real, specific content. No lorem ipsum, no "your headline here".
- All heading/body/eyebrow/ctaLabel/items/faqs/testimonials content MUST be written in ${localeLabel(resolveLocale(request, pagePlan.brief))}. Keep structural values (component types, roles) in English.
- Respect the selected tone and palette intent.
- For services/features/pricing/process/trust sections, provide 3-4 items.
- For FAQ, provide 3-5 faqs.
- For testimonials, provide 2-3 realistic testimonials.
- For hero and CTA, include a useful ctaLabel.
- Keep body copy concise enough for a landing page.`;
}

async function askSectionPlanner(
  pagePlan: PagePlan,
  section: PagePlanSection,
  request: GeneratePageRequest,
  repairHint?: string,
  accountant?: JobAccountant,
): Promise<unknown> {
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(pagePlan, section, request) },
    {
      role: "user" as const,
      content: `${repairHint ? `Previous section plan failed validation: ${repairHint}\n\n` : ""}Generate the section plan now.`,
    },
  ];
  const result = await callLLMWithUsage(messages, { jsonMode: true, stage: "section" });
  accountant?.record(result, "section");
  return extractJSON(result.text);
}

export async function generateSectionPlan(
  pagePlan: PagePlan,
  section: PagePlanSection,
  request: GeneratePageRequest,
  repairHint?: string,
  accountant?: JobAccountant,
): Promise<SectionPlan> {
  const parsed = await askSectionPlanner(pagePlan, section, request, repairHint, accountant);
  const result = SectionPlanSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  const componentManifest = buildComponentCapabilityManifest(request.availableComponents ?? []);
  const available = new Set(componentManifest.map((component) => component.type));

  // Drop any preset ref the LLM invented (id not in the catalog) — mirror of
  // filterPreferredComponents. Roadmap 02/01.
  const presetIds = new Set<string>();
  for (const group of request.availablePresets ?? []) {
    for (const type of group.types ?? []) {
      for (const item of type.items ?? []) if (item?.id) presetIds.add(item.id);
    }
  }
  const presetRefs = (result.data.presetRefs ?? []).filter((ref) => presetIds.has(ref.presetId));

  return {
    ...result.data,
    sectionId: section.id,
    type: section.type,
    items: result.data.items ?? [],
    preferredComponents: filterPreferredComponents(result.data.preferredComponents, componentManifest),
    componentIntents: (result.data.componentIntents ?? []).filter((intent) => available.has(intent.componentType)),
    presetRefs: presetRefs.length > 0 ? presetRefs : undefined,
    mediaItems: result.data.mediaItems ?? [],
    navItems: result.data.navItems ?? [],
  } as SectionPlan;
}

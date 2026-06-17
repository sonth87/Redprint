/**
 * Section Plan Generator — asks the LLM for section content intent only.
 *
 * The model never emits builder commands here. Commands are produced by the
 * deterministic compiler after this schema validates.
 */
import { z } from "zod";
import { callLLM } from "./llm-client.js";
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

function buildSystemPrompt(pagePlan: PagePlan, section: PagePlanSection, request: GeneratePageRequest): string {
  const componentManifest = buildComponentCapabilityManifest(request.availableComponents ?? []);
  const candidateTypes = candidateComponentsForSection(section.type, request.availableComponents ?? []);
  const componentContracts = resolveComponentContracts(request.availableComponents ?? [], candidateTypes);
  return `You are a professional landing page section copywriter and UX planner.
Generate content intent for exactly one section. Do NOT return HTML/CSS. Do NOT return builder commands.

Return ONLY JSON:
{
  "sectionId": "${section.id}",
  "type": "${section.type}",
  "layoutVariant": "optional compact layout name",
  "preferredComponents": ["ComponentType"],
  "componentIntents": [{ "role": "hero_media", "componentType": "Image", "variant": "cover", "contentSource": "mediaItems", "priority": "preferred", "reason": "why this component fits" }],
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
  "mediaPrompt": "optional image description"
}

Available component capability manifest:
${formatComponentManifestForPrompt(componentManifest)}

Detailed component contracts for this section:
${formatComponentContractsForPrompt(componentContracts)}

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
- Return component intent and content only; never return builder commands or raw component props.
- If media is needed but no real image is available, include useful alt/caption and describe media intent; the compiler may use safe fallback images.
- Write real, specific content. No lorem ipsum, no "your headline here".
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
): Promise<unknown> {
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(pagePlan, section, request) },
    {
      role: "user" as const,
      content: `${repairHint ? `Previous section plan failed validation: ${repairHint}\n\n` : ""}Generate the section plan now.`,
    },
  ];
  const rawText = await callLLM(messages, true);
  return extractJSON(rawText);
}

export async function generateSectionPlan(
  pagePlan: PagePlan,
  section: PagePlanSection,
  request: GeneratePageRequest,
  repairHint?: string,
): Promise<SectionPlan> {
  const parsed = await askSectionPlanner(pagePlan, section, request, repairHint);
  const result = SectionPlanSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(formatZodError(result.error));
  }

  const componentManifest = buildComponentCapabilityManifest(request.availableComponents ?? []);
  const available = new Set(componentManifest.map((component) => component.type));

  return {
    ...result.data,
    sectionId: section.id,
    type: section.type,
    items: result.data.items ?? [],
    preferredComponents: filterPreferredComponents(result.data.preferredComponents, componentManifest),
    componentIntents: (result.data.componentIntents ?? []).filter((intent) => available.has(intent.componentType)),
    mediaItems: result.data.mediaItems ?? [],
    navItems: result.data.navItems ?? [],
  } as SectionPlan;
}

/**
 * Page Plan Generator — provider-neutral planning layer for full page AI generation.
 *
 * The LLM proposes a CreativeBrief + PagePlan. Deterministic guardrails then
 * normalize section count, ordering, required sections, and stable section IDs.
 */
import { z } from "zod";
import { callLLMWithUsage } from "./llm-client.js";
import type { JobAccountant } from "./llm-accounting.js";
import { resolveLocale, localeLabel } from "./section-plan-compiler.js";
import { extractJSON, formatZodError } from "./json-utils.js";
import type {
  CreativeBrief,
  GeneratePageRequest,
  PageGenerationOptions,
  PageGoal,
  PagePlan,
  PagePlanSection,
  PageSectionType,
} from "../types/ai.types.js";

const SECTION_TYPES = [
  "header",
  "hero",
  "services",
  "features",
  "trust",
  "process",
  "stats",
  "gallery",
  "testimonials",
  "pricing",
  "faq",
  "cta",
  "footer",
  "custom",
] as const;

const GOALS = ["sell_service", "sell_product", "collect_leads", "showcase", "inform"] as const;

const CreativeBriefSchema = z.object({
  rawPrompt: z.string().min(1),
  inferredIndustry: z.string().min(1),
  inferredPageType: z.string().min(1),
  primaryGoal: z.enum(GOALS),
  targetAudience: z.string().min(1),
  tone: z.string().min(1),
  styleDirection: z.string().min(1),
  assumedBusinessDetails: z.array(z.string()).min(1).max(10),
  requiredContentAreas: z.array(z.string()).min(3).max(14),
});

const PagePlanSectionSchema = z.object({
  id: z.string().optional(),
  index: z.number().int().min(0).optional(),
  type: z.enum(SECTION_TYPES),
  title: z.string().min(1),
  purpose: z.string().min(1),
  priority: z.enum(["required", "recommended", "optional"]),
  layoutIntent: z.string().min(1),
  contentRequirements: z.array(z.string()).min(1).max(10),
});

const PagePlanSchema = z.object({
  complexity: z.enum(["simple", "standard", "comprehensive"]).default("standard"),
  brief: CreativeBriefSchema,
  sections: z.array(PagePlanSectionSchema).min(1).max(12),
});

interface PagePattern {
  id: string;
  label: string;
  min: number;
  max: number;
  required: PageSectionType[];
  recommended: PageSectionType[];
  order: PageSectionType[];
}

const PAGE_PATTERNS: Record<string, PagePattern> = {
  "local-service-business": {
    id: "local-service-business",
    label: "Local service business",
    min: 7,
    max: 10,
    required: ["hero", "services", "trust", "cta", "footer"],
    recommended: ["header", "gallery", "pricing", "testimonials", "faq"],
    order: ["header", "hero", "services", "gallery", "trust", "pricing", "testimonials", "faq", "cta", "footer"],
  },
  saas: {
    id: "saas",
    label: "SaaS / software landing page",
    min: 7,
    max: 10,
    required: ["hero", "features", "trust", "cta", "footer"],
    recommended: ["header", "stats", "testimonials", "pricing", "faq"],
    order: ["header", "hero", "features", "stats", "trust", "testimonials", "pricing", "faq", "cta", "footer"],
  },
  ecommerce: {
    id: "ecommerce",
    label: "E-commerce / product landing page",
    min: 6,
    max: 9,
    required: ["hero", "features", "trust", "cta", "footer"],
    recommended: ["header", "gallery", "testimonials", "faq"],
    order: ["header", "hero", "gallery", "features", "trust", "testimonials", "faq", "cta", "footer"],
  },
  portfolio: {
    id: "portfolio",
    label: "Portfolio / showcase page",
    min: 5,
    max: 8,
    required: ["hero", "gallery", "cta", "footer"],
    recommended: ["header", "features", "testimonials"],
    order: ["header", "hero", "features", "gallery", "testimonials", "cta", "footer"],
  },
  generic: {
    id: "generic",
    label: "General landing page",
    min: 6,
    max: 10,
    required: ["hero", "features", "cta", "footer"],
    recommended: ["header", "gallery", "trust", "testimonials", "faq"],
    order: ["header", "hero", "features", "gallery", "trust", "testimonials", "faq", "cta", "footer"],
  },
};

function safeIdPart(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 24) || "section";
}

function inferPattern(prompt: string): PagePattern {
  const p = prompt.toLowerCase();
  if (/(pet|thú cưng|thu cung|groom|veterinary|veterinar|dog|cat|chó|cho|mèo|meo)/i.test(p)) {
    return PAGE_PATTERNS["local-service-business"];
  }
  if (/(service|dịch vụ|dich vu|clinic|spa|salon|agency|consulting|booking|appointment|restaurant|cafe|venue|travel|tour|hotel|resort|beauty)/i.test(p)) {
    return PAGE_PATTERNS["local-service-business"];
  }
  if (/(saas|software|app|platform|dashboard|automation|workflow|productivity|ai|ml)/i.test(p)) {
    return PAGE_PATTERNS.saas;
  }
  if (/(shop|store|ecommerce|e-commerce|buy|cart|fashion|product|marketplace)/i.test(p)) {
    return PAGE_PATTERNS.ecommerce;
  }
  if (/(portfolio|agency|studio|photographer|designer|artist|freelance|showcase)/i.test(p)) {
    return PAGE_PATTERNS.portfolio;
  }
  return PAGE_PATTERNS.generic;
}

function selectedTone(options?: PageGenerationOptions): string {
  return options?.tone?.label || options?.tone?.id || "friendly, professional, trustworthy";
}

function selectedStyle(request: GeneratePageRequest): string {
  const palette = request.generationOptions?.colorPalette;
  if (palette) {
    return `${palette.name ?? "Selected palette"} using primary ${palette.primary}, secondary ${palette.secondary}, and accent ${palette.accent}`;
  }
  const tokens = request.designTokens;
  if (tokens && Object.keys(tokens).length > 0) {
    return `Use provided design tokens: ${JSON.stringify(tokens)}`;
  }
  return "modern, polished, conversion-focused, and consistent";
}

function inferGoal(pattern: PagePattern): PageGoal {
  if (pattern.id === "ecommerce") return "sell_product";
  if (pattern.id === "portfolio") return "showcase";
  if (pattern.id === "local-service-business") return "sell_service";
  return "collect_leads";
}

function defaultSection(sectionType: PageSectionType, pattern: PagePattern): Omit<PagePlanSection, "id" | "index"> {
  const titles: Record<PageSectionType, string> = {
    header: "Navigation",
    hero: "Hero",
    services: "Services",
    features: "Features",
    trust: "Why Choose Us",
    process: "How It Works",
    stats: "Results",
    gallery: "Gallery",
    testimonials: "Testimonials",
    pricing: "Packages",
    faq: "FAQ",
    cta: "Book Now",
    footer: "Footer",
    custom: "Details",
  };

  const purpose: Record<PageSectionType, string> = {
    header: "Help visitors navigate the page and reach the primary action quickly.",
    hero: "Introduce the offer with a clear value proposition and primary call to action.",
    services: "Show the main services in a scannable set of cards.",
    features: "Explain the core benefits and differentiators.",
    trust: "Build confidence with standards, guarantees, credentials, or care principles.",
    process: "Explain the steps visitors take to start or book.",
    stats: "Show proof points and measurable outcomes.",
    gallery: "Show visual examples relevant to the business.",
    testimonials: "Build trust with realistic customer quotes.",
    pricing: "Present packages or starting prices clearly.",
    faq: "Answer common objections and practical questions.",
    cta: "Prompt visitors to take the next step.",
    footer: "Provide contact, location, links, and business details.",
    custom: "Cover an important detail inferred from the request.",
  };

  return {
    type: sectionType,
    title: titles[sectionType],
    purpose: purpose[sectionType],
    priority: pattern.required.includes(sectionType) ? "required" : "recommended",
    layoutIntent:
      sectionType === "hero"
        ? "two-column hero with strong headline and CTA"
        : sectionType === "faq"
        ? "stacked question and answer list"
        : sectionType === "cta"
        ? "centered conversion band"
        : sectionType === "footer"
        ? "compact footer with contact and links"
        : "responsive card/grid layout",
    contentRequirements: [purpose[sectionType]],
  };
}

export function buildDeterministicPagePlan(request: GeneratePageRequest, jobId: string): PagePlan {
  const pattern = inferPattern(request.prompt);
  const sections = [...new Set([...pattern.required, ...pattern.recommended])]
    .sort((a, b) => pattern.order.indexOf(a) - pattern.order.indexOf(b))
    .slice(0, pattern.max);

  const brief: CreativeBrief = {
    rawPrompt: request.prompt,
    inferredIndustry: pattern.id === "local-service-business" ? "pet care or local services" : pattern.label,
    inferredPageType: pattern.label,
    primaryGoal: inferGoal(pattern),
    targetAudience: pattern.id === "local-service-business" ? "local customers looking for reliable services" : "qualified website visitors",
    tone: selectedTone(request.generationOptions),
    styleDirection: selectedStyle(request),
    assumedBusinessDetails: [
      "The business needs a complete landing page, not a single hero block.",
      "Visitors should quickly understand the offer, trust signals, and next action.",
    ],
    requiredContentAreas: sections.map((s) => defaultSection(s, pattern).title),
  };

  return normalizePagePlan(
    {
      jobId,
      complexity: request.generationOptions?.complexity ?? "standard",
      brief,
      sections: sections.map((s, index) => ({
        ...defaultSection(s, pattern),
        id: `ai-${jobId.slice(0, 8)}-${index}-${safeIdPart(s)}`,
        index,
      })),
    },
    request,
    jobId,
  );
}

function buildPlannerSystemPrompt(request: GeneratePageRequest): string {
  const pattern = inferPattern(request.prompt);
  const options = request.generationOptions;
  return `You are a senior web strategist and page planner for a visual website builder.
The user may provide a very short prompt. Expand it into a complete, useful landing page plan.

Return ONLY JSON matching this shape:
{
  "complexity": "standard",
  "brief": {
    "rawPrompt": "...",
    "inferredIndustry": "...",
    "inferredPageType": "...",
    "primaryGoal": "sell_service|sell_product|collect_leads|showcase|inform",
    "targetAudience": "...",
    "tone": "...",
    "styleDirection": "...",
    "assumedBusinessDetails": ["..."],
    "requiredContentAreas": ["..."]
  },
  "sections": [
    {
      "type": "hero",
      "title": "Hero",
      "purpose": "...",
      "priority": "required",
      "layoutIntent": "...",
      "contentRequirements": ["..."]
    }
  ]
}

Rules:
- Default short prompts to a STANDARD, complete page.
- Recommended pattern: ${pattern.label}.
- Section count must be ${pattern.min}-${pattern.max} unless the user explicitly asks for a short page.
- Required sections: ${pattern.required.join(", ")}.
- Recommended order: ${pattern.order.join(" -> ")}.
- Use section type values only from: ${SECTION_TYPES.join(", ")}.
- UI-selected tone has priority over template defaults: ${selectedTone(options)}.
- UI-selected palette/style has priority over template defaults: ${selectedStyle(request)}.
- Write every brief and section content field (titles, purpose, content) in ${localeLabel(resolveLocale(request))}. Keep structural values (section "type") in English.
- Do not generate raw HTML, CSS, or builder commands. Plan only.`;
}

async function askPlanner(
  request: GeneratePageRequest,
  jobId: string,
  repairHint?: string,
  accountant?: JobAccountant,
): Promise<unknown> {
  const messages = [
    { role: "system" as const, content: buildPlannerSystemPrompt(request) },
    {
      role: "user" as const,
      content: `${repairHint ? `Previous plan failed validation: ${repairHint}\n\n` : ""}User prompt:\n${request.prompt}`,
    },
  ];
  const result = await callLLMWithUsage(messages, { jsonMode: true, stage: "planner" });
  accountant?.record(result, "planner");
  return extractJSON(result.text);
}

export function normalizePagePlan(plan: PagePlan, request: GeneratePageRequest, jobId: string): PagePlan {
  const pattern = inferPattern(request.prompt);
  const seen = new Set<PageSectionType>();
  const byType = new Map<PageSectionType, PagePlanSection>();

  for (const required of pattern.required) {
    byType.set(required, {
      ...defaultSection(required, pattern),
      id: "",
      index: 0,
    });
  }

  for (const section of plan.sections) {
    if (!seen.has(section.type)) {
      byType.set(section.type, section);
      seen.add(section.type);
    }
  }

  for (const rec of pattern.recommended) {
    if (byType.size >= pattern.min) break;
    if (!byType.has(rec)) {
      byType.set(rec, {
        ...defaultSection(rec, pattern),
        id: "",
        index: 0,
      });
    }
  }

  const sorted = Array.from(byType.values())
    .sort((a, b) => {
      const ai = pattern.order.indexOf(a.type);
      const bi = pattern.order.indexOf(b.type);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  const candidates =
    sorted.length > pattern.max
      ? [
          ...sorted.filter((section) => pattern.required.includes(section.type)),
          ...sorted
            .filter((section) => !pattern.required.includes(section.type))
            .slice(0, Math.max(0, pattern.max - pattern.required.length)),
        ].sort((a, b) => {
          const ai = pattern.order.indexOf(a.type);
          const bi = pattern.order.indexOf(b.type);
          return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
        })
      : sorted;

  const ordered = candidates
    .map((section, index) => ({
      ...section,
      id: `ai-${jobId.slice(0, 8)}-${index}-${safeIdPart(section.type)}`,
      index,
      priority: pattern.required.includes(section.type) ? "required" : section.priority,
      contentRequirements:
        section.contentRequirements.length > 0
          ? section.contentRequirements
          : defaultSection(section.type, pattern).contentRequirements,
    }));

  return {
    jobId,
    complexity: request.generationOptions?.complexity ?? plan.complexity ?? "standard",
    brief: {
      ...plan.brief,
      rawPrompt: request.prompt,
      tone: selectedTone(request.generationOptions) || plan.brief.tone,
      styleDirection: selectedStyle(request),
    },
    sections: ordered,
  };
}

export async function generatePagePlan(
  request: GeneratePageRequest,
  jobId: string,
  accountant?: JobAccountant,
): Promise<PagePlan> {
  let parsed: unknown;
  try {
    parsed = await askPlanner(request, jobId, undefined, accountant);
  } catch (err) {
    return buildDeterministicPagePlan(request, jobId);
  }

  let result = PagePlanSchema.safeParse(parsed);
  if (!result.success) {
    const errorText = formatZodError(result.error);
    try {
      parsed = await askPlanner(request, jobId, errorText, accountant);
      result = PagePlanSchema.safeParse(parsed);
    } catch {
      // Fall through to deterministic fallback below.
    }
  }

  if (!result.success) {
    return buildDeterministicPagePlan(request, jobId);
  }

  return normalizePagePlan(
    {
      jobId,
      complexity: result.data.complexity,
      brief: result.data.brief,
      sections: result.data.sections.map((section, index) => ({
        ...section,
        id: section.id ?? "",
        index: section.index ?? index,
      })),
    },
    request,
    jobId,
  );
}

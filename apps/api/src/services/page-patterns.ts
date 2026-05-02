/**
 * UX Pattern Engine — matches user prompts to known page patterns and emits
 * structural constraints for the outline generator.
 *
 * Patterns are based on common landing page archetypes. The engine:
 *  1. Scores the prompt against each pattern's keyword list
 *  2. Returns the highest-scoring pattern (falls back to "generic-landing")
 *  3. Builds a human-readable constraint block to inject into the outline prompt
 *
 * This prevents illogical section orderings (CTA before Hero, missing Footer, etc.)
 * and keeps generated pages consistent with UX best practices.
 */

export interface PagePattern {
  id: string;
  name: string;
  /** Lowercase keywords — any match increments the score */
  keywords: string[];
  /** Section types that MUST appear in the output */
  requiredSections: string[];
  /** Section types that are recommended but optional */
  optionalSections: string[];
  /** Ideal section order — AI should follow this sequence */
  recommendedOrder: string[];
}

// ── Pattern definitions ──────────────────────────────────────────────────────

const PATTERNS: PagePattern[] = [
  {
    id: "saas-landing",
    name: "SaaS / Software Landing",
    keywords: [
      "saas", "software", "app", "application", "platform", "tool",
      "startup", "product", "subscription", "dashboard", "workflow",
      "automation", "api", "developer", "enterprise",
    ],
    requiredSections: ["hero", "cta", "footer"],
    optionalSections: ["header", "features", "stats", "testimonials", "pricing", "faq"],
    recommendedOrder: [
      "header", "hero", "features", "stats", "testimonials", "pricing", "faq", "cta", "footer",
    ],
  },
  {
    id: "ecommerce",
    name: "E-commerce / Shop",
    keywords: [
      "shop", "store", "ecommerce", "e-commerce", "product", "buy",
      "cart", "checkout", "order", "sale", "discount", "brand",
      "fashion", "clothing", "electronics", "marketplace",
    ],
    requiredSections: ["hero", "cta", "footer"],
    optionalSections: ["header", "features", "stats", "testimonials", "gallery"],
    recommendedOrder: [
      "header", "hero", "features", "stats", "testimonials", "cta", "footer",
    ],
  },
  {
    id: "portfolio",
    name: "Portfolio / Agency",
    keywords: [
      "portfolio", "agency", "creative", "designer", "design", "studio",
      "freelance", "photographer", "artist", "illustrator", "architect",
      "work", "project", "showcase", "resume", "cv",
    ],
    requiredSections: ["hero", "footer"],
    optionalSections: ["header", "features", "stats", "testimonials", "gallery", "cta", "custom"],
    recommendedOrder: [
      "header", "hero", "features", "stats", "gallery", "testimonials", "cta", "footer",
    ],
  },
  {
    id: "content-page",
    name: "Content / Blog",
    keywords: [
      "blog", "article", "news", "magazine", "journal", "content",
      "post", "media", "publication", "editorial", "writing",
    ],
    requiredSections: ["hero", "footer"],
    optionalSections: ["header", "features", "stats", "testimonials", "cta"],
    recommendedOrder: [
      "header", "hero", "features", "stats", "testimonials", "cta", "footer",
    ],
  },
  {
    id: "generic-landing",
    name: "Generic Landing Page",
    keywords: [],
    requiredSections: ["hero", "cta", "footer"],
    optionalSections: ["header", "features", "stats", "testimonials", "pricing", "faq"],
    recommendedOrder: [
      "header", "hero", "features", "cta", "footer",
    ],
  },
];

// ── Pattern matching ─────────────────────────────────────────────────────────

/**
 * Scores the prompt against all patterns and returns the best match.
 * Falls back to "generic-landing" when no keywords match, flagged as semantic fallback.
 */
export function matchPattern(prompt: string): PagePattern & { isSemanticFallback?: boolean } {
  const lower = prompt.toLowerCase();
  let best: PagePattern = PATTERNS[PATTERNS.length - 1]; // generic-landing fallback
  let bestScore = 0;

  for (const pattern of PATTERNS) {
    if (pattern.keywords.length === 0) continue; // skip generic (it's the fallback)
    const score = pattern.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      best = pattern;
    }
  }

  return { ...best, isSemanticFallback: bestScore === 0 };
}

// ── Constraint builder ───────────────────────────────────────────────────────

/**
 * Produces a human-readable constraint block to inject into the outline prompt.
 * Describes recommended section order and required sections.
 * If isSemanticFallback is true, emits a semantic guidance block instead.
 */
export function buildPatternConstraint(pattern: PagePattern & { isSemanticFallback?: boolean }): string {
  if (pattern.isSemanticFallback) {
    return `## Page Structure
Analyze the user's request to determine the most appropriate section structure.
Choose from: hero, header, features, stats, testimonials, pricing, faq, cta, footer, custom.
IMPORTANT: Never place cta or pricing before hero. Always end with footer. Max 8 sections.`;
  }

  return `## Page Structure Pattern: ${pattern.name}
Recommended section order (follow this sequence):
${pattern.recommendedOrder.map((s, i) => `  ${i + 1}. ${s}`).join("\n")}
Required sections (MUST include): ${pattern.requiredSections.join(", ")}
Optional sections (include when relevant): ${pattern.optionalSections.join(", ")}
IMPORTANT: Never place cta or pricing before hero. Always end with footer.`;
}

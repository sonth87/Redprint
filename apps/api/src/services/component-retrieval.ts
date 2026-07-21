/**
 * Component Retrieval — pick the top-k relevant components for a prompt when
 * the registry is large (roadmap 03/03, depends on 03/01's `sectionAffinity`/
 * `bestFor` as ranking signal).
 *
 * At 17 built-ins, sending every component's manifest/contract to every prompt
 * is cheap and simple — no filtering needed. Once a registry grows to 50-200+
 * components, that stops being true: prompt tokens grow linearly with catalog
 * size (paid on every section × every retry), and the model has to choose
 * between fewer good candidates vs. many mediocre ones. This module is a
 * deterministic, embedding-free scorer — cheap enough to run on every prompt,
 * with no vector DB or precomputed index required.
 */
import type { AIAvailableComponent, CreativeBrief, PagePlanSection, PageSectionType } from "../types/ai.types.js";

/** Below this catalog size, retrieval is a no-op (send everything, byte-identical to pre-03/03 output). */
function retrievalThreshold(): number {
  const v = Number(process.env.AI_RETRIEVAL_THRESHOLD);
  return Number.isFinite(v) && v > 0 ? v : 30;
}

/** Core layout/content primitives always included regardless of score — the model must always be able to build a basic structure. */
const CORE_LAYOUT_TYPES = new Set(["Section", "Container", "Grid", "Row", "Column", "Text", "Button", "Image"]);

const SECTION_TOP_K = 15;
const SECTION_CONTRACT_TOP_K = 6;
const CHAT_TOP_K = 20;

/** category → section types it's a natural fit for (categoryPrior term in the scoring formula). */
const CATEGORY_SECTION_AFFINITY: Record<string, PageSectionType[]> = {
  media: ["gallery", "services", "hero", "testimonials", "cta"],
  navigation: ["header", "footer"],
  decorative: ["hero", "cta"],
};

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2),
  );
}

function keywordOverlap(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const bTokens = new Set(b.flatMap((s) => [...tokenize(s)]));
  const aTokens = new Set(a.flatMap((s) => [...tokenize(s)]));
  let hits = 0;
  for (const t of aTokens) if (bTokens.has(t)) hits++;
  return hits;
}

/**
 * Score one component against a section. Weights match the roadmap formula:
 * 3×sectionAffinity + 2×keyword overlap + 1×category prior + 1×core layout.
 */
function scoreForSection(component: AIAvailableComponent, sectionType: PageSectionType, brief: CreativeBrief, section: PagePlanSection): number {
  const hints = component.aiHints;
  let score = 0;

  if (hints?.sectionAffinity?.includes(sectionType)) score += 3;

  const componentTerms = [...(hints?.bestFor ?? []), hints?.purpose ?? ""];
  const briefTerms = [...brief.requiredContentAreas, ...section.contentRequirements];
  if (keywordOverlap(componentTerms, briefTerms) > 0) score += 2;

  if (CATEGORY_SECTION_AFFINITY[component.category]?.includes(sectionType)) score += 1;
  if (CORE_LAYOUT_TYPES.has(component.type)) score += 1;

  return score;
}

/** Score one component against a free-text prompt (chat path — no section type). */
function scoreForPrompt(component: AIAvailableComponent, prompt: string): number {
  const hints = component.aiHints;
  let score = 0;
  const componentTerms = [...(hints?.bestFor ?? []), hints?.purpose ?? ""];
  if (keywordOverlap(componentTerms, [prompt]) > 0) score += 2;
  if (CORE_LAYOUT_TYPES.has(component.type)) score += 1;
  return score;
}

export interface RetrievalResult {
  /** Components selected for this prompt (== all of them when retrieval didn't trigger). */
  selected: AIAvailableComponent[];
  /** Whether retrieval actually filtered anything (catalog was above the threshold). */
  retrievalUsed: boolean;
  candidateCount: number;
  totalCount: number;
  /** Top-scoring excluded components close to the cutoff, for tuning (roadmap step 5). */
  nearMisses: Array<{ type: string; score: number }>;
}

function rankAndSelect(
  components: AIAvailableComponent[],
  k: number,
  score: (c: AIAvailableComponent) => number,
  forceIncludeTypes: Set<string> = new Set(),
): RetrievalResult {
  const totalCount = components.length;
  if (totalCount <= retrievalThreshold()) {
    return { selected: components, retrievalUsed: false, candidateCount: totalCount, totalCount, nearMisses: [] };
  }

  const ranked = components
    .map((c) => ({ component: c, score: score(c) }))
    .sort((a, b) => b.score - a.score);

  const forced = ranked.filter((r) => CORE_LAYOUT_TYPES.has(r.component.type) || forceIncludeTypes.has(r.component.type));
  const forcedTypes = new Set(forced.map((r) => r.component.type));
  const rest = ranked.filter((r) => !forcedTypes.has(r.component.type));

  const remainingSlots = Math.max(0, k - forced.length);
  const topRest = rest.slice(0, remainingSlots);
  const selected = [...forced, ...topRest].map((r) => r.component);

  const nearMisses = rest.slice(remainingSlots, remainingSlots + 3).map((r) => ({ type: r.component.type, score: r.score }));

  return { selected, retrievalUsed: true, candidateCount: selected.length, totalCount, nearMisses };
}

/**
 * Select top-k components for a section prompt. Below the catalog threshold
 * this is a no-op (returns everything, same order) — output is byte-identical
 * to the pre-03/03 behavior for the current 17 built-ins.
 */
export function selectComponentsForSection(
  components: AIAvailableComponent[],
  sectionType: PageSectionType,
  brief: CreativeBrief,
  section: PagePlanSection,
  k: number = SECTION_TOP_K,
): RetrievalResult {
  return rankAndSelect(components, k, (c) => scoreForSection(c, sectionType, brief, section));
}

/** Contract detail is even more expensive per-component than the manifest line, so it gets a tighter top-k. */
export const SECTION_CONTRACT_TOP_K_DEFAULT = SECTION_CONTRACT_TOP_K;

/**
 * Select top-k components for the chat path, scored against the whole user
 * prompt (no section type). A component named verbatim in the prompt is
 * force-included even if its score would otherwise miss the cutoff (roadmap
 * corner case: "use HoneycombGallery").
 */
export function selectComponentsForPrompt(
  components: AIAvailableComponent[],
  userPrompt: string,
  k: number = CHAT_TOP_K,
): RetrievalResult {
  const lowerPrompt = userPrompt.toLowerCase();
  const namedTypes = new Set(components.filter((c) => lowerPrompt.includes(c.type.toLowerCase())).map((c) => c.type));
  return rankAndSelect(components, k, (c) => scoreForPrompt(c, userPrompt), namedTypes);
}

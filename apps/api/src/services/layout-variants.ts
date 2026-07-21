/**
 * Layout Variants — give `SectionPlan.layoutVariant` real effect (roadmap 02/05).
 *
 * Each section type has a small **closed enum** of layout variants. The LLM may
 * pick one (validated against the enum + component availability); otherwise the
 * compiler picks deterministically by a per-job seed so two runs of the same
 * prompt can differ in layout, while a retry of one section stays stable.
 *
 * This module is data + resolution only (no command emission) so the compiler
 * remains the single executor. Phase 1 wires hero / services / cta; other types
 * fall back to their single existing path.
 */

/** All variant ids known to the resolver, per section type. First = default. */
export const SECTION_VARIANTS = {
  hero: ["split-media-right", "split-media-left", "centered-stack", "full-bleed-media"],
  services: ["grid-cards", "gallery-showcase", "alternating-rows"],
  cta: ["centered-band", "split-with-media"],
} as const;

export type SectionVariantType = keyof typeof SECTION_VARIANTS;
export type HeroVariant = (typeof SECTION_VARIANTS)["hero"][number];
export type ServicesVariant = (typeof SECTION_VARIANTS)["services"][number];
export type CtaVariant = (typeof SECTION_VARIANTS)["cta"][number];

/** Component types each variant needs; a variant is skipped if any is missing. */
const VARIANT_REQUIRES: Record<string, string[]> = {
  // hero
  "split-media-right": ["Grid", "Image"],
  "split-media-left": ["Grid", "Image"],
  "centered-stack": [],
  "full-bleed-media": ["Image"],
  // services
  "grid-cards": ["Grid"],
  "gallery-showcase": [],
  "alternating-rows": [],
  // cta
  "centered-band": [],
  "split-with-media": ["Image"],
};

export function isLayoutVarietyEnabled(): boolean {
  return process.env.AI_LAYOUT_VARIETY !== "off";
}

/** Whether a section type participates in the variant system. */
export function hasVariants(type: string): type is SectionVariantType {
  return type in SECTION_VARIANTS;
}

/** Small deterministic string hash → non-negative int. */
function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function requirementsMet(variant: string, availableTypes: Set<string>): boolean {
  const reqs = VARIANT_REQUIRES[variant] ?? [];
  // Empty availableTypes = "no registry filter" (tests / permissive mode).
  if (availableTypes.size === 0) return true;
  return reqs.every((t) => availableTypes.has(t));
}

export interface ResolveVariantInput {
  type: string;
  /** LLM-provided variant string (may be free text / stale — validated here). */
  requested?: string;
  /** Stable seed source, e.g. `${jobId}:${type}`. */
  seedKey: string;
  availableTypes: Set<string>;
}

/**
 * Resolve the layout variant for a section:
 *   1. If variety is disabled → the type's default (first) variant.
 *   2. If the LLM's `requested` variant is valid for this type AND its component
 *      requirements are met → use it.
 *   3. Otherwise seed-pick from the requirement-satisfying variants (stable per
 *      seedKey). Falls back to the default variant if none qualify.
 */
export function resolveVariant(input: ResolveVariantInput): string {
  const { type, requested, seedKey, availableTypes } = input;
  if (!hasVariants(type)) return "";
  const all = SECTION_VARIANTS[type] as readonly string[];
  const eligible = all.filter((v) => requirementsMet(v, availableTypes));
  const pool = eligible.length > 0 ? eligible : [all[0]];

  if (!isLayoutVarietyEnabled()) return pool[0];

  if (requested) {
    const norm = requested.trim().toLowerCase();
    const match = pool.find((v) => v === norm);
    if (match) return match;
  }

  const idx = hashString(seedKey) % pool.length;
  return pool[idx];
}

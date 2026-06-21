/**
 * Popup System V4 — pure A/B experiment helpers.
 *
 * Framework-agnostic (no React/DOM). Shared by the runtime renderer and the
 * editor preview so variant assignment behaves identically in both. These are
 * the most bug-prone parts of V4, so they are fully unit-testable in isolation.
 */

import type { PopupDefinition, PopupExperiment, PopupVariant } from "../document/popups";

/** A normalized cumulative-weight table entry for weighted selection. */
export interface NormalizedVariantWeight {
  variantId: string;
  /** Cumulative normalized weight in (0, 1]; the last entry is exactly 1. */
  cumulative: number;
}

/**
 * Build a cumulative-weight table from enabled variants with positive weight.
 * Returns an empty array when there is nothing assignable (→ use base content).
 */
export function normalizeWeights(variants: PopupVariant[] | undefined): NormalizedVariantWeight[] {
  if (!variants || variants.length === 0) return [];
  const eligible = variants.filter((v) => v.enabled && v.weight > 0);
  const total = eligible.reduce((sum, v) => sum + v.weight, 0);
  if (total <= 0) return [];

  const table: NormalizedVariantWeight[] = [];
  let running = 0;
  for (const v of eligible) {
    running += v.weight / total;
    table.push({ variantId: v.id, cumulative: running });
  }
  // Guard against floating-point drift so the final bucket always wins.
  const last = table[table.length - 1];
  if (last) last.cumulative = 1;
  return table;
}

/**
 * Weighted pick from the variant table using an injected RNG (0 <= rng() < 1).
 * Returns null when there is no eligible variant (→ use base content).
 */
export function pickVariant(
  variants: PopupVariant[] | undefined,
  rng: () => number = Math.random,
): string | null {
  const table = normalizeWeights(variants);
  if (table.length === 0) return null;
  const r = clamp01(rng());
  for (const entry of table) {
    if (r <= entry.cumulative) return entry.variantId;
  }
  return table[table.length - 1]?.variantId ?? null;
}

export interface ResolveAssignmentInput {
  variants?: PopupVariant[];
  experiment?: PopupExperiment;
  /** Previously-stored sticky assignment, if any. */
  existingAssignment?: string | null;
  rng?: () => number;
}

export interface ResolveAssignmentResult {
  /** Chosen variant id, or null to use the base popup. */
  variantId: string | null;
  /** True when a new assignment was made this call (caller may persist it). */
  isNew: boolean;
}

/**
 * Resolve which variant a visitor should see.
 *
 * Precedence:
 *  1. A concluded experiment (`winnerVariantId`) forces that variant — even if
 *     disabled (the experiment is over).
 *  2. Sticky assignment reuses a valid existing assignment; a stale assignment
 *     (variant deleted or now disabled) is dropped and re-picked.
 *  3. Otherwise a fresh weighted pick (random).
 *
 * When the experiment is absent/disabled or no variant is eligible, returns
 * `{ variantId: null }` → base content.
 */
export function resolveVariantAssignment(input: ResolveAssignmentInput): ResolveAssignmentResult {
  const { variants, experiment, existingAssignment, rng = Math.random } = input;

  // Concluded experiment forces the winner regardless of enabled state.
  if (experiment?.winnerVariantId) {
    const exists = variants?.some((v) => v.id === experiment.winnerVariantId);
    if (exists) return { variantId: experiment.winnerVariantId, isNew: false };
  }

  if (!experiment?.enabled || !variants || variants.length === 0) {
    return { variantId: null, isNew: false };
  }

  if (experiment.assignment === "sticky" && existingAssignment) {
    const stillValid = variants.some((v) => v.id === existingAssignment && v.enabled && v.weight > 0);
    if (stillValid) return { variantId: existingAssignment, isNew: false };
  }

  const picked = pickVariant(variants, rng);
  return { variantId: picked, isNew: picked !== null };
}

export interface ResolvedPopup {
  popup: PopupDefinition;
  /** The content root to render (variant's own root, or the base root). */
  rootNodeId: string;
}

/**
 * Apply a variant's config patch and pick its content root. When `variantId`
 * is null or the variant is missing, returns the base popup unchanged.
 */
export function resolvePopupForVariant(
  popup: PopupDefinition,
  variantId: string | null,
): ResolvedPopup {
  if (!variantId) return { popup, rootNodeId: popup.rootNodeId };
  const variant = popup.variants?.find((v) => v.id === variantId);
  if (!variant) return { popup, rootNodeId: popup.rootNodeId };

  const patched: PopupDefinition = variant.popupPatch
    ? { ...popup, ...variant.popupPatch }
    : popup;
  return { popup: patched, rootNodeId: variant.rootNodeId ?? popup.rootNodeId };
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n >= 1) return 0.999999999;
  return n;
}

/**
 * Small deterministic RNG (mulberry32) seeded from a string, for reproducible
 * variant assignment when an experiment seed is provided.
 */
export function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

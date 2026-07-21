/**
 * LLM pricing table — model → USD per 1M tokens (input / output).
 *
 * Hand-maintained for cost *observability* (roadmap 02/08). Prices drift; this
 * table is intentionally approximate. Every cost we compute from it is labelled
 * `estimated`. An unknown model yields a null cost — we still log the raw tokens.
 *
 * Sources: Anthropic / OpenAI / Google public pricing as of 2026-07. Update by
 * hand when prices change; do NOT call a pricing API from the request path.
 */

export interface ModelPricing {
  /** USD per 1M input tokens. */
  inputPerMTok: number;
  /** USD per 1M output tokens. */
  outputPerMTok: number;
  /**
   * USD per 1M *cache read* tokens, if the provider bills cache reads at a
   * discount (Anthropic prompt caching). Falls back to `inputPerMTok` when
   * omitted.
   */
  cacheReadPerMTok?: number;
}

/**
 * Keyed by exact model id. Prefixes are matched too (see `pricingFor`) so a
 * dated alias like `claude-sonnet-5-YYYYMMDD` still resolves to the base entry.
 */
const PRICING: Record<string, ModelPricing> = {
  // ── Anthropic (Claude) ──────────────────────────────────────────────────
  "claude-fable-5": { inputPerMTok: 10, outputPerMTok: 50, cacheReadPerMTok: 1 },
  "claude-opus-4-8": { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5 },
  "claude-opus-4-7": { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5 },
  "claude-opus-4-6": { inputPerMTok: 5, outputPerMTok: 25, cacheReadPerMTok: 0.5 },
  "claude-sonnet-5": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "claude-sonnet-4-6": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "claude-sonnet-4-5": { inputPerMTok: 3, outputPerMTok: 15, cacheReadPerMTok: 0.3 },
  "claude-haiku-4-5": { inputPerMTok: 1, outputPerMTok: 5, cacheReadPerMTok: 0.1 },

  // ── OpenAI ──────────────────────────────────────────────────────────────
  "gpt-4o": { inputPerMTok: 2.5, outputPerMTok: 10 },
  "gpt-4o-mini": { inputPerMTok: 0.15, outputPerMTok: 0.6 },

  // ── Google (Gemini) ─────────────────────────────────────────────────────
  "gemini-2.0-flash": { inputPerMTok: 0.1, outputPerMTok: 0.4 },
  "gemini-1.5-pro": { inputPerMTok: 1.25, outputPerMTok: 5 },
  "gemini-1.5-flash": { inputPerMTok: 0.075, outputPerMTok: 0.3 },
};

/** Look up pricing by exact id, then by longest matching known prefix. */
export function pricingFor(model: string): ModelPricing | null {
  if (PRICING[model]) return PRICING[model];
  // Longest-prefix match handles dated aliases (`claude-sonnet-5-20260101`).
  let best: { key: string; pricing: ModelPricing } | null = null;
  for (const [key, pricing] of Object.entries(PRICING)) {
    if (model.startsWith(key) && (!best || key.length > best.key.length)) {
      best = { key, pricing };
    }
  }
  return best?.pricing ?? null;
}

export interface UsageForCost {
  inputTokens: number;
  outputTokens: number;
  /** Cache-read tokens (already counted in inputTokens by some providers; see note). */
  cacheReadTokens?: number;
}

/**
 * Estimate USD cost for one model's usage. Returns null when the model is
 * unknown (unpriced) so callers can distinguish "free" from "unpriced".
 *
 * Note on cache reads: Anthropic reports `input_tokens` **excluding** cache
 * reads plus separate cache-read counters, so we price the three buckets
 * independently. Providers without cache pricing pass no `cacheReadTokens`.
 */
export function estimateCostUsd(model: string, usage: UsageForCost): number | null {
  const pricing = pricingFor(model);
  if (!pricing) return null;
  const cacheRead = usage.cacheReadTokens ?? 0;
  const cacheRate = pricing.cacheReadPerMTok ?? pricing.inputPerMTok;
  const cost =
    (usage.inputTokens / 1_000_000) * pricing.inputPerMTok +
    (usage.outputTokens / 1_000_000) * pricing.outputPerMTok +
    (cacheRead / 1_000_000) * cacheRate;
  return cost;
}

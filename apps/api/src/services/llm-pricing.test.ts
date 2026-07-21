import { describe, expect, it } from "vitest";
import { estimateCostUsd, pricingFor } from "./llm-pricing.js";

describe("llm-pricing (roadmap 02/08)", () => {
  it("prices a known model by exact id", () => {
    const cost = estimateCostUsd("claude-sonnet-5", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    // $3 in + $15 out per 1M.
    expect(cost).toBeCloseTo(18, 6);
  });

  it("prices cache-read tokens at the discounted rate", () => {
    const cost = estimateCostUsd("claude-opus-4-8", {
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
    });
    // cacheReadPerMTok = 0.5.
    expect(cost).toBeCloseTo(0.5, 6);
  });

  it("resolves a dated alias via longest-prefix match", () => {
    expect(pricingFor("claude-sonnet-5-20260101")).toEqual(pricingFor("claude-sonnet-5"));
  });

  it("returns null for an unknown model (unpriced, not free)", () => {
    expect(estimateCostUsd("some-future-model", { inputTokens: 100, outputTokens: 100 })).toBeNull();
    expect(pricingFor("some-future-model")).toBeNull();
  });
});

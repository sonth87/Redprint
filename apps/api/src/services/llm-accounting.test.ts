import { describe, expect, it } from "vitest";
import { JobAccountant } from "./llm-accounting.js";
import type { LLMResult } from "./llm-client.js";

function result(
  model: string,
  inputTokens: number,
  outputTokens: number,
  extra: Partial<LLMResult["usage"]> = {},
): LLMResult {
  return {
    text: "",
    model,
    provider: "claude",
    usage: {
      inputTokens,
      outputTokens,
      cacheReadTokens: 0,
      cacheCreationTokens: 0,
      incomplete: false,
      ...extra,
    },
  };
}

describe("JobAccountant (roadmap 02/08)", () => {
  it("sums tokens and cost across calls and breaks down by stage", () => {
    const acct = new JobAccountant();
    acct.record(result("claude-sonnet-5", 1_000_000, 0), "planner"); // $3
    acct.record(result("claude-sonnet-5", 0, 1_000_000), "section"); // $15
    acct.record(result("claude-sonnet-5", 0, 1_000_000), "section"); // $15

    const s = acct.summary();
    expect(s.llmCalls).toBe(3);
    expect(s.totalInputTokens).toBe(1_000_000);
    expect(s.totalOutputTokens).toBe(2_000_000);
    expect(s.estimatedCostUsd).toBeCloseTo(33, 4);
    expect(s.byStage.planner.calls).toBe(1);
    expect(s.byStage.section.calls).toBe(2);
    expect(s.byStage.section.outputTokens).toBe(2_000_000);
  });

  it("flags incomplete usage and still counts priced tokens", () => {
    const acct = new JobAccountant();
    acct.record(result("claude-sonnet-5", 100, 100, { incomplete: true }), "planner");
    const s = acct.summary();
    expect(s.usageIncomplete).toBe(true);
    expect(s.estimatedCostUsd).not.toBeNull();
  });

  it("marks unpriced model but keeps cost from priced calls only", () => {
    const acct = new JobAccountant();
    acct.record(result("claude-sonnet-5", 1_000_000, 0), "planner"); // $3, priced
    acct.record(result("mystery-model", 1_000_000, 0), "section"); // unpriced
    const s = acct.summary();
    expect(s.unpricedModel).toBe(true);
    expect(s.estimatedCostUsd).toBeCloseTo(3, 4);
  });

  it("returns null cost when nothing was priced", () => {
    const acct = new JobAccountant();
    acct.record(result("mystery-model", 100, 100), "planner");
    expect(acct.summary().estimatedCostUsd).toBeNull();
  });
});

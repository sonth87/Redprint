/**
 * LLM job accounting — aggregate token usage & estimated cost across all the
 * LLM calls that make up one generate-page job (planner + N sections + retries
 * + repair). Roadmap 02/08.
 *
 * Usage:
 *   const acct = new JobAccountant();
 *   const { text } = await callLLMWithUsage(msgs, { stage: "planner" });
 *   acct.record(result); // pass the whole LLMResult
 *   ...
 *   logger.jobEvent("complete", { ...acct.summary() });
 */
import { estimateCostUsd } from "./llm-pricing.js";
import type { LLMResult } from "./llm-client.js";

export interface JobUsageSummary {
  llmCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  /** Sum of estimated USD across all priced calls. Null if nothing was priced. */
  estimatedCostUsd: number | null;
  /** True if any call reported incomplete usage (cost is a lower bound). */
  usageIncomplete: boolean;
  /** True if at least one call used an unpriced model (cost is a lower bound). */
  unpricedModel: boolean;
  /** Per-stage token breakdown, for "which stage costs most" analysis. */
  byStage: Record<string, { calls: number; inputTokens: number; outputTokens: number }>;
}

/** Mutable per-job accumulator. Not thread-safe by design (per-request scope). */
export class JobAccountant {
  private calls = 0;
  private input = 0;
  private output = 0;
  private cacheRead = 0;
  private cacheCreation = 0;
  private cost = 0;
  private priced = false;
  private incomplete = false;
  private unpriced = false;
  private stages: Record<string, { calls: number; inputTokens: number; outputTokens: number }> = {};

  /** Record one LLM call's usage. `stage` labels the breakdown bucket. */
  record(result: LLMResult, stage = "unknown"): void {
    const { usage, model } = result;
    this.calls += 1;
    this.input += usage.inputTokens;
    this.output += usage.outputTokens;
    this.cacheRead += usage.cacheReadTokens;
    this.cacheCreation += usage.cacheCreationTokens;
    if (usage.incomplete) this.incomplete = true;

    const cost = estimateCostUsd(model, {
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      cacheReadTokens: usage.cacheReadTokens,
    });
    if (cost === null) {
      this.unpriced = true;
    } else {
      this.cost += cost;
      this.priced = true;
    }

    const bucket = (this.stages[stage] ??= { calls: 0, inputTokens: 0, outputTokens: 0 });
    bucket.calls += 1;
    bucket.inputTokens += usage.inputTokens;
    bucket.outputTokens += usage.outputTokens;
  }

  summary(): JobUsageSummary {
    return {
      llmCalls: this.calls,
      totalInputTokens: this.input,
      totalOutputTokens: this.output,
      cacheReadTokens: this.cacheRead,
      cacheCreationTokens: this.cacheCreation,
      estimatedCostUsd: this.priced ? round4(this.cost) : null,
      usageIncomplete: this.incomplete,
      unpricedModel: this.unpriced,
      byStage: this.stages,
    };
  }
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

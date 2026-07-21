import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { callLLMWithUsage } from "./llm-client.js";

// Capture the request body sent to the provider so we can assert on the wire shape.
function mockClaudeFetch(captured: { body?: any }) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    captured.body = JSON.parse(init.body as string);
    return {
      ok: true,
      json: async () => ({
        content: [{ text: "ok" }],
        usage: {
          input_tokens: 10,
          output_tokens: 20,
          cache_read_input_tokens: 5,
          cache_creation_input_tokens: 3,
        },
      }),
    } as unknown as Response;
  });
}

const ORIGINAL_ENV = { ...process.env };

describe("llm-client Claude model compatibility (roadmap 02/08)", () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = "claude";
    process.env.ANTHROPIC_API_KEY = "test-key";
    delete process.env.LLM_MODEL;
    delete process.env.LLM_MODEL_PLANNER;
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("omits temperature for a new Claude model that rejects sampling params", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-sonnet-5";

    await callLLMWithUsage([{ role: "user", content: "hi" }], { temperature: 0.9 });

    expect(captured.body.model).toBe("claude-sonnet-5");
    expect(captured.body).not.toHaveProperty("temperature");
  });

  it("omits temperature for opus-4-8 too", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-opus-4-8";

    await callLLMWithUsage([{ role: "user", content: "hi" }]);
    expect(captured.body).not.toHaveProperty("temperature");
  });

  it("sends temperature for an older Claude model that accepts it", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-sonnet-4-5";

    await callLLMWithUsage([{ role: "user", content: "hi" }], { temperature: 0.3 });
    expect(captured.body.temperature).toBe(0.3);
  });

  it("defaults to a current model when LLM_MODEL is unset", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));

    await callLLMWithUsage([{ role: "user", content: "hi" }]);
    expect(captured.body.model).toBe("claude-sonnet-5");
    // Default model rejects sampling → no temperature.
    expect(captured.body).not.toHaveProperty("temperature");
  });

  it("resolves per-stage model override from env", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-sonnet-5";
    process.env.LLM_MODEL_PLANNER = "claude-opus-4-8";

    await callLLMWithUsage([{ role: "user", content: "hi" }], { stage: "planner" });
    expect(captured.body.model).toBe("claude-opus-4-8");
  });

  it("parses token usage from the Claude response", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-sonnet-5";

    const { usage } = await callLLMWithUsage([{ role: "user", content: "hi" }]);
    expect(usage.inputTokens).toBe(10);
    expect(usage.outputTokens).toBe(20);
    expect(usage.cacheReadTokens).toBe(5);
    expect(usage.cacheCreationTokens).toBe(3);
    expect(usage.incomplete).toBe(false);
  });

  it("raises max_tokens above the old 8192 default", async () => {
    const captured: { body?: any } = {};
    vi.stubGlobal("fetch", mockClaudeFetch(captured));
    process.env.LLM_MODEL = "claude-sonnet-5";

    await callLLMWithUsage([{ role: "user", content: "hi" }]);
    expect(captured.body.max_tokens).toBeGreaterThan(8192);
  });
});

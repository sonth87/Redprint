/**
 * LLM Client — provider abstraction for OpenAI, Gemini, and Claude.
 *
 * API keys and model are loaded from environment variables.
 * Never exposed to the client.
 *
 * Observability & config (roadmap 02/08):
 * - Every call returns token `usage` alongside text so a job can be costed.
 * - Model / temperature / max_tokens are configurable per *stage* via env
 *   (`LLM_MODEL_PLANNER`, `LLM_TEMPERATURE_SECTION`, …) with a global fallback.
 * - Newer Claude models reject `temperature`/`top_p`/`top_k` (HTTP 400), so we
 *   only send `temperature` to models that still accept it. See
 *   `claudeAcceptsSampling`.
 */
import type { LLMMessage } from "../types/ai.types.js";
import { logger } from "./logger.js";

export type LLMProvider = "openai" | "gemini" | "claude";

/** Pipeline stage — used to resolve per-stage env overrides. */
export type LLMStage = "planner" | "section" | "chat" | "repair";

/** Token usage for one LLM call. Fields are best-effort per provider. */
export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
  /** Anthropic prompt-cache read tokens (billed at a discount), if reported. */
  cacheReadTokens: number;
  /** Anthropic prompt-cache creation tokens, if reported. */
  cacheCreationTokens: number;
  /** True when the provider did not report usage (e.g. stream cut short). */
  incomplete: boolean;
}

/** Result of a usage-aware LLM call. */
export interface LLMResult {
  text: string;
  usage: LLMUsage;
  /** Model actually used (after stage/env resolution) — for cost attribution. */
  model: string;
  provider: LLMProvider;
}

/** Per-call options. All optional; each falls back to env then to a default. */
export interface LLMCallOptions {
  jsonMode?: boolean;
  stage?: LLMStage;
  /** Override model id (highest priority, above env). */
  model?: string;
  /** Override sampling temperature. Ignored for models that reject it. */
  temperature?: number;
  /** Override max output tokens. */
  maxTokens?: number;
}

function zeroUsage(incomplete = false): LLMUsage {
  return {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheCreationTokens: 0,
    incomplete,
  };
}

function getProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER?.toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "claude") return "claude";
  return "openai"; // default
}

function defaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.0-flash";
    case "claude":
      // Default to a current model. `claude-sonnet-4-5` is on the retired path;
      // sonnet-5 is the balanced current default (opus for max quality — set
      // LLM_MODEL / LLM_MODEL_<STAGE> to override).
      return "claude-sonnet-5";
    default:
      return "gpt-4o";
  }
}

/**
 * Resolve the model for a stage. Priority: explicit opt → `LLM_MODEL_<STAGE>`
 * → `LLM_MODEL` → provider default.
 */
function resolveModel(provider: LLMProvider, opts: LLMCallOptions): string {
  if (opts.model) return opts.model;
  if (opts.stage) {
    const perStage = process.env[`LLM_MODEL_${opts.stage.toUpperCase()}`];
    if (perStage) return perStage;
  }
  return process.env.LLM_MODEL || defaultModel(provider);
}

/**
 * Resolve temperature for a stage. Priority: explicit opt →
 * `LLM_TEMPERATURE_<STAGE>` → `LLM_TEMPERATURE` → 0.7. Returns undefined if the
 * resolved value is not a finite number.
 */
function resolveTemperature(opts: LLMCallOptions): number {
  if (typeof opts.temperature === "number") return opts.temperature;
  if (opts.stage) {
    const perStage = Number(process.env[`LLM_TEMPERATURE_${opts.stage.toUpperCase()}`]);
    if (Number.isFinite(perStage)) return perStage;
  }
  const global = Number(process.env.LLM_TEMPERATURE);
  if (Number.isFinite(global)) return global;
  return 0.7;
}

/**
 * Resolve max output tokens. Priority: explicit opt → `LLM_MAX_TOKENS_<STAGE>`
 * → `LLM_MAX_TOKENS` → default. Raised from the old 8192 so full sections /
 * page plans are not truncated on current models (all callers stream or
 * tolerate the larger cap).
 */
function resolveMaxTokens(opts: LLMCallOptions): number {
  const DEFAULT_MAX_TOKENS = 16_384;
  if (typeof opts.maxTokens === "number" && opts.maxTokens > 0) return opts.maxTokens;
  if (opts.stage) {
    const perStage = Number(process.env[`LLM_MAX_TOKENS_${opts.stage.toUpperCase()}`]);
    if (Number.isFinite(perStage) && perStage > 0) return perStage;
  }
  const global = Number(process.env.LLM_MAX_TOKENS);
  if (Number.isFinite(global) && global > 0) return global;
  return DEFAULT_MAX_TOKENS;
}

/**
 * Whether a Claude model still accepts `temperature`/`top_p`/`top_k`.
 *
 * Newer Claude models (Fable 5, Sonnet 5, Opus 4.8 / 4.7 / 4.6) REJECT these
 * sampling params with HTTP 400. Sending temperature to them breaks the whole
 * pipeline. Older models (sonnet-4-5 and earlier, haiku-4-5, 3.x) still accept
 * it. We allowlist the *old* families rather than blocklist the new ones so a
 * future new model defaults to the safe (no-temperature) path.
 */
function claudeAcceptsSampling(model: string): boolean {
  const m = model.toLowerCase();
  // New families that reject sampling params — the default for anything unknown.
  const rejects =
    m.startsWith("claude-fable-5") ||
    m.startsWith("claude-mythos-5") ||
    m.startsWith("claude-sonnet-5") ||
    m.startsWith("claude-opus-4-8") ||
    m.startsWith("claude-opus-4-7") ||
    m.startsWith("claude-opus-4-6");
  if (rejects) return false;
  // Known older families that still accept sampling params.
  return (
    m.startsWith("claude-sonnet-4-5") ||
    m.startsWith("claude-sonnet-4") ||
    m.startsWith("claude-haiku") ||
    m.startsWith("claude-3")
  );
}

function getApiKey(provider: LLMProvider): string {
  const genericKey = process.env.LLM_API_KEY;
  if (genericKey) return genericKey;

  switch (provider) {
    case "gemini":
      return process.env.GOOGLE_API_KEY || "";
    case "claude":
      return process.env.ANTHROPIC_API_KEY || "";
    default:
      return process.env.OPENAI_API_KEY || "";
  }
}

function getTimeoutMs(): number {
  const configured = Number(process.env.LLM_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return 60_000;
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getTimeoutMs());

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(`LLM request timed out after ${getTimeoutMs()}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

/** Log cache-token usage in the existing CLAUDE_CACHE format (debug only). */
function logClaudeCache(source: string, usage: LLMUsage): void {
  if (usage.cacheCreationTokens || usage.cacheReadTokens) {
    logger.decision("CLAUDE_CACHE", `Prompt cache usage${source ? ` (${source})` : ""}`, {
      created: usage.cacheCreationTokens,
      read: usage.cacheReadTokens,
    });
  }
}

// ── OpenAI ───────────────────────────────────────────────────────────────

async function callOpenAI(messages: LLMMessage[], opts: LLMCallOptions): Promise<LLMResult> {
  const apiKey = getApiKey("openai");
  if (!apiKey) throw new Error("LLM_API_KEY or OPENAI_API_KEY is not set");
  const model = resolveModel("openai", opts);

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: resolveTemperature(opts),
    max_tokens: resolveMaxTokens(opts),
  };

  if (opts.jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const usage = zeroUsage(!data.usage);
  usage.inputTokens = data.usage?.prompt_tokens ?? 0;
  usage.outputTokens = data.usage?.completion_tokens ?? 0;
  return { text: data.choices[0]?.message?.content ?? "", usage, model, provider: "openai" };
}

// ── Gemini ───────────────────────────────────────────────────────────────

async function callGemini(messages: LLMMessage[], opts: LLMCallOptions): Promise<LLMResult> {
  const apiKey = getApiKey("gemini");
  if (!apiKey) throw new Error("LLM_API_KEY or GOOGLE_API_KEY is not set");

  const model = resolveModel("gemini", opts);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Extract system message
  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");

  const contents = [
    ...(systemMsg
      ? [
          { role: "user", parts: [{ text: systemMsg.content }] },
          { role: "model", parts: [{ text: "Understood. I will respond as instructed." }] },
        ]
      : []),
    ...userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: resolveTemperature(opts),
        maxOutputTokens: resolveMaxTokens(opts),
        ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const usage = zeroUsage(!data.usageMetadata);
  usage.inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  usage.outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  return {
    text: data.candidates[0]?.content?.parts[0]?.text ?? "",
    usage,
    model,
    provider: "gemini",
  };
}

// ── Claude ───────────────────────────────────────────────────────────────

async function callClaude(messages: LLMMessage[], opts: LLMCallOptions): Promise<LLMResult> {
  const apiKey = getApiKey("claude");
  if (!apiKey) throw new Error("LLM_API_KEY or ANTHROPIC_API_KEY is not set");
  const model = resolveModel("claude", opts);

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: resolveMaxTokens(opts),
    // Block-form system with prompt caching: the system prompt (component
    // manifest + nesting rules + command reference) is large and stable, so
    // mark it ephemeral-cacheable to avoid re-billing it every request.
    system: systemMsg
      ? [{ type: "text", text: systemMsg, cache_control: { type: "ephemeral" } }]
      : undefined,
    messages: apiMessages,
  };
  // Only send temperature to models that accept it — newer Claude models 400
  // on any sampling param.
  if (claudeAcceptsSampling(model)) {
    body.temperature = resolveTemperature(opts);
  }

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content: Array<{ text: string }>;
    usage?: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
  };

  const usage = zeroUsage(!data.usage);
  usage.inputTokens = data.usage?.input_tokens ?? 0;
  usage.outputTokens = data.usage?.output_tokens ?? 0;
  usage.cacheCreationTokens = data.usage?.cache_creation_input_tokens ?? 0;
  usage.cacheReadTokens = data.usage?.cache_read_input_tokens ?? 0;
  logClaudeCache("", usage);

  return { text: data.content[0]?.text ?? "", usage, model, provider: "claude" };
}

// ── Streaming helpers ─────────────────────────────────────────────────────

async function streamOpenAI(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  opts: LLMCallOptions,
): Promise<LLMResult> {
  const apiKey = getApiKey("openai");
  if (!apiKey) throw new Error("LLM_API_KEY or OPENAI_API_KEY is not set");
  const model = resolveModel("openai", opts);

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: resolveTemperature(opts),
    max_tokens: resolveMaxTokens(opts),
    stream: true,
    // Ask OpenAI to include usage on the final stream chunk.
    stream_options: { include_usage: true },
  };
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);

  const usage = zeroUsage(true);
  const text = await readSSEStream(
    res,
    (line) => {
      if (line === "[DONE]") return "";
      const parsed = JSON.parse(line) as {
        choices: Array<{ delta: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      if (parsed.usage) {
        usage.inputTokens = parsed.usage.prompt_tokens ?? usage.inputTokens;
        usage.outputTokens = parsed.usage.completion_tokens ?? usage.outputTokens;
        usage.incomplete = false;
      }
      return parsed.choices[0]?.delta?.content ?? "";
    },
    onToken,
  );
  return { text, usage, model, provider: "openai" };
}

async function streamClaude(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  opts: LLMCallOptions,
): Promise<LLMResult> {
  const apiKey = getApiKey("claude");
  if (!apiKey) throw new Error("LLM_API_KEY or ANTHROPIC_API_KEY is not set");
  const model = resolveModel("claude", opts);

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const body: Record<string, unknown> = {
    model,
    max_tokens: resolveMaxTokens(opts),
    stream: true,
    system: systemMsg
      ? [{ type: "text", text: systemMsg, cache_control: { type: "ephemeral" } }]
      : undefined,
    messages: apiMessages,
  };
  if (claudeAcceptsSampling(model)) {
    body.temperature = resolveTemperature(opts);
  }

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);

  const usage = zeroUsage(true);
  const text = await readSSEStream(
    res,
    (line) => {
      const parsed = JSON.parse(line) as {
        type: string;
        message?: { usage?: { input_tokens?: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number } };
        delta?: { type: string; text?: string };
        usage?: { output_tokens?: number };
      };
      // input/cache tokens arrive on message_start; output tokens on message_delta.
      if (parsed.type === "message_start" && parsed.message?.usage) {
        const u = parsed.message.usage;
        usage.inputTokens = u.input_tokens ?? usage.inputTokens;
        usage.cacheCreationTokens = u.cache_creation_input_tokens ?? usage.cacheCreationTokens;
        usage.cacheReadTokens = u.cache_read_input_tokens ?? usage.cacheReadTokens;
        usage.incomplete = false;
      }
      if (parsed.type === "message_delta" && parsed.usage) {
        usage.outputTokens = parsed.usage.output_tokens ?? usage.outputTokens;
        usage.incomplete = false;
      }
      if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
        return parsed.delta.text ?? "";
      }
      return "";
    },
    onToken,
  );
  logClaudeCache("stream", usage);
  return { text, usage, model, provider: "claude" };
}

async function streamGemini(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  opts: LLMCallOptions,
): Promise<LLMResult> {
  const apiKey = getApiKey("gemini");
  if (!apiKey) throw new Error("LLM_API_KEY or GOOGLE_API_KEY is not set");

  const model = resolveModel("gemini", opts);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const systemMsg = messages.find((m) => m.role === "system");
  const userMessages = messages.filter((m) => m.role !== "system");
  const contents = [
    ...(systemMsg
      ? [
          { role: "user", parts: [{ text: systemMsg.content }] },
          { role: "model", parts: [{ text: "Understood. I will respond as instructed." }] },
        ]
      : []),
    ...userMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: resolveTemperature(opts),
        maxOutputTokens: resolveMaxTokens(opts),
        ...(opts.jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

  const usage = zeroUsage(true);
  const text = await readSSEStream(
    res,
    (line) => {
      const parsed = JSON.parse(line) as {
        candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
        usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
      };
      if (parsed.usageMetadata) {
        usage.inputTokens = parsed.usageMetadata.promptTokenCount ?? usage.inputTokens;
        usage.outputTokens = parsed.usageMetadata.candidatesTokenCount ?? usage.outputTokens;
        usage.incomplete = false;
      }
      return parsed.candidates[0]?.content?.parts[0]?.text ?? "";
    },
    onToken,
  );
  return { text, usage, model, provider: "gemini" };
}

// Reads an SSE response body, calls parseLine per data: line, accumulates text.
async function readSSEStream(
  res: Response,
  parseLine: (data: string) => string,
  onToken: (delta: string) => void,
): Promise<string> {
  if (!res.body) throw new Error("LLM stream response has no body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const delta = parseLine(data);
        if (delta) {
          accumulated += delta;
          onToken(delta);
        }
      } catch {
        // malformed chunk — skip
      }
    }
  }

  return accumulated;
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Call the configured LLM provider and return text + token usage.
 * Prefer this over {@link callLLM} for anything that should be costed/accounted.
 */
export async function callLLMWithUsage(
  messages: LLMMessage[],
  opts: LLMCallOptions = {},
): Promise<LLMResult> {
  const provider = getProvider();
  switch (provider) {
    case "gemini":
      return callGemini(messages, opts);
    case "claude":
      return callClaude(messages, opts);
    default:
      return callOpenAI(messages, opts);
  }
}

/**
 * Stream the LLM response token-by-token. Calls onToken for each text delta
 * and returns the full text + token usage when the stream completes.
 */
export async function callLLMStreamWithUsage(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  opts: LLMCallOptions = {},
): Promise<LLMResult> {
  const provider = getProvider();
  switch (provider) {
    case "gemini":
      return streamGemini(messages, onToken, opts);
    case "claude":
      return streamClaude(messages, onToken, opts);
    default:
      return streamOpenAI(messages, onToken, opts);
  }
}

/**
 * Backwards-compatible text-only wrapper. Existing call sites that don't need
 * usage keep working unchanged.
 *
 * @param messages - Conversation messages (system + user + optional assistant)
 * @param jsonMode - Hint to provider to return JSON, OR a full options object.
 */
export async function callLLM(
  messages: LLMMessage[],
  jsonMode: boolean | LLMCallOptions = false,
): Promise<string> {
  const opts: LLMCallOptions = typeof jsonMode === "boolean" ? { jsonMode } : jsonMode;
  const { text } = await callLLMWithUsage(messages, opts);
  return text;
}

/**
 * Backwards-compatible text-only streaming wrapper.
 */
export async function callLLMStream(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  jsonMode: boolean | LLMCallOptions = false,
): Promise<string> {
  const opts: LLMCallOptions = typeof jsonMode === "boolean" ? { jsonMode } : jsonMode;
  const { text } = await callLLMStreamWithUsage(messages, onToken, opts);
  return text;
}

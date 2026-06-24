/**
 * LLM Client — provider abstraction for OpenAI, Gemini, and Claude.
 *
 * API keys and model are loaded from environment variables.
 * Never exposed to the client.
 */
import type { LLMMessage } from "../types/ai.types.js";
import { logger } from "./logger.js";

export type LLMProvider = "openai" | "gemini" | "claude";

function getProvider(): LLMProvider {
  const p = process.env.LLM_PROVIDER?.toLowerCase();
  if (p === "gemini") return "gemini";
  if (p === "claude") return "claude";
  return "openai"; // default
}

function getModel(): string {
  return process.env.LLM_MODEL || defaultModel(getProvider());
}

function defaultModel(provider: LLMProvider): string {
  switch (provider) {
    case "gemini":
      return "gemini-2.0-flash";
    case "claude":
      return "claude-sonnet-4-5";
    default:
      return "gpt-4o";
  }
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

// ── OpenAI ───────────────────────────────────────────────────────────────

async function callOpenAI(messages: LLMMessage[], jsonMode: boolean): Promise<string> {
  const apiKey = getApiKey("openai");
  if (!apiKey) throw new Error("LLM_API_KEY or OPENAI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: getModel(),
    messages,
    temperature: 0.7,
    max_tokens: 8192,
  };

  if (jsonMode) {
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
  };
  return data.choices[0]?.message?.content ?? "";
}

// ── Gemini ───────────────────────────────────────────────────────────────

async function callGemini(messages: LLMMessage[], jsonMode: boolean): Promise<string> {
  const apiKey = getApiKey("gemini");
  if (!apiKey) throw new Error("LLM_API_KEY or GOOGLE_API_KEY is not set");

  const model = getModel();
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
        temperature: 0.7,
        maxOutputTokens: 8192,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0]?.content?.parts[0]?.text ?? "";
}

// ── Claude ───────────────────────────────────────────────────────────────

async function callClaude(messages: LLMMessage[], _jsonMode: boolean): Promise<string> {
  const apiKey = getApiKey("claude");
  if (!apiKey) throw new Error("LLM_API_KEY or ANTHROPIC_API_KEY is not set");

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 8192,
      // Block-form system with prompt caching: the system prompt (component
      // manifest + nesting rules + command reference) is large and stable, so
      // mark it ephemeral-cacheable to avoid re-billing it every request.
      system: systemMsg
        ? [{ type: "text", text: systemMsg, cache_control: { type: "ephemeral" } }]
        : undefined,
      messages: apiMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as {
    content: Array<{ text: string }>;
    usage?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
  };

  if (data.usage && (data.usage.cache_creation_input_tokens || data.usage.cache_read_input_tokens)) {
    logger.decision("CLAUDE_CACHE", "Prompt cache usage", {
      created: data.usage.cache_creation_input_tokens ?? 0,
      read: data.usage.cache_read_input_tokens ?? 0,
    });
  }

  return data.content[0]?.text ?? "";
}

// ── Streaming helpers ─────────────────────────────────────────────────────

async function streamOpenAI(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  jsonMode: boolean,
): Promise<string> {
  const apiKey = getApiKey("openai");
  if (!apiKey) throw new Error("LLM_API_KEY or OPENAI_API_KEY is not set");

  const body: Record<string, unknown> = {
    model: getModel(),
    messages,
    temperature: 0.7,
    max_tokens: 8192,
    stream: true,
  };
  if (jsonMode) body.response_format = { type: "json_object" };

  const res = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`);

  return readSSEStream(res, (line) => {
    if (line === "[DONE]") return "";
    const parsed = JSON.parse(line) as { choices: Array<{ delta: { content?: string } }> };
    return parsed.choices[0]?.delta?.content ?? "";
  }, onToken);
}

async function streamClaude(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
): Promise<string> {
  const apiKey = getApiKey("claude");
  if (!apiKey) throw new Error("LLM_API_KEY or ANTHROPIC_API_KEY is not set");

  const systemMsg = messages.find((m) => m.role === "system")?.content ?? "";
  const apiMessages = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  const res = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 8192,
      stream: true,
      system: systemMsg
        ? [{ type: "text", text: systemMsg, cache_control: { type: "ephemeral" } }]
        : undefined,
      messages: apiMessages,
    }),
  });

  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);

  return readSSEStream(res, (line) => {
    const parsed = JSON.parse(line) as {
      type: string;
      delta?: { type: string; text?: string };
      usage?: { cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
    };
    if (parsed.type === "message_delta" && parsed.usage) {
      const u = parsed.usage;
      if (u.cache_creation_input_tokens || u.cache_read_input_tokens) {
        logger.decision("CLAUDE_CACHE", "Prompt cache usage (stream)", {
          created: u.cache_creation_input_tokens ?? 0,
          read: u.cache_read_input_tokens ?? 0,
        });
      }
    }
    if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
      return parsed.delta.text ?? "";
    }
    return "";
  }, onToken);
}

async function streamGemini(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  jsonMode: boolean,
): Promise<string> {
  const apiKey = getApiKey("gemini");
  if (!apiKey) throw new Error("LLM_API_KEY or GOOGLE_API_KEY is not set");

  const model = getModel();
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
        temperature: 0.7,
        maxOutputTokens: 8192,
        ...(jsonMode ? { responseMimeType: "application/json" } : {}),
      },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);

  return readSSEStream(res, (line) => {
    const parsed = JSON.parse(line) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    return parsed.candidates[0]?.content?.parts[0]?.text ?? "";
  }, onToken);
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
 * Call the configured LLM provider and return the text response.
 * @param messages - Conversation messages (system + user + optional assistant)
 * @param jsonMode - Hint to provider to return JSON (uses json_object / responseMimeType)
 */
export async function callLLM(messages: LLMMessage[], jsonMode = false): Promise<string> {
  const provider = getProvider();
  switch (provider) {
    case "gemini":
      return callGemini(messages, jsonMode);
    case "claude":
      return callClaude(messages, jsonMode);
    default:
      return callOpenAI(messages, jsonMode);
  }
}

/**
 * Stream the LLM response token-by-token. Calls onToken for each text delta
 * and returns the full accumulated text when the stream completes.
 */
export async function callLLMStream(
  messages: LLMMessage[],
  onToken: (delta: string) => void,
  jsonMode = false,
): Promise<string> {
  const provider = getProvider();
  switch (provider) {
    case "gemini":
      return streamGemini(messages, onToken, jsonMode);
    case "claude":
      return streamClaude(messages, onToken);
    default:
      return streamOpenAI(messages, onToken, jsonMode);
  }
}

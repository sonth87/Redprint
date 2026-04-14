/**
 * LLM Client — provider abstraction for OpenAI, Gemini, and Claude.
 *
 * API keys and model are loaded from environment variables.
 * Never exposed to the client.
 */
import type { LLMMessage } from "../types/ai.types.js";

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

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
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

  const res = await fetch(url, {
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

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: getModel(),
      max_tokens: 8192,
      system: systemMsg,
      messages: apiMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

  const data = (await res.json()) as { content: Array<{ text: string }> };
  return data.content[0]?.text ?? "";
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

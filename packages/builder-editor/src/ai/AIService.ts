/**
 * AIService — manages AI conversations and dispatches to provider adapters.
 *
 * Supports OpenAI, Gemini, and Claude providers. Each provider adapter
 * handles its own API format. The service manages conversation state
 * and translates AI responses into builder commands.
 */
import type {
  AIConfig,
  AIMessage,
  AIBuilderContext,
  AIResponse,
  AIProviderAdapter,
  AIProvider,
} from "./types";

// ── OpenAI adapter ──────────────────────────────────────────────────────

const openaiAdapter: AIProviderAdapter = {
  name: "openai",
  async sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse> {
    const systemMessage = buildSystemMessage(config, context);
    const apiMessages = [
      { role: "system" as const, content: systemMessage },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model || "gpt-4o-mini",
        messages: apiMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 2048,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";
    return parseAIResponse(content);
  },
};

// ── Gemini adapter ──────────────────────────────────────────────────────

const geminiAdapter: AIProviderAdapter = {
  name: "gemini",
  async sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse> {
    const systemMessage = buildSystemMessage(config, context);
    const model = config.model || "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;

    const contents = [
      {
        role: "user",
        parts: [{ text: systemMessage }],
      },
      {
        role: "model",
        parts: [{ text: "Understood. I will help with the UI builder." }],
      },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 2048,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return parseAIResponse(content);
  },
};

// ── Claude adapter ──────────────────────────────────────────────────────

const claudeAdapter: AIProviderAdapter = {
  name: "claude",
  async sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse> {
    const systemMessage = buildSystemMessage(config, context);

    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: config.model || "claude-sonnet-4-20250514",
        max_tokens: config.maxTokens ?? 2048,
        system: systemMessage,
        messages: apiMessages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} — ${error}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text ?? "";
    return parseAIResponse(content);
  },
};

// ── Shared helpers ──────────────────────────────────────────────────────

function buildSystemMessage(config: AIConfig, context: AIBuilderContext): string {
  const base =
    config.systemPrompt ||
    "You are an AI assistant for a visual UI builder. Help users build, modify, and improve their web page designs.";

  const contextBlock = `
Current builder state:
- Document: "${context.document.name}" (${context.document.nodeCount} nodes)
- Active breakpoint: ${context.activeBreakpoint}
${
  context.selectedNode
    ? `- Selected: ${context.selectedNode.type} (id: ${context.selectedNode.id}, name: ${context.selectedNode.name ?? "unnamed"})`
    : "- No node selected"
}
- Available components: ${context.availableComponents.map((c) => c.type).join(", ")}

When suggesting changes, respond with a JSON block wrapped in \`\`\`json ... \`\`\` containing an array of commands:
[{ "type": "UPDATE_STYLE", "payload": { "nodeId": "...", "style": { ... } }, "description": "..." }]
`;

  return `${base}\n\n${contextBlock}`;
}

function parseAIResponse(content: string): AIResponse {
  const suggestions: AIResponse["suggestions"] = [];

  // Extract JSON blocks for command suggestions
  const jsonMatch = content.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]!);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.type && item.payload) {
            suggestions.push({
              type: item.type,
              payload: item.payload,
              description: item.description || item.type,
            });
          }
        }
      }
    } catch {
      // Ignore parse errors in suggestion block
    }
  }

  // Clean up the message by removing JSON blocks
  const message = content.replace(/```json[\s\S]*?```/g, "").trim();

  return { message, suggestions: suggestions.length > 0 ? suggestions : undefined };
}

// ── Provider registry ───────────────────────────────────────────────────

const adapters: Record<AIProvider, AIProviderAdapter> = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
  claude: claudeAdapter,
};

export function getAIAdapter(provider: AIProvider): AIProviderAdapter {
  return adapters[provider];
}

export async function sendAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
): Promise<AIResponse> {
  const adapter = adapters[config.provider];
  if (!adapter) throw new Error(`Unknown AI provider: ${config.provider}`);
  return adapter.sendMessage(messages, context, config);
}

/**
 * AI Tools Service — strategy-based execution layer.
 *
 * Each AIToolsMode has its own Strategy that knows how to:
 *   1. Build the right system + user prompt
 *   2. Parse the raw AI response into a typed AIToolsResponse
 *
 * Adding a new mode (e.g. "code", "video") = add a new Strategy, register it,
 * done. The orchestration in executeAction() never changes.
 */

import type { AIConfig } from "../types";
import { sendAIMessage } from "../AIService";
import type { AIToolsRequest, AIToolsResponse, AIToolsStrategy } from "./types";
import { AI_TEXT_ACTIONS, AI_IMAGE_ACTIONS, AI_TONES } from "./ai-tools-config";

// ── Text strategy ─────────────────────────────────────────────────────────

const textStrategy: AIToolsStrategy = {
  mode: "text",

  buildPrompt(request, actions, tones): string {
    const action = actions.find((a) => a.id === request.actionId);
    const selectedTones = tones.filter((t) => request.toneIds?.includes(t.id));

    const toneInstructions =
      selectedTones.length > 0
        ? `\nTone instructions: ${selectedTones.map((t) => t.promptInstruction).join(" ")}`
        : "";

    const componentHint = request.componentType
      ? `\nComponent context: This is a "${request.componentType}" component.`
      : "";

    let instruction: string;
    if (request.customPrompt) {
      instruction = `Transform the content as follows: ${request.customPrompt}`;
    } else if (action) {
      instruction = action.promptTemplate;
    } else {
      instruction = "Improve the following content.";
    }

    return [
      `You are a professional copywriter assistant for a visual page builder.`,
      `Your task: ${instruction}`,
      toneInstructions,
      componentHint,
      ``,
      `IMPORTANT RULES:`,
      `- Return ONLY the final content, no explanations, no preamble, no quotes.`,
      `- Preserve HTML tags if present (e.g. <strong>, <em>, <br>).`,
      `- Match the approximate length unless the action explicitly says otherwise.`,
      ``,
      `Content to process:`,
      `---`,
      request.currentContent,
      `---`,
    ]
      .filter((l) => l !== undefined)
      .join("\n");
  },

  parseResponse(rawContent): AIToolsResponse {
    // Strip potential markdown code fences if AI wraps content
    const cleaned = rawContent
      .replace(/^```(?:html|text)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();

    return {
      textContent: cleaned,
      rawMessage: rawContent,
    };
  },
};

// ── Image strategy ────────────────────────────────────────────────────────

const imageStrategy: AIToolsStrategy = {
  mode: "image",

  buildPrompt(request, actions): string {
    const action = actions.find((a) => a.id === request.actionId);

    const instruction = request.customPrompt
      ? `${action?.promptTemplate ?? ""}\nUser description: ${request.customPrompt}`
      : action?.promptTemplate ?? "Improve this image.";

    const currentImageContext = request.currentContent
      ? `\nCurrent image URL: ${request.currentContent}`
      : "";

    return [
      `You are an AI image processing assistant integrated into a visual page builder.`,
      `Your task: ${instruction}`,
      currentImageContext,
      ``,
      `IMPORTANT RULES:`,
      `- Return ONLY the resulting image URL (or a base64 data URI).`,
      `- No explanations, no additional text.`,
      `- If you cannot generate or process an image, return an empty string.`,
    ].join("\n");
  },

  parseResponse(rawContent): AIToolsResponse {
    const trimmed = rawContent.trim();
    const isUrl =
      trimmed.startsWith("http://") ||
      trimmed.startsWith("https://") ||
      trimmed.startsWith("data:");

    return {
      imageUrl: isUrl ? trimmed : undefined,
      rawMessage: rawContent,
    };
  },
};

// ── Strategy registry ─────────────────────────────────────────────────────

const strategies: Record<string, AIToolsStrategy> = {
  text: textStrategy,
  image: imageStrategy,
};

// ── Public service ─────────────────────────────────────────────────────────

export async function executeAIToolsAction(
  request: AIToolsRequest,
  config: AIConfig,
): Promise<AIToolsResponse> {
  const strategy = strategies[request.mode];
  if (!strategy) {
    throw new Error(`No AI tools strategy for mode: ${request.mode}`);
  }

  const actions = request.mode === "image" ? AI_IMAGE_ACTIONS : AI_TEXT_ACTIONS;
  const tones = AI_TONES;

  const systemPrompt = strategy.buildPrompt(request, actions, tones);

  // Reuse the existing AIService sendAIMessage infrastructure
  const response = await sendAIMessage(
    [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: systemPrompt,
        timestamp: Date.now(),
      },
    ],
    // Minimal context — the full builder context is not needed for content ops
    {
      document: { name: "", nodeCount: 0, rootNodeId: "" },
      selectedNode: null,
      availableComponents: [],
      activeBreakpoint: "desktop",
    },
    {
      ...config,
      // Override system prompt so we don't leak the builder system prompt
      systemPrompt: "You are a helpful content assistant. Follow the user's instructions precisely.",
    },
  );

  return strategy.parseResponse(response.message);
}

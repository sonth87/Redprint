/**
 * AI Section Builder — service layer.
 *
 * Builds a focused prompt that tells the AI to populate a section node
 * with child components, then normalizes the returned ADD_NODE commands so
 * all parentId aliases ("root", "section") resolve to the real section nodeId.
 */

import type { AIConfig, AICommandSuggestion } from "../types";
import { sendAIMessage } from "../AIService";
import { normalizeAICommands } from "../normalizeAICommands";
import { AI_SECTION_ACTIONS } from "./ai-section-config";

export interface GenerateSectionRequest {
  /** The real UUID of the Section node to fill */
  sectionNodeId: string;
  /** One of the preset action IDs, or "custom" when using a free-form prompt */
  actionId: string;
  /** Free-form prompt (only used when actionId === "custom") */
  customPrompt?: string;
  /** Available component types to guide what the AI can use */
  availableComponentTypes: string[];
  /** AI provider config */
  aiConfig: AIConfig;
}

// ── Prompt builder ──────────────────────────────────────────────────────

function buildSectionPrompt(request: GenerateSectionRequest): string {
  const action = AI_SECTION_ACTIONS.find((a) => a.id === request.actionId);

  const taskInstruction = request.customPrompt
    ? `Generate a page section as described: ${request.customPrompt}`
    : action?.promptTemplate ?? "Generate a well-structured page section.";

  const availableComponentList = request.availableComponentTypes.join(", ");

  return [
    `You are a professional web page builder AI assistant.`,
    `Your task: ${taskInstruction}`,
    ``,
    `RULES:`,
    `- Return EXACTLY ONE line of JSON: {"message":"...","commands":[...]}`,
    `- NO markdown, NO code blocks, NO line breaks, NO preamble.`,
    `- ONLY use ADD_NODE commands.`,
    `- Available component types (use ONLY these): ${availableComponentList}`,
    `- Container components (can have children): Section, Container, Grid, Column`,
    `- Leaf components (no children): Text, Button, Image, Divider`,
    `- The section node already exists with nodeId "root". Add children INTO it using parentId "root".`,
    ``,
    `CRITICAL - NODEIDS FOR CONTAINERS:`,
    `- ALWAYS provide a UNIQUE "nodeId" for EVERY container component (Section, Container, Grid, Column).`,
    `- Use format "temp-{name}" for nodeId, e.g. "temp-hero-grid", "temp-col-1", "temp-card".`,
    `- Leaf components (Text, Button, Image) do NOT need nodeId — omit it completely.`,
    `- Child nodes reference parent nodeId via parentId field.`,
    `- NEVER reuse the same nodeId.`,
    ``,
    `- Build rich, complete layouts: multiple rows, proper typography, spacing, and colours.`,
    `- Respond in English regardless of the user's language.`,
    ``,
    `COMMAND FORMAT (each line is one ADD_NODE):`,
    `{"type":"ADD_NODE","payload":{"componentType":"Container","parentId":"root","nodeId":"temp-main","props":{},"style":{}}}`,
    `{"type":"ADD_NODE","payload":{"componentType":"Text","parentId":"temp-main","props":{"text":"Title","tag":"h1"},"style":{"fontSize":"32px"}}}`,
    ``,
    `EXAMPLE - Full response with 3 levels:`,
    `{"message":"Footer with 4 columns","commands":[{"type":"ADD_NODE","payload":{"componentType":"Grid","parentId":"root","nodeId":"temp-grid","props":{},"style":{"display":"grid","gridTemplateColumns":"2fr 1fr 1fr 1fr","gap":"40px"}}},{"type":"ADD_NODE","payload":{"componentType":"Column","parentId":"temp-grid","nodeId":"temp-col-1","props":{},"style":{"display":"flex","flexDirection":"column"}}},{"type":"ADD_NODE","payload":{"componentType":"Text","parentId":"temp-col-1","props":{"text":"Products","tag":"h4"},"style":{"fontSize":"16px","fontWeight":"600"}}},{"type":"ADD_NODE","payload":{"componentType":"Text","parentId":"temp-col-1","props":{"text":"Feature A","tag":"p"},"style":{"fontSize":"14px"}}}]}`,
    ``,
  ].join("\n");
}

// ── Public API ─────────────────────────────────────────────────────────

export interface GenerateSectionResult {
  /** Human-readable message from the AI */
  message: string;
  /** Normalized, ready-to-dispatch commands */
  commands: AICommandSuggestion[];
}

export async function generateSectionContent(
  request: GenerateSectionRequest,
): Promise<GenerateSectionResult> {
  const prompt = buildSectionPrompt(request);

  const response = await sendAIMessage(
    [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: prompt,
        timestamp: Date.now(),
      },
    ],
    // Pass full component list so AI knows what's available
    {
      document: { name: "", nodeCount: 0, rootNodeId: "" },
      selectedNode: null,
      availableComponents: request.availableComponentTypes.map((t) => ({
        type: t,
        name: t,
        category: "custom",
      })),
      activeBreakpoint: "desktop",
    },
    {
      ...request.aiConfig,
      // Use full system prompt with detailed command format (don't override)
    },
  );

  // response is already parsed by the adapter — use response.suggestions directly.
  // (Calling parseAIResponse on response.message would try to parse the human-readable
  // message string as JSON, which always returns 0 commands.)
  const rawCommands = response.suggestions ?? [];

  console.log("[generateSectionContent] Raw commands from response:", rawCommands.length);

  // Normalize: resolve "root"/"section" aliases to the real section nodeId
  const commands = normalizeAICommands(rawCommands, request.sectionNodeId);

  console.log("[generateSectionContent] After normalization:", { rawCount: rawCommands.length, normalizedCount: commands.length });

  return {
    message: response.message,
    commands,
  };
}

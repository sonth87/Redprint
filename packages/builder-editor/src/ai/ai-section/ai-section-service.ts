/**
 * AI Section Builder — service layer.
 *
 * Builds a focused prompt that tells the AI to populate a section node
 * with child components, then normalizes the returned ADD_NODE commands so
 * all parentId aliases ("root", "section") resolve to the real section nodeId.
 */

import type { AIConfig, AICommandSuggestion, AIBuilderContext } from "../types";
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
  /** The full builder context with page nodes and component defs */
  builderContext: AIBuilderContext;
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
    `- Container components (can have children): Container, Grid, Column (DO NOT use Section)`,
    `- Leaf components (no children): Text, Button, Image, Divider`,
    `- The target Section node already exists with nodeId "${request.sectionNodeId}". Add children INTO it using parentId "${request.sectionNodeId}".`,
    `- DO NOT generate a "Section" component. Use "Container" or "Grid" as your highest-level wrapper.`,
    ``,
    `CRITICAL - NODEIDS FOR CONTAINERS:`,
    `- ALWAYS provide a UNIQUE "nodeId" for EVERY container component (Section, Container, Grid, Column).`,
    `- Use format "temp-{name}" for nodeId, e.g. "temp-hero-grid", "temp-col-1", "temp-card".`,
    `- Leaf components (Text, Button, Image) do NOT need nodeId — omit it completely.`,
    `- Child nodes reference parent nodeId via parentId field.`,
    `- NEVER reuse the same nodeId.`,
    ``,
    `- Build rich, complete layouts: multiple rows, proper typography, spacing, and colours.`,
    `- MAKE IT RESPONSIVE: Provide "responsiveStyle", "responsiveProps", or "responsiveHidden" alongside standard "style"/"props" to adapt the layout for mobile and tablet limits. Example: stack columns into a list on mobile by setting flex-direction to column, or use shorter text on mobile via responsiveProps.`,
    `- Respond in English regardless of the user's language.`,
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
    // Pass the full injected builder context, not standard dummy context
    request.builderContext,
    {
      ...request.aiConfig,
      // Use full system prompt with detailed command format (don't override)
    },
  );

  // response is already parsed by the adapter — use response.suggestions directly.
  // (Calling parseAIResponse on response.message would try to parse the human-readable
  // message string as JSON, which always returns 0 commands.)
  const rawCommands = response.suggestions ?? [];

  // Normalize: resolve "root"/"section" aliases to the real section nodeId
  const commands = normalizeAICommands(rawCommands, request.sectionNodeId);

  return {
    message: response.message,
    commands,
  };
}

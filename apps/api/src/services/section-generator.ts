/**
 * Section Generator — Step 2 of the page generation pipeline.
 *
 * Given a SectionOutline + design context, asks the LLM to generate the
 * actual ADD_NODE commands to populate that section on the canvas.
 *
 * Context is intentionally minimal: only what this section needs.
 * Large page node trees are NOT sent here to avoid context fatigue.
 */
import { callLLM } from "./llm-client.js";
import { logger } from "./logger.js";
import type {
  AICommandSuggestion,
  AIPresetGroup,
  GeneratePageRequest,
  SectionDesignContext,
  SectionOutline,
} from "../types/ai.types.js";

// ── JSON extraction helper (same as outline-generator) ────────────────────

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf("{");
    if (start === -1) throw new Error("No JSON object found");
    let depth = 0; let inStr = false; let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}" && --depth === 0) {
        return JSON.parse(text.slice(start, i + 1));
      }
    }
    throw new Error("Could not extract JSON");
  }
}

// ── Design tokens instruction builder ────────────────────────────────────

function buildDesignTokensInstruction(tokens: Record<string, unknown>): string {
  const { primaryColor, secondaryColor, accentColor, fontFamily, headingFontFamily, borderRadius, backgroundColor, textColor } = tokens as any;

  let instruction = `\n## Design Tokens — MANDATORY\nYou MUST use ONLY these values. Do NOT invent or approximate colors. Apply them specifically:\n`;

  if (primaryColor) {
    instruction += `- PRIMARY COLOR "${primaryColor}": Use for hero backgrounds, main buttons (backgroundColor), accent elements\n`;
  }
  if (secondaryColor) {
    instruction += `- SECONDARY COLOR "${secondaryColor}": Use for section backgrounds, secondary buttons, text areas\n`;
  }
  if (accentColor) {
    instruction += `- ACCENT COLOR "${accentColor}": Use for highlights, icons, borders, hover states\n`;
  }
  if (backgroundColor) {
    instruction += `- BACKGROUND COLOR "${backgroundColor}": Use for main page/section background\n`;
  }
  if (textColor) {
    instruction += `- TEXT COLOR "${textColor}": Use for body text and paragraph color\n`;
  }
  if (fontFamily) {
    instruction += `- FONT FAMILY "${fontFamily}": Use for body text in "fontFamily" style property\n`;
  }
  if (headingFontFamily) {
    instruction += `- HEADING FONT "${headingFontFamily}": Use for h1, h2, h3 in "fontFamily" style property\n`;
  }
  if (borderRadius) {
    instruction += `- BORDER RADIUS "${borderRadius}": Use for rounded corners in "borderRadius" style property\n`;
  }

  instruction += `\nComplete token reference:\n${JSON.stringify(tokens, null, 2)}\n\nREPEAT: Use ONLY these colors. Do NOT use random colors like #FF7F50, #4A90E2, etc.`;

  return instruction;
}

// ── Prompt builders ───────────────────────────────────────────────────────

function buildSystemPrompt(
  request: GeneratePageRequest,
  outline: SectionOutline,
  designContext: SectionDesignContext,
  matchedPreset?: AIPresetGroup
): string {
  const componentList = request.availableComponents
    .map((c) => `${c.type} (${c.category})`)
    .join(", ");

  const presetHint = matchedPreset
    ? `\n## Recommended Preset Reference\nUse styles/props from this preset as a starting point:\n${JSON.stringify(matchedPreset, null, 2)}`
    : "";

  // Phase 1B: use derived nesting rules if available
  const nestingRulesHint = request.nestingRules
    ? `\n## Component Hierarchy Rules\n${request.nestingRules}`
    : `\n## Component Hierarchy Rules
Container components (can have children): Section, Container, Grid, Column
Leaf components (no children): Text, Button, Image, Divider
NEVER place leaf nodes directly under root — always wrap in Container/Grid/Column
DO NOT generate a new "Section" component — the section already exists`;

  const previousSectionsHint =
    designContext.previousSections.length > 0
      ? `\n## Style Consistency (from already-generated sections)\n${designContext.previousSections
          .map(
            (s) =>
              `- ${s.type}: colors=[${s.dominantColors.join(", ")}], fontSizes=[${s.fontSizes.join(", ")}]`
          )
          .join("\n")}`
      : "";

  const designTokensHint = Object.keys(designContext.designTokens).length > 0
    ? buildDesignTokensInstruction(designContext.designTokens as Record<string, unknown>)
    : "";

  return `You are a professional web page builder AI. Generate ADD_NODE commands to build a single page section.

## Available Components (ONLY use these)
${componentList}

${nestingRulesHint}

## Temporary Node ID Rules
- ALWAYS provide a unique "nodeId" for every Container/Grid/Column
- Format: "temp-{description}" e.g. "temp-hero-grid", "temp-col-1"
- Leaf nodes (Text, Button, Image) do NOT need nodeId — omit it
- Children reference parent via parentId
- Never reuse the same nodeId
${presetHint}${previousSectionsHint}${designTokensHint}

## Responsive Design
- Add "responsiveStyle" and/or "responsiveProps" for mobile/tablet adaptations
- Example: stack grids to 1 column on mobile via responsiveStyle: { mobile: { gridTemplateColumns: "1fr" } }

## Output Format
Return ONLY one JSON object — no markdown, no preamble:
{
  "message": "Brief description of what was built",
  "commands": [
    { "type": "ADD_NODE", "payload": { "componentType": "Grid", "parentId": "root", "nodeId": "temp-grid", "props": {}, "style": {}, "responsiveStyle": {} } },
    { "type": "ADD_NODE", "payload": { "componentType": "Text", "parentId": "temp-grid", "props": { "text": "...", "tag": "h1" }, "style": {} } }
  ]
}`;
}

function buildUserPrompt(
  outline: SectionOutline,
  designContext: SectionDesignContext
): string {
  return `## Original User Request
${designContext.originalPrompt}

## This Section's Outline
- Type: ${outline.sectionType}
- Purpose: ${outline.purpose}
- Layout: ${outline.layoutHint}
- Key Content Required: ${outline.keyContent.join(", ")}
- Tone: ${outline.tone ?? "professional"}

Build this section now. The parent Section node has parentId "root".
Generate rich, complete content — not just placeholders.`;
}

// ── Extract style summary from generated commands ─────────────────────────

export function extractStyleSummary(commands: AICommandSuggestion[]) {
  const colors: string[] = [];
  const fontSizes: string[] = [];

  for (const cmd of commands) {
    const style = cmd.payload.style as Record<string, string> | undefined;
    if (!style) continue;
    if (style.backgroundColor) colors.push(style.backgroundColor);
    if (style.color) colors.push(style.color);
    if (style.fontSize) fontSizes.push(style.fontSize);
  }

  return {
    dominantColors: [...new Set(colors)].slice(0, 5),
    fontSizes: [...new Set(fontSizes)].slice(0, 5),
  };
}

// ── Public API ────────────────────────────────────────────────────────────

export async function generateSectionCommands(
  outline: SectionOutline,
  request: GeneratePageRequest,
  designContext: SectionDesignContext
): Promise<AICommandSuggestion[]> {
  // Find matching preset if presetId was suggested in the outline
  const matchedPreset = outline.presetId
    ? request.availablePresets?.find((g) =>
        g.types.some((t) => t.items.some((item) => item.id === outline.presetId))
      )
    : undefined;

  const systemPrompt = buildSystemPrompt(request, outline, designContext, matchedPreset);
  const userPrompt = buildUserPrompt(outline, designContext);

  logger.section(outline.index, outline.sectionType, outline.tone, outline.layoutHint);
  logger.systemMessage(systemPrompt);
  logger.prompt("USER_PROMPT", userPrompt);

  const messages = [
    {
      role: "system" as const,
      content: systemPrompt,
    },
    {
      role: "user" as const,
      content: userPrompt,
    },
  ];

  const rawText = await callLLM(messages, true);
  logger.response("AI_SECTION_RESPONSE", { responseLength: rawText.length, preview: rawText.slice(0, 200) });

  let parsed: unknown;
  try {
    parsed = extractJSON(rawText);
  } catch (err) {
    logger.error("PARSE_ERROR", `Failed to parse response: ${String(err)}\nRaw text: ${rawText.slice(0, 500)}`);
    throw new Error(
      `Section generator failed to parse response for section "${outline.sectionType}": ${String(err)}`
    );
  }

  const obj = parsed as { commands?: unknown[] };
  if (!Array.isArray(obj.commands)) {
    logger.error("COMMAND_ERROR", `No commands in response for "${outline.sectionType}"`);
    throw new Error(`Section generator returned no commands for "${outline.sectionType}"`);
  }

  const commands = obj.commands
    .filter(
      (c): c is AICommandSuggestion =>
        typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string"
    )
    .map((c) => ({
      type: c.type,
      payload: (c.payload as Record<string, unknown>) ?? {},
      description: (c.description as string) || c.type,
    }));

  logger.decision("SECTION_COMPLETE", `Generated ${commands.length} commands for ${outline.sectionType}`);
  return commands;
}

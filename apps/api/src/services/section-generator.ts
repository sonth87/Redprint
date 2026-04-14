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
    ? `\n## Canvas Design Tokens\n${JSON.stringify(designContext.designTokens, null, 2)}`
    : "";

  return `You are a professional web page builder AI. Generate ADD_NODE commands to build a single page section.

## Available Components (ONLY use these)
${componentList}

## Component Rules
- Container components (can have children): Section, Container, Grid, Column
- Leaf components (no children): Text, Button, Image, Divider
- NEVER place leaf nodes directly under root — always wrap in Container/Grid/Column
- DO NOT generate a new "Section" component — the section already exists

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

  const messages = [
    {
      role: "system" as const,
      content: buildSystemPrompt(request, outline, designContext, matchedPreset),
    },
    {
      role: "user" as const,
      content: buildUserPrompt(outline, designContext),
    },
  ];

  const rawText = await callLLM(messages, true);

  let parsed: unknown;
  try {
    parsed = extractJSON(rawText);
  } catch (err) {
    throw new Error(
      `Section generator failed to parse response for section "${outline.sectionType}": ${String(err)}`
    );
  }

  const obj = parsed as { commands?: unknown[] };
  if (!Array.isArray(obj.commands)) {
    throw new Error(`Section generator returned no commands for "${outline.sectionType}"`);
  }

  return obj.commands
    .filter(
      (c): c is AICommandSuggestion =>
        typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string"
    )
    .map((c) => ({
      type: c.type,
      payload: (c.payload as Record<string, unknown>) ?? {},
      description: (c.description as string) || c.type,
    }));
}

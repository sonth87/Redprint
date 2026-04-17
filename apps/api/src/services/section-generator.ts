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
import { COMMAND_REFERENCE } from "./command-reference.js";
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
      ? `\n## Style Consistency — MATCH THESE FROM PRIOR SECTIONS\n${designContext.previousSections
          .map((s) => {
            const parts = [`- ${s.type}:`];
            if (s.dominantColors.length) parts.push(`colors=[${s.dominantColors.join(", ")}]`);
            if (s.fontSizes.length) parts.push(`fontSizes=[${s.fontSizes.join(", ")}]`);
            if (s.fontFamilies?.length) parts.push(`fonts=[${s.fontFamilies.join(", ")}]`);
            if (s.borderRadii?.length) parts.push(`borderRadius=[${s.borderRadii.join(", ")}]`);
            if (s.buttonStyles?.length) parts.push(`button=${JSON.stringify(s.buttonStyles[0])}`);
            return parts.join(" ");
          })
          .join("\n")}
Use the same button styling, border radii, and color palette for visual consistency.`
      : "";

  const designTokensHint = Object.keys(designContext.designTokens).length > 0
    ? buildDesignTokensInstruction(designContext.designTokens as Record<string, unknown>)
    : "";

  return `You are a professional web page builder AI. Generate ADD_NODE commands to build a single page section.
You write REAL, SPECIFIC content — never placeholder text. Every text element must contain genuine copy that reflects the user's business and tone. Content quality bar: imagine a professional copywriter wrote this for an actual client launch.

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

## Responsive Design — MANDATORY FOR EVERY SECTION
You MUST add responsive styles. Every section must include at least 3 nodes with responsiveStyle.

Required behaviors:
1. Headings (h1/h2): responsiveStyle: { mobile: { fontSize: "28px", lineHeight: "1.3" } }
2. Grids (2+ cols): responsiveStyle: { mobile: { gridTemplateColumns: "1fr" }, tablet: { gridTemplateColumns: "1fr 1fr" } }
3. Section padding: responsiveStyle: { mobile: { paddingTop: "40px", paddingBottom: "40px", paddingLeft: "16px", paddingRight: "16px" } }
4. Images: responsiveStyle: { mobile: { width: "100%", height: "auto" } }
5. Buttons: responsiveProps: { mobile: { label: "<short label>" } } if desktop label > 20 chars

${COMMAND_REFERENCE}

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
  const contentExpansionMap: Record<string, string> = {
    "headline": "main headline (8-12 words, action-oriented, specific benefit for this product/service)",
    "subheadline": "supporting subtitle (15-25 words explaining the value proposition)",
    "cta-button": "CTA button with specific label (e.g. 'Start Free Trial', 'Get Demo', 'Shop Now' — NOT 'Click Here')",
    "body-text": "2-3 sentences of paragraph copy relevant to the topic",
    "feature-list": "3-4 feature items each with a title (3-5 words) and description (10-15 words)",
    "stat": "concrete metric with real number (e.g. '10,000+ customers', '99.9% uptime', '$2M saved')",
    "testimonial": "customer quote (20-30 words) with name and title/company",
    "price": "pricing amount with billing period (e.g. '$49/month', 'From $99')",
  };

  const expandedContent = outline.keyContent.map((item) => {
    const key = item.toLowerCase().replace(/[^a-z-]/g, "");
    const expansion = contentExpansionMap[key];
    return expansion ? `- ${item}: ${expansion}` : `- ${item}: write specific, realistic content`;
  }).join("\n");

  return `## Original User Request
${designContext.originalPrompt}

## This Section's Outline
- Type: ${outline.sectionType}
- Purpose: ${outline.purpose}
- Layout: ${outline.layoutHint}
- Tone: ${outline.tone ?? "professional"}

## Content Requirements — WRITE REAL COPY, NO PLACEHOLDERS
${expandedContent}

RULES:
- DO NOT use placeholder text like "Lorem ipsum", "Your headline here", "Feature title"
- ALL text props must contain specific, realistic content based on: "${designContext.originalPrompt.slice(0, 120)}"
- Headlines must be benefit-oriented (NOT "Welcome" — YES "Cut Costs by 40% with Smart Automation")
- Stats must look real (NOT "100%" — YES "12,847 customers" or "94.3% satisfaction rate")
- CTAs must be action-specific (NOT "Click Here" — YES "Start Free Trial", "Book Consultation")

Build this section now. The parent Section node has parentId "root".`;
}

// ── Extract style summary from generated commands ─────────────────────────

export function extractStyleSummary(commands: AICommandSuggestion[]) {
  const colors: string[] = [];
  const fontSizes: string[] = [];
  const fontFamilies: string[] = [];
  const borderRadii: string[] = [];
  const buttonStyles: Array<{ backgroundColor?: string; color?: string; borderRadius?: string }> = [];

  for (const cmd of commands) {
    if (cmd.type !== "ADD_NODE") continue;
    const payload = cmd.payload as Record<string, unknown>;
    const style = payload.style as Record<string, string> | undefined;
    if (!style) continue;
    if (style.backgroundColor) colors.push(style.backgroundColor);
    if (style.color) colors.push(style.color);
    if (style.fontSize) fontSizes.push(style.fontSize);
    if (style.fontFamily) fontFamilies.push(style.fontFamily);
    if (style.borderRadius) borderRadii.push(style.borderRadius);
    if ((payload.componentType as string) === "Button") {
      buttonStyles.push({
        backgroundColor: style.backgroundColor,
        color: style.color,
        borderRadius: style.borderRadius,
      });
    }
  }

  return {
    dominantColors: [...new Set(colors)].slice(0, 5),
    fontSizes: [...new Set(fontSizes)].slice(0, 5),
    fontFamilies: [...new Set(fontFamilies)].slice(0, 3),
    borderRadii: [...new Set(borderRadii)].slice(0, 3),
    buttonStyles: buttonStyles.slice(0, 2),
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

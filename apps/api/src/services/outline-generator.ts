/**
 * Outline Generator — Step 1 of the page generation pipeline.
 *
 * Given a user prompt + available components + presets, asks the LLM to
 * produce a structured page outline (list of SectionOutline objects).
 *
 * Integrates UX Pattern Engine (Phase 2B) to enforce logical section ordering
 * and uses compact preset summaries (Phase 1C) to reduce token overhead.
 *
 * Uses Zod for validation so malformed AI output is caught early.
 */
import { z } from "zod";
import { callLLM } from "./llm-client.js";
import { matchPattern, buildPatternConstraint } from "./page-patterns.js";
import type { GeneratePageRequest, PageOutline, SectionOutline } from "../types/ai.types.js";

// ── Zod schema for LLM output validation ──────────────────────────────────

const SectionOutlineSchema = z.object({
  index: z.number().int().min(0),
  sectionId: z.string().min(1),
  sectionType: z.string().min(1),
  purpose: z.string().min(1),
  layoutHint: z.string().min(1),
  presetId: z.string().optional(),
  keyContent: z.array(z.string()).min(1).max(8),
  tone: z.string().optional(),
});

const PageOutlineSchema = z.object({
  sections: z.array(SectionOutlineSchema).min(1).max(12),
});

// ── Prompts ───────────────────────────────────────────────────────────────

function buildSystemPrompt(request: GeneratePageRequest): string {
  const componentList = request.availableComponents.map((c) => `${c.type} (${c.category})`).join(", ");

  // Phase 1C: use compact preset summary if available, fall back to full list
  const presetList = request.availablePresetsCompact
    ? request.availablePresetsCompact
    : request.availablePresets
    ? request.availablePresets
        .flatMap((g) =>
          g.types.flatMap((t) =>
            t.items.map((item) => `  - id: "${item.id}", name: "${item.name}", type: "${item.componentType}"`)
          )
        )
        .join("\n")
    : "  (none)";

  // Phase 2B: infer page structure pattern and add constraints
  const pattern = matchPattern(request.prompt);
  const patternConstraint = buildPatternConstraint(pattern);

  return `You are a professional web page architect. Your task is to analyze the user's request and produce a structured page outline.

## Available Components
${componentList}

## Available Presets (use presetId when a preset matches a section)
${presetList}

${patternConstraint}

## Output Requirements
Return ONLY valid JSON matching this exact structure — no markdown, no code block, no explanation:
{
  "sections": [
    {
      "index": 0,
      "sectionId": "section-0",
      "sectionType": "hero",
      "purpose": "...",
      "layoutHint": "centered",
      "presetId": "optional-preset-id",
      "keyContent": ["headline", "subheadline", "cta-button"],
      "tone": "professional"
    }
  ]
}

## Rules
- Max 8 sections unless the user explicitly requests more
- sectionType must be one of: hero, header, features, stats, testimonials, pricing, faq, cta, footer, custom
- layoutHint must be one of: centered, left-aligned, right-aligned, 2-col, 3-col-grid, 4-col-grid
- sectionId must be unique: use format "section-{index}"
- keyContent: 3-6 items describing the key UI elements this section needs
- Do NOT generate table-of-contents sections
- Respond in English regardless of input language`;
}

function buildUserPrompt(request: GeneratePageRequest): string {
  const tokensStr = request.designTokens
    ? `\n## Design Tokens (for context)\n${JSON.stringify(request.designTokens, null, 2)}`
    : "";

  return `## User Request
${request.prompt}
${tokensStr}

Generate the page outline now.`;
}

// ── Fallback parser (handles slight formatting issues) ────────────────────

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Extract first balanced JSON object
    const start = text.indexOf("{");
    if (start === -1) throw new Error("No JSON object found in LLM response");

    let depth = 0;
    let inStr = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === "{") depth++;
      else if (ch === "}") {
        depth--;
        if (depth === 0) {
          return JSON.parse(text.slice(start, i + 1));
        }
      }
    }
    throw new Error("Could not extract valid JSON from LLM response");
  }
}

// ── Public API ────────────────────────────────────────────────────────────

export async function generatePageOutline(request: GeneratePageRequest): Promise<PageOutline> {
  const messages = [
    { role: "system" as const, content: buildSystemPrompt(request) },
    { role: "user" as const, content: buildUserPrompt(request) },
  ];

  const rawText = await callLLM(messages, true /* jsonMode */);

  let parsed: unknown;
  try {
    parsed = extractJSON(rawText);
  } catch (err) {
    throw new Error(`Outline parser failed: ${err instanceof Error ? err.message : String(err)}\n\nRaw: ${rawText.slice(0, 500)}`);
  }

  const result = PageOutlineSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Outline validation failed: ${result.error.message}\n\nRaw: ${JSON.stringify(parsed).slice(0, 500)}`);
  }

  // Guarantee sequential index values regardless of what AI returned
  const sections: SectionOutline[] = result.data.sections.map((s, i) => ({
    ...s,
    index: i,
    sectionId: `section-${i}`,
  }));

  return { sections };
}

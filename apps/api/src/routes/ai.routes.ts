/**
 * AI Routes — Express router for AI endpoints.
 *
 * POST /api/ai/generate-page  — Full page SSE generation (multi-step pipeline)
 * POST /api/ai/chat           — Single chat/edit turn (returns JSON)
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { generatePageOutline } from "../services/outline-generator.js";
import { generateSectionCommands, extractStyleSummary } from "../services/section-generator.js";
import { callLLM } from "../services/llm-client.js";
import { COMMAND_REFERENCE } from "../services/command-reference.js";
import type {
  ChatRequest,
  GeneratePageRequest,
  SectionDesignContext,
  AICommandSuggestion,
} from "../types/ai.types.js";

export const aiRouter: IRouter = Router();

// ── Utility: write SSE event ─────────────────────────────────────────────

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// ── SSE headers setup ─────────────────────────────────────────────────────

function initSSE(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

// ── Generation mode from env ─────────────────────────────────────────────

function isParallelMode(): boolean {
  return (process.env.AI_GENERATION_MODE ?? "sequential") === "parallel";
}

function getBatchSize(): number {
  return parseInt(process.env.AI_BATCH_SIZE ?? "3", 10);
}

// ── POST /api/ai/generate-page ──────────────────────────────────────────

aiRouter.post("/generate-page", async (req: Request, res: Response) => {
  const body = req.body as GeneratePageRequest;

  if (!body.prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  initSSE(res);

  try {
    // ── Step 1: Generate page outline ──────────────────────────────────────
    console.log(`[AI] Generating outline for: "${body.prompt.slice(0, 80)}..."`);
    const outline = await generatePageOutline(body);
    console.log(`[AI] Outline ready: ${outline.sections.length} sections`);

    sendSSE(res, "outline_ready", { sections: outline.sections });

    // ── Step 2: Generate each section ─────────────────────────────────────
    const designContext: SectionDesignContext = {
      designTokens: body.designTokens ?? {},
      previousSections: [],
      originalPrompt: body.prompt,
    };

    if (isParallelMode()) {
      // ── Parallel mode (batched) ──────────────────────────────────────────
      const batchSize = getBatchSize();
      for (let start = 0; start < outline.sections.length; start += batchSize) {
        const batch = outline.sections.slice(start, start + batchSize);
        console.log(`[AI] Parallel batch: sections ${start}–${start + batch.length - 1}`);

        // Capture current design context for this batch (before any of them run)
        const batchDesignContext: SectionDesignContext = {
          ...designContext,
          previousSections: [...designContext.previousSections],
        };

        const batchResults = await Promise.allSettled(
          batch.map((sectionOutline) =>
            generateSectionCommands(sectionOutline, body, batchDesignContext)
          )
        );

        for (let i = 0; i < batchResults.length; i++) {
          const result = batchResults[i];
          const sectionOutline = batch[i];

          if (result.status === "fulfilled") {
            const commands: AICommandSuggestion[] = result.value;
            sendSSE(res, "section_ready", {
              index: sectionOutline.index,
              sectionId: sectionOutline.sectionId,
              commands,
            });
            // Update design context for subsequent batches
            const summary = extractStyleSummary(commands);
            designContext.previousSections.push({
              type: sectionOutline.sectionType,
              ...summary,
            });
          } else {
            console.error(`[AI] Section ${sectionOutline.index} failed:`, result.reason);
            sendSSE(res, "section_error", {
              index: sectionOutline.index,
              sectionId: sectionOutline.sectionId,
              error: result.reason instanceof Error ? result.reason.message : "Generation failed",
            });
          }
        }
      }
    } else {
      // ── Sequential mode ──────────────────────────────────────────────────
      for (const sectionOutline of outline.sections) {
        console.log(`[AI] Generating section ${sectionOutline.index}: ${sectionOutline.sectionType}`);
        try {
          const commands = await generateSectionCommands(sectionOutline, body, designContext);
          sendSSE(res, "section_ready", {
            index: sectionOutline.index,
            sectionId: sectionOutline.sectionId,
            commands,
          });
          // Update design context for next section
          const summary = extractStyleSummary(commands);
          designContext.previousSections.push({
            type: sectionOutline.sectionType,
            ...summary,
          });
        } catch (err) {
          console.error(`[AI] Section ${sectionOutline.index} failed:`, err);
          sendSSE(res, "section_error", {
            index: sectionOutline.index,
            sectionId: sectionOutline.sectionId,
            error: err instanceof Error ? err.message : "Generation failed",
          });
          // Continue with next section — don't abort the whole generation
        }
      }
    }

    sendSSE(res, "complete", {});
    res.end();
  } catch (err) {
    console.error("[AI] generate-page fatal error:", err);
    sendSSE(res, "error", {
      message: err instanceof Error ? err.message : "Internal server error",
    });
    res.end();
  }
});

// ── Chat system prompt builder ───────────────────────────────────────────

function buildChatSystemPrompt(ctx: ChatRequest["builderContext"]): string {
  // Components: use pre-serialized compact manifest when available (Phase 1B),
  // otherwise fall back to a simple type list.
  const componentList =
    ctx.componentsManifest ??
    ctx.availableComponents.map((c) => `${c.type} (${c.category})`).join(", ");

  // Nesting rules: use derived rules when available (Phase 1B), else static fallback.
  const nestingRules =
    ctx.nestingRules ??
    `Container components (can have children): Section, Container, Grid, Column
Leaf components (no children): Text, Button, Image, Divider
Always build pages with proper nesting: Section → Column/Grid → leaf nodes.
Never place leaf nodes directly into root — wrap them in a Section or Container first.`;

  const selectedNodeBlock = ctx.selectedNode
    ? `- Selected node: ${ctx.selectedNode.type} (id: "${ctx.selectedNode.id}", name: "${ctx.selectedNode.name ?? "unnamed"}")
  Props: ${JSON.stringify(ctx.selectedNode.props)}
  Style: ${JSON.stringify(ctx.selectedNode.style)}`
    : "- No node selected";

  // Phase 3A: prefer hierarchical summary (slim tree + focused nodes) over full tree
  let pageContextBlock = "";
  if (ctx.pageNodesSummary) {
    const { tree, focusedNodes } = ctx.pageNodesSummary;
    pageContextBlock = `\n## Page Structure (Slim Tree)
All existing nodes structure:\n${JSON.stringify(tree, null, 2)}\n
## Focused Nodes (with full details)
Selected node + parent + siblings:\n${JSON.stringify(focusedNodes, null, 2)}\n`;
  } else if (ctx.pageNodes) {
    pageContextBlock = `\n## Full Page Node Tree\nAll existing nodes with their real UUIDs — use these IDs in UPDATE_* commands:\n${JSON.stringify(ctx.pageNodes, null, 2)}\n`;
  }

  // Presets: use compact one-line string (Phase 1C) or full list.
  const presetsBlock = ctx.availablePresetsCompact
    ? `\n## Available Presets\n${ctx.availablePresetsCompact}\n`
    : ctx.availablePresets
    ? `\n## Available Presets\n${ctx.availablePresets
        .flatMap((g) =>
          g.types.flatMap((t) =>
            t.items.map(
              (item) =>
                `  - id: "${item.id}", name: "${item.name}", componentType: "${item.componentType}"`
            )
          )
        )
        .join("\n")}\n`
    : "";

  // Design tokens (Phase 2A).
  const designTokensBlock =
    ctx.designTokens && Object.keys(ctx.designTokens).length > 0
      ? `\n## Design Tokens — MANDATORY\nUse ONLY these values for colors and typography. Do NOT invent arbitrary CSS values.\n${JSON.stringify(ctx.designTokens, null, 2)}\n`
      : "";

  return `You are an AI assistant for a visual web page builder called Redprint. Help users build, modify, and improve their web page designs by generating precise builder commands.

## Current Builder State
- Document: "${ctx.document.name}" (${ctx.document.nodeCount} nodes, rootId: "${ctx.document.rootNodeId}")
- Active breakpoint: ${ctx.activeBreakpoint}
${selectedNodeBlock}

## Available Components
${componentList}

## Component Hierarchy
${nestingRules}${pageContextBlock}${presetsBlock}${designTokensBlock}
${COMMAND_REFERENCE}`;
}

// ── POST /api/ai/chat ────────────────────────────────────────────────────

aiRouter.post("/chat", async (req: Request, res: Response) => {
  const body = req.body as ChatRequest;

  if (!body.messages?.length) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  try {
    const systemContent = buildChatSystemPrompt(body.builderContext);

    // body.messages contains only user/assistant messages (no system role).
    // The client no longer sends a system message — the backend owns that.
    const messages = [
      { role: "system" as const, content: systemContent },
      ...body.messages.filter((m) => m.role !== "system"),
    ];

    const rawText = await callLLM(messages, true);

    // Parse response
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const start = rawText.indexOf("{");
      parsed = start >= 0 ? JSON.parse(rawText.slice(start)) : { message: rawText, commands: [] };
    }

    const obj = parsed as { message?: string; commands?: unknown[] };
    const commands = Array.isArray(obj.commands)
      ? obj.commands.filter(
          (c): c is AICommandSuggestion =>
            typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string"
        )
      : [];

    res.json({ message: obj.message ?? "", commands });
  } catch (err) {
    console.error("[AI] chat error:", err);
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

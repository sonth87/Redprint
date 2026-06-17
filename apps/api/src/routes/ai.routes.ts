/**
 * AI Routes — Express router for AI endpoints.
 *
 * POST /api/ai/generate-page  — Full page SSE generation (multi-step pipeline)
 * POST /api/ai/chat           — Single chat/edit turn (returns JSON)
 */
import { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { classifyAIError } from "../services/ai-error-classifier.js";
import { buildComponentCapabilityManifest } from "../services/component-capability-manifest.js";
import { buildDeterministicPagePlan, generatePagePlan } from "../services/page-plan-generator.js";
import { generateSectionPlan } from "../services/section-plan-generator.js";
import { buildSkeletonCommands, compileFallbackSection, compileSection } from "../services/section-plan-compiler.js";
import { callLLM } from "../services/llm-client.js";
import { COMMAND_REFERENCE } from "../services/command-reference.js";
import { logger } from "../services/logger.js";
import type {
  ChatRequest,
  GeneratePageRequest,
  AICommandSuggestion,
} from "../types/ai.types.js";

export const aiRouter: IRouter = Router();

const RICH_COMPONENT_TYPES = new Set([
  "NavigationMenu",
  "GalleryPro",
  "GallerySlider",
  "GalleryGrid",
  "CollapsibleText",
  "TextMarquee",
  "TextMask",
  "Shape",
  "Row",
  "Column",
  "Repeater",
]);

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

function getPositiveIntEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  if (Number.isFinite(value) && value > 0) return Math.floor(value);
  return fallback;
}

function sectionPriority(type: string): number {
  const order = ["header", "hero", "services", "features", "pricing", "cta", "trust", "process", "testimonials", "faq", "footer"];
  const index = order.indexOf(type);
  return index === -1 ? order.length : index;
}

function commandComponentTypes(commands: AICommandSuggestion[]): string[] {
  return commands
    .filter((cmd) => cmd.type === "ADD_NODE")
    .map((cmd) => String(cmd.payload.componentType ?? ""))
    .filter(Boolean);
}

function richCommandSummary(commands: AICommandSuggestion[]) {
  const componentTypes = commandComponentTypes(commands);
  const richTypes = componentTypes.filter((type) => RICH_COMPONENT_TYPES.has(type));
  return {
    selectedComponent: richTypes[0],
    richComponentUsed: richTypes.length > 0,
    fallbackComponent: richTypes[0] ?? componentTypes[0],
    adapterUsed: richTypes[0] ?? componentTypes[0],
  };
}

async function runWithConcurrency<T>(items: T[], concurrency: number, worker: (item: T) => Promise<void>): Promise<void> {
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const item = items[nextIndex++];
        if (item) await worker(item);
      }
    }),
  );
}

// ── POST /api/ai/generate-page ──────────────────────────────────────────

aiRouter.post("/generate-page", async (req: Request, res: Response) => {
  const body = req.body as GeneratePageRequest;

  if (!body.prompt?.trim()) {
    res.status(400).json({ error: "prompt is required" });
    return;
  }

  logger.request("POST", "/api/ai/generate-page", body);
  logger.debug("REQUEST", "Received generate-page request", {
    promptLength: body.prompt.length,
    hasDesignTokens: !!body.designTokens && Object.keys(body.designTokens).length > 0,
    designTokens: body.designTokens,
    componentCount: body.availableComponents?.length ?? 0,
    manifestComponents: buildComponentCapabilityManifest(body.availableComponents ?? []).map((component) => component.type),
  });

  initSSE(res);

  const jobId = randomUUID();
  const startedAt = Date.now();
  const failedSections: Array<{ sectionId: string; index: number; error: string }> = [];
  let completed = 0;

  try {
    logger.jobEvent("started", { jobId, stage: "planner", status: "running" });
    sendSSE(res, "job_started", { jobId });

    const pagePlan = await generatePagePlan(body, jobId);
    const skeletonCommands = buildSkeletonCommands(pagePlan, body);
    const manifestComponents = buildComponentCapabilityManifest(body.availableComponents ?? []).map((component) => component.type);

    logger.jobEvent("plan_ready", {
      jobId,
      stage: "planner",
      status: "success",
      elapsedMs: Date.now() - startedAt,
      manifestComponents,
    });
    logger.response("plan_ready", {
      jobId,
      sectionCount: pagePlan.sections.length,
      sections: pagePlan.sections.map((section) => ({ id: section.id, type: section.type, title: section.title })),
    });

    sendSSE(res, "plan_ready", { jobId, plan: pagePlan, skeletonCommands });

    const maxAttempts = getPositiveIntEnv("AI_MAX_SECTION_ATTEMPTS", 2);
    const sectionConcurrency = getPositiveIntEnv("AI_SECTION_CONCURRENCY", 2);
    const prioritizedSections = [...pagePlan.sections].sort(
      (a, b) => sectionPriority(a.type) - sectionPriority(b.type) || a.index - b.index,
    );

    await runWithConcurrency(prioritizedSections, sectionConcurrency, async (section) => {
      const sectionStart = Date.now();
      logger.jobEvent("section_started", { jobId, sectionId: section.id, stage: "section", status: "running" });
      sendSSE(res, "section_started", { jobId, index: section.index, sectionId: section.id });

      let sectionDone = false;
      let lastError = "";
      let lastErrorKind = "unknown";

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const sectionPlan = await generateSectionPlan(
            pagePlan,
            section,
            body,
            attempt > 1 ? lastError : undefined,
          );
          const commands = compileSection(sectionPlan, section, pagePlan, body);
          if (commands.length === 0) {
            throw new Error("Compiler produced no valid commands");
          }

          const richSummary = richCommandSummary(commands);
          completed++;
          sectionDone = true;
          logger.jobEvent("section_ready", {
            jobId,
            sectionId: section.id,
            attempt,
            stage: "section",
            status: "success",
            elapsedMs: Date.now() - sectionStart,
            sectionType: section.type,
            preferredComponents: sectionPlan.preferredComponents,
            componentIntents: sectionPlan.componentIntents?.map((intent) => `${intent.role}:${intent.componentType}`),
            selectedComponent: richSummary.selectedComponent,
            adapterUsed: richSummary.adapterUsed,
            richComponentUsed: richSummary.richComponentUsed,
            mediaItemCount: sectionPlan.mediaItems?.length ?? 0,
          });
          sendSSE(res, "section_ready", {
            jobId,
            index: section.index,
            sectionId: section.id,
            commands,
          });
          break;
        } catch (err) {
          const classified = classifyAIError(err);
          lastError = classified.message;
          lastErrorKind = classified.kind;
          logger.jobEvent("section_error", {
            jobId,
            sectionId: section.id,
            attempt,
            stage: "section",
            status: classified.retryable && attempt < maxAttempts ? "retryable_error" : "fallback",
            errorCode: classified.kind,
          });
          if (attempt < maxAttempts && classified.retryable) {
            sendSSE(res, "section_retrying", {
              jobId,
              index: section.index,
              sectionId: section.id,
              attempt: attempt + 1,
              reason: lastError,
            });
          } else {
            break;
          }
        }
      }

      if (!sectionDone) {
        const fallbackCommands = compileFallbackSection(section, pagePlan, body);
        const richSummary = richCommandSummary(fallbackCommands);
        failedSections.push({ sectionId: section.id, index: section.index, error: lastError || "Section generation failed" });
        logger.jobEvent("section_failed", {
          jobId,
          sectionId: section.id,
          stage: "section",
          status: "fallback",
          fallbackUsed: fallbackCommands.length > 0,
          elapsedMs: Date.now() - sectionStart,
          errorCode: lastErrorKind,
          sectionType: section.type,
          fallbackComponent: richSummary.fallbackComponent,
          fallbackReason: lastError || "Section generation failed",
          adapterUsed: richSummary.adapterUsed,
          adapterFallbackReason: lastError || "Section generation failed",
          richComponentUsed: richSummary.richComponentUsed,
        });
        sendSSE(res, "section_failed", {
          jobId,
          index: section.index,
          sectionId: section.id,
          error: lastError || "Section generation failed",
          fallbackCommands,
        });
      }
    });

    const status = failedSections.length === 0 ? "success" : completed > 0 ? "partial" : "failed";
    logger.jobEvent("complete", {
      jobId,
      stage: "complete",
      status,
      elapsedMs: Date.now() - startedAt,
      fallbackUsed: failedSections.length > 0,
    });
    sendSSE(res, "complete", {
      jobId,
      status,
      completed,
      failed: failedSections.length,
      failedSections,
    });
    res.end();
  } catch (err) {
    console.error("[AI] generate-page fatal error:", err);
    logger.jobEvent("fatal_error", {
      jobId,
      stage: "planner",
      status: "failed",
      elapsedMs: Date.now() - startedAt,
      errorCode: err instanceof Error ? err.message.slice(0, 120) : String(err).slice(0, 120),
    });
    sendSSE(res, "error", {
      jobId,
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

function buildFullPageChatFallback(body: ChatRequest): { message: string; commands: AICommandSuggestion[] } {
  const prompt = body.messages.filter((message) => message.role === "user").at(-1)?.content ?? "Generate a full page";
  const jobId = `chat-${randomUUID().slice(0, 8)}`;
  const request: GeneratePageRequest = {
    prompt,
    fullPageMode: true,
    rootNodeId: body.builderContext.document.rootNodeId,
    availableComponents: body.builderContext.availableComponents,
    availablePresets: body.builderContext.availablePresets,
    availablePresetsCompact: body.builderContext.availablePresetsCompact,
    nestingRules: body.builderContext.nestingRules,
    designTokens: body.builderContext.designTokens,
    pageNodes: body.builderContext.pageNodes,
  };
  const pagePlan = buildDeterministicPagePlan(request, jobId);
  const commands = [
    ...buildSkeletonCommands(pagePlan, request),
    ...pagePlan.sections.flatMap((section) => compileFallbackSection(section, pagePlan, request)),
  ];

  return {
    message: "The AI provider timed out, so a deterministic full-page fallback was generated instead.",
    commands,
  };
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

    logger.systemMessage(systemContent);
    logger.debug("CHAT_CONTEXT", "Chat request context", {
      documentName: body.builderContext.document.name,
      nodeCount: body.builderContext.document.nodeCount,
      fullPageMode: body.builderContext.fullPageMode ?? false,
      messageCount: body.messages.length,
      lastUserMessage: body.messages.filter((m) => m.role === "user").at(-1)?.content?.slice(0, 100),
    });

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
    let commands = Array.isArray(obj.commands)
      ? obj.commands.filter(
          (c): c is AICommandSuggestion =>
            typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string"
        )
      : [];

    // Handle fullPageMode: prepend REMOVE_NODE commands for all children of root
    if (body.builderContext.fullPageMode) {
      logger.debug("FULL_PAGE_MODE", "fullPageMode is enabled", {
        hasPageNodes: !!body.builderContext.pageNodes,
        nodeCount: body.builderContext.pageNodes ? Object.keys(body.builderContext.pageNodes).length : 0,
        rootNodeId: body.builderContext.document.rootNodeId
      });

      if (body.builderContext.pageNodes) {
        const rootNodeId = body.builderContext.document.rootNodeId;
        const childrenToRemove = Object.values(body.builderContext.pageNodes).filter(
          (node) => node.parentId === rootNodeId
        );

        if (childrenToRemove.length > 0) {
          const removeCommands: AICommandSuggestion[] = childrenToRemove.map((node) => ({
            type: "REMOVE_NODE",
            payload: { nodeId: node.id },
            description: `Remove ${node.type} node`,
          }));

          logger.decision(
            "FULL_PAGE_MODE",
            `Clearing ${childrenToRemove.length} existing nodes from root before generating new content`,
            {
              nodeIds: childrenToRemove.map((n) => n.id),
              nodeTypes: childrenToRemove.map((n) => n.type),
              aiCommandsCount: commands.length,
              totalCommandsAfterClear: removeCommands.length + commands.length
            }
          );

          commands = [...removeCommands, ...commands];
        } else {
          logger.debug("FULL_PAGE_MODE", "No children to remove under root node", { rootNodeId });
        }
      } else {
        logger.debug("FULL_PAGE_MODE", "fullPageMode enabled but no pageNodes available", {
          hasPageNodes: false
        });
      }
    }

    res.json({ message: obj.message ?? "", commands });
  } catch (err) {
    console.error("[AI] chat error:", err);
    if (body.builderContext?.fullPageMode) {
      const fallback = buildFullPageChatFallback(body);
      res.json(fallback);
      return;
    }
    res.status(500).json({
      error: err instanceof Error ? err.message : "Internal server error",
    });
  }
});

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
import {
  buildContractsByType,
  buildSkeletonCommands,
  compileFallbackSection,
  compileSectionWithMeta,
  validateCompiledCommandsWithReport,
  type DroppedCommand,
} from "../services/section-plan-compiler.js";
import { callLLM, callLLMStream } from "../services/llm-client.js";
import { JobAccountant } from "../services/llm-accounting.js";
import {
  runQualityGate,
  partitionByMode,
  resolveGateMode,
} from "../services/quality-gate.js";
import { resolveLocale } from "../services/section-plan-compiler.js";
import { initSSE, sendSSE } from "../services/sse.js";
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
  const accountant = new JobAccountant();
  const failedSections: Array<{ sectionId: string; index: number; error: string }> = [];
  let completed = 0;

  // Quality gate (roadmap 02/04): job-level heading registry for cross-section
  // duplicate detection; locale drives the wrong_language check.
  const gateMode = resolveGateMode();
  const seenHeadings = new Map<string, string>();
  let qualityWarningCount = 0;

  try {
    logger.jobEvent("started", { jobId, stage: "planner", status: "running" });
    sendSSE(res, "job_started", { jobId });

    const pagePlan = await generatePagePlan(body, jobId, accountant);
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
            accountant,
          );
          const { commands, presetUsed, variantUsed } = compileSectionWithMeta(sectionPlan, section, pagePlan, body);
          if (commands.length === 0) {
            throw new Error("Compiler produced no valid commands");
          }

          // Quality gate — deterministic content checks (roadmap 02/04).
          const gateLocale = resolveLocale(body, pagePlan.brief);
          const issues = runQualityGate(commands, body.designTokens ?? {}, {
            locale: gateLocale,
            seenHeadings,
          });
          const { blocking, warnings } = partitionByMode(issues, gateMode);
          if (blocking.length > 0) {
            // Treat as a retryable section error so the existing retry-with-hint
            // loop rewrites it; exhausted attempts fall through to fallback pack.
            const err = new Error(
              `Quality gate blocked section: ${blocking.map((i) => `${i.code} (${i.detail})`).join("; ")}`,
            );
            (err as { qualityBlock?: boolean }).qualityBlock = true;
            throw err;
          }
          if (warnings.length > 0) qualityWarningCount += warnings.length;

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
            qualityWarnings: warnings.length || undefined,
            presetUsed: presetUsed.length > 0 ? presetUsed : undefined,
            variantUsed: variantUsed || undefined,
          });
          sendSSE(res, "section_ready", {
            jobId,
            index: section.index,
            sectionId: section.id,
            commands,
            qualityWarnings: warnings.length > 0 ? warnings : undefined,
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
        // Run the gate on the fallback in exempt mode: blocks are downgraded to
        // warnings so a bad pack can never leave a section empty, but a genuinely
        // dirty pack still surfaces in logs for the maintainer to fix.
        const fallbackGateLocale = resolveLocale(body, pagePlan.brief);
        const fallbackIssues = runQualityGate(fallbackCommands, body.designTokens ?? {}, {
          locale: fallbackGateLocale,
          exemptBlock: true,
        });
        if (fallbackIssues.length > 0) {
          qualityWarningCount += fallbackIssues.length;
          logger.decision("QUALITY_GATE_FALLBACK", "Fallback section has quality issues", {
            sectionId: section.id,
            issues: fallbackIssues.map((i) => `${i.code}:${i.detail}`),
          });
        }
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
    const usage = accountant.summary();
    logger.jobEvent("complete", {
      jobId,
      stage: "complete",
      status,
      elapsedMs: Date.now() - startedAt,
      fallbackUsed: failedSections.length > 0,
      llmCalls: usage.llmCalls,
      totalInputTokens: usage.totalInputTokens,
      totalOutputTokens: usage.totalOutputTokens,
      cacheHitTokens: usage.cacheReadTokens,
      estimatedCostUsd: usage.estimatedCostUsd,
      usageIncomplete: usage.usageIncomplete,
      usageByStage: usage.byStage,
      qualityWarnings: qualityWarningCount || undefined,
      qualityGateMode: gateMode,
    });
    sendSSE(res, "complete", {
      jobId,
      status,
      completed,
      failed: failedSections.length,
      failedSections,
      // Cost summary is opt-in for the client (avoid surprising the UI); it can
      // surface "~$0.04, 12 calls" when AI_EXPOSE_COST=true.
      ...(process.env.AI_EXPOSE_COST === "true"
        ? {
            usage: {
              llmCalls: usage.llmCalls,
              totalInputTokens: usage.totalInputTokens,
              totalOutputTokens: usage.totalOutputTokens,
              estimatedCostUsd: usage.estimatedCostUsd,
            },
          }
        : {}),
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

export function buildChatSystemPrompt(ctx: ChatRequest["builderContext"]): string {
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

  // Popups (roadmap 00/03): only rendered when the document actually has popups, so we never
  // waste tokens on an empty section and never invite the model to invent a popup id.
  const activeSurfaceLine =
    ctx.activeSurface?.type === "popup"
      ? `- Active surface: editing popup "${ctx.activeSurface.popupId}" (${ctx.activeSurface.selection ?? "content"}), rootId: "${ctx.activeSurface.rootNodeId}". New nodes you add should use this rootId as their top-level parentId, not the page root.`
      : `- Active surface: page (rootId: "${ctx.document.rootNodeId}")`;
  const popupsBlock =
    ctx.availablePopups && ctx.availablePopups.length > 0
      ? `\n## Popups\n${activeSurfaceLine}\nAvailable popups (use these ids as the targetId for showModal/hideModal interactions — never invent an id):\n${ctx.availablePopups
          .map(
            (p) =>
              `  - id: "${p.id}", name: "${p.name}", kind: ${p.kind}, enabled: ${p.enabled}, autoTrigger: ${p.autoTrigger}`,
          )
          .join("\n")}\n`
      : "";

  return `You are an AI assistant for a visual web page builder called Redprint. Help users build, modify, and improve their web page designs by generating precise builder commands.

## Current Builder State
- Document: "${ctx.document.name}" (${ctx.document.nodeCount} nodes, rootId: "${ctx.document.rootNodeId}")
- Active breakpoint: ${ctx.activeBreakpoint}
${selectedNodeBlock}

## Available Components
${componentList}

## Component Hierarchy
${nestingRules}${pageContextBlock}${presetsBlock}${designTokensBlock}${popupsBlock}
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

    const rawText = await callLLM(messages, { jsonMode: true, stage: "chat" });

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

    // ── Validation gate ──────────────────────────────────────────────────
    // The chat path previously shipped raw LLM commands. Route them through the
    // same validator/repair as generate-page, and report (not silent-drop) any
    // rejected ADD_NODE commands so the client can surface them.
    const ctx = body.builderContext;
    const availableTypes = new Set(ctx.availableComponents.map((c) => c.type));
    const contractsByType = buildContractsByType(ctx.availableComponents);
    // initial valid parents: the root node + every existing node in the current page.
    const initialParentIds = new Set<string>([ctx.document.rootNodeId]);
    const initialParentTypes = new Map<string, string>();
    if (ctx.pageNodes) {
      for (const [id, node] of Object.entries(ctx.pageNodes)) {
        initialParentIds.add(id);
        initialParentTypes.set(id, node.type);
      }
    }

    const { valid, dropped } = validateCompiledCommandsWithReport(
      commands,
      availableTypes,
      initialParentIds,
      contractsByType,
      initialParentTypes,
    );
    commands = valid;

    // Repair loop (1 retry)
    let finalDropped = dropped;
    if (dropped.length > 0) {
      logger.decision("CHAT_VALIDATION", `Dropped ${dropped.length} invalid AI command(s), attempting repair`, {
        dropped,
        kept: commands.length,
      });
      const { repairedValid, stillDropped } = await repairDroppedCommands(
        messages,
        dropped,
        availableTypes,
        contractsByType,
        initialParentIds,
        initialParentTypes,
      );
      commands = [...commands, ...repairedValid];
      finalDropped = stillDropped;
    }

    // Quality gate (roadmap 02/04) — scoped to the commands this turn produces
    // (chat edits a few nodes, not the whole page). No locale check here: the
    // chat prompt already enforces "respond in the user's language". Both block
    // and warn issues are surfaced to the client (chat is a single-turn edit;
    // we don't force a content re-ask), so the UI can flag them.
    const qualityIssues = runQualityGate(commands, ctx.designTokens ?? {});
    if (qualityIssues.length > 0) {
      logger.decision("CHAT_QUALITY_GATE", `Chat commands have ${qualityIssues.length} quality issue(s)`, {
        issues: qualityIssues.map((i) => `${i.code}:${i.detail}`),
      });
    }

    res.json({
      message: obj.message ?? "",
      commands,
      ...(finalDropped.length > 0 ? { droppedCommands: finalDropped } : {}),
      ...(qualityIssues.length > 0 ? { qualityWarnings: qualityIssues } : {}),
    });
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

// ── Repair helper ────────────────────────────────────────────────────────

const REPAIR_HINTS: Record<string, (cmd: DroppedCommand, ctx: { availableTypes: Set<string>; contractsByType: Map<string, import("../services/component-contract-resolver.js").ComponentContract> }) => string> = {
  unknown_type: (_cmd, ctx) =>
    `Use only these types: ${[...ctx.availableTypes].join(", ")}`,
  leaf_parent: (cmd) =>
    `Component ${cmd.componentType ?? "unknown"} cannot have children. Choose a container type (e.g. Section, Column) as parent.`,
  missing_required_props: (cmd, ctx) => {
    const contract = cmd.componentType ? ctx.contractsByType.get(cmd.componentType) : undefined;
    const required = contract?.requiredProps.map((p) => p.key) ?? [];
    return `Required props missing: ${required.join(", ") || "check contract"}`;
  },
  invalid_props: (cmd, ctx) => {
    const contract = cmd.componentType ? ctx.contractsByType.get(cmd.componentType) : undefined;
    const required = contract?.requiredProps.map((p) => p.key) ?? [];
    return `Required props missing: ${required.join(", ") || "check contract"}`;
  },
  invalid_enum: () => "Use only the allowed enum values listed in the component schema.",
  orphan_parent: () => "Parent node id does not exist in the page. Use an existing node id as parent.",
  duplicate_id: () => "Node id already exists. Generate a unique id.",
  missing_fields: () => "Command is missing required fields: type, payload, nodeId, componentType, parentId.",
};

async function repairDroppedCommands(
  originalMessages: import("../types/ai.types.js").LLMMessage[],
  dropped: DroppedCommand[],
  availableTypes: Set<string>,
  contractsByType: Map<string, import("../services/component-contract-resolver.js").ComponentContract>,
  initialParentIds: Set<string>,
  initialParentTypes: Map<string, string>,
): Promise<{ repairedValid: AICommandSuggestion[]; stillDropped: DroppedCommand[] }> {
  const ctx = { availableTypes, contractsByType };

  const errorLines = dropped.map((cmd) => {
    const hint = REPAIR_HINTS[cmd.reason]?.(cmd, ctx) ?? "Invalid command.";
    return `- ${cmd.type}${cmd.componentType ? ` (${cmd.componentType})` : ""} → reason: ${cmd.reason}. Fix: ${hint}`;
  });

  const repairMessages: import("../types/ai.types.js").LLMMessage[] = [
    ...originalMessages,
    {
      role: "assistant" as const,
      content: "(previous response with validation errors)",
    },
    {
      role: "user" as const,
      content: `The following commands were rejected by the validator:\n${errorLines.join("\n")}\n\nPlease rewrite ONLY the rejected commands to fix them. Return ONLY the corrected commands as JSON: { "commands": [...] }`,
    },
  ];

  let repairText: string;
  try {
    repairText = await callLLM(repairMessages, { jsonMode: true, stage: "repair" });
  } catch (err) {
    logger.decision("REPAIR_FAILED", "Repair LLM call failed", { error: String(err) });
    return { repairedValid: [], stillDropped: dropped };
  }

  let repairParsed: unknown;
  try {
    repairParsed = JSON.parse(repairText);
  } catch {
    const start = repairText.indexOf("{");
    repairParsed = start >= 0 ? JSON.parse(repairText.slice(start)) : { commands: [] };
  }

  const repairedCandidates = Array.isArray((repairParsed as Record<string, unknown>).commands)
    ? ((repairParsed as { commands: unknown[] }).commands).filter(
        (c): c is AICommandSuggestion =>
          typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string",
      )
    : [];

  const { valid: repairedValid, dropped: stillDropped } = validateCompiledCommandsWithReport(
    repairedCandidates,
    availableTypes,
    initialParentIds,
    contractsByType,
    initialParentTypes,
  );

  logger.decision("REPAIR_ATTEMPT", `Repair: ${dropped.length} dropped → ${repairedValid.length} recovered, ${stillDropped.length} still invalid`, {
    recovered: repairedValid.length,
    stillDropped: stillDropped.length,
  });

  return { repairedValid, stillDropped };
}

// ── POST /api/ai/chat/stream ──────────────────────────────────────────────

aiRouter.post("/chat/stream", async (req: Request, res: Response) => {
  const body = req.body as ChatRequest;

  if (!body.messages?.length) {
    res.status(400).json({ error: "messages array is required" });
    return;
  }

  initSSE(res);

  try {
    const systemContent = buildChatSystemPrompt(body.builderContext);

    logger.systemMessage(systemContent);
    logger.debug("CHAT_STREAM_CONTEXT", "Chat stream request context", {
      documentName: body.builderContext.document.name,
      nodeCount: body.builderContext.document.nodeCount,
      fullPageMode: body.builderContext.fullPageMode ?? false,
      messageCount: body.messages.length,
    });

    const messages = [
      { role: "system" as const, content: systemContent },
      ...body.messages.filter((m) => m.role !== "system"),
    ];

    // Stream tokens to client as they arrive
    const rawText = await callLLMStream(messages, (delta) => {
      sendSSE(res, "token", { delta });
    }, { jsonMode: true, stage: "chat" });

    // Parse accumulated response
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
            typeof c === "object" && c !== null && typeof (c as Record<string, unknown>).type === "string",
        )
      : [];

    // fullPageMode: prepend REMOVE_NODE for root children
    if (body.builderContext.fullPageMode && body.builderContext.pageNodes) {
      const rootNodeId = body.builderContext.document.rootNodeId;
      const childrenToRemove = Object.values(body.builderContext.pageNodes).filter(
        (node) => node.parentId === rootNodeId,
      );
      if (childrenToRemove.length > 0) {
        const removeCommands: AICommandSuggestion[] = childrenToRemove.map((node) => ({
          type: "REMOVE_NODE",
          payload: { nodeId: node.id },
          description: `Remove ${node.type} node`,
        }));
        commands = [...removeCommands, ...commands];
      }
    }

    // Validation gate
    const ctx = body.builderContext;
    const availableTypes = new Set(ctx.availableComponents.map((c) => c.type));
    const contractsByType = buildContractsByType(ctx.availableComponents);
    const initialParentIds = new Set<string>([ctx.document.rootNodeId]);
    const initialParentTypes = new Map<string, string>();
    if (ctx.pageNodes) {
      for (const [id, node] of Object.entries(ctx.pageNodes)) {
        initialParentIds.add(id);
        initialParentTypes.set(id, node.type);
      }
    }

    const { valid, dropped } = validateCompiledCommandsWithReport(
      commands,
      availableTypes,
      initialParentIds,
      contractsByType,
      initialParentTypes,
    );
    commands = valid;

    // Repair loop (1 retry)
    let finalDropped = dropped;
    if (dropped.length > 0) {
      logger.decision("CHAT_STREAM_VALIDATION", `Dropped ${dropped.length} invalid command(s), attempting repair`, { dropped });
      const { repairedValid, stillDropped } = await repairDroppedCommands(
        messages,
        dropped,
        availableTypes,
        contractsByType,
        initialParentIds,
        initialParentTypes,
      );
      commands = [...commands, ...repairedValid];
      finalDropped = stillDropped;
    }

    // Quality gate (roadmap 02/04) — scoped to this turn's commands; surfaced to
    // the client (both block + warn) rather than triggering a content re-ask.
    const qualityIssues = runQualityGate(commands, ctx.designTokens ?? {});
    if (qualityIssues.length > 0) {
      logger.decision("CHAT_STREAM_QUALITY_GATE", `Chat commands have ${qualityIssues.length} quality issue(s)`, {
        issues: qualityIssues.map((i) => `${i.code}:${i.detail}`),
      });
    }

    sendSSE(res, "complete", {
      message: obj.message ?? "",
      commands,
      ...(finalDropped.length > 0 ? { droppedCommands: finalDropped } : {}),
      ...(qualityIssues.length > 0 ? { qualityWarnings: qualityIssues } : {}),
    });
    res.end();
  } catch (err) {
    console.error("[AI] chat/stream error:", err);
    sendSSE(res, "error", { error: err instanceof Error ? err.message : "Internal server error" });
    res.end();
  }
});

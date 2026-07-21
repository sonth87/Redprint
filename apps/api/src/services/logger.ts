/**
 * Logger service — Configurable logging for AI pipeline debugging.
 *
 * Enable via: AI_DEBUG=true in .env
 * Controls: Request logging, prompt inspection, decision tracking
 */

const DEBUG = process.env.AI_DEBUG === "true";
const PROMPT_DEBUG = process.env.AI_PROMPT_DEBUG === "true";

function safePreview(value: unknown): unknown {
  if (!value || typeof value !== "object") return value;
  const clone = JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  if (typeof clone.prompt === "string") clone.prompt = `${clone.prompt.slice(0, 120)}${clone.prompt.length > 120 ? "…" : ""}`;
  if (typeof clone.messages === "object") clone.messages = "[redacted]";
  if (typeof clone.LLM_API_KEY === "string") clone.LLM_API_KEY = "[redacted]";
  return clone;
}

export const logger = {
  debug: (section: string, message: string, data?: unknown) => {
    if (!DEBUG) return;
    console.log(
      `\n[${"═".repeat(50)}]`,
      `\n[${section.toUpperCase()}] ${message}`,
      data ? `\n${JSON.stringify(data, null, 2)}` : "",
      `\n[${"═".repeat(50)}]`
    );
  },

  request: (method: string, path: string, body: unknown) => {
    if (!DEBUG) return;
    console.log(`\n[REQUEST] ${method} ${path}`);
    console.log(`Body:`, JSON.stringify(safePreview(body), null, 2));
  },

  designTokens: (tokens: Record<string, unknown>) => {
    if (!DEBUG) return;
    console.log(`\n[DESIGN_TOKENS]`);
    console.log(JSON.stringify(tokens, null, 2));
  },

  prompt: (title: string, prompt: string) => {
    if (!DEBUG) return;
    console.log(`\n[PROMPT: ${title}]`);
    console.log(PROMPT_DEBUG ? prompt : `${prompt.slice(0, 500)}${prompt.length > 500 ? "\n[truncated: enable AI_PROMPT_DEBUG=true for full prompt]" : ""}`);
    console.log(`\n[PROMPT_LENGTH: ${prompt.length} chars]`);
  },

  systemMessage: (message: string) => {
    if (!DEBUG) return;
    console.log(`\n[SYSTEM_MESSAGE]`);
    console.log(PROMPT_DEBUG ? message : `${message.slice(0, 500)}${message.length > 500 ? "\n[truncated: enable AI_PROMPT_DEBUG=true for full system prompt]" : ""}`);
    console.log(`\n[MESSAGE_LENGTH: ${message.length} chars]`);
  },

  response: (event: string, data: unknown) => {
    if (!DEBUG) return;
    console.log(`\n[RESPONSE: ${event}]`);
    console.log(JSON.stringify(data, null, 2));
  },

  decision: (stage: string, decision: string, context?: unknown) => {
    if (!DEBUG) return;
    console.log(`\n[DECISION: ${stage}] ${decision}`);
    if (context) console.log(JSON.stringify(context, null, 2));
  },

  section: (index: number, sectionType: string, tone?: string, layoutHint?: string) => {
    if (!DEBUG) return;
    console.log(`\n[SECTION #${index}] type=${sectionType} tone=${tone} layout=${layoutHint}`);
  },

  jobEvent: (
    event: string,
    data: {
      jobId?: string;
      sectionId?: string;
      attempt?: number;
      stage?: string;
      elapsedMs?: number;
      provider?: string;
      status?: string;
      errorCode?: string;
      fallbackUsed?: boolean;
      manifestComponents?: string[];
      sectionType?: string;
      preferredComponents?: string[];
      selectedComponent?: string;
      fallbackComponent?: string;
      fallbackReason?: string;
      richComponentUsed?: boolean;
      mediaItemCount?: number;
      validationErrorCode?: string;
      contractComponents?: string[];
      componentIntents?: string[];
      adapterUsed?: string;
      adapterFallbackReason?: string;
      propValidationErrors?: string[];
      contractSource?: string;
      // Cost/observability (roadmap 02/08) — populated on the "complete" event.
      llmCalls?: number;
      totalInputTokens?: number;
      totalOutputTokens?: number;
      cacheHitTokens?: number;
      estimatedCostUsd?: number | null;
      usageIncomplete?: boolean;
      usageByStage?: Record<string, { calls: number; inputTokens: number; outputTokens: number }>;
      // Quality gate (roadmap 02/04).
      qualityWarnings?: number;
      qualityGateMode?: string;
      // Preset-first compile (roadmap 02/01).
      presetUsed?: string[];
      // Layout variety (roadmap 02/05).
      variantUsed?: string;
      // Media pipeline (roadmap 02/06).
      imageProvider?: string;
      imageCount?: number;
    },
  ) => {
    if (!DEBUG) return;
    console.log(`\n[AI_JOB:${event}]`);
    console.log(JSON.stringify(data, null, 2));
  },

  error: (stage: string, error: unknown) => {
    console.error(`\n[ERROR: ${stage}]`);
    console.error(error);
  },

  isEnabled: () => DEBUG,
};

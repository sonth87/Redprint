/**
 * Logger service — Configurable logging for AI pipeline debugging.
 *
 * Enable via: AI_DEBUG=true in .env
 * Controls: Request logging, prompt inspection, decision tracking
 */

const DEBUG = process.env.AI_DEBUG === "true";

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
    console.log(`Body:`, JSON.stringify(body, null, 2));
  },

  designTokens: (tokens: Record<string, unknown>) => {
    if (!DEBUG) return;
    console.log(`\n[DESIGN_TOKENS]`);
    console.log(JSON.stringify(tokens, null, 2));
  },

  prompt: (title: string, prompt: string) => {
    if (!DEBUG) return;
    console.log(`\n[PROMPT: ${title}]`);
    console.log(prompt);
    console.log(`\n[PROMPT_LENGTH: ${prompt.length} chars]`);
  },

  systemMessage: (message: string) => {
    if (!DEBUG) return;
    console.log(`\n[SYSTEM_MESSAGE]`);
    console.log(message);
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

  error: (stage: string, error: unknown) => {
    console.error(`\n[ERROR: ${stage}]`);
    console.error(error);
  },

  isEnabled: () => DEBUG,
};

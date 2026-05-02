/**
 * AIService — dispatches AI requests to the backend server (apps/api).
 *
 * All provider logic (OpenAI / Gemini / Claude) and API keys now live in the
 * backend. The client only needs to know the backend URL.
 *
 * Response format (from /api/ai/chat):
 *   { "message": "...", "commands": [...] }
 */
import type {
  AIConfig,
  AIMessage,
  AIBuilderContext,
  AIResponse,
  AIStreamCallbacks,
  AICommandSuggestion,
} from "./types";

// ── Response parser ────────────────────────────────────────────────────────

function extractFirstJSON(text: string): string | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

function parseCommandsFromObject(obj: Record<string, unknown>): { message: string; suggestions: AICommandSuggestion[] | undefined } {
  const message = typeof obj.message === "string" ? obj.message : "";
  const commandsRaw = Array.isArray(obj.commands) ? obj.commands : [];

  const suggestions = (commandsRaw as unknown[])
    .map((c, idx) => {
      if (!c || typeof c !== "object") {
        console.warn(`[parseAIResponse] Command ${idx} is not an object:`, typeof c);
        return null;
      }
      const cmd = c as Record<string, unknown>;
      const cmdType =
        (cmd.type as string) ||
        (typeof cmd.payload === "object" && cmd.payload
          ? ((cmd.payload as Record<string, unknown>).type as string)
          : undefined);
      if (!cmdType) {
        console.warn(`[parseAIResponse] Command ${idx} has no type field:`, Object.keys(cmd));
        return null;
      }
      return {
        type: cmdType,
        payload: (cmd.payload as Record<string, unknown>) ?? {},
        description: (cmd.description as string) || cmdType,
      };
    })
    .filter((s): s is AICommandSuggestion => s !== null);

  return { message, suggestions: suggestions.length > 0 ? suggestions : undefined };
}

export function parseAIResponse(text: string): AIResponse {
  const trimmed = text.trim();
  if (!trimmed) return { message: "" };

  // Attempt 1: Direct JSON.parse
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
      if (suggestions || message) return { message, suggestions };
    }
  } catch { /* fall through */ }

  // Attempt 2: Balanced bracket extraction
  const extracted = extractFirstJSON(trimmed);
  if (extracted && extracted !== trimmed) {
    try {
      const parsed = JSON.parse(extracted) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
        if (suggestions || message) return { message, suggestions };
      }
    } catch { /* fall through */ }
  }

  // Attempt 3: ```json ... ``` code block
  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
        if (suggestions || message) return { message, suggestions };
      }
    } catch { /* ignore */ }
  }

  return { message: trimmed };
}

// ── SSE stream reader helper ─────────────────────────────────────────────

async function readSSEStream(
  response: Response,
  onLine: (line: string) => void,
): Promise<void> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      onLine(line);
    }
  }
  if (buffer) onLine(buffer);
}

// ── Backend adapter ──────────────────────────────────────────────────────

function getBackendUrl(config: AIConfig): string {
  return config.backendUrl?.replace(/\/$/, "") || "http://localhost:3002";
}

/**
 * Send a chat message to the backend /api/ai/chat endpoint.
 * Returns parsed AIResponse (message + command suggestions).
 *
 * The backend owns the system prompt — the client sends only user/assistant messages
 * plus the builder context. This eliminates the ~900-token command reference from
 * the request payload (Phase 1A).
 */
export async function sendAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
): Promise<AIResponse> {
  const backendUrl = getBackendUrl(config);

  const payload = {
    // Filter out any legacy system messages — the backend builds its own.
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content })),
    builderContext: {
      document: context.document,
      selectedNode: context.selectedNode,
      availableComponents: context.availableComponents,
      activeBreakpoint: context.activeBreakpoint,
      pageNodes: context.pageNodes,
      pageNodesSummary: context.pageNodesSummary,
      availablePresets: context.availablePresets,
      // Phase 1B–2A–3A fields — populated by later phases; backend falls back gracefully when absent.
      componentsManifest: context.componentsManifest,
      nestingRules: context.nestingRules,
      availablePresetsCompact: context.availablePresetsCompact,
      designTokens: context.designTokens,
      fullPageMode: context.fullPageMode,
    },
  };

  const res = await fetch(`${backendUrl}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI backend error ${res.status}: ${errText}`);
  }

  const data = await res.json() as { message?: string; commands?: AICommandSuggestion[] };
  return {
    message: data.message ?? "",
    suggestions: data.commands && data.commands.length > 0 ? data.commands : undefined,
  };
}

/**
 * Stream a chat message from the backend /api/ai/chat endpoint.
 * NOTE: The backend currently returns JSON (not token-by-token stream) for chat.
 * This wrapper simulates streaming by loading the full response then calling onComplete.
 * A future iteration can add true token streaming to the backend chat endpoint.
 */
export async function streamAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
  callbacks: AIStreamCallbacks,
): Promise<void> {
  try {
    const response = await sendAIMessage(messages, context, config);
    // Simulate stream: emit all text as one token, then complete
    const fullText = JSON.stringify({ message: response.message, commands: response.suggestions ?? [] });
    callbacks.onToken(fullText);
    callbacks.onComplete(fullText);
  } catch (err) {
    callbacks.onError(err instanceof Error ? err : new Error(String(err)));
  }
}

// ── Public helpers (kept for backward compat) ────────────────────────────

export function getAIAdapter(_provider: string) {
  return { name: "backend" };
}

export { readSSEStream };

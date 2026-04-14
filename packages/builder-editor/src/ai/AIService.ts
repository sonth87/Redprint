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

// ── System prompt builder (kept for backward compat / chat context) ──────

function buildSystemMessage(config: AIConfig, context: AIBuilderContext): string {
  const base =
    config.systemPrompt ||
    "You are an AI assistant for a visual web page builder called Redprint. Help users build, modify, and improve their web page designs by generating precise builder commands.";

  const componentList = context.availableComponents
    .map((c) => {
      const props = c.propSchema?.map((p) => `${p.key}(${p.type})`).join(", ") ?? "";
      return `  - ${c.type} [${c.category}]${props ? ` — props: ${props}` : ""}`;
    })
    .join("\n");

  const selectedNodeBlock = context.selectedNode
    ? `- Selected node: ${context.selectedNode.type} (id: "${context.selectedNode.id}", name: "${context.selectedNode.name ?? "unnamed"}")
  Props: ${JSON.stringify(context.selectedNode.props)}
  Style: ${JSON.stringify(context.selectedNode.style)}`
    : "- No node selected";

  const pageContextBlock = context.pageNodes
    ? `\n## Full Page Node Tree\nAll existing nodes with their real UUIDs — use these IDs in commands:\n${JSON.stringify(context.pageNodes, null, 2)}\n`
    : "";

  const presetsBlock = context.availablePresets
    ? `\n## Available Presets (Palette Catalog)\nWhen the user asks to add a specific element, prefer using these preset props/styles directly in ADD_NODE instead of bare defaults. Each item has an id, componentType, props, style, and optional tags.\n${context.availablePresets
        .map(
          (g) =>
            `### ${g.group}\n` +
            g.types
              .map(
                (t) =>
                  `#### ${t.type}\n` +
                  t.items
                    .map(
                      (item) =>
                        `  - id: "${item.id}", name: "${item.name}", componentType: "${item.componentType}"` +
                        (item.tags?.length ? `, tags: [${item.tags.join(", ")}]` : "") +
                        `\n    props: ${JSON.stringify(item.props)}` +
                        (item.style && Object.keys(item.style).length
                          ? `\n    style: ${JSON.stringify(item.style)}`
                          : ""),
                    )
                    .join("\n"),
              )
              .join("\n"),
        )
        .join("\n")}\n`
    : "";

  return `${base}

## Current Builder State
- Document: "${context.document.name}" (${context.document.nodeCount} nodes, rootId: "${context.document.rootNodeId}")
- Active breakpoint: ${context.activeBreakpoint}
${selectedNodeBlock}

## Available Components
${componentList}
${pageContextBlock}${presetsBlock}
## Command Reference

### ADD_NODE — Add a new component to the canvas
{ "type": "ADD_NODE", "payload": { "componentType": "ComponentType", "parentId": "root", "nodeId": "temp-unique-id", "props": {}, "style": {}, "responsiveStyle": { "mobile": { "flexDirection": "column" } }, "responsiveProps": { "mobile": { "label": "Short" } }, "responsiveHidden": { "tablet": true } } }
IMPORTANT:
- The payload field MUST be "componentType" (NOT "type").
- Use "root" as parentId for top-level sections/containers.
- To build NESTED layouts, assign a temporary "nodeId" (e.g. "temp-hero", "temp-grid-1") in each ADD_NODE, then use that same ID as "parentId" in child ADD_NODE commands. The system resolves all IDs to real UUIDs automatically.
- For RESPONSIVE DESIGN: Use "responsiveStyle", "responsiveProps", or "responsiveHidden" mapped by breakpoint ("desktop" | "tablet" | "mobile").

### UPDATE_STYLE — Update CSS styles on an existing node
{ "type": "UPDATE_STYLE", "payload": { "nodeId": "uuid", "style": { "backgroundColor": "#fff", "fontSize": "16px" } } }

### UPDATE_PROPS — Update component content/configuration
{ "type": "UPDATE_PROPS", "payload": { "nodeId": "uuid", "props": { "text": "content" } } }

### RENAME_NODE — Rename a node in the layers panel
{ "type": "RENAME_NODE", "payload": { "nodeId": "uuid", "name": "New Name" } }

### UPDATE_RESPONSIVE_STYLE — Update styles for a specific breakpoint
{ "type": "UPDATE_RESPONSIVE_STYLE", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile", "style": {} } }

### UPDATE_RESPONSIVE_PROPS — Update props for a specific breakpoint
{ "type": "UPDATE_RESPONSIVE_PROPS", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile", "props": {} } }

### TOGGLE_RESPONSIVE_HIDDEN — Hide/show a node on a specific breakpoint
{ "type": "TOGGLE_RESPONSIVE_HIDDEN", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile" } }

### RESET_RESPONSIVE_STYLE — Remove all breakpoint overrides and revert to base style
{ "type": "RESET_RESPONSIVE_STYLE", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile" } }

### DUPLICATE_NODE — Duplicate an existing node
{ "type": "DUPLICATE_NODE", "payload": { "nodeId": "uuid" } }

### UPDATE_CANVAS_CONFIG — Update canvas-level settings
{ "type": "UPDATE_CANVAS_CONFIG", "payload": { "config": {} } }

### UPDATE_INTERACTIONS — Update interaction/event handlers on a node
{ "type": "UPDATE_INTERACTIONS", "payload": { "nodeId": "uuid", "interactions": [] } }

## Component Hierarchy Rules
Container components (can have children): Section, Container, Grid, Column
Leaf components (no children): Text, Button, Image, Divider
Always build pages with proper nesting: Section → Column/Grid → leaf nodes.
Never place leaf nodes directly into root — wrap them in a Section or Container first.

## Output Format — CRITICAL
Respond with EXACTLY ONE JSON object. No markdown, no code blocks, no preamble, no trailing text.
{ "message": "Brief explanation of what you are doing", "commands": [ ... ] }
If there are no commands to execute: { "message": "...", "commands": [] }
For existing nodes, use real UUIDs from the context above. For NEW nodes, use temp IDs ("temp-xxx") and reference them as parentId in children.
Generate COMPLETE, RICH layouts — include multiple sections, proper typography, colors, spacing, and enough content to fill a real page. Do NOT generate just 1-2 nodes.
Always respond in the same language the user uses in their prompt.`;
}

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
 */
export async function sendAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
): Promise<AIResponse> {
  const systemContent = buildSystemMessage(config, context);
  const backendUrl = getBackendUrl(config);

  const payload = {
    messages: [
      { role: "system", content: systemContent },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ],
    builderContext: {
      document: context.document,
      selectedNode: context.selectedNode,
      availableComponents: context.availableComponents,
      activeBreakpoint: context.activeBreakpoint,
      pageNodes: context.pageNodes,
      availablePresets: context.availablePresets,
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

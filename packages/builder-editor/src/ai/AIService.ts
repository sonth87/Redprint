/**
 * AIService — manages AI conversations and dispatches to provider adapters.
 *
 * Supports OpenAI, Gemini, and Claude providers with both regular and
 * streaming (SSE) response modes.
 *
 * Response format: the AI is instructed to return a single JSON object:
 *   { "message": "...", "commands": [...] }
 * The parser also handles legacy markdown ```json blocks as a fallback.
 */
import type {
  AIConfig,
  AIMessage,
  AIBuilderContext,
  AIResponse,
  AIStreamCallbacks,
  AIProviderAdapter,
  AIProvider,
  AICommandSuggestion,
} from "./types";

// ── System prompt builder ───────────────────────────────────────────────

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
- For RESPONSIVE DESIGN: Use "responsiveStyle", "responsiveProps", or "responsiveHidden" mapped by breakpoint ("desktop" | "tablet" | "mobile"). E.g., stacking grids vertically on mobile by passing "responsiveStyle": { "mobile": { "gridTemplateColumns": "1fr" } } or changing a button's text via "responsiveProps": { "mobile": { "label": "Buy" } }.

### UPDATE_STYLE — Update CSS styles on an existing node
{ "type": "UPDATE_STYLE", "payload": { "nodeId": "uuid", "style": { "backgroundColor": "#fff", "fontSize": "16px" } } }

### UPDATE_PROPS — Update component content/configuration
{ "type": "UPDATE_PROPS", "payload": { "nodeId": "uuid", "props": { "text": "content" } } }

### RENAME_NODE — Rename a node in the layers panel
{ "type": "RENAME_NODE", "payload": { "nodeId": "uuid", "name": "New Name" } }

### UPDATE_RESPONSIVE_STYLE — Update styles for a specific breakpoint
{ "type": "UPDATE_RESPONSIVE_STYLE", "payload": { "nodeId": "uuid", "breakpoint": "desktop|tablet|mobile", "style": {} } }
IMPORTANT: Use UPDATE_STYLE for base styles (applied to all breakpoints). Use UPDATE_RESPONSIVE_STYLE only for breakpoint-specific overrides — they shallow-merge on top of the base style at render time.
Breakpoints: desktop (≥1024px), tablet (768–1023px), mobile (<768px).

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

## Style Properties Reference
backgroundColor, color, fontSize, fontWeight, fontFamily, lineHeight, textAlign, letterSpacing, textDecoration, textTransform,
padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
margin, marginTop, marginRight, marginBottom, marginLeft,
width, height, minWidth, minHeight, maxWidth, maxHeight,
display, flexDirection, alignItems, justifyContent, flexWrap, gap,
gridTemplateColumns, gridTemplateRows,
borderRadius, border, borderWidth, borderStyle, borderColor, boxShadow,
opacity, overflow, position, top, right, bottom, left, zIndex,
transform, transition, backgroundImage, backgroundSize, backgroundPosition, objectFit

## Layout Example — Product Landing Page
This shows the correct nested structure with temp IDs:
\`\`\`json
{
  "message": "Creating a product section with heading, image and CTA",
  "commands": [
    { "type": "ADD_NODE", "payload": { "componentType": "Section", "parentId": "root", "nodeId": "temp-hero", "props": { "minHeight": 600 }, "style": { "display": "flex", "flexDirection": "column", "alignItems": "center", "justifyContent": "center", "padding": "60px 20px", "backgroundColor": "#f9fafb" } } },
    { "type": "ADD_NODE", "payload": { "componentType": "Text", "parentId": "temp-hero", "props": { "text": "Welcome", "tag": "h1" }, "style": { "fontSize": "48px", "fontWeight": "700", "color": "#111827", "marginBottom": "16px", "textAlign": "center" } } },
    { "type": "ADD_NODE", "payload": { "componentType": "Text", "parentId": "temp-hero", "props": { "text": "Discover amazing products", "tag": "p" }, "style": { "fontSize": "18px", "color": "#6b7280", "textAlign": "center", "marginBottom": "32px" } } },
    { "type": "ADD_NODE", "payload": { "componentType": "Button", "parentId": "temp-hero", "props": { "label": "Shop Now", "variant": "primary", "size": "large" }, "style": { "backgroundColor": "#2563eb", "color": "#ffffff", "paddingLeft": "32px", "paddingRight": "32px", "borderRadius": "8px" } } },
    { "type": "RENAME_NODE", "payload": { "nodeId": "temp-hero", "name": "Hero Section" } }
  ]
}
\`\`\`

## Output Format — CRITICAL
Respond with EXACTLY ONE JSON object. No markdown, no code blocks, no preamble, no trailing text.
{ "message": "Brief explanation of what you are doing", "commands": [ ... ] }
If there are no commands to execute: { "message": "...", "commands": [] }
For existing nodes, use real UUIDs from the context above. For NEW nodes, use temp IDs ("temp-xxx") and reference them as parentId in children.
Generate COMPLETE, RICH layouts — include multiple sections, proper typography, colors, spacing, and enough content to fill a real page. Do NOT generate just 1-2 nodes.
Always respond in the same language the user uses in their prompt.`;
}

// ── Response parser ─────────────────────────────────────────────────────

/**
 * Extracts the first balanced JSON object from a string that may have
 * trailing garbage (e.g. Gemini appending ",\"opacity\":\"0.3\"}}" after
 * the valid payload). Handles escaped characters and string contents.
 */
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

  // ── Attempt 1: Direct JSON.parse of the full text ──────────────────────
  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
      console.log(`[parseAIResponse] Attempt 1 (direct) OK: ${suggestions?.length ?? 0} commands`);
      if (suggestions || message) return { message, suggestions };
    }
    if (Array.isArray(parsed)) {
      const suggestions = (parsed as unknown[])
        .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object" && "type" in (c as object))
        .map((c) => ({
          type: c.type as string,
          payload: (c.payload as Record<string, unknown>) ?? {},
          description: (c.description as string) || (c.type as string),
        }));
      return { message: "", suggestions: suggestions.length > 0 ? suggestions : undefined };
    }
  } catch {
    // fall through
  }

  // ── Attempt 2: Balanced bracket extraction (handles trailing garbage) ──
  const extracted = extractFirstJSON(trimmed);
  if (extracted && extracted !== trimmed) {
    try {
      const parsed = JSON.parse(extracted) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
        console.log(`[parseAIResponse] Attempt 2 (bracket-extract) OK: ${suggestions?.length ?? 0} commands`);
        if (suggestions || message) return { message, suggestions };
      }
    } catch {
      // fall through
    }
  }

  // ── Attempt 3: ```json ... ``` code block ──────────────────────────────
  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch?.[1]) {
    try {
      const parsed = JSON.parse(jsonMatch[1]) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const { message, suggestions } = parseCommandsFromObject(parsed as Record<string, unknown>);
        if (suggestions || message) return { message, suggestions };
      }
      if (Array.isArray(parsed)) {
        const suggestions = (parsed as unknown[])
          .filter((c): c is Record<string, unknown> => Boolean(c) && typeof c === "object" && "type" in (c as object))
          .map((c) => ({
            type: c.type as string,
            payload: (c.payload as Record<string, unknown>) ?? {},
            description: (c.description as string) || (c.type as string),
          }));
        const message = trimmed.replace(/```json[\s\S]*?```/g, "").trim();
        return { message, suggestions: suggestions.length > 0 ? suggestions : undefined };
      }
    } catch {
      // ignore
    }
  }

  // Pure text response — no commands
  return { message: trimmed };
}

// ── SSE stream reader helper ────────────────────────────────────────────

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
  // Flush remaining buffer
  if (buffer) onLine(buffer);
}

// ── OpenAI adapter ──────────────────────────────────────────────────────

const openaiAdapter: AIProviderAdapter = {
  name: "openai",

  async sendMessage(messages, context, config) {
    const systemMessage = buildSystemMessage(config, context);
    const apiMessages = [
      { role: "system" as const, content: systemMessage },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model || "gpt-5",
        messages: apiMessages,
        temperature: config.temperature ?? 0.7,
        max_tokens: config.maxTokens ?? 8192,
        response_format: { type: "json_object" },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI API error: ${response.status} — ${await response.text()}`);
    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return parseAIResponse(data.choices?.[0]?.message?.content ?? "");
  },

  async streamMessage(messages, context, config, callbacks) {
    const systemMessage = buildSystemMessage(config, context);
    const apiMessages = [
      { role: "system" as const, content: systemMessage },
      ...messages.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
    ];
    let response: Response;
    try {
      response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
        body: JSON.stringify({
          model: config.model || "gpt-5",
          messages: apiMessages,
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens ?? 8192,
          stream: true,
        }),
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!response.ok) {
      callbacks.onError(new Error(`OpenAI API error: ${response.status} — ${await response.text()}`));
      return;
    }
    let fullText = "";
    try {
      await readSSEStream(response, (line) => {
        if (!line.startsWith("data: ")) return;
        const data = line.slice(6).trim();
        if (data === "[DONE]") return;
        try {
          const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
          const token = parsed.choices?.[0]?.delta?.content ?? "";
          if (token) { fullText += token; callbacks.onToken(token); }
        } catch { /* skip malformed chunk */ }
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    callbacks.onComplete(fullText);
  },
};

// ── Gemini adapter ──────────────────────────────────────────────────────

const geminiAdapter: AIProviderAdapter = {
  name: "gemini",

  async sendMessage(messages, context, config) {
    const systemMessage = buildSystemMessage(config, context);
    const model = config.model || "gemini-3-flash-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${config.apiKey}`;
    const contents = [
      { role: "user", parts: [{ text: systemMessage }] },
      { role: "model", parts: [{ text: "Understood. I will respond with a single JSON object." }] },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: config.temperature ?? 0.7,
          maxOutputTokens: config.maxTokens ?? 8192,
          responseMimeType: "application/json",
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    });
    if (!response.ok) throw new Error(`Gemini API error: ${response.status} — ${await response.text()}`);
    const data = await response.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
    return parseAIResponse(data.candidates?.[0]?.content?.parts?.[0]?.text ?? "");
  },

  async streamMessage(messages, context, config, callbacks) {
    const systemMessage = buildSystemMessage(config, context);
    const model = config.model || "gemini-3-flash-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${config.apiKey}`;
    const contents = [
      { role: "user", parts: [{ text: systemMessage }] },
      { role: "model", parts: [{ text: "Understood. I will respond with a single JSON object." }] },
      ...messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
    ];
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: config.temperature ?? 0.7,
            maxOutputTokens: config.maxTokens ?? 8192,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!response.ok) {
      callbacks.onError(new Error(`Gemini API error: ${response.status} — ${await response.text()}`));
      return;
    }
    let fullText = "";
    try {
      await readSSEStream(response, (line) => {
        if (!line.startsWith("data: ")) return;
        const data = line.slice(6).trim();
        try {
          const parsed = JSON.parse(data) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
          const token = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
          if (token) { fullText += token; callbacks.onToken(token); }
        } catch { /* skip */ }
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    callbacks.onComplete(fullText);
  },
};

// ── Claude adapter ──────────────────────────────────────────────────────

const claudeAdapter: AIProviderAdapter = {
  name: "claude",

  async sendMessage(messages, context, config) {
    const systemMessage = buildSystemMessage(config, context);
    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: config.model || "claude-4-sonnet-20260215",
        max_tokens: config.maxTokens ?? 8192,
        system: systemMessage,
        messages: apiMessages,
      }),
    });
    if (!response.ok) throw new Error(`Claude API error: ${response.status} — ${await response.text()}`);
    const data = await response.json() as { content?: Array<{ text?: string }> };
    return parseAIResponse(data.content?.[0]?.text ?? "");
  },

  async streamMessage(messages, context, config, callbacks) {
    const systemMessage = buildSystemMessage(config, context);
    const apiMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));
    let response: Response;
    try {
      response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": config.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: config.model || "claude-4-sonnet-20260215",
          max_tokens: config.maxTokens ?? 8192,
          system: systemMessage,
          messages: apiMessages,
          stream: true,
        }),
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    if (!response.ok) {
      callbacks.onError(new Error(`Claude API error: ${response.status} — ${await response.text()}`));
      return;
    }
    let fullText = "";
    try {
      await readSSEStream(response, (line) => {
        if (!line.startsWith("data: ")) return;
        const data = line.slice(6).trim();
        try {
          const parsed = JSON.parse(data) as { type?: string; delta?: { type?: string; text?: string } };
          if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
            const token = parsed.delta.text ?? "";
            if (token) { fullText += token; callbacks.onToken(token); }
          }
        } catch { /* skip */ }
      });
    } catch (err) {
      callbacks.onError(err instanceof Error ? err : new Error(String(err)));
      return;
    }
    callbacks.onComplete(fullText);
  },
};

// ── Provider registry ───────────────────────────────────────────────────

const adapters: Record<AIProvider, AIProviderAdapter> = {
  openai: openaiAdapter,
  gemini: geminiAdapter,
  claude: claudeAdapter,
};

export function getAIAdapter(provider: AIProvider): AIProviderAdapter {
  return adapters[provider];
}

export async function sendAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
): Promise<AIResponse> {
  const adapter = adapters[config.provider];
  if (!adapter) throw new Error(`Unknown AI provider: ${config.provider}`);
  return adapter.sendMessage(messages, context, config);
}

export async function streamAIMessage(
  messages: AIMessage[],
  context: AIBuilderContext,
  config: AIConfig,
  callbacks: AIStreamCallbacks,
): Promise<void> {
  const adapter = adapters[config.provider];
  if (!adapter) {
    callbacks.onError(new Error(`Unknown AI provider: ${config.provider}`));
    return;
  }
  return adapter.streamMessage(messages, context, config, callbacks);
}

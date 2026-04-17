# AI Assistant

AI Assistant integration for the UI Builder — conversational interface for generating and modifying
builder components via OpenAI, Gemini, and Claude.

---

## Overview

The AI Assistant allows users to describe changes in natural language ("make the heading bigger and
blue", "add a hero section with a CTA button") and receive command suggestions that can be applied
directly to the document.

**Key constraint:** The AI never directly mutates state. All AI suggestions are dispatched as
standard builder commands through the Command Engine, meaning they are fully undoable.

---

## Architecture

```
BuilderEditor
  └── AIAssistant (Dialog)
        ├── AIConfigPanel          ← Provider/key/model settings (persisted in localStorage)
        ├── sendAIMessage()        ← Dispatch to provider adapter
        │     ├── openaiAdapter
        │     ├── geminiAdapter
        │     └── claudeAdapter
        └── buildAIContext()       ← Snapshot of current builder state
```

**Files:**

| File | Purpose |
|------|---------|
| `packages/builder-editor/src/ai/types.ts` | All AI-related TypeScript interfaces |
| `packages/builder-editor/src/ai/AIService.ts` | Provider adapters + `sendAIMessage()` |
| `packages/builder-editor/src/ai/buildAIContext.ts` | State snapshot builder |
| `packages/builder-editor/src/ai/AIAssistant.tsx` | Chat dialog UI |
| `packages/builder-editor/src/ai/AIConfig.tsx` | Settings panel UI |

---

## Type Contracts

### `AIConfig`

```ts
interface AIConfig {
  provider: AIProvider;       // "openai" | "gemini" | "claude"
  apiKey: string;
  model?: string;             // e.g. "gpt-5", "gemini-3-flash-preview", "claude-4-sonnet"
  temperature?: number;       // 0–2, default 0.7
  maxTokens?: number;         // default 2048
  systemPrompt?: string;      // overrides the default system prompt
  streamingEnabled?: boolean; // stream tokens in real-time, default false
  includePageContext?: boolean; // include full page node tree in context
}
```

Config is **persisted in `localStorage`** under key `"ui-builder:ai-config"`. API keys are stored
client-side only — never sent to our own servers.

### `AIBuilderContext`

The context snapshot passed to the AI on every request:

```ts
interface AIBuilderContext {
  document: {
    name: string;
    nodeCount: number;
    rootNodeId: string;
  };
  selectedNode: {
    id: string;
    type: string;
    name: string | undefined;
    props: Record<string, unknown>;
    style: Record<string, unknown>;
    /** Stringified capability keys where value is truthy */
    capabilities?: string[];
    /** First-level propSchema entries (groups flattened out) */
    propSchema?: Array<{ key: string; label: string; type: string }>;
  } | null;
  availableComponents: Array<{
    type: string;
    name: string;
    category: string;
    capabilities?: string[];
    propSchema?: Array<{ key: string; label: string; type: string }>;
  }>;
  activeBreakpoint: string;
  pageNodes?: Record<string, AIPageNode>; // full node tree, only when includePageContext = true
  availablePresets?: AIPresetGroup[];     // palette catalog summary, only when paletteCatalog is passed
}
```

`availablePresets` is a slim, AI-readable summary of the entire `PaletteCatalog`:

```ts
interface AIPresetGroup {
  group: string;            // e.g. "Text"
  types: AIPresetType[];
}
interface AIPresetType {
  type: string;             // e.g. "Titles"
  items: AIPresetItem[];
}
interface AIPresetItem {
  id: string;               // e.g. "text-h1"
  name: string;             // e.g. "Heading 1"
  componentType: string;    // the registered component key
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  tags?: string[];
}
```

Context is built by `buildAIContext(state, components, options)` in `buildAIContext.ts`.

### `BuildAIContextOptions`

```ts
interface BuildAIContextOptions {
  /** Include full page node tree. Increases token cost. Default: false */
  includePageContext?: boolean;
  /**
   * When provided, extract all palette presets into `availablePresets`.
   * The AI will then reference preset props/styles when generating ADD_NODE commands
   * instead of using bare empty defaults.
   */
  paletteCatalog?: PaletteCatalog;
}
```

When `paletteCatalog` is passed to `<BuilderEditor>`, it is automatically forwarded to
`buildAIContext` — no additional configuration needed.

### `AIResponse`

```ts
interface AIResponse {
  message: string;
  suggestions?: AICommandSuggestion[];
}

interface AICommandSuggestion {
  type: string;                         // Builder command type
  payload: Record<string, unknown>;     // Command payload
  description: string;                  // Human-readable label on the Apply button
}
```

Suggestions are parsed from a `\`\`\`json ... \`\`\`` block in the AI response.

---

## Provider Adapters

All three adapters implement `AIProviderAdapter`:

```ts
interface AIProviderAdapter {
  name: AIProvider;
  sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse>;
  streamMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
    callbacks: AIStreamCallbacks,
  ): Promise<void>;
}
```

### OpenAI

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Auth: `Authorization: Bearer {apiKey}`
- Default model: `gpt-5`

### Gemini

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Uses `contents` array with `user`/`model` roles
- Default model: `gemini-3-flash-preview`

### Claude (Anthropic)

- Endpoint: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key: {apiKey}` + `anthropic-version: 2023-06-01`
- Default model: `claude-4-sonnet-20260215`
- **Note**: No `anthropic-dangerous-direct-browser-access` header — callers must proxy through a
  backend to use Claude in production.

---

## System Prompt

The system prompt is constructed from two parts:

1. **Base**: `config.systemPrompt` if set, otherwise the default builder-specific prompt.
2. **Context block**: Auto-generated from `AIBuilderContext` — document name, node count, selected
   node info, available component types.

The AI is instructed to respond with `\`\`\`json [ { "type": "COMMAND", "payload": {...},
"description": "..." } ] \`\`\`` for actionable suggestions.

---

## Full Page Mode

When the **"Generate full page (replaces existing content)"** checkbox is enabled in the AI Assistant dialog,
the backend automatically prepends `REMOVE_NODE` commands for all existing children of the root node
before applying the AI-generated commands.

**How it works:**

1. User checks "Generate full page" checkbox
2. Frontend passes `fullPageMode: true` in the context to the backend
3. Backend identifies all children of the root node
4. Backend generates a `REMOVE_NODE` command for each child
5. These removal commands are prepended before AI-generated commands
6. All commands execute atomically on the client: remove old content, then build new content

**Logging:**

When `fullPageMode` is active, the following debug information is logged (when `AI_DEBUG=true`):
- Whether fullPageMode is enabled
- Count of page nodes available
- Count of nodes being removed
- Node IDs and types being removed
- Total command count after clear

---

## Command Whitelist

Only the following command types can be dispatched from AI suggestions. Any suggestion with a type
not in this whitelist is silently ignored:

```ts
const ALLOWED_AI_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  "REMOVE_NODE",                  // ← Only generated internally by fullPageMode, not by AI
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_INTERACTIONS",
]);
```

**Note:** `REMOVE_NODE` is only generated internally by the backend when `fullPageMode=true` to clear
existing content before regenerating the entire page. The AI itself cannot generate `REMOVE_NODE`
commands. `MOVE_NODE` is excluded.

---

## UI Integration

The AI Assistant is accessed via the **Sparkles (✨) button** in `EditorToolbar`. It opens a
`<Dialog>` that hosts the conversation and an `<AIConfigPanel>` embedded in the Page Settings panel
(visible when no node is selected).

**To open programmatically:**

```ts
// BuilderEditor exposes this via the aiOpen state
setAiOpen(true);
```

---

## Adding a New Provider

1. Add the provider slug to `AIProvider` type in `types.ts`.
2. Create an adapter object implementing `AIProviderAdapter` in `AIService.ts`.
3. Register it in the `adapters` record at the bottom of `AIService.ts`.
4. Add model options to `PROVIDER_MODELS` in `AIConfig.tsx`.
5. Add i18n key `ai.providers.{slug}` to both `en.json` and `vi.json`.

---

_For the command system that processes AI suggestions, see [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md).  
For the component registry that feeds `availableComponents`, see [DATA_MODEL.md](./DATA_MODEL.md)._

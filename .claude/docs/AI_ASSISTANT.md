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
  └── AIAssistant (Dialog)           ← Chat assistant: targeted edits
  └── PageGeneratorModal             ← Full-page generation via SSE
  └── AISectionPopover               ← Section-level regeneration

All three end in the same command application pipeline, but full-page generation now has a
planner/compiler stage before commands reach the client:

  Page Generator
    → CreativeBrief + PagePlan       ← Zod-validated planning contract
    → plan_ready skeleton commands   ← deterministic Section ADD_NODEs
    → SectionPlan per section        ← generated independently with retry/fallback
    → deterministic compiler         ← SectionPlan → builder commands
    → normalizeAICommands()          ← preserves backend-stable ai-* IDs
    → applyAICommandsProgressive()   ← batch-by-depth rendering
          Prelude:         REMOVE_NODE clears old full-page content
          Phase 1 (sync):  containers → layout skeleton appears
          Phase 2 (rAF):   leaves    → content fills in
    → dispatch()                     ← builder CommandEngine
```

**Files:**

| File | Purpose |
|------|---------|
| `packages/builder-editor/src/ai/types.ts` | All AI-related TypeScript interfaces |
| `packages/builder-editor/src/ai/AIService.ts` | Backend communication (`sendAIMessage`, `streamAIMessage`) |
| `packages/builder-editor/src/ai/buildAIContext.ts` | Builder state snapshot for AI context |
| `packages/builder-editor/src/ai/normalizeAICommands.ts` | Command normalization + temp ID resolution |
| `packages/builder-editor/src/ai/applyAICommandsProgressive.ts` | Batch-by-depth command application |
| `packages/builder-editor/src/ai/AIAssistant.tsx` | Chat dialog UI |
| `packages/builder-editor/src/ai/AIConfig.tsx` | Settings panel UI |
| `packages/builder-editor/src/ai/page-generator/usePageGenerator.ts` | Full-page SSE generation hook |
| `packages/builder-editor/src/ai/ai-section/useAISectionState.ts` | Section regeneration state |

---

## Streaming Architecture

Each AI entry point uses a different transport but the **same client-side application pipeline**.

| Entry point | Backend transport | Client application |
|-------------|------------------|--------------------|
| **generate-page** | SSE: `job_started` → `plan_ready` → N × section events → `complete` | Skeleton first, then `applyAICommandsProgressive` per section |
| **ai-section** | Single JSON response (`POST /api/ai/chat`) | `applyAICommandsProgressive` (awaited) |
| **chat assistant** | Single JSON response (`POST /api/ai/chat`) | `applyAICommandsProgressive` (awaited) |

When `AIAssistant` is used with full-page mode enabled, the editor routes that request through the
same `generate-page` SSE pipeline instead of the legacy chat endpoint.

### generate-page SSE Events

```
job_started      { jobId }
plan_ready       { jobId, plan: PagePlan, skeletonCommands: AICommandSuggestion[] }
section_started  { jobId, index, sectionId }
section_retrying { jobId, index, sectionId, attempt, reason }
section_ready    { jobId, index, sectionId, commands: AICommandSuggestion[] }
section_failed   { jobId, index, sectionId, error, fallbackCommands?: AICommandSuggestion[] }
complete         { jobId, status: "success" | "partial" | "failed", completed, failed, failedSections }
error            { jobId, message: string }
```

`plan_ready` is the first renderable milestone. The client applies skeleton commands immediately so
users see the full page structure before section content finishes. Section failures are isolated:
after retry, the backend emits fallback commands for that section and completes with partial status.

---

## Rich Component Awareness

Full-page generation v2 uses a hybrid backend-side component contract layer. The editor sends
`availableComponents` with `propSchema`, `capabilities`, and `defaultProps`; the backend derives a
compact catalog summary for all available components and merges curated guidance for complex
components.

The manifest intentionally does not include full raw `propSchema`. Each component entry contains:

- `type`
- `purpose`
- `bestFor`
- `requiredProps`
- `keyProps`
- `variants`
- `fallbackTo`

Known rich components such as `NavigationMenu`, `GalleryPro`, `GalleryGrid`, `GallerySlider`,
`CollapsibleText`, `TextMarquee`, `TextMask`, `Shape`, `Row`, `Column`, and `Repeater` get curated
purpose/fallback/variant guidance. Unknown or custom registered components still receive
propSchema-driven summaries, so they can appear in AI context without code changes.

### On-Demand Component Contracts

Section prompts receive detailed `ComponentContract` entries only for components relevant to that
section. A contract contains required/optional props, defaults, variants, constraints, fallback
chain, examples, and `contractSource` (`propSchema`, `curated`, or `merged`).

This avoids sending every component's full schema to every prompt while still letting the model make
better section-level component choices.

### SectionPlan Intent Fields

The LLM still returns content intent only. It may request richer rendering through these fields:

```ts
interface SectionPlan {
  sectionId: string;
  type: PageSectionType;
  layoutVariant?: string;
  preferredComponents?: string[];
  componentIntents?: Array<{
    role: string;
    componentType: string;
    variant?: string;
    contentSource?: string;
    priority?: "required" | "preferred" | "optional";
    reason?: string;
  }>;
  interactionIntent?: "static" | "carousel" | "expandable" | "marquee" | "gallery";
  mediaItems?: Array<{ src?: string; alt: string; caption?: string; link?: string }>;
  navItems?: Array<{ label: string; href: string }>;
  visualEmphasis?: "copy" | "media" | "balanced" | "proof" | "conversion";
  eyebrow?: string;
  heading: string;
  body: string;
  items: Array<{ title: string; body: string; meta?: string }>;
}
```

`preferredComponents` and `componentIntents` are filtered against available component contracts
before compilation. `null` arrays normalize to empty arrays, invalid component choices are dropped,
and missing media URLs are replaced by deterministic industry-aware fallback images.

### Compiler Strategy

The compiler owns all final props and command generation. Component intents act as deterministic
adapter preferences; adapters map intent/content into safe props, then schema validation checks the
payload before commands are streamed:

| Section | Preferred rich path | Fallback path |
|---------|---------------------|---------------|
| `header` | `NavigationMenu` | Text nav row + button |
| `hero` | `TextMask`, `TextMarquee`, `Image`, optional `Shape` | Standard hero grid |
| `services` | `GalleryPro`/`GalleryGrid` plus cards | Grid cards |
| `gallery` | `GalleryPro` → `GallerySlider` → `GalleryGrid` | Grid + Image |
| `testimonials` | `GalleryPro`/`GallerySlider` plus proof cards | Testimonial cards |
| `faq` | `CollapsibleText` | FAQ cards |
| `cta` | `TextMarquee` + Image + Button | CTA text/button block |
| `footer` | `NavigationMenu` + text + divider | Footer cards |

Every compiled command is validated before streaming: registered component type, known parent ID,
no leaf nodes as parents, no non-Section leaf directly under root, required props present, selected
enum values allowed, no duplicate node IDs, and prop-schema validation where a contract is available.

---

## Progressive Command Application

**File:** `packages/builder-editor/src/ai/applyAICommandsProgressive.ts`

When a section's commands arrive, they are applied in **two phases** to create a progressive
"build-up" effect instead of all nodes appearing simultaneously:

**Prelude — Removal commands (synchronous)**
`REMOVE_NODE` commands generated by full-page regeneration are dispatched before new containers so
old page content is cleared before the new skeleton appears.

**Phase 1 — Containers (synchronous)**
ADD_NODE commands for layout container types are dispatched immediately:
- `Section`, `Container`, `Grid`, `Column`, `Repeater`

React renders these containers, establishing the layout skeleton on the canvas.

**Phase 2 — Leaves (next `requestAnimationFrame`)**
After yielding to React via `requestAnimationFrame`, the remaining commands are dispatched:
- Leaf components: `Text`, `Button`, `Image`, `Divider`, etc.
- Non-ADD_NODE commands: `RENAME_NODE`, `UPDATE_STYLE`, `UPDATE_PROPS`, etc.

```ts
// Shared constant (exported from normalizeAICommands.ts)
export const CONTAINER_COMPONENT_TYPES = new Set([
  "Section", "Container", "Grid", "Column", "Repeater",
]);
```

**Usage pattern:**

```ts
// fire-and-forget (generate-page: sections arrive seconds apart)
void applyAICommandsProgressive(normalized, dispatch, filter);

// awaited (ai-section, chat: need to know when done before updating UI state)
await applyAICommandsProgressive(normalized, dispatch, filter);
```

---

## Type Contracts

### `AIConfig`

```ts
interface AIConfig {
  backendUrl: string;         // apps/api URL, e.g. http://localhost:3002
  provider?: AIProvider;      // deprecated client hint, ignored by backend
  apiKey?: string;            // deprecated, provider keys live on backend env
  model?: string;
  temperature?: number;       // 0–2, default 0.7
  maxTokens?: number;         // default 8192
  streamingEnabled?: boolean; // chat compatibility flag; page generation always uses SSE
  includePageContext?: boolean; // include full page node tree in context
  designTokens?: DesignTokens;
}
```

Config is **persisted in `localStorage`** under key `"ui-builder:ai-config"`. API keys are configured
on the backend via environment variables and are not stored in the editor.

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
- Default model: `gpt-4o`

### Gemini

- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Uses `contents` array with `user`/`model` roles
- Default model: `gemini-2.0-flash`

### Claude (Anthropic)

- Endpoint: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key: {apiKey}` + `anthropic-version: 2023-06-01`
- Default model: `claude-sonnet-4-6`
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
2. Frontend sends `fullPageMode`, `rootNodeId`, and `pageNodes` in the `generate-page` request
3. Backend identifies all root children and adds `REMOVE_NODE` commands using `payload.nodeId`
4. Removal commands are included in `plan_ready.skeletonCommands` before new Section skeletons
5. Section content arrives later through `section_ready` or `section_failed.fallbackCommands`

**Logging:**

When `AI_DEBUG=true`, generation logs structured job/section events with `jobId`, `sectionId`,
attempt, stage, elapsed time, status, fallback usage, `manifestComponents`, `sectionType`,
`preferredComponents`, `selectedComponent`, `fallbackComponent`, `fallbackReason`,
`componentIntents`, `adapterUsed`, `contractSource`, `richComponentUsed`, `mediaItemCount`,
`propValidationErrors`, and `validationErrorCode` when available. Full prompts are truncated unless
`AI_PROMPT_DEBUG=true`.

Provider calls are guarded by `LLM_TIMEOUT_MS` to prevent long-running plan or section requests from
blocking the SSE job indefinitely. The default timeout is `60000` milliseconds.

Section generation runs with bounded concurrency via `AI_SECTION_CONCURRENCY` (default `2`) and
`AI_MAX_SECTION_ATTEMPTS` (default `2`). Repairable JSON/schema/compiler errors may retry; timeout,
rate-limit, and overloaded-provider errors bypass retry and emit fallback commands so the rest of the
page can continue. If the planner provider call fails before `plan_ready`, the backend uses a
deterministic PagePlan fallback and still emits skeleton commands.

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

**Note:** `REMOVE_NODE` is generated internally by the backend when `fullPageMode=true` to clear
existing content before regenerating the entire page. The page-generation compiler, not the LLM,
creates final builder commands for full-page generation. `MOVE_NODE` is excluded.

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

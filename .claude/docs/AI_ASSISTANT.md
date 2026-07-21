# AI Assistant

> Audience: AI agents & maintainers. User-facing overview: [/docs/user-guide/09-ai-assistant.md](../../docs/user-guide/09-ai-assistant.md)

AI Assistant integration for the UI Builder — conversational interface for generating and modifying
builder components via a backend-hosted LLM (OpenAI, Gemini, or Claude).

---

## Overview

The AI Assistant allows users to describe changes in natural language ("make the heading bigger and
blue", "add a hero section with a CTA button") and receive command suggestions that are applied
directly to the document.

**Key constraint:** The AI never directly mutates state. All AI suggestions are dispatched as
standard builder commands through the Command Engine, meaning they are fully undoable.

**Key constraint:** All provider calls happen on the backend (`apps/api`). The browser never holds an
LLM API key. The client only knows a `backendUrl` and, optionally, a bearer token for the backend's
own perimeter auth (`AIConfig.backendAuthToken`, not a provider key).

---

## Architecture

```
BuilderEditor
  └── AIAssistant (Dialog)           ← Chat assistant: targeted edits, conversational thread
  └── PageGeneratorModal             ← Full-page generation via SSE
  └── AISectionPopover               ← Section-level regeneration
  └── AIToolsPopover                 ← Text rewrite / tone change (selected node only)

generate-page has a planner/compiler stage before commands reach the client:

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

chat and ai-section instead let the LLM return commands directly, which then pass through the SAME
validation gate as generate-page (see "Validation Gate" below) before being applied.
```

**Files:**

| File | Purpose |
|------|---------|
| `packages/builder-editor/src/ai/types.ts` | All AI-related TypeScript interfaces |
| `packages/builder-editor/src/ai/allowedCommands.ts` | Single-source command whitelist (see [Command Whitelist](#command-whitelist)) |
| `packages/builder-editor/src/ai/AIService.ts` | Backend communication (`sendAIMessage`, `streamAIMessage`) |
| `packages/builder-editor/src/ai/buildAIContext.ts` | Builder state snapshot for AI context |
| `packages/builder-editor/src/ai/normalizeAICommands.ts` | Command normalization + temp ID resolution |
| `packages/builder-editor/src/ai/applyAICommandsProgressive.ts` | Batch-by-depth command application |
| `packages/builder-editor/src/ai/AIAssistant.tsx` | Chat dialog UI (conversational thread) |
| `packages/builder-editor/src/ai/AIConfig.tsx` | Settings panel UI (backend URL, design tokens only) |
| `packages/builder-editor/src/ai/page-generator/usePageGenerator.ts` | Full-page SSE generation hook |
| `packages/builder-editor/src/ai/ai-section/useAISectionState.ts` | Section regeneration state |
| `packages/builder-editor/src/ai/ai-section/ai-section-config.ts` | Preset section prompt templates (hero, header, features, ...) |
| `packages/builder-editor/src/ai/ai-tools/ai-tools-config.ts` | Text rewrite actions + tone presets |
| `apps/api/src/routes/ai.routes.ts` | All three HTTP endpoints (`generate-page`, `chat`, `chat/stream`) |
| `apps/api/src/services/llm-client.ts` | Provider abstraction (OpenAI/Gemini/Claude) — backend only |
| `apps/api/src/services/command-reference.ts` | `COMMAND_REFERENCE` — canonical command docs sent to the LLM |

---

## Backend LLM Providers

All provider logic and API keys live in `apps/api/src/services/llm-client.ts`. The client never
selects a provider or model — the backend does, via environment variables:

| Env var | Purpose | Default |
|---------|---------|---------|
| `LLM_PROVIDER` | `openai` \| `gemini` \| `claude` | `openai` |
| `LLM_MODEL` | Override the provider's default model (global) | see below |
| `LLM_MODEL_<STAGE>` | Per-stage model override (`_PLANNER`/`_SECTION`/`_CHAT`/`_REPAIR`) | falls back to `LLM_MODEL` |
| `LLM_TEMPERATURE` / `LLM_TEMPERATURE_<STAGE>` | Sampling temperature (global / per-stage) | `0.7` |
| `LLM_MAX_TOKENS` / `LLM_MAX_TOKENS_<STAGE>` | Max output tokens (global / per-stage) | `16384` |
| `LLM_API_KEY` | Generic key, used for whichever provider is selected | — |
| `OPENAI_API_KEY` / `GOOGLE_API_KEY` / `ANTHROPIC_API_KEY` | Provider-specific fallback if `LLM_API_KEY` unset | — |
| `LLM_TIMEOUT_MS` | Abort a provider call after this many ms | `60000` |
| `AI_EXPOSE_COST` | Attach a compact token/cost summary to the SSE `complete` event | `false` |
| `AI_QUALITY_GATE` | Post-compile quality gate mode: `block` \| `warn` \| `off` | `block` |
| `AI_QG_DISABLE` | Comma-separated quality-check codes to disable (e.g. `low_contrast,wrong_language`) | — |
| `AI_PRESET_FIRST` | Reuse designer presets for leaf slots during compile (`false` = adapters only) | `true` (on) |
| `AI_LAYOUT_VARIETY` | Layout variants for hero/services/cta (`off` = always default variant) | on |
| `UNSPLASH_ACCESS_KEY` | Enable context-aware image search (unset = content-pack pool only) | — |
| `IMAGE_TIMEOUT_MS` / `IMAGE_RATE_LIMIT` | Image search timeout (ms) / requests per hour | `3000` / `45` |

Default models per provider (when `LLM_MODEL` is unset): `gpt-4o` (openai), `gemini-2.0-flash`
(gemini), `claude-sonnet-5` (claude). Claude requests mark the (large, stable) system prompt
`cache_control: { type: "ephemeral" }` for prompt caching; cache token usage is logged.

**Model compatibility:** newer Claude models (Fable 5, Sonnet 5, Opus 4.8/4.7/4.6) reject
`temperature`/`top_p`/`top_k` with HTTP 400, so `llm-client.ts` sends `temperature` only to models that
still accept it (`claudeAcceptsSampling`). Anything unknown defaults to the no-sampling path.

**Cost & observability:** `callLLMWithUsage`/`callLLMStreamWithUsage` return token `usage` per call; a
`JobAccountant` (`llm-accounting.ts`) aggregates planner + sections + retries + repair into the
`complete` job log (`totalInputTokens`, `totalOutputTokens`, `estimatedCostUsd`, `llmCalls`,
`usageByStage`). Costs come from the hand-maintained `llm-pricing.ts` table (unknown model → null cost,
tokens still logged). See [roadmap 02/08](../../docs/roadmap/02-ai-generation/08-cost-observability.md).

**Adding a new provider:** implement `callLLM`/`callLLMStream` in `llm-client.ts` for the new
provider, add it to the `LLMProvider` union, and branch on it in `getProvider()`/`defaultModel()`.
There is no client-side provider adapter layer to update — the client is provider-agnostic by design.

> The client's `AIConfig.provider`/`AIConfig.apiKey`/`AIConfig.model`/`AIConfig.temperature`/
> `AIConfig.maxTokens` fields still exist in `types.ts` for backward compatibility but are **not
> wired to any UI control and are ignored by the backend**. `AIConfigPanel` (`AIConfig.tsx`) only
> exposes `backendUrl`, `includePageContext`, and `designTokens`.

---

## Streaming Architecture

Each AI entry point uses a different transport but the **same client-side application pipeline**.

| Entry point | Backend transport | Client application |
|-------------|------------------|--------------------|
| **generate-page** | SSE: `job_started` → `plan_ready` → N × section events → `complete` | Skeleton first, then `applyAICommandsProgressive` per section (fire-and-forget) |
| **ai-section** | Single JSON response (`POST /api/ai/chat`) | `applyAICommandsProgressive` (awaited) |
| **chat assistant** | `POST /api/ai/chat` (JSON) or `POST /api/ai/chat/stream` (real SSE token streaming) depending on `AIConfig.streamingEnabled` | `applyAICommandsProgressive` (awaited) |

When `AIAssistant` is used with full-page mode enabled, the editor routes that request through the
`generate-page` SSE pipeline instead of the chat endpoint, and does **not** use the conversation
thread (see [Chat Conversation Thread](#chat-conversation-thread) below).

`/api/ai/chat/stream` streams real LLM tokens (not a client-side simulation) via `callLLMStream()` in
`llm-client.ts`, which each provider implements natively (OpenAI `stream: true`, Claude `stream: true`
with `cache_control` preserved, Gemini `alt=sse`). The client emits `token` deltas to the UI as they
arrive and applies commands once the final `complete` event carries the parsed result.

### generate-page SSE Events

```
job_started      { jobId }
plan_ready       { jobId, plan: PagePlan, skeletonCommands: AICommandSuggestion[] }
section_started  { jobId, index, sectionId }
section_retrying { jobId, index, sectionId, attempt, reason }
section_ready    { jobId, index, sectionId, commands: AICommandSuggestion[], qualityWarnings?: QualityIssue[] }
section_failed   { jobId, index, sectionId, error, fallbackCommands?: AICommandSuggestion[] }
complete         { jobId, status: "success" | "partial" | "failed", completed, failed, failedSections }
error            { jobId, message: string }
```

`plan_ready` is the first renderable milestone. The client applies skeleton commands immediately so
users see the full page structure before section content finishes. Section failures are isolated:
after retry, the backend emits fallback commands for that section and completes with partial status.

### chat/stream SSE Events

```
token     { delta: string }        // one per streamed text chunk
complete  { message, commands, droppedCommands? }
error     { error: string }
```

---

## Chat Conversation Thread

`AIAssistant.tsx` keeps a real conversation thread (`messages: AIMessage[]` state), not a single
one-shot request. Each chat turn sends the trailing window of the thread (`MAX_CHAT_TURNS = 6` turns,
12 messages) to the backend, so follow-up edits like "make that button red" resolve against prior
context. The dialog does **not** auto-close after applying commands in this path — an assistant
message summarizing the applied change is appended to the thread instead, and the user can keep
chatting. A "Clear" button resets the thread; it also resets automatically when `document.rootNodeId`
changes (e.g. switching pages).

**Full-page mode is the exception**: it routes through `usePageGenerator` (the SSE pipeline above),
which is a one-shot operation with no thread — the dialog closes on completion, matching its previous
behavior.

`apps/api` is stateless: it has no server-side session. The client resends the full trailing message
window on every turn.

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

The LLM still returns content intent only — never raw builder commands — for full-page generation.
It may request richer rendering through these fields:

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
and missing media URLs are replaced by deterministic industry-aware fallback images from the matched
**content pack** (`fallbackImagePool(pack)` — see below).

**Content packs (roadmap 02/02):** deterministic fallback content (used when the LLM fails a section)
is data-driven, not hardcoded. Packs live in `apps/api/src/data/content-packs/*.json` (`_generic` +
per-industry: `pet-care`, `saas`, `restaurant`); `loader.ts` validates them with Zod at init and skips
a malformed pack with a warning (`_generic` is the required baseline). `matchContentPack(brief)` scores
each pack's keywords against `rawPrompt + inferredIndustry + targetAudience` (earliest keyword position
breaks ties; no match → `_generic`). Every section reads copy, nav items/labels, media captions/alt,
image pool, decorative marquee, and hero accent shape from the matched pack, shallow-merged over
`_generic` so a pack may omit sections. Add an industry = add a JSON file + one line in `index.json`, no
TypeScript change. The pack JSON is copied into `dist` by the `copy-data` build step.

**Locale (roadmap 02/03):** `resolveLocale(request, brief)` (in `section-plan-compiler.ts`) picks the
content language with priority: explicit `generationOptions.locale` (Page Generator dropdown; `auto` =
infer) → prompt-script heuristic (Vietnamese diacritics, then CJK ranges) → `en`. It replaces the old
`isVietnamese()` diacritic regex, which misclassified diacritic-free Vietnamese and ignored explicit
requests. The resolved locale is threaded into the planner and section system prompts ("write all
content in &lt;language&gt;; keep structural values English") and selects the content-pack locale entry
(unknown locales fall back to a pack's `_default` copy while the LLM writes in the requested language).
Compiler-emitted UI strings (CollapsibleText expand/collapse, nav CTA) come from `COMPILER_STRINGS`
(`vi`/`en`, fallback `en`). RTL locales are out of scope until the builder supports RTL layout.

**Preset-first compile (roadmap 02/01, phase 1 — leaf presets):** the client sends `availablePresets`
(full props/style per designer preset) in the request. `preset-catalog.ts` indexes them
(`buildPresetIndex`, dropping presets whose `componentType` isn't in the registry) and the compiler
instantiates a preset for a **leaf** slot (currently the primary CTA `Button` and the heading `Text`)
instead of a hardcoded style — either the one the LLM referenced via the new
`SectionPlan.presetRefs: [{role, presetId}]` field, or a heuristic pick by componentType + tags
(`resolvePresetByHeuristic`, seeded by section id for controlled variety). `presetCommand` patches the
content (text/label/src, image src through `safeMediaUrl`) over the preset's props; a preset tagged
`themable` gets design-token color overrides, others keep their designed style verbatim. Invented
preset ids are filtered (mirror of `filterPreferredComponents`); with no catalog or `AI_PRESET_FIRST=false`
the compiler uses the old adapters unchanged. The section prompt lists candidate-scoped presets (id +
type + tags only, capped 30 — never props/style, to bound tokens). `compileSectionWithMeta` reports the
instantiated preset ids, logged as `presetUsed` on `section_ready`. Container/card (multi-child) presets
are deferred to a later phase.

**Layout variety (roadmap 02/05, phase 1 — hero/services/cta):** `layoutVariant` now changes the actual
compile path. `layout-variants.ts` holds a closed enum per section type (hero:
`split-media-right|split-media-left|centered-stack|full-bleed-media`; services:
`grid-cards|gallery-showcase|alternating-rows`; cta: `centered-band|split-with-media`) plus each variant's
component `requires`. `resolveVariant()` picks: an LLM-requested variant if valid + requirements met,
else a seed-pick keyed by `${jobId}:${type}` (stable across a section's retries, varied across jobs),
filtered to variants whose required components are available. The compiler dispatches on `ctx.variant`
inside `compileHeroSection` / `compileServicesVariant` / the cta block. `visualEmphasis` is a post-variant
modifier (`applyVisualEmphasis`): `conversion` repeats the CTA at the section end, `proof` appends a stats
row when the plan has stats. The section prompt lists the type's variant enum with content guidance.
`AI_LAYOUT_VARIETY=off` forces every section to its default (first) variant = the previous behavior.
`compileSectionWithMeta` reports `variantUsed` (logged on `section_ready`). Fallback-pack sections run
through the same variants. features/testimonials/pricing/faq variants are a later phase.

**Media pipeline (roadmap 02/06):** `image-provider.ts` fetches context-aware images per section instead
of only cycling the content-pack pool. `fetchSectionImages(plan, section, brief)` runs in the route
after the SectionPlan (needs `mediaPrompt`) and before compile; the query is `mediaPrompt` (the LLM is
asked to write it in English) or `"{industry} {sectionType}"`, count bounded per section type. Results
are threaded into `compileSectionWithMeta(..., providerImages)`; `mediaItemsFor`/`normalizeMediaItem` use
the priority **valid LLM `src` → provider result → content-pack pool**, and attach Unsplash credit as the
image caption. The v1 provider is Unsplash (`UNSPLASH_ACCESS_KEY`); with no key the provider is `none` and
behavior is identical to before. It is best-effort — no key, timeout (`IMAGE_TIMEOUT_MS`, default 3s),
rate-limit (`IMAGE_RATE_LIMIT`/h token bucket), or any error → empty result → pool, never blocking a
section. An in-memory 1h cache keys by query so a job's same-industry sections share fetches, and every
provider URL passes `safeMediaUrl` (SSRF-safe). Logged as `imageProvider`/`imageCount` on `section_ready`.
Chat-path image search and self-hosting fetched images are out of scope for v1.

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

Every Section skeleton also gets a stable `props.anchorId` (derived from section type, e.g.
`"services"`) so header/footer `NavigationMenu` anchor targets always resolve to a real element —
see `sectionAnchor()` in `section-plan-compiler.ts`.

---

## Validation Gate

LLM output is **untrusted**, on both the generate-page and chat paths. Every `ADD_NODE` command passes
through `validateCompiledCommandsWithReport(commands, availableTypes, initialParentIds,
contractsByType, initialParentTypes?)` in `section-plan-compiler.ts`, which checks: type exists,
parent exists, nesting (no leaf parents), prop validation + repair
(`validatePropsAgainstContract`), required props present, valid enum values, no duplicate node IDs.

Rejected commands are **reported** (`droppedCommands`, with a machine-readable reason such as
`unknown_type` / `leaf_parent` / `missing_required_props`) — never silently dropped. The chat handler
builds `initialParentTypes` from the current page so existing leaf nodes correctly reject new
children. The client surfaces drops as a non-blocking toast (`ai.commandsSkipped`); valid commands
still apply.

### Repair Loop (chat path only)

When the gate drops ≥1 command on `/chat` or `/chat/stream`, `repairDroppedCommands()`
(`ai.routes.ts`) makes **one** targeted re-prompt: each rejection is described with a human-readable
hint from the `REPAIR_HINTS` table (keyed by rejection reason), and the model is asked to return only
the corrected commands. Repaired commands go back through the same validation gate; only commands
still invalid after repair surface in the final `droppedCommands`.

## Quality Gate (roadmap 02/04)

Beyond the structural validation gate, `quality-gate.ts` runs deterministic **content** checks on the
compiled commands (no LLM). `runQualityGate(commands, designTokens, { locale?, seenHeadings?,
exemptBlock? })` returns `QualityIssue[]` with two severities:

| Code | Severity | Check |
|------|----------|-------|
| `placeholder_content` | block (strong patterns) / warn (weak) | "lorem ipsum", "your headline here", `TBD`, `xxxx`, `[…]`, `{{…}}` in any text/label |
| `empty_section` | block | a Section skeleton that received no child commands |
| `low_contrast` | warn | WCAG contrast < 3.0 for a node's `color` vs `backgroundColor`/section bg (only when both parse to hex/rgb) |
| `missing_mobile_font` | warn | `h1`/`h2` Text > 40px with no `responsiveStyle.mobile.fontSize` |
| `overlong_heading` | warn | heading > 120 chars |
| `duplicate_heading` | warn | two sections share a normalized `h1`/`h2` heading (job-level `seenHeadings`) |
| `wrong_language` | warn | heading script doesn't match the requested `locale` (roadmap 02/03) |

Mode is set by `AI_QUALITY_GATE` (`block` default / `warn` / `off`); `AI_QG_DISABLE` turns off
individual codes. **generate-page:** a `block` issue throws a `quality_block` error (retryable →
retry-with-hint via the existing loop → fallback pack); `warn` issues ride along on
`section_ready.qualityWarnings` and count into the `complete` log (`qualityWarnings`,
`qualityGateMode`). Fallback-pack commands run the gate with `exemptBlock: true` (blocks downgraded to
warn so a section is never left empty; a dirty pack still logs). **chat / chat-stream:** the gate runs
scoped to that turn's commands and both block+warn issues are returned as `qualityWarnings` on the
response (no forced content re-ask).

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

### Transactional Apply (roadmap 02/07)

Each generated section (and each chat/ai-section turn) is applied under one **atomic undo group**. The
caller passes a `groupId` to `applyAICommandsProgressive`, which tags every dispatch with that `groupId`
plus `coalesce: false`. In builder-core, `Command.coalesce` defaults to `true` (gesture behavior — a
rapid same-node stream collapses into one history entry via `HistoryStack.coalesce`); AI batches opt out
with `false` so each command keeps its own inverse but `HistoryStack.undo()` still reverts the whole
`groupId` group atomically. Net effect: **one Ctrl+Z undoes a whole section** (≈ `#sections + 1`
skeleton undos for a full page) instead of hundreds of per-node undos. `REMOVE_NODE` (fullPageMode
prelude) has an inverse (`RESTORE_NODES`), so undoing the skeleton restores the previous page.

If a command throws mid-apply, `applyAICommandsProgressive` calls `onGroupFailed`, and the generate-page
hook rolls the partial section back with a single `builder.undo()` before the server's `fallbackCommands`
fill it in — so no half-built section is left on the canvas. Controlled by `AIConfig.transactionalApply`
(default `true`; set `false` to restore per-command history).

---

## Type Contracts

### `AIConfig`

```ts
interface AIConfig {
  backendUrl: string;              // apps/api URL, e.g. http://localhost:3002
  backendAuthToken?: string;       // bearer token for apps/api's own perimeter auth (AI_API_KEY), not a provider key
  provider?: AIProvider;           // @deprecated — ignored by the backend
  apiKey?: string;                 // @deprecated — provider keys live on the backend
  model?: string;                  // @deprecated — no UI control, backend decides via LLM_MODEL
  temperature?: number;            // @deprecated — no UI control
  maxTokens?: number;              // @deprecated — no UI control
  systemPrompt?: string;           // @deprecated — the backend builds the system prompt; not sent by the client
  streamingEnabled?: boolean;      // selects /chat vs /chat/stream for the chat path; full-page generation always uses SSE
  includePageContext?: boolean;    // include full page node tree in context
  designTokens?: DesignTokens;
  transactionalApply?: boolean;    // roadmap 02/07: atomic per-section undo + mid-apply rollback (default true)
}
```

Config is **persisted in `localStorage`** under key `"ui-builder:ai-config"`. Provider API keys are
configured on the backend via environment variables and are never sent to or stored by the client.

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
    capabilities?: string[];
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
  activeSurface?: { type: "page" } | { type: "popup"; popupId: string; rootNodeId: string; selection: "shell" | "content" | null };
  availablePopups?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    kind: string;
    placement: string;
    rootNodeId: string;
    autoTrigger: string;
  }>;
  pageNodes?: Record<string, AIPageNode>; // full node tree, only when includePageContext = true
  availablePresets?: AIPresetGroup[];     // palette catalog summary, only when paletteCatalog is passed
}
```

`activeSurface`/`availablePopups` are built by `buildAIContext` and sent all the way through
`AIService.ts` → `ChatRequest.builderContext` → the backend's `buildChatSystemPrompt`, which renders
a `## Popups` block (only when the document has ≥1 popup) listing real popup ids the model may use as
the `targetId` for `showModal`/`hideModal` interaction actions, and states which surface (page vs a
specific popup's shell/content) is currently being edited so new nodes get the correct parent.

Context is built by `buildAIContext(state, components, options)` in `buildAIContext.ts`.

### `AIResponse`

```ts
interface AIResponse {
  message: string;
  suggestions?: AICommandSuggestion[];
  droppedCommands?: DroppedChatCommand[];  // present only when the validation gate rejected something
}

interface AICommandSuggestion {
  type: string;                         // Builder command type
  payload: Record<string, unknown>;     // Command payload
  description: string;                  // Human-readable label
}
```

The chat endpoints return a single JSON object (`{ message, commands, droppedCommands? }`) — there is
no `​```json ... ​``` `-fenced markdown to parse on the client; `parseAIResponse()` in `AIService.ts`
still tolerates a few malformed-response shapes defensively (direct JSON, balanced-bracket extraction,
fenced code block) since raw LLM text occasionally includes stray formatting.

---

## System Prompt

The system prompt is owned entirely by the backend — `buildChatSystemPrompt()` in `ai.routes.ts`. It
is assembled from: document/breakpoint/selected-node state, the component manifest, derived nesting
rules, page node context (slim tree + focused nodes, or full tree when `includePageContext=true`),
available presets, design tokens (when set, marked MANDATORY), the `## Popups` block (when
applicable), and `COMMAND_REFERENCE` (the canonical command documentation, `command-reference.ts`).
The client never sends a system message — `AIConfig.systemPrompt` is unused.

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
deterministic PagePlan fallback and still emits skeleton commands. If the whole `/api/ai/chat` call
fails while `fullPageMode` is set, the backend falls back to a fully deterministic full-page plan
(`buildFullPageChatFallback`) rather than returning an error.

---

## Perimeter Security (`/api/ai/*`)

- **Auth:** `requireApiKey` (`middleware/auth.ts`) requires `Authorization: Bearer <AI_API_KEY>`. When
  `AI_API_KEY` is unset the endpoints are open **with a startup warning** (dev convenience).
- **Rate limit:** `aiRateLimiter` (`middleware/rateLimit.ts`, `express-rate-limit`) caps per-IP
  requests (`AI_RATE_LIMIT_WINDOW_MS` / `AI_RATE_LIMIT_MAX`). SSE responses count once at entry.
- **SSRF:** `services/url-guard.ts` (`safeMediaUrl` / `safeLinkUrl`) validates every AI-supplied URL —
  blocks loopback/private/link-local hosts and rejects `http:` / `javascript:`. Applied at image
  `src`, nav `href`, and gallery `link`. (A separate, stricter guard —
  `packages/shared/src/urlGuard.ts`'s `isSafeFetchEndpoint` — protects the runtime's `triggerApi`
  interaction action; see `.claude/docs/RUNTIME.md`.)
- Mounted as `app.use("/api/ai", requireApiKey, aiRateLimiter, aiRouter)`; CORS allows `Authorization`.

---

## Command Whitelist

Only the following command types can be dispatched from AI suggestions. Any suggestion with a type
not in this whitelist is silently ignored by the client. The whitelist lives in exactly one place —
`packages/builder-editor/src/ai/allowedCommands.ts` — imported by both `AIAssistant.tsx` (chat path)
and `usePageGenerator.ts` (full-page path):

```ts
export const ALLOWED_AI_COMMANDS = new Set([
  "ADD_NODE",
  "UPDATE_PROPS",
  "UPDATE_STYLE",
  "UPDATE_RESPONSIVE_PROPS",
  "UPDATE_RESPONSIVE_STYLE",
  "TOGGLE_RESPONSIVE_HIDDEN",
  "RESET_RESPONSIVE_STYLE",
  "RENAME_NODE",
  "DUPLICATE_NODE",
  "REMOVE_NODE",                  // ← Only generated internally by fullPageMode, not by the LLM
  "UPDATE_CANVAS_CONFIG",
  "UPDATE_INTERACTIONS",
]);
```

This set must stay a superset of every command type documented in `COMMAND_REFERENCE`
(`apps/api/src/services/command-reference.ts`) plus `REMOVE_NODE`. A contract test enforces this on
both sides: `apps/api/src/services/command-reference.test.ts` (parses `COMMAND_REFERENCE` and asserts
its command list) and `packages/builder-editor/src/ai/allowedCommands.test.ts` (asserts the same list
plus deny-by-default checks for destructive commands like `MOVE_NODE`, `REMOVE_NODES`, `CREATE_POPUP`,
`SET_THEME_COLORS`). When adding a new AI-dispatchable command, update `command-reference.ts`,
`allowedCommands.ts`, both tests, and this file in the same change.

`MOVE_NODE` and all popup/campaign commands (`CREATE_POPUP`, `UPDATE_POPUP`, `DELETE_POPUP`, ...) are
intentionally excluded — deny-by-default. Popups are AI-aware (see `AIBuilderContext.availablePopups`
above) but not yet AI-creatable; the assistant may wire `showModal`/`hideModal` interactions to
existing popup ids, but cannot create or edit a `PopupDefinition`.

> Planned: [docs/roadmap/04-popup-modal/04-ai-popup-generation.md](../../docs/roadmap/04-popup-modal/04-ai-popup-generation.md)
> proposes a template-based `CREATE_POPUP_FROM_TEMPLATE` command as a safe, structured way for the LLM
> to create popups without ever authoring a raw `PopupDefinition`.

---

## AI Tools (text rewrite / tone)

`AIToolsPopover.tsx` + `ai-tools-config.ts` offer quick text operations on the selected node's rich
text: rewrite, and tone presets (`AI_TONES` — friendly, formal, humorous, urgent, expert, each with a
`promptInstruction` string). These are plain-array exports, meant to be extended or replaced by a host
app without touching internals (see the file's doc comment for the extension pattern).

## AI Section Popover

`AISectionPopover.tsx` + `ai-section-config.ts` (`AI_SECTION_ACTIONS`) offer one-click section
generation presets (hero, header, features, stats, testimonials, ...) via `promptTemplate` strings,
plus a custom-prompt sub-view (the action with `isCustom: true`). Generation goes through the regular
`/api/ai/chat` path (not the full-page SSE pipeline), scoped to a single section's subtree.

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

_For the command system that processes AI suggestions, see [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md).
For the component registry that feeds `availableComponents`, see [DATA_MODEL.md](./DATA_MODEL.md).
For the popup system referenced by `availablePopups`/`showModal`/`hideModal`, see [POPUPS.md](./POPUPS.md)._

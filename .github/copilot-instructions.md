# UI Builder — Copilot Instructions

Monorepo library (Turborepo + pnpm). Drag-and-drop web interface builder (LadiPage/Webflow-style).
Full spec: `.claude/ARCHITECTURE.md` (overrides) + `.claude/RULES.md` (baseline).

---

## Package Structure & Dependency Rules

```
builder-core        ← framework-agnostic engine (NO React/DOM/browser APIs)
builder-react       ← React adapter (depends on builder-core)
builder-editor      ← visual editor (depends on builder-core, builder-react, ui)
builder-renderer    ← production renderer (depends on builder-core, builder-react)
packages/ui         ← shadcn-based design system (used by editor only)
packages/shared     ← shared types/utils/constants
apps/playground     ← dev playground
```

**Hard constraints:**
- `builder-core` MUST NOT import React, DOM, or any browser API
- Import design system from `packages/ui`, NOT `@sth87/shadcn-design-system`
- `builder-renderer` must be independently installable — no editor code in its bundle
- All state changes go through **Commands** — no direct state mutation ever

---

## Core Data Types

```ts
interface BuilderNode {
  id: string;                    // UUID v4
  type: string;                  // component type key
  parentId: string | null;
  order: number;                 // sibling order (higher = on top for z-index)
  props: Record<string, unknown>;
  style: StyleConfig;
  responsiveStyle: Partial<Record<'desktop'|'tablet'|'mobile', Partial<StyleConfig>>>;
  interactions: InteractionConfig[];
  locked?: boolean;
  hidden?: boolean;
  name?: string;
  metadata: { createdAt: string; updatedAt: string; pluginData?: Record<string, unknown> };
}

interface BuilderDocument {
  id: string;
  schemaVersion: string;
  nodes: Record<string, BuilderNode>;
  rootNodeId: string;
  breakpoints: BreakpointConfig[];
  variables: Record<string, VariableDefinition>;
  assets: AssetManifest;
  canvasConfig: CanvasConfig;
}

type Breakpoint = 'desktop' | 'tablet' | 'mobile';
// Rendering: resolveStyle = base style + active breakpoint override (shallow merge)
// node.style = base; node.responsiveStyle[bp] = per-breakpoint overrides
```

---

## Command System

All state changes go through `builder.dispatch(command)`. Commands are reversible (undo/redo).

```ts
interface Command<T = unknown> {
  type: string;
  payload: T;
  groupId?: string;      // group commands into atomic transaction
  description?: string;
}
```

**Built-in commands:**

| Type | Key payload fields |
|---|---|
| `ADD_NODE` | `{ parentId, componentType, props?, style?, insertIndex? }` |
| `REMOVE_NODE` | `{ nodeId }` |
| `MOVE_NODE` | `{ nodeId, targetParentId, insertIndex? }` |
| `REORDER_NODE` | `{ nodeId, insertIndex }` — DOM layout reorder |
| `DUPLICATE_NODE` | `{ nodeId, offset? }` |
| `UPDATE_PROPS` | `{ nodeId, props }` |
| `UPDATE_STYLE` | `{ nodeId, style, breakpoint? }` |
| `UPDATE_RESPONSIVE_STYLE` | `{ nodeId, breakpoint, style }` |
| `UPDATE_INTERACTIONS` | `{ nodeId, interactions }` |
| `RENAME_NODE` | `{ nodeId, name }` |
| `LOCK_NODE` / `UNLOCK_NODE` | `{ nodeId }` |
| `HIDE_NODE` / `SHOW_NODE` | `{ nodeId }` |
| `GROUP_NODES` | `{ nodeIds, containerType? }` |
| `UNGROUP_NODES` | `{ nodeId }` |
| `UPDATE_CANVAS_CONFIG` | `{ config }` |
| `SET_BREAKPOINT` | `{ breakpoint }` — editor-only, no undo |
| `TOGGLE_RESPONSIVE_HIDDEN` | `{ nodeId, breakpoint }` |
| `UPDATE_RESPONSIVE_PROPS` | `{ nodeId, breakpoint, props }` |
| `RESET_RESPONSIVE_STYLE` | `{ nodeId, breakpoint }` |
| `ENTER_TEXT_EDIT` / `EXIT_TEXT_EDIT` | `{ nodeId }` — no undo |
| `SELECT_NODE` / `DESELECT_NODE` / `CLEAR_SELECTION` | editor-only, no undo |
| `SET_CLIPBOARD` | `{ data }` — editor-only, no undo |

**Z-index stacking** (Bring Forward/Send Backward): use `UPDATE_STYLE { zIndex }` with groupId for siblings — NOT `REORDER_NODE`.
`REORDER_NODE` is for layer tree drag-drop (DOM layout order).

---

## State Model

```ts
interface BuilderState {
  document: BuilderDocument;
  editor: {
    selectedNodeIds: string[];
    hoveredNodeId: string | null;
    activeBreakpoint: Breakpoint;
    activeTool: 'select' | 'pan' | 'insert' | 'comment';
    zoom: number;                  // range 0.1–4.0
    panOffset: Point;
    clipboard: ClipboardData | null;
  };
  interaction: { dragOperation, resizeOperation, isMultiSelecting, multiSelectRect };
  ui: { panels: PanelState; notifications: Notification[] };
}
```

---

## ComponentDefinition Protocol

```ts
interface ComponentDefinition {
  type: string;           // unique key e.g. "text-block"
  name: string;
  category: string;
  version: string;
  capabilities: ComponentCapabilities;
  propSchema: PropSchema[];
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;
}
// Missing component → render UnknownComponentPlaceholder, never throw
// Render error → render ErrorPlaceholder, emit component:render-error
```

---

## Key Architecture Notes (from bug fixes)

- **StrictMode resilience**: `createBuilder.ts` uses `ensureBridge()` — re-registers `command:executed` listener after destroy+re-subscribe cycles
- **NodeRenderer**: NEVER dispatch during render — use `useEffect` for error reporting
- **z-index ordering**: `sort((a,b) => a.order - b.order)` → higher `order` = renders last = on top
- **z-index fallback**: Use `Number(style.zIndex ?? node.order)` — never `?? 0` (collapses all to same)
- **Auto-pan**: `BuilderEditor.tsx` detects drag outside canvas bounds and pans to keep component visible
- **borderWidth/borderColor/borderStyle** are in `StyleConfig`
- **InteractionConfig** requires `id` field (`crypto.randomUUID()`)
- **Boolean()** wrapper needed for `unknown` props in JSX conditionals

---

## File Lookup

| Looking for | Go to |
|---|---|
| Document model types | `packages/builder-core/src/document/` |
| Command definitions & handlers | `packages/builder-core/src/commands/` |
| State management | `packages/builder-core/src/state/` |
| Event bus | `packages/builder-core/src/events/` |
| Responsive breakpoints | `packages/builder-core/src/responsive/` |
| React hooks | `packages/builder-react/src/hooks/` |
| Builder context/provider | `packages/builder-react/src/context/` |
| Canvas zoom/pan/grid | `packages/builder-editor/src/canvas/` |
| Drag-and-drop | `packages/builder-editor/src/` (BuilderEditor.tsx) |
| Selection/resize/snap overlays | `packages/builder-editor/src/overlay/` |
| Snap engine | `packages/builder-editor/src/snap/` |
| Property panel | `packages/builder-editor/src/panels/` |
| Context (quick action) toolbar | `packages/builder-editor/src/toolbar/` |
| Keyboard shortcuts | `packages/builder-editor/src/shortcuts/` |
| Design system components | `packages/ui/src/components/` |
| Shared types | `packages/shared/src/` |
| i18n translations | `packages/builder-editor/src/i18n/` |

---

## Code Conventions

- **TypeScript strict mode** — no `any`, use `unknown` + type guards
- **`interface`** for object shapes; **`type`** for unions/utilities
- **`import type`** for type-only imports
- Import from `packages/ui`: `import { Button } from "@ui/components/button"`
- **`cn()`** from `packages/ui` for conditional classes
- File naming: `PascalCase.tsx` (components), `camelCase.ts` (hooks/utils), `use` prefix (hooks)
- i18n: ALL user-facing strings via `t('key')` — update both `en.json` and `vi.json`
- Conventional commits: `feat:`, `fix:`, `refactor:`, `chore:`

---

## Shared Logic Rule

Common configuration for a component type **must use shared hooks/utilities** — never duplicate across UI surfaces (property panel vs toolbar vs menubar). Shared hooks live in `packages/builder-react/src/hooks/`.

---

## Build Commands

```bash
pnpm build          # build all packages
pnpm typecheck      # TypeScript check (must pass before done)
pnpm lint           # ESLint (must pass before done)
pnpm test           # Vitest (must pass before done)
```

Build order: `shared` → `ui` → `builder-core` → `builder-react` → `builder-editor` + `builder-renderer` → `playground`

---

## Task Completion Contract

A task is **done** only when ALL of these pass (agent must actually run them):
```bash
pnpm typecheck   # zero TypeScript errors
pnpm lint        # zero ESLint errors
pnpm test        # all Vitest tests pass
```
Never declare done based on code review alone.

---

## Feature Implementation Checklists

### New UI Component or Panel
- [ ] Exported from the package `index.ts`
- [ ] All user-facing strings use `t('key')` — no hardcoded strings
- [ ] Translation keys added to **both** `en.json` and `vi.json` simultaneously
- [ ] Empty/placeholder state handled (no selected node case)
- [ ] Keyboard navigation works (Tab, Escape)

### New Command
- [ ] Command type constant added to `built-in.ts` (and payload interface if needed)
- [ ] Forward handler implemented in `handlers.ts`
- [ ] Inverse (undo) handler implemented in `handlers.ts`
- [ ] Handler registered in `registerAllHandlers()`
- [ ] Unit test added

### New Builder Component Type
- [ ] `ComponentDefinition` with complete `propSchema`, `defaultProps`, `capabilities`, `editorRenderer`, `runtimeRenderer`
- [ ] Registered in component registry
- [ ] At least one preset created (recommended)

### New AI Provider or Model
- [ ] Add provider to `AIProvider` type union in `packages/builder-editor/src/ai/types.ts`
- [ ] Implement fetch-based adapter in `AIService.ts` (no SDK — raw `fetch` only)
- [ ] Add provider + model options to `AIConfig.tsx` settings panel
- [ ] Add translation keys for provider/model labels to `en.json` + `vi.json`
- [ ] Update `buildAIContext.ts` if new context fields are needed
- [ ] Update `.claude/docs/AI_ASSISTANT.md` — Provider Adapters section

### i18n Additions
- [ ] Keys added to `en.json` first, then same keys to `vi.json`
- [ ] Key format: `{namespace}.{feature}.{label}` e.g. `ai.providers.openai`
- [ ] Both files kept in sync — no key missing from either

---

## Documentation Update Rules

When adding a feature, update the corresponding `.claude/docs/` file:

| Feature type | Doc file |
|---|---|
| New command type | `COMMAND_SYSTEM.md` |
| New component capability | `DATA_MODEL.md` |
| New UI panel / toolbar | `EDITOR_UI.md` |
| New rendering behavior | `RUNTIME.md` |
| New plugin hook / API | `PLUGINS.md` |
| New keyboard shortcut | `EDITOR_UI.md` |
| New event emission | `INTEGRATION.md` |
| New error boundary scenario | `ACCESSIBILITY.md` |
| AI provider / model change | `AI_ASSISTANT.md` |

**Rules:**
- `ARCHITECTURE.md` and `RULES.md` may **never** be modified by AI — propose via PR description only
- `README.md` stays <100 lines — no detailed specs, gateway links only
- Update docs **before** refactoring, **after** new features

---

## Code Review Checklist (Every Change)

| Item | Check |
|---|---|
| Shared logic duplication | Same logic in 2+ places? Extract to shared hook |
| i18n | New UI text? Add keys to both locale files |
| Type contracts | Interface changed? Check all usages |
| Event emissions | State changed? Emit corresponding EventBus event |
| Undo/redo support | New command? Inverse command implemented? |
| Error boundary | New component? Wrapped with error boundary? |
| Responsive | Style logic? Handle all 3 breakpoints |
| A11y | New interactive element? ARIA label/role added? |

---

## Key Anti-patterns (Never Do)

- `any` type → use `unknown` + type guard
- Dispatch during render → use `useEffect`
- Direct state mutation → always use Commands
- `?? 0` as z-index fallback → use `?? node.order`
- Duplicate logic across property panel + toolbar → extract shared hook
- Hardcoded user-facing strings → always `t('key')`
- Array index as `key` prop in dynamic lists → use stable unique ID
- `export * from` in deeply nested modules → explicit named exports
- Importing `packages/ui` as `@sth87/shadcn-design-system` → use `@ui/components/...`
- Modifying `ARCHITECTURE.md` / `RULES.md` directly → propose in PR

---

## Task → Files Map (Read Only What's Needed)

Before starting any task, read **only** the files listed for that task type.

| Task | Files to read |
|---|---|
| Add/fix a command handler | `commands/built-in.ts`, `commands/handlers.ts`, `commands/types.ts` |
| Fix a canvas interaction (drag/resize/pan) | `BuilderEditor.tsx`, `overlay/`, `snap/SnapEngine.ts` |
| Add/edit a property control | `properties/PropertyDescriptor.ts`, `panels/right/PropertyPanel.tsx`, `builder-react/hooks/useNodeProperty.ts` |
| Add a new panel or sidebar tab | `panels/left/LeftSidebar.tsx` or `panels/right/PropertyPanel.tsx`, `i18n/en.json`, `i18n/vi.json` |
| Fix responsive/breakpoint behavior | `responsive/resolver.ts`, `responsive/types.ts`, `commands/handlers.ts` (`UPDATE_STYLE` handler) |
| Add/change AI provider or model | `ai/types.ts`, `ai/AIService.ts`, `ai/AIConfig.tsx`, `i18n/en.json`, `i18n/vi.json` |
| Fix AI suggestion/context | `ai/buildAIContext.ts`, `ai/AIService.ts` |
| Add a React hook | `builder-react/src/hooks/`, `builder-react/src/index.ts` |
| Add a component to the registry | `registry/ComponentRegistry.ts`, `components/sample-components.tsx` (playground) |
| Add a preset | `presets/PresetRegistry.ts`, `presets/types.ts` |
| Fix z-index / layer ordering | `BuilderEditor.tsx` (onMoveUp/onMoveDown), `overlay/SelectionOverlay.tsx`, `commands/handlers.ts` (`REORDER_NODE`) |
| Add/fix keyboard shortcut | `shortcuts/`, `BuilderEditor.tsx` |
| Edit i18n strings | `i18n/en.json` + `i18n/vi.json` (always both) |
| Fix NodeRenderer render error | `builder-react/src/components/NodeRenderer.tsx` |
| Fix build/type errors | Run `pnpm typecheck` first to see exact files with errors |

---

## Implementation Progress

All 7 packages build cleanly. Phases completed:
- **Core engine**: 30 command handlers, createBuilder with StrictMode resilience
- **Canvas interactions**: selection, drag-drop, snap, resize, rotate, keyboard shortcuts, auto-pan
- **Property system**: PropertyDescriptor, useNodeProperty, PropertyControls (11 controls), PropertyPanel (5 tabs)
- **Panel system**: PresetPalette, LeftSidebar (4 tabs), MediaManager
- **i18n**: i18next, en.json + vi.json (~300 keys each)
- **AI Assistant**: AIService (OpenAI/Gemini/Claude), AIAssistant chat UI, AIConfig panel
- **Responsive**: 3-tier breakpoints (desktop/tablet/mobile), per-breakpoint style overrides

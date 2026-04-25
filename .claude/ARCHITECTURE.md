# Project Architecture

> **This file is project-specific.** It describes the architecture, features, and technical decisions of this project.
> It may **override or extend** sections from `RULES.md` — see the override mechanism in [Rules Reference](#rules-reference).
>
> **Version:** 1.2 | **Last updated:** 2026-04 | **Updated by:** Tech Lead
> **Changelog:**
> - v1.3 — Implemented **Spatial Reparenting**: Component ownership is now determined by geometric position (hit-testing) rather than DOM hierarchy. Updated AI prompts to enforce strict `parentId` assignment to sections, preventing "root" clutter.
- v1.2 — Added `builder-components` package (17 built-in ComponentDefinitions, `extendComponent()`, `BASE_COMPONENTS[]`); updated architecture diagram, dependency rules, and package table; added Built-in Component Library section
> - v1.1 — Expanded with comprehensive type contracts, design principles, command system, panel specs, event catalogue, error boundaries, and keyboard shortcuts from Technical Specification v2.1

---

## Project Overview

**Project Name:** `UI Builder Library`
**App Type:** `Monorepo (Turborepo + pnpm workspaces)`
**Description:** A modular, extensible UI Builder Library that allows users to drag-and-drop to create web interfaces. The library is designed as a **platform**, not just a component set. This spec covers the **library layer only** — backend services (manifest API, CDN, auth, persistence) are out of scope but integration contracts are defined.

### Target Users

- **Developers** integrating the builder into their products via library packages
- **End users** (non-technical) who drag-and-drop components to create web layouts
- **Plugin developers** extending the builder with custom components, panels, and behaviors

### Key Features

- **Visual Canvas Editor:** Drag-and-drop canvas with zoom/pan/scroll, grid overlay, ruler, helper lines, and multi-breakpoint responsive preview (desktop/tablet/mobile)
- **Component System:** Registry-based architecture — all components registered via `ComponentDefinition` protocol with type-safe prop schemas, lifecycle hooks, and A11y config
- **Smart Interaction:** Snap & alignment engine (edge/center/grid/spacing snap), rubber-band multi-selection, resize with aspect-ratio lock, context toolbar (quick actions)
- **State & Command System:** Command-pattern state management with full undo/redo history, grouped atomic transactions, and serializable history
- **Plugin & Extension System:** First-class plugin API — register components, panels, tabs, toolbar items, commands, shortcuts, snap targets, and layout rules
- **Dynamic Component Loading:** Remote component loading from external services with manifest-based discovery, sandboxed execution, and SRI hash verification
- **Import/Export:** JSON schema import/export, HTML export, asset bundling (ZIP)

### Brand Assets

- **Favicon & Logo**: Always use the `favicon` and `logo` files located in the `assets` folder as the official favicon and logo for the project.

| File                      | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `docs/assets/favicon.ico` | Browser tab icon                        |
| `docs/assets/logo.svg`    | Project logo — used in header, etc.     |

---

## Rules Reference

**RULES.md version in use:** `2.0`
**Source:** `.claude/RULES.md`

### Active Overrides & Extensions

| Section in RULES.md | Type      | Override / Extension detail                                                                                                          |
| -------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Tech Stack           | OVERRIDES | This project is a library — no Next.js, no backend framework. Core package is framework-agnostic (no React/DOM dependency)           |
| Project Structure    | OVERRIDES | Monorepo structure follows library package layout (`packages/builder-*`) instead of `apps/` + `packages/` pattern                     |
| Design System        | OVERRIDES | Uses shadcn (via `packages/ui`) as internal design system for editor UI, not `@sth87/shadcn-design-system`                            |
| State Management     | OVERRIDES | Uses custom Command-pattern state engine (`builder-core`) instead of Zustand. Event bus for cross-package communication               |
| Testing              | EXTENDS   | `builder-core` must be unit-testable without DOM. Command system tested as pure function: state + command → expected output           |
| Code Size            | EXTENDS   | Performance-critical modules (snap engine, render pipeline) may exceed default line limits with documented justification               |

---

## Core Design Principles

These principles govern all architectural decisions in the project:

1. **Component-driven** — No component is hardcoded. All must be registered via `builder.registerComponent(definition)`. Components can be registered, unregistered, and queried at runtime.

2. **Schema-driven UI** — `BuilderDocument` schema is the single source of truth for both rendering and editing. The renderer produces UI solely from schema, no additional config needed.

3. **Plugin-first** — Every non-core feature must be implementable as a plugin. Core exposes a stable, independently-versioned plugin API. Plugins cannot access core internal state outside of `PluginAPI`.

4. **Framework-agnostic core** — `builder-core` can work with any framework (React, Vue, Svelte, vanilla JS) without modification.

5. **Contract-first interfaces** — Every package boundary must be defined as a TypeScript interface contract before implementation. These contracts are immutable unless version-bumped.

6. **Fail-safe degradation:**
   - Missing component definition → render `UnknownComponentPlaceholder`, never throw
   - Plugin load fail → continue without that plugin, emit diagnostic event
   - Remote component load fail → render `RemoteComponentErrorPlaceholder`
   - Command fail → state unchanged, emit `command:error`

7. **Extension-first panel system** — Editor panels (left, right, top, bottom) are extensible — plugins can add panels, tabs, or controls without modifying core editor code.

---

## Architecture

### App Type & Pattern

**App type:** Monorepo — Library packages (not application)

**Architecture pattern:** Layered package architecture with strict dependency rules

```
┌─────────────────────────────────────────────────────────┐
│                   Consumer Application                   │
├─────────────────────────────────────────────────────────┤
│ builder-editor  │ builder-presets  │ builder-renderer    │
│ (Visual editor) │ (Preset mgmt UI) │ (Runtime renderer)  │
├────────────────┴──────────────────┴─────────────────────┤
│                    builder-react                          │
│         (React adapter — hooks, context, provider)        │
├──────────────────────────────────────────────────────────┤
│                  builder-components                       │
│  (17 built-in ComponentDefinitions + extendComponent())   │
├──────────────────────────────────────────────────────────┤
│                    builder-core                           │
│   (Framework-agnostic engine — state, commands, events)   │
├──────────────────────────────────────────────────────────┤
│                    packages/ui                            │
│         (shadcn-based design system for editor UI)        │
└──────────────────────────────────────────────────────────┘
```

### Package Dependency Rules

```
builder-core           ← no dependencies (framework-agnostic)
builder-components     ← depends on builder-core only (NO React/DOM in runtime)
builder-react          ← depends on builder-core
builder-presets        ← depends on builder-core, builder-react, builder-components, builder-renderer, packages/ui
builder-editor         ← depends on builder-core, builder-react, builder-components, packages/ui
builder-renderer       ← depends on builder-core, builder-react
```

| Package                | Role                                                        | Output           | Peer deps   |
| ---------------------- | ----------------------------------------------------------- | ---------------- | ----------- |
| `builder-core`         | Central engine — framework-agnostic                         | ESM + CJS        | none        |
| `builder-components`   | 17 built-in ComponentDefinitions + `extendComponent()`      | ESM + CJS        | React ≥18   |
| `builder-react`        | React adapter layer                                         | ESM only         | React ≥18   |
| `builder-presets`      | Preset catalog UI — catalog browser, preset editor, prop controls | ESM + CJS | React ≥18   |
| `builder-editor`       | Visual editor — canvas, panels, drag-drop, toolbar          | ESM + CSS bundle | React ≥18   |
| `builder-renderer`     | Runtime renderer — production, no editor code               | ESM              | React ≥18   |
| `packages/ui`          | shadcn-based design system for editor UI components         | ESM              | React ≥18   |

**Hard constraints:**
- `builder-core` MUST NOT have any runtime dependency on React, DOM, or browser APIs
- `builder-components` depends ONLY on `builder-core` — no DOM or browser APIs in component logic
- All DOM interaction must go through adapters in `builder-react` or `builder-editor`
- `builder-renderer` must be independently installable — no editor code in its bundle

### Data Flow

```
[Inputs]
Document Schema → builder-core (parse, validate, migrate)
Component Defs  → ComponentRegistry
Plugins         → PluginEngine
Runtime Context → BuilderState

[Core loop]
User action → Command → CommandEngine → StateManager → EventBus
EventBus → builder-react (subscription) → React re-render
EventBus → builder-editor (overlay, panel refresh)

[Outputs]
builder-renderer → Runtime UI (production)
builder-editor   → Editor UI (authoring)
StateManager     → Updated Document Schema
EventBus         → Interaction Events
```

### Rendering Pipeline

```
Document
  → Node tree traversal (depth-first)
    → Component resolution (registry lookup → fallback if not found)
    → Props resolution (defaults merge + node props)
    → Style resolution (base + responsive merge by breakpoint)
    → Interaction binding
    → Render call (editorRenderer | runtimeRenderer)
      → Output DOM
```

**Editor rendering** uses two separate layers:
- **Document layer** — renders actual component tree using `editorRenderer` (WYSIWYG canvas)
- **Overlay layer** — renders selection boxes, resize handles, hover highlights, snap guides, helper lines, drop indicators. `position: absolute` on top, `pointer-events` managed to not block component interaction.

**Runtime rendering** must: resolve components from registry, merge base + responsive styles, bind interactions, render via `runtimeRenderer`, never include editor code in bundle.

---

## Built-in Component Library (`builder-components`)

Package `@ui-builder/builder-components` provides the official set of base component definitions. It depends only on `builder-core` and exposes:

- **`BASE_COMPONENTS: ComponentDefinition[]`** — aggregate array of all 17 definitions, ready to pass to `builder.registerComponent()`
- **`extendComponent(base, overrides)`** — shallow-merge utility for deriving a new `ComponentDefinition` from an existing one (overrides fully replace `propSchema` / `capabilities` when provided)
- **Re-exports `defineComponent`** from `builder-core` for convenience

### Built-in Components (17)

| Type | Category | Can contain children |
| --- | --- | --- |
| `section` | Layout | ✓ |
| `container` | Layout | ✓ |
| `grid` | Layout | ✓ |
| `column` | Layout | ✓ |
| `text` | Content | — |
| `button` | Content | — |
| `image` | Media | — |
| `divider` | Content | — |
| `text-marquee` | Content | — |
| `collapsible-text` | Content | — |
| `text-mask` | Content | — |
| `gallery-grid` | Media | — |
| `gallery-slider` | Media | — |
| `shape` | Decorative | — |
| `navigation-menu` | Navigation | — |
| `repeater` | Data | ✓ |
| `anchor` | Navigation | — |

### Usage Pattern

```ts
import { BASE_COMPONENTS, extendComponent } from '@ui-builder/builder-components';

// Register all built-in components
BASE_COMPONENTS.forEach(def => builder.registerComponent(def));

// Extend a built-in to create a custom variant
const HeroBanner = extendComponent(TextComponent, {
  type: 'hero-banner',
  name: 'Hero Banner',
  defaultProps: { text: 'Welcome', fontSize: 48 },
});
```

> Project-specific / playground-only custom components live in `apps/playground/src/components/sample-components.tsx` and follow the same `ComponentDefinition` protocol.

### Image Component — Filter System

**Location:** `packages/shared/src/imageFilters.ts` (source of truth), `packages/builder-components/src/components/Image.tsx`, `packages/builder-editor/src/panels/ImageFilterPicker.tsx`

The Image component includes a sophisticated **39-filter preset system** supporting Instagram-style effects via three rendering modes:

#### Filter Modes

| Mode | Technique | Examples |
|------|-----------|----------|
| **CSS** | Direct CSS `filter` property chain | Kennedy, Darken, Lighten, Orca, Gotham |
| **SVG** | SVG `<feColorMatrix>` + `feOffset` for complex effects | 3D (anaglyph split channel), Ink (high-contrast grayscale) |
| **Overlay** | CSS filter on `<img>` + color `<div>` with `mix-blend-mode` | Hulk (green multiply), Marge (yellow), Lucille (red), Barney (purple), Neptune (blue), etc. |

#### Filter List (39 presets)

```
Row 1:  None, Kennedy, Darken
Row 2:  Blur, Lighten, Faded
Row 3:  Kerouac, Orca, Sangria
Row 4:  Gotham, Nightrain, Whistler
Row 5:  Feathered, Soledad, Goldie
Row 6:  3D, Ink, Manhattan
Row 7:  Gumby, Organic, Elmo
Row 8:  Neptune, Jellybean, Neon Sky
Row 9:  Hulk, Bauhaus, Yoda
Row 10: Midnight, Unicorn, Blue Ray
Row 11: Malibu, Red Rum, Flamingo
Row 12: Hydra, Kool-Aid, Barney
Row 13: Pixie, Marge, Lucille
```

#### Architecture Notes

- **Shared definition:** `IMAGE_FILTERS: ImageFilter[]` in `@ui-builder/shared` (no React/DOM deps)
  - Both `builder-components` and `builder-editor` import from shared
  - Helper functions: `getFilterDef()`, `buildCssFilter()`, `collectSvgFilterDefs()`
- **SVG filter injection:** Hidden `<svg>` with `<defs>` rendered inline in containers (both editor and runtime)
  - Anaglyph 3D uses `feOffset` to split red channel left, cyan right
  - Ink uses `feComponentTransfer` for ultra-high contrast
- **Overlay rendering:** Filter definition includes `overlayColor`, `overlayOpacity`, `overlayBlend` for duotone effects
  - Applied as a positioned `<div>` on top of `<img>` with `mix-blend-mode: multiply | soft-light`
- **Preview:** `ImageFilterPicker` component (editor) renders 3×N grid with live preview swatches showing applied filter
  - Each swatch shows both CSS/SVG effect AND overlay layer correctly

#### Usage in Image Component

```tsx
// Get filter definition by stored key
const filterDef = getFilterDef(node.props.filter);  // e.g. "hulk"

// Build CSS filter string (handles all 3 modes)
const cssFilter = buildCssFilter(filterDef);  // "url(#if-3d)" or "saturate(...)" or "contrast(...)"

// Render overlay if needed
{filterDef?.mode === "overlay" && (
  <div style={{
    backgroundColor: filterDef.overlayColor,
    opacity: filterDef.overlayOpacity,
    mixBlendMode: filterDef.overlayBlend,
    mixBlendMode: filterDef.overlayBlend,
  }} />
)}
```

### Media Management System

**Location:** `packages/builder-editor/src/panels/MediaManager.tsx`, `packages/builder-core/src/document/assets.ts`, `apps/api/src/routes/media.routes.ts`

The Media Management system provides a **unified UI for browsing, uploading, and selecting media assets** (images, videos, fonts, files) in the builder canvas.

#### Architecture

- **Frontend UI:** `MediaManager` dialog component with 3 tabs
  - **Library:** Browse existing assets, search/filter, select, delete
  - **Upload:** Drag-and-drop file upload with per-file progress tracking
  - **URL:** Paste external URLs (auto-detect type by extension)
- **Backend API:** Express routes at `/api/media/upload`, `/api/media/:id`, `/api/media`
  - File storage in `apps/api/uploads/`
  - Metadata persisted in `apps/api/uploads/metadata.json`
  - Max 50 MB per file, whitelist of allowed MIME types
- **Type contracts in `builder-core`:** `Asset`, `AssetType`, `AssetManifest`, `AssetProvider`, `MediaRef`
  - Zero DOM deps — used in server-side contexts
  - Extensible via `AssetProvider` interface for custom sources (S3, Cloudinary, etc.)

#### Key Interfaces

```ts
interface Asset {
  id: string;
  type: "image" | "video" | "font" | "file" | "icon";
  name: string;
  url: string;                    // Resolved URL
  thumbnailUrl?: string;
  size?: number;                  // Bytes
  dimensions?: { width: number; height: number };
  mimeType?: string;
  uploadedAt?: string;
  tags?: string[];
  source: "local" | "url" | string;  // Provider ID
}

interface MediaRef {
  assetId?: string;               // ID in document's AssetManifest
  url: string;                    // Always present
  alt?: string;
  focalPoint?: { x: number; y: number };  // Smart crop 0–1 fractions
}

interface AssetProvider {
  id: string;
  name: string;
  supportedTypes: AssetType[];
  listAssets(query: AssetQuery): Promise<AssetListResult>;
  upload?(file: Uploadable): Promise<Asset>;
  delete?(assetId: string): Promise<void>;
}
```

#### Integration with Image Component

Image component `src` prop accepts either:
- Direct URL: `"https://example.com/photo.jpg"`
- `MediaRef` with focal point: `{ assetId: "uuid", url: "...", focalPoint: {x:0.5, y:0.5} }`

When user clicks **Image → Open media manager**, the `MediaManager` dialog opens for selection.

#### Data Flow (Upload)

```
Drag file → handleDrop() → queue with preview → sequential upload
  → POST /api/media/upload → file stored, metadata saved
  → status: pending → uploading → done/error
  → after all: switch to Library tab, show new assets
```

---

## Document Model (Core Type Contracts)

> These types are from the spec and are considered **immutable** contracts. AI Agent must reference these when implementing.

### BuilderNode

```ts
interface BuilderNode {
  id: string;                    // UUID v4, globally unique
  type: string;                  // component type key
  parentId: string | null;       // null = root node
  order: number;                 // sibling order
  props: Record<string, unknown>;
  style: StyleConfig;
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  interactions: InteractionConfig[];
  slot?: string;                 // named slot in parent
  locked?: boolean;              // locked = no select, no move
  hidden?: boolean;              // hidden on canvas and runtime
  name?: string;                 // human-readable label in layer panel
  metadata: NodeMetadata;
}

interface NodeMetadata {
  createdAt: string;
  updatedAt: string;
  pluginData?: Record<string, unknown>;  // plugin-owned metadata per namespace
  tags?: string[];
}
```

### BuilderDocument

```ts
interface BuilderDocument {
  id: string;
  schemaVersion: string;         // semver e.g. "2.1.0"
  createdAt: string;             // ISO 8601
  updatedAt: string;
  name: string;
  description?: string;
  nodes: Record<string, BuilderNode>;
  rootNodeId: string;
  breakpoints: BreakpointConfig[];
  variables: Record<string, VariableDefinition>;
  assets: AssetManifest;
  plugins: PluginReference[];
  canvasConfig: CanvasConfig;
  metadata: DocumentMetadata;
}
```

### StyleConfig (key properties)

Covers: box model (margin, padding, width/height, min/max), typography (fontSize, fontWeight, fontFamily, lineHeight, color, textAlign), layout (display, flex*, grid*, gap), visual (background, border, borderRadius, boxShadow, opacity, overflow), filters (filter, backdropFilter), position (position, top/left/right/bottom, zIndex), transform (transform, transition).

### Responsive Configuration

```ts
type Breakpoint = 'desktop' | 'tablet' | 'mobile';

const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { breakpoint: 'desktop', label: 'Desktop', minWidth: 1024, icon: 'monitor' },
  { breakpoint: 'tablet', label: 'Tablet', minWidth: 768, maxWidth: 1023, icon: 'tablet' },
  { breakpoint: 'mobile', label: 'Mobile', minWidth: 0, maxWidth: 767, icon: 'smartphone' },
];
```

Custom breakpoints are configurable per-builder-instance, overriding defaults.

---

## Component Protocol

### ComponentDefinition (key fields)

```ts
interface ComponentDefinition {
  type: string;                  // unique key, e.g. "text-block"
  name: string;                  // human-readable
  category: string;              // grouping in palette
  version: string;               // semver
  icon?: string;
  capabilities: ComponentCapabilities;
  propSchema: PropSchema[];      // drives dynamic property panels
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;
  containerConfig?: ContainerConfig;
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;
  quickActions?: QuickAction[];
  lifecycle?: ComponentLifecycle;
  a11y?: ComponentA11yConfig;
  editorConfig?: ComponentEditorConfig;
}
```

### ComponentCapabilities

```ts
interface ComponentCapabilities {
  canContainChildren: boolean;
  acceptedChildTypes?: string[];     // undefined = accept all
  canResize: boolean;
  canResizeWidth?: boolean;
  canResizeHeight?: boolean;
  maintainAspectRatio?: boolean;
  canRotate?: boolean;
  canTriggerEvents: boolean;
  canBindData: boolean;
  canBeHidden: boolean;
  canBeLocked: boolean;
  isRootEligible?: boolean;
  isDragDisabled?: boolean;
  isDropDisabled?: boolean;
}
```

### PropSchema Types

Supported prop types for dynamic property panel generation: `string`, `number`, `boolean`, `select`, `color` (+ gradient/transparent), `image`, `video`, `richtext`, `data-binding`, `json`, `spacing`, `border`, `shadow`, `icon`, `font`, `slider`, `group` (nested props with collapsible UI).

### ContainerConfig & Layout Types

`containerConfig` on a `ComponentDefinition` controls both drop behavior and drag-mode selection:

```ts
interface ContainerConfig {
  layoutType: 'flow' | 'flex' | 'grid' | 'absolute' | 'slot-based';
  disallowedChildTypes?: string[];   // component types blocked from dropping here
  emptyStateConfig?: { message: string; allowDrop: boolean };
}
```

| Layout       | Description                                                  |
| ------------ | ------------------------------------------------------------ |
| `flow`       | Block flow, children stack in document order                 |
| `flex`       | Flexbox — direction, wrapping, alignment configurable        |
| `grid`       | CSS grid — column/row templates configurable                 |
| `absolute`   | Free-form positioning with x/y coordinates                   |
| `slot-based` | Container defines named slots; children assigned to specific slot |

`layoutType: "flex"` or `"grid"` automatically activates **flow-mode drag** (preview clone + insert-line indicator) for static children. `layoutType: "absolute"` activates **absolute-mode drag** (snap guides + section reparenting). The system selects the mode automatically — no per-component drag code needed.

---

## State & Command System

### Command Interface

```ts
interface Command<T = unknown> {
  type: string;
  payload: T;
  description?: string;    // human-readable for history UI
  timestamp?: number;
  groupId?: string;         // group commands into atomic transaction
}

interface ReversibleCommand<T = unknown> extends Command<T> {
  getInverse(currentState: BuilderState): Command;
}
```

### Built-in Commands

| Command type              | Payload (key fields)                                                         | Description                     |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------- |
| `ADD_NODE`                | `{ parentId, componentType, props?, style?, position?, insertIndex? }`       | Add new node                    |
| `REMOVE_NODE`             | `{ nodeId }`                                                                 | Remove node and descendants     |
| `MOVE_NODE`               | `{ nodeId, targetParentId, position, insertIndex? }`                         | Move to different parent        |
| `REORDER_NODE`            | `{ nodeId, insertIndex }`                                                    | Reorder within same parent      |
| `DUPLICATE_NODE`          | `{ nodeId, offset? }`                                                        | Duplicate node + descendants    |
| `UPDATE_PROPS`            | `{ nodeId, props }`                                                          | Update component props          |
| `UPDATE_STYLE`            | `{ nodeId, style, breakpoint? }`                                             | Update style                    |
| `UPDATE_RESPONSIVE_STYLE` | `{ nodeId, breakpoint, style }`                                              | Style override for breakpoint   |
| `UPDATE_INTERACTIONS`     | `{ nodeId, interactions }`                                                   | Update interaction config       |
| `RENAME_NODE`             | `{ nodeId, name }`                                                           | Rename node                     |
| `LOCK_NODE` / `UNLOCK_NODE` | `{ nodeId }`                                                              | Lock/unlock node                |
| `HIDE_NODE` / `SHOW_NODE` | `{ nodeId }`                                                                | Hide/show node                  |
| `GROUP_NODES`             | `{ nodeIds, containerType? }`                                                | Group nodes into container      |
| `UNGROUP_NODES`           | `{ nodeId }`                                                                 | Ungroup container               |
| `SET_VARIABLE`            | `{ key, value }`                                                             | Update document variable        |
| `UPDATE_CANVAS_CONFIG`    | `{ config }`                                                                 | Update canvas settings          |
| `LOAD_COMPONENT`          | `{ manifestUrl, componentType }`                                             | Load remote component           |

### State Model

```ts
interface BuilderState {
  document: BuilderDocument;
  editor: EditorState;
  interaction: InteractionState;
  ui: UIState;
}

interface EditorState {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  activeBreakpoint: Breakpoint;
  activeTool: 'select' | 'pan' | 'insert' | 'comment';
  zoom: number;
  panOffset: Point;
  clipboard: ClipboardData | null;
}

interface InteractionState {
  dragOperation: DragOperation | null;
  resizeOperation: ResizeOperation | null;
  isMultiSelecting: boolean;
  multiSelectRect: Rect | null;
}

interface UIState {
  panels: PanelState;
  quickToolbar: QuickToolbarState;
  notifications: Notification[];
}
```

---

## History System

```ts
interface HistoryEntry {
  id: string;
  command: Command;
  inverseCommand: Command;   // precomputed on execute
  timestamp: number;
  groupId?: string;          // entries with same groupId undo/redo together
  description: string;       // label in history panel
}
```

**Requirements:**
- Undo/redo must be atomic with grouped commands
- History must be serializable (JSON-safe) for save/restore session
- Plugin commands must provide inverse command when registered
- Max history depth: configurable, default 100

---

## Drag-and-Drop System

### Architecture — Strategy Pattern

The drag system uses a **Strategy Pattern** to isolate each interaction mode. All implementation lives in `packages/builder-editor/src/dragdrop/`.

```
dragdrop/
  types.ts                  — DragContext, DragVisualState, DragStrategy, DropResolution
  DragCoordinator.ts        — selects active strategy (first canHandle() wins), delegates move/drop/cancel
  DropTargetResolver.ts     — pure drop-position math (no React, no side effects)
  strategies/
    FlowDragStrategy.ts     — flex/grid reorder + floating preview clone
    AbsoluteDragStrategy.ts — snap guides + section reparenting (catch-all)
```

**`useMoveGesture.ts`** is a thin React wrapper (~100 lines) that wires the coordinator into state. It registers `FlowDragStrategy` first, `AbsoluteDragStrategy` as catch-all, and returns the same public API as before. **Never modify `BuilderEditor.tsx`, `usePointerDown.ts`, or `dragUtils.ts`** — they are stable integration points.

**`useDragHandlers.ts`** handles palette drag (panel → canvas) independently. It imports `resolveContainerDropPosition` directly from `dragdrop/DropTargetResolver`.

### Interaction Modes

| Mode | Strategy | Triggered when |
|------|----------|----------------|
| Flow drag | `FlowDragStrategy` | Single node, static child of `flex`/`grid` parent |
| Absolute drag | `AbsoluteDragStrategy` | Everything else (absolute nodes, multi-select) |
| Palette drag | `useDragHandlers` | Dragging from AddElementsPanel |

### Key Contracts

- **`DragContext`** — immutable snapshot assembled once per gesture, passed to all strategy methods. Contains `frameEl`, `snapEngine`, `movingSnapshots`, `getContainerConfig`, etc.
- **`DragVisualState`** — pure data describing overlays: `snapGuides`, `distanceGuides`, `flowDropTarget`, `flowDragOffset`, `highlightedNodeIds`, `liveDimensions`.
- **`DropTargetResolver.resolveDropTarget()`** — walks `elementsFromPoint`, finds first valid flow/grid container, returns `DropResolution { parentId, insertIndex, gridCell?, indicator }`.
- **Section reparenting** — `AbsoluteDragStrategy.onDrop` calls `getDropTargetSection()` from `dragUtils.ts` to determine target section by geometric hit-test, then dispatches `UPDATE_STYLE` → `MOVE_NODE` → `REORDER_NODE` in sequence.
- **`useDropSlotResolver.ts`** is now a re-export shim — all logic is in `DropTargetResolver.ts`. Do not add logic back to it.

### Adding a New Drag Mode

1. Create `dragdrop/strategies/MyStrategy.ts` implementing `DragStrategy`
2. `canHandle(ctx)` returns true for the cases it owns
3. Register in `useMoveGesture.ts` `buildCoordinator()` **before** `AbsoluteDragStrategy`
4. Add tests in `dragdrop/__tests__/MyStrategy.test.ts`

```ts
type DropPosition = 'before' | 'after' | 'inside' | 'replace' | 'slot';

interface DragSource =
  | { type: 'existing-node'; nodeId: string }      // dragging node on canvas
  | { type: 'new-component'; componentType: string } // dragging from palette

interface DropTarget {
  nodeId: string;
  position: DropPosition;
  slotName?: string;
  insertIndex?: number;
}
```

**Validation rules:** All drops validated against `ContainerConfig` of target — type restrictions, max children limit, self-nesting prevention, slot availability. Invalid drops must show clear visual feedback (red color, forbidden icon).
**Spatial hit-testing:** Ownership for absolute-positioned components is determined by geometric overlap with `Section` containers, bypassing traditional DOM event bubbling to ensure robust nesting even when components overlap.

---

## Canvas & Viewport System

### Canvas Config

```ts
interface CanvasConfig {
  width?: number;              // px, undefined = fluid/responsive
  backgroundColor?: string;   // default '#ffffff'
  showGrid: boolean;           // default false
  gridSize: number;            // px, default 8
  snapEnabled: boolean;        // default true
  snapThreshold: number;       // px, default 6
  snapToGrid: boolean;
  snapToComponents: boolean;
  rulerEnabled: boolean;       // default false
  showHelperLines: boolean;    // default true
  helperLineColor?: string;
}
```

### Zoom & Pan

- Zoom range: 0.1 – 4.0, step 0.1
- Zoom into cursor position (not canvas center)
- `Ctrl+0` = fit to viewport, `Ctrl+1` = 100%
- Pan via Space+drag or middle mouse button
- Viewport must scroll when canvas content exceeds viewport

### Grid Rendering

- Grid renders only in editor mode, never in runtime
- Grid overlay uses CSS background pattern (not SVG/DOM elements per cell — performance)
- Two types: dot grid and line grid — configurable

### Helper Lines

Visual guides showing container boundaries (wrapper width, margin, etc.). Appear on hover/select of container nodes. Not rendered in runtime.

---

## Snap & Alignment Engine

### Snap Types

| Type          | Description                                                                    |
| ------------- | ------------------------------------------------------------------------------ |
| **Edge snap** | Snap edges of moving node to edges of other nodes in same container            |
| **Center snap** | Snap center of node to center of other nodes or container                    |
| **Grid snap** | Snap to grid lines when `snapToGrid = true`                                    |
| **Spacing snap** | Equal-spacing guides when distance between nodes is equal (Figma-style)     |

### Visual Indicators

- Render snap guide lines in primary color across canvas
- Show distance labels (px) for spacing snap
- Snap guides only visible in editor, never in runtime
- Snap calculation must complete within **<8ms per frame**

---

## Editor Panel System

### Panel Architecture

Panels are extensible — plugins can register panels, tabs, and controls without modifying core editor.

```ts
interface EditorPanel {
  id: string;
  position: 'left' | 'right' | 'bottom' | 'floating';
  title: string;
  icon?: string;
  defaultWidth?: number;
  resizable: boolean;
  collapsible: boolean;
  defaultVisible: boolean;
  render: (ctx: PanelContext) => ReactNode;
  order?: number;
}
```

### Left Panel — Component Palette

- Search components by name, tag, category
- Filter by category
- Component entry shows: icon, name, tooltip on hover
- Drag from palette to canvas creates new component
- Double-click adds to root container
- Loading/error states for remote components
- Favourite marking support

### Right Panel — Property Panel

Tab structure (all extensible by plugins):

| Tab            | Content                                                         |
| -------------- | --------------------------------------------------------------- |
| **Design**     | Props, style (size, spacing, typography, color, border, shadow) |
| **Events**     | Interaction config — trigger → action mapping                   |
| **Effects**    | Animation, transition, transform                                |
| **Data**       | Data binding, variables                                         |
| **Advanced**   | CSS class, custom attributes, SEO, A11y                         |

**Requirements:**
- Controls auto-generated from `PropSchema` of the component
- Multi-select: show shared properties, mixed-value state
- Panel must not re-render entirely when only one value changes

### Top Toolbar

```
[Undo][Redo] | [Desktop][Tablet][Mobile] | [100%▼] | [Grid✓][Snap✓] | [👁 Panels] | [?][↑Import][↓Export]
```

---

## Quick Action Toolbar

Context toolbar floating above the selected component.

### Built-in Quick Actions

| Action              | Shortcut | Description               |
| ------------------- | -------- | ------------------------- |
| Move up (z-index)   | `]`      | Up 1 layer                |
| Move down (z-index) | `[`      | Down 1 layer              |
| Move to front       | `Ctrl+]` | Top layer                 |
| Move to back        | `Ctrl+[` | Bottom layer              |
| Duplicate           | `Ctrl+D` | Duplicate node            |
| Delete              | `Delete` | Remove node               |
| Wrap in container   | —        | Wrap in container         |
| Lock/Unlock         | `Ctrl+L` | Lock/unlock node          |
| Hide                | `Ctrl+H` | Hide node                 |
| More options        | —        | Dropdown with more actions |

Component definitions can add custom quick actions via `ComponentDefinition.quickActions`.

Toolbar positioning: preferred above node → fallback below → fallback inside top. Must always remain within viewport.

---

## Selection System

### Single Selection
- Show selection bounding box with resize handles
- Show quick action toolbar
- Update right panel with node properties
- Cannot select locked nodes

### Multi-selection
- `Shift+Click` = add to selection
- `Ctrl+A` = select all in active container
- Rubber-band: drag on canvas (not on node) to create selection rect
- Operations: move group, delete group, group into container, align, distribute

### Resize Handles
- 8 handles: `n`, `s`, `e`, `w`, `ne`, `nw`, `se`, `sw`
- `Shift` = maintain aspect ratio
- `Alt` = resize from center
- Handles shown/hidden per `ComponentCapabilities` (`canResizeWidth`, `canResizeHeight`)

---

## Interaction System

```ts
type InteractionTrigger = 'click' | 'dblclick' | 'hover' | 'mouseenter' | 'mouseleave'
  | 'focus' | 'blur' | 'submit' | 'change' | 'keydown' | 'keyup'
  | 'mount' | 'unmount' | 'scroll' | 'intersect';

type InteractionAction =
  | { type: 'navigate'; url: string; target?: '_blank' | '_self' }
  | { type: 'triggerApi'; endpoint: string; method: string; ... }
  | { type: 'setState'; key: string; value: unknown }
  | { type: 'toggleVisibility'; targetId: string }
  | { type: 'addClass' | 'removeClass'; targetId: string; className: string }
  | { type: 'showModal' | 'hideModal'; targetId: string }
  | { type: 'scrollTo'; targetId: string; behavior?: ScrollBehavior }
  | { type: 'emit'; event: string; payload?: unknown }
  | { type: 'custom'; handler: string; params?: unknown };
```

Interactions support conditional execution via `Condition[]` with operators: `eq`, `neq`, `gt`, `lt`, `gte`, `lte`, `contains`, `truthy`, `falsy`.

---

## Plugin & Extension System

### Plugin Interface

```ts
interface BuilderPlugin {
  id: string;
  name: string;
  version: string;
  minCoreVersion?: string;
  dependencies?: Record<string, string>;
  install(api: PluginAPI): void | Promise<void>;
  initialize?(api: PluginAPI): void | Promise<void>;
  destroy?(api: PluginAPI): void | Promise<void>;
}
```

### PluginAPI Capabilities

Plugins can:
- Register/unregister components
- Register commands (with inverse handlers)
- Register editor panels, property tabs, property controls
- Register quick actions (per component type or global `'*'`)
- Register toolbar items, layout rules, snap targets
- Subscribe/emit events
- Read state (read-only): document, state, selectedNodes
- Dispatch commands
- Register asset providers and keyboard shortcuts
- Log diagnostics

### Lifecycle Rules

- `install` must complete before any builder operation
- Plugin fail at `install` → rollback all registrations
- `destroy` must be idempotent
- Plugins cannot access core internal state outside `PluginAPI`

---

## Dynamic Component Loading

### Loading Process

1. Fetch manifest from service URL (timeout: 10s, configurable)
2. Validate manifest schema + version compatibility
3. Resolve dependency order
4. Fetch component bundle with integrity check (timeout: 30s)
5. Execute bundle in isolated scope (sandbox)
6. Extract `ComponentDefinition` export
7. Validate definition schema
8. Register via `builder.registerComponent()`
9. Emit `component:loaded` event
10. Update component palette

### Security & Sandbox

- Bundles run in sandboxed scope — no direct access to `window`, `document`, `localStorage`
- Sandbox exposes: render context, limited DOM API for component's own subtree, `ComponentContext`
- SRI hash validation mandatory in production mode
- Retry: 3 times with exponential backoff
- Failed component → render `RemoteComponentErrorPlaceholder`

---

## Asset Management

### Asset Types

`image` | `video` | `font` | `icon` | `file`

### Asset Provider Interface

Plugins/services can provide asset sources:

```ts
interface AssetProvider {
  id: string;
  name: string;
  supportedTypes: AssetType[];
  listAssets(query: AssetQuery): Promise<AssetListResult>;
  upload?(file: File): Promise<Asset>;
  delete?(assetId: string): Promise<void>;
}
```

Asset Picker in property panel: shows assets from all registered providers, supports upload, URL input, preview, search/filter.

---

## Keyboard Shortcuts

### Core Shortcuts

| Shortcut                    | Action                               |
| --------------------------- | ------------------------------------ |
| `Ctrl+Z`                    | Undo                                 |
| `Ctrl+Shift+Z` / `Ctrl+Y`  | Redo                                 |
| `Ctrl+D`                    | Duplicate                            |
| `Delete` / `Backspace`      | Delete node                          |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy / Cut / Paste              |
| `Ctrl+A`                    | Select all                           |
| `Escape`                    | Deselect / exit container            |
| `Enter`                     | Enter container (select first child) |
| `Tab` / `Shift+Tab`         | Select next/previous sibling         |
| `Arrow keys`                | Nudge 1px                            |
| `Shift+Arrow`               | Nudge 10px                           |
| `Ctrl+G` / `Ctrl+Shift+G`  | Group / Ungroup                      |
| `Ctrl+L`                    | Lock/unlock                          |
| `Ctrl+H`                    | Hide/show                            |
| `Ctrl+]` / `Ctrl+[`        | Move to front / back                 |
| `]` / `[`                   | Move up / down 1 layer               |
| `Ctrl+0`                    | Fit to screen                        |
| `Ctrl+1`                    | 100% zoom                            |
| `Ctrl++` / `Ctrl+-`         | Zoom in / out                        |
| `Space+Drag`                | Pan canvas                           |
| `Ctrl+;`                    | Toggle grid                          |
| `Ctrl+'`                    | Toggle snap                          |

**Plugin-registered shortcuts** use `priority` field for conflict resolution. Shortcuts inactive during text editing (inside richtext component).

---

## Import / Export System

### Export

| Format  | Description                           |
| ------- | ------------------------------------- |
| `json`  | Raw document schema (BuilderDocument) |
| `html`  | Static HTML with inline CSS           |
| `react` | React component code (future)         |
| `zip`   | HTML + assets bundle                  |

### Import

- v1 supports JSON only
- Merge strategies: `replace`, `merge`, `append`
- Must validate schema before applying, run migration if needed
- Show warnings for data loss
- Support drag & drop file into editor to import

---

## Schema Versioning & Migration

Each `BuilderDocument` has `schemaVersion` (semver). On load: compare with `CURRENT_SCHEMA_VERSION` → run migration chain if needed.

```ts
interface SchemaMigration {
  fromVersion: string;
  toVersion: string;
  description: string;
  migrate(document: BuilderDocument): BuilderDocument;
  rollback?(document: BuilderDocument): BuilderDocument;
}
```

**Rules:**
- Migrations must be pure functions (no side effects)
- Migration chain: v1 → v2 → v3
- Unknown fields preserved in `legacyData`
- Breaking schema changes = major version bump + mandatory migration
- Documents from all prior versions must be renderable after migration

---

## Event Catalogue

| Event                   | Payload                                | When                          |
| ----------------------- | -------------------------------------- | ----------------------------- |
| `document:changed`      | `BuilderDocument`                      | Any document change           |
| `node:added`            | `{ node: BuilderNode }`               | Node added                    |
| `node:removed`          | `{ nodeId: string }`                  | Node removed                  |
| `node:moved`            | `{ nodeId, fromParentId, toParentId }`| Node moved                    |
| `node:updated`          | `{ nodeId, changes }`                 | Props/style updated           |
| `selection:changed`     | `{ selectedIds: string[] }`           | Selection changed             |
| `breakpoint:changed`    | `{ breakpoint: Breakpoint }`          | Breakpoint switched           |
| `command:executed`      | `{ command, result }`                 | After each command            |
| `command:error`         | `{ command, error }`                  | Command failed                |
| `history:undo`          | `{ entry: HistoryEntry }`            | After undo                    |
| `history:redo`          | `{ entry: HistoryEntry }`            | After redo                    |
| `component:loaded`      | `{ type: string }`                   | Remote component loaded       |
| `component:error`       | `{ type: string, error }`            | Component render error        |
| `plugin:installed`      | `{ pluginId: string }`               | Plugin installed              |
| `plugin:error`          | `{ pluginId: string, error }`        | Plugin error                  |
| `canvas:config-changed` | `{ config: CanvasConfig }`           | Canvas config changed         |
| `drag:start`            | `{ operation: DragOperation }`       | Drag started                  |
| `drag:end`              | `{ operation: DragOperation, result }`| Drag ended                   |

---

## Error Boundary Contracts

### Render Errors
- Catch at node boundary → render `ErrorPlaceholder` → continue rendering rest of tree
- Emit `component:render-error` event

### Command Errors
- Do not apply command to state → add error to diagnostic log → emit `command:error`
- Document state remains unchanged (no partial mutation)

### Plugin Errors
- Plugin error at `install`/`initialize` → catch, report → builder continues in degraded state
- Plugin errors never crash the entire editor

### Remote Component Errors
- Manifest fetch fail → show error state in palette, retry available
- Bundle load fail → `RemoteComponentErrorPlaceholder` on canvas
- Runtime render error → standard `ErrorPlaceholder`

### Placeholder Components

| Component type                    | When rendered                                    |
| --------------------------------- | ------------------------------------------------ |
| `UnknownComponentPlaceholder`     | Component type not found in registry             |
| `RemoteComponentErrorPlaceholder` | Remote component load failed                     |
| `ErrorPlaceholder`                | Component render threw error                     |
| `EmptyContainerPlaceholder`       | Container has no children (editor only)          |
| `LoadingPlaceholder`              | Component loading (remote)                       |

---

## Accessibility (A11y)

### Runtime Output
- Component definitions declare ARIA roles and labels
- Runtime renderer applies ARIA attributes from `ComponentDefinition.a11y` + node-level overrides
- Generated HTML must pass WCAG 2.1 Level AA for basic components

### Editor Accessibility
- Canvas keyboard navigation: Tab/Shift+Tab for siblings, Enter to enter container, Escape to exit
- Selection, drag, resize must have keyboard alternatives
- Property panel must be fully keyboard accessible
- All interactive elements must have focus indicators
- Screen reader announcements for major state changes

---

## Folder Structure

<!-- OVERRIDES RULES.md — library monorepo layout -->

```
/
├── packages/
│   ├── builder-core/               # Framework-agnostic engine
│   │   ├── src/
│   │   │   ├── document/           # BuilderDocument, BuilderNode, types
│   │   │   ├── registry/           # ComponentDefinition registry
│   │   │   ├── commands/           # Command engine, built-in commands, inverses
│   │   │   ├── history/            # History stack
│   │   │   ├── events/             # Event bus
│   │   │   ├── plugins/            # Plugin engine, PluginAPI
│   │   │   ├── state/              # BuilderState, state manager
│   │   │   ├── validation/         # Schema validation, PropSchema validation
│   │   │   ├── migration/          # Migration engine, migration registry
│   │   │   └── responsive/         # Breakpoint config, style resolution
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── builder-react/              # React adapter
│   │   ├── src/
│   │   │   ├── renderer/           # React component tree renderer
│   │   │   ├── hooks/              # useBuilder, useNode, useSelection, etc.
│   │   │   └── context/            # BuilderContext, BuilderProvider
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── builder-editor/             # Visual editor
│   │   ├── src/
│   │   │   ├── canvas/             # Canvas root, zoom/pan/scroll, grid, ruler
│   │   │   ├── overlay/            # Selection, hover, snap guides, helper lines
│   │   │   ├── dragdrop/           # DragOperation, drop validation, ghost element
│   │   │   ├── selection/          # SelectionManager, multi-select, rubber-band
│   │   │   ├── resize/             # ResizeOperation, handle rendering
│   │   │   ├── snap/               # SnapEngine, SnapTargetFactory
│   │   │   ├── toolbar/            # Top toolbar, breakpoint selector
│   │   │   ├── quick-toolbar/      # QuickActionToolbar, positioning logic
│   │   │   ├── panels/
│   │   │   │   ├── left/           # ComponentPalette
│   │   │   │   ├── right/          # PropertyPanel, tab system
│   │   │   │   └── bottom/         # Layer tree, etc.
│   │   │   ├── controls/           # Dynamic property controls
│   │   │   ├── assets/             # AssetPicker
│   │   │   ├── shortcuts/          # ShortcutManager
│   │   │   └── import-export/      # Import/Export modals
│   │   ├── styles/                 # Editor CSS bundle
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── builder-renderer/           # Production runtime renderer
│   │   ├── src/
│   │   │   ├── runtime/            # Runtime render loop, hydration, SSR
│   │   │   ├── resolver/           # Component resolution, fallback logic
│   │   │   ├── pipeline/           # Prop merge, style merge, interaction binding
│   │   │   └── loader/             # Dynamic component loader, sandbox
│   │   ├── tests/
│   │   └── package.json
│   │
│   ├── ui/                         # shadcn-based design system
│   │   ├── src/
│   │   │   ├── components/         # shadcn UI components
│   │   │   ├── lib/                # cn() utility, theme utils
│   │   │   └── styles/             # Global CSS, tokens, animations
│   │   └── package.json
│   │
│   ├── shared/                     # Shared types, utils, constants
│   └── config/                     # Shared configs (ESLint, TS, Tailwind)
│
├── apps/                           # Demo/playground apps (optional)
│   └── playground/                 # Dev playground for testing the builder
│
├── .claude/                        # AI Agent context files
│   ├── RULES.md
│   ├── ARCHITECTURE.md             # This file
│   └── assets/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── README.md                       # Full technical specification
```

---

## Feature Modules

### builder-core Modules

| Module         | Description                                                | Key entities                                      |
| -------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| `document`     | Document model — node tree, styles, responsive, variables  | `BuilderDocument`, `BuilderNode`, `StyleConfig`    |
| `registry`     | Component registration and lookup                          | `ComponentDefinition`, `ComponentRegistry`         |
| `commands`     | Command pattern engine with inverse-command support        | `Command`, `ReversibleCommand`, `CommandResult`    |
| `history`      | Undo/redo history stack with grouped entries                | `HistoryEntry`, `HistoryState`                     |
| `events`       | Pub/sub event bus for cross-module communication           | `EventBus`, event catalogue (18+ event types)      |
| `plugins`      | Plugin lifecycle management                                | `BuilderPlugin`, `PluginAPI`                       |
| `state`        | Centralized state manager                                  | `BuilderState`, `EditorState`, `UIState`           |
| `validation`   | Schema + PropSchema validation                             | `DropValidator`, `SchemaValidator`                 |
| `migration`    | Schema versioning and migration engine                     | `SchemaMigration`, `MigrationEngine`               |
| `responsive`   | Breakpoint config and style resolution                     | `Breakpoint`, `BreakpointConfig`                   |

### builder-react Modules

| Module         | Description                                                | Key entities                                                                  |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `renderer`     | React component tree renderer                              | `NodeRenderer`, tree traversal logic                                          |
| `hooks`        | Builder hooks for React consumption                        | `useBuilder`, `useNode`, `useNodeChildren`, `useSelection`, `useBreakpoint`, `useCommand`, `useHistory` |
| `context`      | Provider and context for builder integration               | `BuilderContext`, `BuilderProvider`                                           |

### builder-editor Modules

| Module          | Description                                               | Key entities                                    |
| --------------- | --------------------------------------------------------- | ----------------------------------------------- |
| `canvas`        | Canvas root — zoom/pan/scroll, grid, ruler                | `ViewportState`, `CanvasConfig`, `ZoomConfig`   |
| `overlay`       | Selection boxes, hover highlights, snap guides            | `HelperLine`, `SnapResult`                      |
| `dragdrop`      | Drag-and-drop with validation                             | `DragOperation`, `DropTarget`, `DragSource`     |
| `selection`     | Single/multi-select, rubber-band                          | `SelectionManager`, `MultiSelectOperation`      |
| `resize`        | Resize with aspect-ratio lock                             | `ResizeOperation`, `ResizeHandle`               |
| `snap`          | Snap & alignment engine                                   | `SnapEngine`, `SnapTarget`, `SnapResult`        |
| `panels`        | Left (palette), right (properties), bottom (layers)       | `EditorPanel`, `PropertyPanelTab`, `PanelContext`|
| `controls`      | Dynamic property controls for PropSchema types            | String, number, color, image, select, slider, etc. |
| `quick-toolbar` | Context toolbar on selected component                     | `QuickAction`, `QuickToolbarConfig`             |
| `shortcuts`     | Keyboard shortcut system                                  | `ShortcutDefinition`, `ShortcutContext`          |
| `assets`        | Asset picker and provider integration                     | `AssetPicker`, `AssetProvider`                  |
| `import-export` | Import/export documents                                   | `ExportConfig`, `ImportConfig`                  |

### builder-renderer Modules

| Module         | Description                                                | Key entities                                                |
| -------------- | ---------------------------------------------------------- | ----------------------------------------------------------- |
| `runtime`      | Runtime render loop, hydration, SSR                        | Runtime renderer, server-side hydration                     |
| `resolver`     | Component resolution with fallback                         | Placeholder components, registry lookup                     |
| `pipeline`     | Prop merge, style merge, interaction binding               | Style resolution (base + responsive), event delegation      |
| `loader`       | Dynamic component loader, manifest fetcher, sandbox        | `ComponentManifest`, sandbox scope, SRI validation          |

---

## Key Dependencies

<!-- EXTENDS RULES.md — library-specific dependencies -->

| Package              | Version | Purpose                                                      |
| -------------------- | ------- | ------------------------------------------------------------ |
| `uuid`               | latest  | UUID v4 generation for node IDs                              |
| `immer`              | latest  | Immutable state updates in command engine (optional)         |
| `zod`                | latest  | Schema validation for documents and prop schemas             |

> Note: This project intentionally avoids Zustand, TanStack Query, Axios, and react-i18next — those belong in consumer applications, not in the builder library itself.

---

## State Management

<!-- OVERRIDES RULES.md — custom command-pattern state engine -->

This project uses a **custom Command-pattern state engine** instead of Zustand/TanStack Query. State changes only happen through dispatched commands.

| State layer       | Managed by             | Key state                                                  |
| ----------------- | ---------------------- | ---------------------------------------------------------- |
| Document state    | `CommandEngine`        | `BuilderDocument`, `BuilderNode` tree                      |
| Editor state      | `StateManager`         | `selectedNodeIds`, `activeBreakpoint`, `zoom`, `panOffset` |
| Interaction state | `StateManager`         | `dragOperation`, `resizeOperation`, `multiSelectRect`      |
| UI state          | `StateManager`         | `panels` visibility/size, `quickToolbar`, `notifications`  |
| History           | `HistoryStack`         | `past`, `future` entries                                   |

---

## Testing Strategy

<!-- EXTENDS RULES.md -->

- **`builder-core`**: Fully unit-testable without DOM. Command system tested as pure functions: given state + command → expected output state.
- **Migration engine**: Test coverage for every registered migration.
- **Editor interactions**: Synthetic event tests for drag, drop, resize.
- **Rendering pipeline**: Snapshot tests.
- **Framework**: Vitest for all packages.

---

## Non-Functional Requirements

### Performance Targets

| Metric                                        | Target                  |
| --------------------------------------------- | ----------------------- |
| Canvas FPS during drag (200 visible nodes)    | 60 fps                  |
| Initial document parse + render (≤500 nodes)  | <200ms                  |
| Remote component load — non-blocking canvas   | Required                |
| Undo/redo completion time                     | <1 render frame (16ms)  |
| Property panel update on select               | <32ms                   |
| Snap calculation per frame                    | <8ms                    |
| Canvas zoom/pan                               | 60fps                   |

### Scalability

- Document: up to 5,000 nodes
- Component registry: up to 500 types
- Concurrent plugins: up to 50
- History depth: configurable, default 100

### Performance Implementation Rules

- Memoize component renders by node id + props hash
- Batch style recalculation when switching breakpoint
- Lazy-evaluate children of collapsed containers
- Incremental re-render: only re-render changed subtrees
- Runtime bundle must be tree-shakeable
- Editor code must not leak into runtime bundle

---

## Development Mode Diagnostics

In development mode, builder should log:
- Missing component registrations (node type not found)
- Schema validation warnings
- Plugin dependency conflicts
- Slow renders (>16ms) with component name
- Attempted direct state mutation (bypassing commands)
- Snap target calculation time if >8ms
- Remote component load failures

---

## Integration Points

These are **out of scope** for the library but contracts are defined for consumer applications.

| Service                | Method                       | Contract                                                                                     |
| ---------------------- | ---------------------------- | -------------------------------------------------------------------------------------------- |
| Component Manifest API | `GET {manifestUrl}`          | Response: `ComponentManifest`                                                                |
| Component Bundle CDN   | `GET {bundleUrl}`            | Response: ES module with default export `ComponentDefinition`                                |
| Document Persistence   | Event-driven                 | Library emits `document:changed` with full `BuilderDocument` payload. Consumer saves.        |
| Auth / Permissions     | Init config                  | Consumer passes `permissions` object on builder init. Library checks before executing commands.|
| Asset Upload Service   | Via `AssetProvider` interface| Consumer implements and registers provider.                                                  |
| Analytics / Telemetry  | Event bus                    | Consumer subscribes to events: `node:added`, `node:removed`, `component:loaded`, etc.        |

### Permission Contract

```ts
interface BuilderPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAddComponents: boolean;
  canLoadRemoteComponents: boolean;
  canExport: boolean;
  canImport: boolean;
  allowedComponentTypes?: string[];     // undefined = all
  restrictedCommands?: string[];        // command types that are forbidden
}
```

---

## Known Constraints & Tech Debt

### Current Constraints

- This is a library — no backend, no database, no auth implementation
- Remote component sandbox design needs security review before production use
- `react` export format for Import/Export is marked as future feature
- Selective undo (undo a specific entry) is optional/future feature

---

## Agent Quick Reference

| Looking for                      | Go to                                              |
| -------------------------------- | -------------------------------------------------- |
| Document model types             | `packages/builder-core/src/document/`              |
| Component registry               | `packages/builder-core/src/registry/`              |
| Command definitions              | `packages/builder-core/src/commands/`              |
| State management                 | `packages/builder-core/src/state/`                 |
| Event bus                        | `packages/builder-core/src/events/`                |
| Plugin API                       | `packages/builder-core/src/plugins/`               |
| Schema validation                | `packages/builder-core/src/validation/`            |
| Migration engine                 | `packages/builder-core/src/migration/`             |
| Responsive breakpoints           | `packages/builder-core/src/responsive/`            |
| React hooks                      | `packages/builder-react/src/hooks/`                |
| Builder context/provider         | `packages/builder-react/src/context/`              |
| Canvas component                 | `packages/builder-editor/src/canvas/`              |
| Overlay components               | `packages/builder-editor/src/overlay/`             |
| Drag-and-drop system             | `packages/builder-editor/src/dragdrop/`            |
| Selection system                 | `packages/builder-editor/src/selection/`           |
| Resize system                    | `packages/builder-editor/src/resize/`              |
| Snap engine                      | `packages/builder-editor/src/snap/`                |
| Panel components                 | `packages/builder-editor/src/panels/`              |
| Property controls                | `packages/builder-editor/src/controls/`            |
| Quick action toolbar             | `packages/builder-editor/src/quick-toolbar/`       |
| Keyboard shortcuts               | `packages/builder-editor/src/shortcuts/`           |
| Asset picker                     | `packages/builder-editor/src/assets/`              |
| Import/Export                    | `packages/builder-editor/src/import-export/`       |
| Runtime renderer                 | `packages/builder-renderer/src/runtime/`           |
| Component resolver               | `packages/builder-renderer/src/resolver/`          |
| Render pipeline                  | `packages/builder-renderer/src/pipeline/`          |
| Dynamic loader                   | `packages/builder-renderer/src/loader/`            |
| Design system components (shadcn)| `packages/ui/src/components/`                      |
| Shared types                     | `packages/shared/`                                 |
| Full technical specification     | `README.md` (root)                                 |

---

## Additional Notes

- All interface contracts defined in the README spec are considered **immutable** unless a formal version bump is issued.
- `builder-core` design must allow future adapters for Vue, Svelte, or vanilla JS — never hardcode React-specific patterns.
- The library follows a **fail-safe degradation** principle: missing components render placeholders, plugin failures don't crash the editor, invalid commands leave state unchanged.
- Package boundaries must be enforced by lint rules (no cross-package imports outside defined contracts).
- All public APIs versioned with deprecation warnings before removal.
- Breaking changes require major version bump.

### Shared Configuration Logic

**Critical rule**: Common configuration features for a component type **must use shared logic** across all UI surfaces — never duplicate the same logic in multiple places.

**Example**: When selecting a `text` component, both the **menubar** (top toolbar) and **property panel** (right sidebar) display configuration options like:
- `fontSize`, `color`, `textDecoration`, `fontWeight`, `fontStyle`, `lineHeight`
- Text alignment, letter spacing, etc.

If the property panel implements the `fontSize` handler separately from the menubar, inconsistencies arise:
- Behavior divergence between surfaces
- Hard-to-find bugs when updating one place but not the other
- Maintenance nightmare when refactoring business logic

**Solution**:
- Create shared utilities/hooks (`useTextPropertyHandler`, `useStyleConfigurator`) in `packages/builder-react/src/hooks/`
- Both property panel and menubar import and use shared hooks/utilities
- **One logic, multiple UI surfaces** — panels render differently but share the same core logic

### Code Review Checklist for All Changes

Every code change **must verify**:

| Checklist Item                        | Purpose                                                                         |
| ------------------------------------- | ------------------------------------------------------------------------------- |
| **Shared logic duplication**          | Is the same functionality implemented 2+ times? (e.g., fontSize handler twice)  |
| **Language keys (i18n)**              | New UI text? Add i18n keys for all supported languages                          |
| **AI Assistant context**              | AI/prompt-related change? Update `.agents/skills/` if needed                    |
| **Type contracts**                    | Interface updated? Check all places using that interface                        |
| **Event emissions**                   | State changed? Emit corresponding event to EventBus                             |
| **Plugin API stability**              | Public API changed? Add deprecation warning, don't break existing plugins        |
| **PropSchema validation**             | New prop added? Update component's `PropSchema` definition                      |
| **Responsive breakpoint handling**    | Style logic? Handle all breakpoints (desktop/tablet/mobile)                     |
| **A11y attributes**                   | New interactive element? Add ARIA labels, roles (`ariaLabel`, `role`)           |
| **Performance targets**               | New computation? Snap engine must stay <8ms, renders <16ms per frame             |
| **Undo/Redo support**                 | State command? Ensure inverse command is computed correctly                     |
| **Error boundary coverage**           | New component? Wrap with error boundary, render fail-safe placeholder           |
| **Test coverage**                     | Unit tests for logic, integration tests for interactions                        |

**Failure to verify these items** → bugs, inconsistency, degraded UX.

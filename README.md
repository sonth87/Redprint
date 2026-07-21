# UI Builder Library

**A modular, extensible drag-and-drop interface builder platform.**

> 🔗 **Full Technical Specification:** See `.claude/docs/SPECIFICATION.md`

---

## 📚 Quick Start

### Installation

```bash
pnpm add @ui-builder/builder-core
pnpm add @ui-builder/builder-react
pnpm add @ui-builder/builder-editor
```

### Basic Usage

```tsx
import { createBuilder } from "@ui-builder/builder-core";
import { BuilderEditor } from "@ui-builder/builder-editor";

const builder = createBuilder();

export default function App() {
  return <BuilderEditor builder={builder} />;
}
```

---

## 🏗️ Architecture

**Four-layer modular design:**

| Package            | Purpose                                     | Exports          |
| ------------------ | ------------------------------------------- | ---------------- |
| `builder-core`     | Framework-agnostic engine (no React, no DOM) | API, types, commands |
| `builder-react`    | React adapter + hooks                       | Provider, hooks  |
| `builder-editor`   | Visual editor (canvas, panels, toolbar)     | Editor component |
| `builder-renderer` | Production runtime renderer                 | Runtime component |

**Key Constraint:** `builder-core` has zero runtime dependencies. All DOM interaction flows through `builder-react` or `builder-editor`.

---

## 🎨 Design System

**Unified UI:** All editor components built from **shadcn** (`packages/ui`)

**Visual Style:** **Liquid Glass** aesthetic (glassmorphism v2)
- Semi-transparent surfaces with backdrop blur
- Premium, modern visual polish
- GPU-accelerated performance

```css
.glass-surface {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

---

## 📖 Documentation

Documentation is organized in three layers:

| Layer | Location | Audience | Language |
| ----- | -------- | -------- | -------- |
| **User Guide** | [docs/user-guide/](./docs/README.md) | Users, PMs, newcomers — features & flows | Tiếng Việt |
| **Technical Spec** | [.claude/docs/](./.claude/docs/README.md) | AI agents & maintainers — contracts, conventions | English |
| **Roadmap** | [docs/roadmap/](./docs/roadmap/README.md) | Planning — one file per improvement item | Tiếng Việt |

Complete technical reference organized by domain:

| Document | Covers |
| -------- | ------ |
| **[SPECIFICATION.md](./.claude/docs/SPECIFICATION.md)** | Project overview, architecture, design principles |
| **[DATA_MODEL.md](./.claude/docs/DATA_MODEL.md)** | BuilderDocument, BuilderNode, ComponentDefinition, PropSchema |
| **[COMMAND_SYSTEM.md](./.claude/docs/COMMAND_SYSTEM.md)** | Command execution, state management, undo/redo, schema versioning |
| **[EDITOR_UI.md](./.claude/docs/EDITOR_UI.md)** | Canvas, drag-drop, panels, selection, snap, toolbar, shortcuts |
| **[RUNTIME.md](./.claude/docs/RUNTIME.md)** | Rendering pipeline, dynamic components, assets, import/export |
| **[PLUGINS.md](./.claude/docs/PLUGINS.md)** | Plugin system, PluginAPI, lifecycle hooks, patterns |
| **[ACCESSIBILITY.md](./.claude/docs/ACCESSIBILITY.md)** | A11y, keyboard navigation, error handling, diagnostics |
| **[INTEGRATION.md](./.claude/docs/INTEGRATION.md)** | External services, event catalogue, performance targets |
| **[AI_ASSISTANT.md](./.claude/docs/AI_ASSISTANT.md)** | AI conversational interface — providers, context, command whitelist |
| **[POPUPS.md](./.claude/docs/POPUPS.md)** | Popup system V6 — data model, rules, campaigns, lifecycle, commands |
| **[PROPERTY_SYSTEM.md](./.claude/docs/PROPERTY_SYSTEM.md)** | PropertyDescriptor, shared style/prop editing, PropertyControls |
| **[PRESETS.md](./.claude/docs/PRESETS.md)** | Component preset types, PresetRegistry API, palette UI |
| **[IMAGE_FILTERS.md](./.claude/docs/IMAGE_FILTERS.md)** | 39 Instagram-style filter presets — CSS, SVG, and overlay modes |
| **[MEDIA_MANAGEMENT.md](./.claude/docs/MEDIA_MANAGEMENT.md)** | Asset upload, browsing, selection — MediaManager UI, backends, AssetProvider |

**For AI Agents:** Always read `SPECIFICATION.md` first for project context.

---

## ✨ Key Features

### Visual Design System
- **Drag-and-drop interface** for intuitive component placement
- **Multi-breakpoint responsive design** (mobile, tablet, desktop)
- **Real-time preview** with production-accurate rendering
- **Advanced styling** — CSS-in-JS with Tailwind integration

### Component Ecosystem
- **17 built-in components** (Button, Card, Section, Grid, etc.)
- **Extensible component system** via `extendComponent()`
- **Component presets** for rapid prototyping
- **Dynamic prop schemas** with validation

### State Management
- **Command-driven architecture** for all state changes
- **Full undo/redo support** with command history
- **Conflict-free document serialization**
- **TypeScript-first data model**

### Editor Capabilities
- **Intelligent snapping & alignment guides**
- **Multi-select & bulk operations**
- **Keyboard shortcuts** for power users
- **Node tree inspector** for hierarchy management
- **Popup layer management** — create, edit, template, trigger, and render document-level popups, with conversion goals, A/B variants, audience targeting, date/time scheduling, frequency capping, locale-specific content, campaign lifecycle management (draft→review→published→paused→archived), conflict policies (stack/suppress/replace/queue), and a vendor-neutral analytics event stream
- **Property controls** (text, number, color, select, slider, rich-text)

### Developer Experience
- **Framework-agnostic core** (zero runtime dependencies)
- **React hooks & context API** integration
- **TypeScript support** throughout
- **Plugin system** for extensibility
- **Comprehensive type exports** for type-safe integrations

### AI-Powered Generation
- **Natural language page generation** — describe a page, get a full layout
- **Section-level AI regeneration** — regenerate individual sections via context menu
- **Chat assistant** — targeted edits ("make the heading blue", "add a CTA button")
- **Multi-provider support** — OpenAI, Gemini, and Claude via a single backend
- **Fully undoable** — all AI output dispatched as standard builder commands
- **Design token enforcement** — AI respects your brand colors and typography
- **Progressive rendering** — containers appear first, content fills in next frame
- **Rich component awareness** — page generation can use V2 navigation menus with anchor/page/url targets and submenus, galleries, marquees, masked text,
  collapsible FAQ blocks, and safe component fallbacks when those components are registered

### Production Ready
- **Optimized runtime renderer** for deployment
- **Asset management** (images, fonts, CDN integration)
- **Import/export** (JSON, TypeScript)
- **Accessibility built-in** (WCAG compliance)
- **Performance profiling** tools

---

## 🤖 AI-Powered Generation

The builder includes a fully integrated AI generation layer that translates natural language
descriptions into builder commands. All AI output goes through the same Command Engine as manual
edits — meaning every AI action is **undoable** and **schema-validated**.

### Three AI Entry Points

| Mode | How to trigger | Best for |
|------|---------------|----------|
| **Page Generator** | ✨ button → "Generate full page" | Building a complete page from a prompt |
| **Section AI** | Right-click Section → AI icon | Regenerating content inside one section |
| **Chat Assistant** | ✨ button → free-form chat | Targeted edits to existing nodes |

### How It Works

```
User prompt + selected palette/tone
  → Backend planner creates a CreativeBrief + PagePlan
  → Backend validates/normalizes section count, order, and required sections
  → SSE plan_ready sends deterministic Section skeleton commands
  → Backend sends a compact component capability manifest to each SectionPlan prompt
  → Backend generates each SectionPlan independently as intent, not commands
  → Deterministic compiler selects registered components and props
  → Client applies skeleton/content progressively through CommandEngine
```

**Page generation** uses a provider-neutral SSE pipeline. The backend streams `job_started`,
`plan_ready`, per-section progress, retry/failure events, and `complete`. If one section fails after
retry, the backend sends fallback commands for that section and completes with partial status instead
of discarding the whole page.

For richer landing pages, the backend builds a compact capability manifest from the
`availableComponents` sent by the editor. The LLM may request components such as
`NavigationMenu`, `GalleryPro`, `GalleryGrid`, `GallerySlider`, `CollapsibleText`, `TextMarquee`,
`TextMask`, `Shape`, `Row`, `Column`, and `Repeater`, but it never emits final props or commands for
them. For `NavigationMenu`, the compiler emits tree-shaped menu items with `target` values for
anchors, page paths, or URLs. The compiler owns the final command shape, validates the component exists, fills missing media
with deterministic industry-aware images, and falls back to basic `Grid`/`Image`/`Text` layouts when
rich components are unavailable.

Generation also includes a hybrid component contract layer. The editor sends `propSchema`,
`capabilities`, and `defaultProps` for registered components; the backend turns that into a compact
catalog summary plus on-demand `ComponentContract` details for the components relevant to each
section. The model can return `componentIntents`, but deterministic adapters and prop validation own
the final builder command payloads.

### Backend Setup

Start the AI backend before using any AI features:

```bash
cd apps/api

# Configure provider (choose one)
LLM_PROVIDER=openai   LLM_API_KEY=sk-...       pnpm dev
LLM_PROVIDER=gemini   LLM_API_KEY=AIza...      pnpm dev
LLM_PROVIDER=claude   LLM_API_KEY=sk-ant-...   pnpm dev
```

Set `LLM_TIMEOUT_MS` to cap slow provider calls; the default is `60000` milliseconds. Full-page
generation also supports `AI_SECTION_CONCURRENCY` (default `2`) and `AI_MAX_SECTION_ATTEMPTS`
(default `2`). Timeout, rate-limit, and provider-overloaded errors bypass retries and use fallback
section content so one slow provider call does not block the whole page. If the initial page planner
provider call fails, the backend falls back to a deterministic PagePlan and still streams skeleton
sections.

Enable `AI_DEBUG=true` for structured generation logs. Full prompts/responses stay redacted unless
`AI_PROMPT_DEBUG=true`; logs include section type, preferred components, selected rich component,
fallback reason, media item count, component intents, adapter usage, contract source, and validation
error codes where available. The per-job `complete` log line also carries token/cost accounting
(`totalInputTokens`, `totalOutputTokens`, `estimatedCostUsd`, `llmCalls`, `usageByStage`) — see the
[cost & observability roadmap item](docs/roadmap/02-ai-generation/08-cost-observability.md).

When the editor sends a preset catalog (`availablePresets`), the compiler reuses designed presets for
leaf slots (CTA button, heading) instead of only hardcoded styles — the LLM references presets by id, or
the compiler picks by tag heuristic. Disable with `AI_PRESET_FIRST=false` (falls back to the built-in
adapters).

Hero, services, and CTA sections have multiple **layout variants** (e.g. hero split-media / centered /
full-bleed) so the same prompt can produce visually different pages — the LLM may pick one, or the
compiler picks deterministically per job. Disable with `AI_LAYOUT_VARIETY=off`.

Set `UNSPLASH_ACCESS_KEY` to fetch **context-aware images** per section (from each section's
`mediaPrompt`) instead of the fixed fallback pool. It is best-effort — no key, a timeout, or a rate limit
silently falls back to the pool and never blocks generation. Fetched images are hotlinked from the
provider (not stored) and passes an SSRF-safe URL check.

A deterministic **quality gate** (`AI_QUALITY_GATE`, default `block`) runs after compile: it blocks
placeholder text and empty sections (retried with a hint, then falls back), and warns on low contrast,
non-responsive giant headings, duplicate/overlong headings, and wrong-language headings. Set to `warn`
(surface but never block) or `off`; disable individual checks with `AI_QG_DISABLE=low_contrast,...`.

Model, temperature, and max output tokens are configurable per pipeline **stage** without code
changes. Global vars are `LLM_MODEL`, `LLM_TEMPERATURE`, `LLM_MAX_TOKENS`; per-stage overrides use the
suffixes `_PLANNER`, `_SECTION`, `_CHAT`, `_REPAIR` (e.g. `LLM_MODEL_PLANNER=claude-haiku-4-5` runs the
planner on a cheaper model). Newer Claude models reject sampling params, so `temperature` is sent only
to models that still accept it. Set `AI_EXPOSE_COST=true` to include a compact cost summary in the SSE
`complete` event for the editor to display.

The `/api/ai/*` routes sit behind a perimeter: set `AI_API_KEY` to require
`Authorization: Bearer <AI_API_KEY>` on every request (unset = open, with a startup warning — fine for
local dev, not for production). `AI_RATE_LIMIT_WINDOW_MS` (default `60000`) and `AI_RATE_LIMIT_MAX`
(default `30`) cap requests per IP.

The backend runs on `http://localhost:3002` by default. Set the URL in the editor's AI config panel.

### Provider & Model Defaults

| Provider | Default model | JSON mode |
|----------|--------------|-----------|
| OpenAI | `gpt-4o` | `response_format: json_object` |
| Gemini | `gemini-2.0-flash` | `responseMimeType: application/json` |
| Claude | `claude-sonnet-5` | Prompt-based |

Override via `LLM_MODEL` (or per-stage `LLM_MODEL_PLANNER` / `_SECTION` / `_CHAT` / `_REPAIR`). All
providers support the same request/response shape — switching providers requires only an env change, no
code changes.

### Design Tokens

Pass canvas-level design tokens to keep AI output consistent with your brand:

```tsx
<BuilderEditor
  builder={builder}
  aiConfig={{
    backendUrl: "http://localhost:3002",
    designTokens: {
      primaryColor: "#6366F1",
      fontFamily: "Inter, sans-serif",
      borderRadius: "8px",
    },
  }}
/>
```

The page generator passes selected palette and tone as first-class generation options. The compiler
uses design tokens when creating commands, so the generated page is constrained by the builder's
component model instead of free-form HTML/CSS.

> Full reference: **[AI_ASSISTANT.md](./.claude/docs/AI_ASSISTANT.md)**

---

## 🚀 Getting Started with Development

### Prerequisites
- **Node.js** 18+
- **pnpm** 8+ (package manager)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd my-builder

# Install dependencies
pnpm install

# Start development
pnpm dev

# Build all packages
pnpm build

# Run type checking
pnpm typecheck

# Run linting
pnpm lint
```

### Development Workflow

**Work on builder-core (framework-agnostic engine):**
```bash
cd packages/builder-core
pnpm dev
```

**Work on builder-editor (visual editor UI):**
```bash
cd packages/builder-editor
pnpm dev
```

**Test in Playground (full-featured sandbox):**
```bash
cd apps/playground
pnpm dev
# Open http://localhost:5173
```

**Configure components in CMS:**
```bash
cd apps/cms
pnpm dev
# Open http://localhost:5174
```

### Project Scripts

| Command | Description |
| --- | --- |
| `pnpm install` | Install all dependencies across monorepo |
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm typecheck` | Type check without emit |
| `pnpm lint` | Run ESLint on all packages |
| `pnpm format` | Format code with Prettier |

---

## 📦 Component System

### Creating a Custom Component

Define a component using `ComponentDefinition`:

```typescript
import type { ComponentDefinition, PropSchema } from "@ui-builder/builder-core";

const MyButton: ComponentDefinition = {
  type: "MyButton",
  displayName: "My Custom Button",
  description: "A custom button component",
  defaultProps: {
    label: "Click me",
    variant: "primary",
  },
  defaultStyle: {
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
  },
  propSchema: {
    label: {
      type: "string",
      label: "Button Label",
      description: "Text displayed on the button",
    },
    variant: {
      type: "string",
      control: "select",
      options: ["primary", "secondary", "ghost"],
      label: "Variant",
    },
    onClick: {
      type: "function",
      label: "On Click",
    },
  },
};

export default MyButton;
```

### Registering a Component

Register in the `ComponentRegistry`:

```typescript
import { ComponentRegistry } from "@ui-builder/builder-core";

const registry = new ComponentRegistry();
registry.registerComponent(MyButton);
```

### Component Preset

Create a preset for quick access in the palette:

```typescript
import type { PaletteItem } from "@ui-builder/builder-core";

const MyButtonPreset: PaletteItem = {
  id: "my-button-primary",
  componentType: "MyButton",
  name: "Primary Button",
  description: "Large primary action button",
  props: {
    label: "Save Changes",
    variant: "primary",
  },
  style: {
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
  },
};
```

### Extending Existing Components

Use `extendComponent()` to create variants:

```typescript
import { extendComponent } from "@ui-builder/builder-components";

const LargeButton = extendComponent(Button, {
  displayName: "Large Button",
  defaultProps: {
    size: "lg",
  },
});
```

---

## 📚 Packages Overview

### `builder-core`
**Framework-agnostic state engine & type system**

- BuilderDocument, BuilderNode, ComponentDefinition
- BuilderAPI (state management, commands)
- ComponentRegistry, GroupRegistry
- Command system with undo/redo
- PropSchema validation
- Zero external dependencies ✨

**Use:** Core state management for any framework/platform

### `builder-components`
**17 built-in component definitions**

- Layout: Container, Section, Grid, Stack
- Content: Text, RichText, Image, Button
- Forms: Input, Select, Checkbox, Radio
- Data: Table, List
- Interactive: Tabs, Accordion, Modal
- extendComponent() for custom variants

**Use:** Out-of-the-box components for rapid development

### `builder-react`
**React integration layer**

- BuilderProvider (context setup)
- useBuilder() hook
- useSelection() hook
- useCommand() hook
- React component rendering
- Event handling & lifecycle

**Use:** React applications building with the builder

### `builder-editor`
**Visual drag-and-drop editor**

- Canvas with grid & snapping
- Multi-panel UI (properties, tree, palette)
- Toolbar with shortcuts
- Drag-drop orchestration
- Real-time property editing
- Responsive viewport simulation

**Use:** Full visual editing experience

### `builder-renderer`
**Production-grade runtime renderer**

- Efficient DOM rendering
- Dynamic component loading
- Asset pipeline
- Import/export (JSON, TypeScript)
- Accessibility support

**Use:** Render designed layouts in production

### `ui`
**shadcn-based design system**

- Reusable UI components
- Tailwind CSS integration
- Consistent visual style
- Liquid Glass aesthetic

**Use:** Building editor UI & custom interfaces

### `shared`
**Shared utilities & constants**

- Type definitions
- Constants (GRID_UNIT_PX, etc.)
- Helper functions
- Shared types across packages

**Use:** Common code across all packages

### `config`
**Build & code quality configuration**

- ESLint rules
- TypeScript config
- Tailwind config
- Prettier formatting rules

**Use:** Consistent tooling across monorepo

---

## 🤝 Contributing

### Code Standards

- **TypeScript** — strict mode enabled, no `any`
- **Naming Conventions** — PascalCase for types, camelCase for functions/variables
- **Component Patterns** — Follow existing component definitions
- **Comments** — Document complex logic, not obvious code
- **Tests** — Unit tests for core logic, integration tests for workflows

### Commit Messages

Follow conventional commits:
```
feat: add component snapping feature
fix: resolve canvas selection bug
docs: update component system guide
refactor: simplify command execution
chore: update dependencies
```

### Pull Request Process

1. **Branch naming** — `feature/description` or `fix/description`
2. **Write tests** for new functionality
3. **Review docs impact** after every code change — update user-facing docs and AI-facing docs/instructions when behavior, APIs, workflows, constraints, or assumptions change
4. **Run quality checks** — `pnpm typecheck && pnpm lint && pnpm build`
5. **Request review** from maintainers

### Design Principles

- **Separation of Concerns** — Core logic separate from UI
- **Type Safety** — Leverage TypeScript for compile-time checks
- **Immutability** — Prefer immutable state updates
- **Composability** — Small, focused components that compose well
- **Performance** — Optimize for runtime efficiency & bundle size

### Reporting Issues

Include:
- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/videos if applicable
- Environment details (OS, Node version, etc.)

---

## 📞 Support & Resources

- **Documentation** — See `.claude/docs/` for detailed guides
- **Examples** — Check `apps/playground` for usage examples
- **Issues** — Report bugs on GitHub
- **Discussions** — Community discussions & Q&A

---

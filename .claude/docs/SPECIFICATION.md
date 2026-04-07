# UI Builder Specification

**Technical Specification v2.1**

> This document serves as the engineering reference for AI Agents when understanding project scope, planning development, and generating code/structures per module. All interface contracts defined here are immutable unless officially version-bumped.

---

## 1. Project Overview

### Objective

Build a **UI Builder Library** — a modular, extensible platform enabling drag-and-drop web interface creation. Designed as a **platform**, not merely a component library.

### Core User Capabilities

- Drag-and-drop components onto canvas to create layouts
- Select components to view/edit properties via right panel
- Move, resize, duplicate, delete components on canvas
- Snap components together during drag (magnetic snap)
- View helper lines indicating container/wrapper bounds
- Configure responsive designs across multiple breakpoints (desktop/tablet/mobile)
- Load third-party components dynamically
- Undo/redo all operations
- Import/export document schemas
- Toggle grid, snap, panel visibility via toolbar

### Scope Boundary

This specification covers **library layer only**. Backend services (manifest API, CDN, auth, persistence) lie outside scope but integration contracts are defined in Section 27.

---

## 2. Architecture Overview

### Package Dependency Rules

```
builder-core          ← no dependencies
builder-react         ← depends on builder-core
builder-editor        ← depends on builder-core, builder-react
builder-renderer      ← depends on builder-core, builder-react
```

| Package            | Role                                           |
| ------------------ | ---------------------------------------------- |
| `builder-core`     | Central engine — framework-agnostic            |
| `builder-react`    | React adapter layer                            |
| `builder-editor`   | Visual editor — canvas, panels, drag-drop      |
| `builder-renderer` | Production runtime renderer (no editor code)   |

**Hard constraint:** `builder-core` cannot depend on React, DOM, or browser APIs at runtime. All DOM interactions must flow through adapters in `builder-react` or `builder-editor`.

### Data Flow Overview

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

---

## 3. Core Design Principles

### 3.1 Component-driven

No component is hardcoded. All must register via:

```ts
builder.registerComponent(definition: ComponentDefinition): void
builder.unregisterComponent(type: string): void
builder.getComponent(type: string): ComponentDefinition | undefined
builder.listComponents(filter?: ComponentFilter): ComponentDefinition[]
```

### 3.2 Schema-driven UI

Document schema is the single source of truth for both rendering and editing. Renderer creates UI from schema only, no supplemental config needed.

### 3.3 Plugin-first

All non-core features must be implementable as plugins. Core exposes stable, independently-versioned plugin API. Plugins cannot access core internal state beyond defined interfaces.

### 3.4 Framework-agnostic core

`builder-core` works with any framework (React, Vue, Svelte, vanilla JS) without modification.

### 3.5 Contract-first interfaces

Each package boundary must be defined as a TypeScript interface contract before implementation. AI Agents must treat these contracts as immutable.

### 3.6 Fail-safe degradation

- Missing component definition → render `UnknownComponentPlaceholder`, don't throw
- Plugin load fail → continue without that plugin, emit diagnostic event
- Remote component load fail → render `RemoteComponentErrorPlaceholder`
- Command fail → state unchanged, emit `command:error`

### 3.7 Extension-first panel system

Editor panels (left, right, top, bottom) must be extensible — plugins can add panels, tabs, controls without modifying core editor code.

### 3.8 UI Design System & Styling

**Design System Foundation**

Project uses **shadcn** (`packages/ui`) as unified design system for all editor UI. Every component, panel, toolbar, and dialog is built from shadcn components ensuring:

- **Visual Consistency**: Unified typography, spacing, color palette, component patterns
- **Accessibility**: All components comply with WCAG 2.1 AA standards
- **Developer Experience**: Pre-built components, TypeScript definitions, composable primitives
- **Theming**: Tailwind CSS token-based theming (light/dark mode, custom palettes)

**Liquid Glass Aesthetic**

Editor UI applies **Liquid Glass** (glassmorphism v2) aesthetic to panels, overlays, and toolbar:

```css
/* Liquid Glass pattern */
.glass-surface {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

/* Dark mode variant */
.dark .glass-surface {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
```

Benefits:
- **Depth perception**: Layered transparency creates visual hierarchy
- **Modern aesthetics**: Contemporary, premium visual polish
- **Performance**: CSS-based, GPU-accelerated rendering
- **Accessibility**: Maintained contrast ratios with strategic opacity

**Design System Location**

```
packages/ui/
├── src/
│   ├── components/           # shadcn-based UI components
│   │   ├── button/
│   │   ├── input/
│   │   ├── dialog/
│   │   ├── tabs/
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts          # cn utility
│   │   └── constants.ts      # Design tokens
│   └── styles/
│       ├── globals.css       # Tailwind directives
│       └── glass.css         # Liquid glass utilities
```

---

_For detailed technical specifications of Data Model, Command System, Editor UI, Runtime, Plugins, Accessibility, and Integration, refer to related `.claude/docs/*.md` files._

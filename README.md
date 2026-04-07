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
| **[PROPERTY_SYSTEM.md](./.claude/docs/PROPERTY_SYSTEM.md)** | PropertyDescriptor, shared style/prop editing, PropertyControls |
| **[PRESETS.md](./.claude/docs/PRESETS.md)** | Component preset types, PresetRegistry API, palette UI |

**For AI Agents:** Always read `SPECIFICATION.md` first for project context.

---

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
- **Property controls** (text, number, color, select, slider, rich-text)

### Developer Experience
- **Framework-agnostic core** (zero runtime dependencies)
- **React hooks & context API** integration
- **TypeScript support** throughout
- **Plugin system** for extensibility
- **Comprehensive type exports** for type-safe integrations

### Production Ready
- **Optimized runtime renderer** for deployment
- **Asset management** (images, fonts, CDN integration)
- **Import/export** (JSON, TypeScript)
- **Accessibility built-in** (WCAG compliance)
- **Performance profiling** tools

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
3. **Update docs** if adding/changing APIs
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

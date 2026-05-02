# CMS — Component Management System

A visual component configurator for the UI Builder library. Allows users to preview, configure, and manage component presets through an interactive interface.

## Overview

The CMS is a **standalone application** that enables:
- **Browse**: Discover all available components and their presets from the palette catalog
- **Configure**: Edit component properties, styles, and children in real-time
- **Preview**: See live updates as you modify configurations
- **Manage**: Create and export component presets for use in the builder

## Architecture

### Core Structure

```
src/
├── App.tsx                      # Main app entry — layout, palette sidebar, editor pane
├── components/
│   ├── PaletteCatalog.tsx      # Left sidebar: searchable list of components & presets
│   ├── ComponentEditorPane.tsx # Center: canvas + right panel (info/properties tabs)
│   ├── InteractiveCanvas.tsx   # Renders preview with builder integration
│   ├── ComponentInfoPanel.tsx  # Displays component metadata & documentation
│   ├── PropSchemaEditor.tsx    # Property editor form
│   ├── NodeTreePanel.tsx       # Hierarchical view of component nodes
│   ├── ComponentPreview.tsx    # Rendered component output
│   ├── StyleEditor.tsx         # CSS style property editor
│   ├── prop-controls/          # Reusable control components for different property types
│   │   ├── StringControl.tsx
│   │   ├── NumberControl.tsx
│   │   ├── ColorControl.tsx
│   │   ├── SelectControl.tsx
│   │   ├── BooleanControl.tsx
│   │   ├── SliderControl.tsx
│   │   ├── RichtextControl.tsx
│   │   └── PropControl.tsx     # Base abstraction
│   └── ComponentCatalog.tsx    # Catalog browser with filtering
├── hooks/
│   ├── useComponentConfigurator.ts  # State management for props, styles, document generation
│   └── useDocumentEditor.ts          # Builder state and document manipulation
├── lib/
│   ├── registry.ts             # Singleton ComponentRegistry with BASE_COMPONENTS
│   ├── buildPreviewDocument.ts # Creates BuilderDocument from component config
│   └── paletteCatalog.ts       # Palette data: components, presets, metadata
├── types/
│   └── palette.types.ts        # PaletteItem, palette structure types
└── main.tsx                    # Vite entry point

```

### Data Flow

```
PaletteCatalog (select item)
    ↓
App (selectedItem state)
    ↓
ComponentEditorPane (definition lookup)
    ↓
useComponentConfigurator (props/style state)
    ↓
buildPreviewDocument (create BuilderDocument)
    ↓
InteractiveCanvas (render with BuilderProvider)
```

## Key Concepts

### 1. **Palette Items**
A palette item represents a pre-configured component instance with a name, metadata, and default props/styles.

**Type:**
```typescript
interface PaletteItem {
  id: string;
  componentType: string;          // e.g., "Button", "Card"
  name: string;
  description?: string;
  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  children?: unknown;             // Nested component data
}
```

**Source:** `src/lib/paletteCatalog.ts` — statically defined presets for each component.

### 2. **Component Configurator Hook**
`useComponentConfigurator()` manages local state for the selected component's configuration.

**State managed:**
- `props` — Component property values
- `style` — CSS-in-JS style overrides
- `document` — Generated `BuilderDocument` (auto-computed from props/style)

**API:**
```typescript
function useComponentConfigurator(
  definition: ComponentDefinition | null,
  initialProps?: Record<string, unknown>,
  initialStyle?: Partial<StyleConfig>,
): UseComponentConfiguratorReturn {
  props, style, document, setProp, setStyleProp, reset
}
```

### 3. **Component Registry**
Singleton instance initialized with all `BASE_COMPONENTS` from `@ui-builder/builder-components`.

```typescript
export const registry = new ComponentRegistry();
for (const component of BASE_COMPONENTS) {
  registry.registerComponent(component);
}
```

Used for lookups:
```typescript
const definition = registry.getComponent(componentType);
```

### 4. **Build Preview Document**
Converts component configuration → `BuilderDocument` for canvas rendering.

**Input:** component type, props, style, children  
**Output:** `BuilderDocument` with root node + metadata

### 5. **Editor Panes**

#### Info Panel
Displays metadata about the selected component:
- Component name & type
- Prop schema
- Supported events
- Default values
- Documentation snippets

#### Properties Panel
Two-tab interface:
- **Info Tab**: Component documentation & prop schema browser
- **Properties Tab**: Prop controls + style editor

Each prop is rendered with the appropriate control type (text, number, color, select, etc.) via `prop-controls/`.

### 6. **Interactive Canvas**
Wraps the preview in a `BuilderProvider` context, enabling:
- Live prop updates
- Visual selection/hovering
- Builder state integration
- Real-time rendering

## Components

### High-Level Components

#### **PaletteCatalog**
```typescript
<PaletteCatalog
  selectedItemId={string | null}
  onSelect={(item: PaletteItem) => void}
/>
```
Renders a searchable, categorized list of palette items. Clicking an item triggers selection.

#### **ComponentEditorPane**
```typescript
<ComponentEditorPane
  item={PaletteItem}
  definition={ComponentDefinition | null}
  registry={ComponentRegistry}
  onReset={() => void}
/>
```
Main editor UI: canvas (left/center) + info/properties panels (right).

#### **InteractiveCanvas**
Renders the preview within a `BuilderProvider`. Handles visual feedback, selection state, and real-time updates.

#### **PropSchemaEditor**
Dynamic form generator for component properties. Renders the appropriate control for each prop based on schema.

#### **StyleEditor**
CSS-in-JS style property editor. Allows editing color, size, spacing, layout, and typography properties.

#### **NodeTreePanel**
Hierarchical tree view of nodes in the preview document. Useful for selecting/inspecting nested components.

### Control Components (`prop-controls/`)

Each control is a specialized input widget for a specific property type:

- **StringControl** — Text input
- **NumberControl** — Number input with increment/decrement
- **ColorControl** — Color picker
- **SelectControl** — Dropdown
- **BooleanControl** — Toggle/checkbox
- **SliderControl** — Range slider
- **RichtextControl** — Rich text editor (for HTML/Markdown content)

**Base interface:**
```typescript
interface PropControlProps {
  value: unknown;
  onChange: (value: unknown) => void;
  schema?: PropSchema;
  label?: string;
  disabled?: boolean;
}
```

## Hooks

### `useComponentConfigurator()`
Manages the full state lifecycle for a component configuration. Auto-generates the preview document.

**Usage:**
```typescript
const { props, style, document, setProp, setStyleProp, reset } = 
  useComponentConfigurator(definition, initialProps, initialStyle);
```

### `useDocumentEditor()`
Manages builder document state and provides methods to modify it (add/remove/update nodes).

## Types

### `PaletteItem`
```typescript
interface PaletteItem {
  id: string;
  componentType: string;
  name: string;
  description?: string;
  props?: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  children?: unknown;
}
```

## Workflow

### Typical User Journey

1. **Open CMS** → App renders with empty state
2. **Browse Palette** → PaletteCatalog displays all available components & presets
3. **Select Item** → ComponentEditorPane appears with:
   - Canvas preview (center)
   - Component info (right, Info tab)
   - Property editor (right, Properties tab)
4. **Edit Properties** → PropSchemaEditor form responds with live updates
5. **Adjust Styles** → StyleEditor allows CSS tweaks
6. **Preview Updates** → InteractiveCanvas re-renders in real-time
7. **Reset/Export** → Save configuration or reset to defaults

### Development Workflow

To add a new component preset:

1. **Register component** in `registry.ts` (auto-loaded from BASE_COMPONENTS)
2. **Add palette item** to `paletteCatalog.ts`
3. **CMS auto-discovers** it on next load
4. **Edit in UI** — props, style, children are all configurable

## Configuration

### Tailwind + Vite
- Uses **Tailwind CSS v4** with `@tailwindcss/vite` plugin
- Design tokens from `packages/ui` (shadcn-based)

### TypeScript
- Strict mode enabled
- Paths alias: `@/` → `src/`

### Scripts
```bash
npm run dev       # Dev server (Vite)
npm run build     # Production build
npm run preview   # Preview built app
npm run typecheck # Type check without emit
npm run lint      # ESLint check
```

## Integration Points

### Upstream Dependencies
- **`@ui-builder/builder-core`** — BuilderDocument, ComponentDefinition, ComponentRegistry
- **`@ui-builder/builder-components`** — BASE_COMPONENTS
- **`@ui-builder/builder-react`** — BuilderProvider, useBuilder, useSelection
- **`@ui-builder/builder-editor`** — Editor utilities
- **`@ui-builder/ui`** — shadcn design system

### External Libraries
- **React 18** — UI framework
- **Vite** — Build tool
- **Tailwind CSS v4** — Styling
- **lucide-react** — Icons

## Future Enhancements

- [ ] Export presets as JSON/TypeScript
- [ ] Import custom component definitions
- [ ] Preset versioning & history
- [ ] Collaborative editing (shared state)
- [ ] Component validation against schema
- [ ] Accessibility auditing
- [ ] Performance profiling

---

**Last updated:** 2026-04-20

# Preset System

Pre-configured component variations that users can drag directly onto the canvas.

---

## Overview

Presets are named, style-and-prop-complete snapshots of components (or small component trees).
Examples: "Hero Section", "CTA Button", "Testimonial Card", "Pricing Table".

Unlike a component definition (which describes structure and schema), a preset describes a specific
**visual variation** of a component — its ready-to-use default appearance.

---

## Type Contracts

### `ComponentPreset`

```ts
interface ComponentPreset {
  id: string;
  /** Component type this preset instantiates */
  componentType: string;
  /** Human-readable display name */
  name: string;
  /** Category for grouping in the palette (e.g. "Sections", "Buttons") */
  category: string;
  /** Optional short description shown on hover */
  description?: string;
  /** Thumbnail URL or data-URI for the palette card */
  thumbnail?: string;
  /** Tags used for full-text search */
  tags?: string[];
  /** Initial props for the root node */
  props: Record<string, unknown>;
  /** Initial style for the root node */
  style?: Partial<StyleConfig>;
  /** Child nodes to create (for container presets) */
  children?: PresetChildNode[];
}
```

### `PresetChildNode`

```ts
interface PresetChildNode {
  componentType: string;
  props: Record<string, unknown>;
  style?: Partial<StyleConfig>;
  children?: PresetChildNode[];  // recursive
}
```

---

## `PresetRegistry`

Defined in `packages/builder-core/src/presets/PresetRegistry.ts`.

The `PresetRegistry` is attached to the builder instance and used by both the editor palette and
any plugin that wants to contribute presets.

### API

```ts
class PresetRegistry {
  /** Register one preset (overwrites on id collision) */
  register(preset: ComponentPreset): void;
  /** Register multiple presets */
  registerMany(presets: ComponentPreset[]): void;
  /** Remove a preset by id */
  unregister(id: string): boolean;
  /** Fetch one preset */
  get(id: string): ComponentPreset | undefined;
  /** List all presets with optional filtering */
  list(filter?: {
    componentType?: string;
    category?: string;
    search?: string;
  }): ComponentPreset[];
  /** All unique category strings */
  getCategories(): string[];
  /** Presets grouped by category */
  getGrouped(): Map<string, ComponentPreset[]>;
  clear(): void;
  readonly size: number;
}
```

### Accessing via BuilderAPI

```ts
builder.presets.register(myPreset);
builder.presets.list({ category: "Sections" });
```

---

## Preset Palette UI

**Component**: `packages/builder-editor/src/panels/left/PresetPalette.tsx`

- Tab inside the left panel alongside `ComponentPalette`
- Renders preset cards grouped by category
- Each card shows: thumbnail (if present) → component type icon fallback, name, description
- Cards are draggable — drop onto the canvas to instantiate
- Full-text search across `name`, `description`, and `tags`

### Instantiation on Drop

When a preset card is dropped onto the canvas, the editor dispatches `ADD_NODE` with the preset's
`props`, `style`, and creates child nodes from `children` recursively:

```ts
dispatch({
  type: "ADD_NODE",
  payload: {
    nodeId: newId,
    parentId: dropTargetId,
    componentType: preset.componentType,
    props: preset.props,
    style: preset.style,
    // children handled by a separate recursive pass
  },
});
```

---

## Registering Presets

### Via `BuilderConfig`

Pass presets at builder creation time:

```ts
const builder = createBuilder({
  components: [...],
  presets: [
    {
      id: "hero-dark",
      componentType: "Section",
      name: "Hero — Dark",
      category: "Sections",
      tags: ["hero", "landing", "dark"],
      props: { minHeight: 600 },
      style: { backgroundColor: "#0f172a", color: "#f8fafc" },
      children: [
        {
          componentType: "Heading",
          props: { text: "Your Headline Here", level: "h1" },
          style: { fontSize: "3rem", fontWeight: "700" },
        },
        {
          componentType: "Button",
          props: { label: "Get Started", variant: "primary" },
        },
      ],
    },
  ],
});
```

### Via Plugin

```ts
const myPlugin: BuilderPlugin = {
  id: "my-plugin",
  onRegister(api) {
    api.presets.registerMany(myPresets);
  },
  onUnregister(api) {
    myPresets.forEach((p) => api.presets.unregister(p.id));
  },
};
```

---

## Search

`PresetRegistry.list({ search })` performs case-insensitive substring matching against:
- `preset.name`
- `preset.description`
- Any entry in `preset.tags`

---

## Preset vs Component

| | Component | Preset |
|---|---|---|
| Defines structure | ✅ (`propSchema`, renderers) | ❌ |
| Defines appearance | ❌ (default only) | ✅ (specific variation) |
| Requires `ComponentDefinition` | self | Yes — must reference a registered component type |
| Drag from palette | ✅ | ✅ |
| Undo-safe | ✅ | ✅ (dispatches ADD_NODE) |
| Plugin-contributed | Via registry | Via plugin |

---

_For the component types presets reference, see [DATA_MODEL.md](./DATA_MODEL.md).  
For how presets are dragged and dropped, see [EDITOR_UI.md](./EDITOR_UI.md) — Drag & Drop._

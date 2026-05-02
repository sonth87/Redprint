# @ui-builder/builder-presets

Preset component management UI library — provides preset catalog browser, editor, and prop controls for the UI Builder ecosystem.

## Overview

`builder-presets` is a data-agnostic React component library that enables managing component presets (variants, custom components, and sections) within a preset management application (e.g., CMS). It does **not** handle data persistence — callers are responsible for loading and saving preset data.

## Features

- **PresetCatalog** — Group-based catalog browser with search, filter, and mini-preview rendering
- **PresetEditor** — Full-featured preset editor with canvas, interactive selection, and property panels
- **Component Prop Controls** — Type-driven prop editors (string, number, boolean, select, color, slider, richtext)
- **Style Editor** — CSS property editor for direct style manipulation
- **Layer Tree** — Node hierarchy visualization with drag/drop and add/remove operations
- **Icon Mapping** — Dynamic icon rendering from lucide-react based on preset group definitions

## Installation

```bash
pnpm add @ui-builder/builder-presets
```

## API

### Types

```typescript
import type {
  PaletteItem,       // Single preset configuration
  PaletteGroup,      // Group of related presets
  PaletteType,       // Category within a group
  PaletteItemChild,  // Nested component definition
} from "@ui-builder/builder-presets";
```

### Components

#### `<PresetCatalog />`

Browse and search preset groups.

```tsx
import { PresetCatalog, createRegistry } from "@ui-builder/builder-presets";

const registry = createRegistry(); // Includes all BASE_COMPONENTS

<PresetCatalog
  groups={paletteGroups}           // PaletteGroup[]
  selectedItemId={selected?.id}    // Current selection
  onSelect={(item) => {...}}       // Selection callback
  registry={registry}               // ComponentRegistry
/>
```

#### `<PresetEditor />`

Full editor with canvas and property panels.

```tsx
import { PresetEditor, createRegistry } from "@ui-builder/builder-presets";

const registry = createRegistry();

<PresetEditor
  item={selectedPreset}            // PaletteItem
  registry={registry}               // ComponentRegistry
  onReset={() => {...}}            // Reset callback
  onChange={(updatedItem) => {...}} // Optional: mutation callback
/>
```

### Utilities

#### `createRegistry()`

Create a ComponentRegistry pre-populated with BASE_COMPONENTS.

```typescript
import { createRegistry } from "@ui-builder/builder-presets";

const registry = createRegistry();
const textComponent = registry.getComponent("Text"); // or null
```

#### `buildPreviewDocument()`

Transform preset data into a BuilderDocument for preview/editing.

```typescript
import { buildPreviewDocument } from "@ui-builder/builder-presets";
import type { PaletteItem } from "@ui-builder/builder-presets";

const item: PaletteItem = {
  id: "heading-1",
  componentType: "Text",
  name: "Heading 1",
  props: { text: "<h1>Title</h1>", tag: "h1" },
  style: { fontSize: "32px", fontWeight: "700" },
};

const doc = buildPreviewDocument(
  item.componentType,
  item.props,
  item.style,
  item.children
);
// → BuilderDocument ready for editing/rendering
```

### Hooks

#### `useComponentConfigurator()`

Manage single component state (props, style, document).

```typescript
import { useComponentConfigurator } from "@ui-builder/builder-presets";

const {
  props,
  style,
  document,
  setProp,
  setStyleProp,
  reset,
} = useComponentConfigurator(
  definition,      // ComponentDefinition | null
  initialProps,    // override default props
  initialStyle     // override default style
);
```

#### `useDocumentEditor()`

Manage multi-node document state with node tree mutations.

```typescript
import { useDocumentEditor } from "@ui-builder/builder-presets";

const {
  document,
  selectedNodeId,
  selectedNode,
  selectedDefinition,
  selectNode,
  updateNodeProp,
  updateNodeStyle,
  addChildNode,
  removeNode,
  reset,
} = useDocumentEditor(item, registry);
```

## Data Flow

```
CMS (data provider)
  ↓
PresetCatalog (browse + select)
  ↓
PresetEditor (edit canvas, props, styles)
  ↓
onChange callback (mutations emitted)
  ↓
CMS (serialize & persist)
```

## Example: CMS Integration

```tsx
import { useState } from "react";
import {
  PresetCatalog,
  PresetEditor,
  createRegistry,
} from "@ui-builder/builder-presets";
import type { PaletteItem } from "@ui-builder/builder-presets";

function CMS() {
  const [selectedItem, setSelectedItem] = useState<PaletteItem | null>(null);
  const registry = createRegistry();

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Left panel: catalog */}
      <div style={{ width: "320px", borderRight: "1px solid #ccc" }}>
        <PresetCatalog
          groups={presetGroups}
          selectedItemId={selectedItem?.id ?? null}
          onSelect={setSelectedItem}
          registry={registry}
        />
      </div>

      {/* Right panel: editor */}
      {selectedItem && (
        <div style={{ flex: 1 }}>
          <PresetEditor
            key={selectedItem.id}
            item={selectedItem}
            registry={registry}
            onReset={() => {}}
            onChange={(updatedItem) => {
              // Save to API/database
              api.updatePreset(updatedItem).catch(console.error);
            }}
          />
        </div>
      )}
    </div>
  );
}
```

## Dependencies

- `@ui-builder/builder-core` — Document model, ComponentRegistry
- `@ui-builder/builder-react` — React hooks (useBuilder, useSelection)
- `@ui-builder/builder-renderer` — RuntimeRenderer for previews
- `@ui-builder/builder-components` — BASE_COMPONENTS array
- `@ui-builder/ui` — shadcn-based UI components
- `lucide-react` — Icon library (dynamic group icons)

## Peer Dependencies

- `react >= 18.0.0`
- `react-dom >= 18.0.0`

## Architecture

`builder-presets` is **data-agnostic** — it does not:
- Load or save data to disk/API (caller's responsibility via `onChange`)
- Make network requests
- Know about your data source (JSON files, database, remote API)

It **only**:
- Renders UI from `PaletteGroup[]` data passed via props
- Emits mutations via callbacks
- Uses the provided `ComponentRegistry` for component definitions

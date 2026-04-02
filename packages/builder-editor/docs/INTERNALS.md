# Builder Editor Implementation Guide

Deep-dive into editor internals, component architecture, and state management.

> **Overview:** See [.claude/docs/EDITOR_UI.md](../../../.claude/docs/EDITOR_UI.md) for complete UI specifications. This file covers implementation architecture and internal state machines.

---

## Canvas System Architecture

The Canvas component orchestrates rendering, interaction, and overlay logic.

### Rendering Layers

```
Canvas (root container)
├── Background Layer (grid, ruler)
├── Document Layer (component tree via editorRenderer)
└── Overlay Layer
    ├── Selection boxes
    ├── Resize handles
    ├── Hover highlights
    ├── Drag ghosting
    ├── Snap guides
    ├── Helper lines
    └── Drop indicators
```

### Key Components

- **Canvas.tsx**: Root canvas component, viewport management, scroll handling
- **DocumentLayer.tsx**: Renders node tree using component editorRenderers
- **OverlayLayer.tsx**: Absolute-positioned overlay for interactive UI
- **SelectionBox.tsx**: Bounding box + resize handles
- **DragGhost.tsx**: Moving element during drag
- **SnapGuides.tsx**: Visual snap feedback

---

## Drag & Drop State Machine

```
Initial
  ↓
[mouseDown on palette/canvas]
  ↓
DraggingFromPalette / DraggingExisting
  ├── [mousemove] → update ghostOffset, calculate target
  ├── [hover valid target] → highlight + show drop indicator
  ├── [hover invalid target] → show prohibition icon
  └── [mouseup]
        ├── Valid drop → execute ADD_NODE or MOVE_NODE
        └── Invalid → abort
```

---

## Panel Architecture

Each panel (left, right, bottom, top) is independently renderable.

```ts
interface PanelController {
  id: string;
  isVisible: boolean;
  width?: number; // for resizable panels
  render(): ReactNode;
}
```

Panel tabs are managed separately from panels:

```ts
interface TabController {
  panelId: string;
  id: string;
  label: string;
  render(): ReactNode;
}
```

---

## Selection & Interaction State

Managed in `InteractionState`:

```ts
interface InteractionState {
  dragOperation: DragOperation | null;
  resizeOperation: ResizeOperation | null;
  isMultiSelecting: boolean;
  multiSelectRect: Rect | null;
}
```

**Transitions:**

- **Mouse down on empty canvas** → start multiSelect (rubber-band)
- **Mouse down on node** → single select  OR start drag
- **Shift+click** → add to selection
- **Mouse down on resize handle** → start resize
- **Escape** → clear selection

---

## Keyboard Shortcut Registration

Shortcuts are centrally registered and managed:

```ts
interface ShortcutManager {
  register(def: ShortcutDefinition): void;
  unregister(id: string): void;
  handle(event: KeyboardEvent): boolean;
}
```

Conflict resolution: highest `priority` wins.

---

## Property Panel Control Generation

Controls are generated dynamically from `PropSchema`:

```ts
function generateControl(schema: PropSchema, props: Record<string, unknown>) {
  switch (schema.type) {
    case 'string': return <StringInput />;
    case 'number': return <NumberInput />;
    case 'color': return <ColorPicker />;
    case 'select': return <Select options={schema.options} />;
    // ... etc
  }
}
```

---

_For UI specifications, see [.claude/docs/EDITOR_UI.md](../../../.claude/docs/EDITOR_UI.md)._
_For state management, see [.claude/docs/COMMAND_SYSTEM.md](../../../.claude/docs/COMMAND_SYSTEM.md)._
_For data model, see [.claude/docs/DATA_MODEL.md](../../../.claude/docs/DATA_MODEL.md)._

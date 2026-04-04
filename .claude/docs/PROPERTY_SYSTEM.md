# Property System

Unified property editing system that guarantees the ContextualToolbar and PropertyPanel always
dispatch identical commands for the same style/prop change.

---

## Overview

The Property System solves a duplication problem: both the floating `ContextualToolbar` and the
docked `PropertyPanel` need to edit node properties. Without a shared abstraction each would
implement its own dispatch logic, leading to subtle divergence.

**Solution**: `PropertyDescriptor<T>` — a descriptor object that knows how to **read** a property
from a node and **write** it back as a typed command payload, regardless of breakpoint context.

---

## Core Type: `PropertyDescriptor<T>`

Defined in `packages/builder-core/src/properties/PropertyDescriptor.ts`:

```ts
interface PropertyDescriptor<T = unknown> {
  key: string;
  category: "style" | "prop" | "layout";
  label: string;
  /** Read the current value, resolving breakpoint overrides */
  getValue(
    node: Pick<BuilderNode, "props" | "style" | "responsiveStyle" | "responsiveProps">,
    breakpoint?: Breakpoint,
  ): T;
  /** True if the value has an explicit per-breakpoint override */
  isOverridden(
    node: Pick<BuilderNode, "responsiveStyle" | "responsiveProps">,
    breakpoint?: Breakpoint,
  ): boolean;
  /** Build the `dispatch()` payload for a value change */
  toPayload(
    nodeId: string,
    value: T,
    breakpoint?: Breakpoint,
  ): { type: string; payload: Record<string, unknown>; description: string };
}
```

---

## Factory Functions

### `createStyleProperty<T>(key, label)`

Creates a descriptor for a CSS style property:

- **Read**: Returns `node.style[key]`; on non-desktop breakpoints, uses `resolveStyle()` to merge
  base + responsive overrides.
- **Write**: Dispatches `UPDATE_STYLE` with the breakpoint included in the payload.
- `isOverridden` checks `node.responsiveStyle?.[breakpoint]?.[key]` existence.

```ts
const fontSize = createStyleProperty<string>("fontSize", "Font Size");
```

### `createPropProperty<T>(key, label)`

Creates a descriptor for a component prop:

- **Read**: Returns `node.props[key]`; uses `resolveProps()` on non-desktop breakpoints.
- **Write**: Dispatches `UPDATE_PROPS` on desktop, `UPDATE_RESPONSIVE_PROPS` on other breakpoints.
- `isOverridden` checks `node.responsiveProps?.[breakpoint]?.[key]` existence.

```ts
const textProp = createPropProperty<string>("text", "Text");
```

---

## Pre-built Descriptors

### `STYLE_PROPERTIES`

Ready-to-use descriptors exported from `builder-core`:

| Key | Label | Category |
|-----|-------|----------|
| `fontSize` | Font Size | style |
| `fontWeight` | Font Weight | style |
| `fontFamily` | Font Family | style |
| `color` | Color | style |
| `textAlign` | Text Align | style |
| `lineHeight` | Line Height | style |
| `letterSpacing` | Letter Spacing | style |
| `textDecoration` | Text Decoration | style |
| `textTransform` | Text Transform | style |
| `width`, `height` | Width / Height | style |
| `minWidth`, `maxWidth` | Min/Max Width | style |
| `minHeight`, `maxHeight` | Min/Max Height | style |
| `padding`, `margin` | Padding / Margin | style |
| `backgroundColor` | Background | style |
| `backgroundImage` | Background Image | style |
| `borderRadius` | Border Radius | style |
| `borderWidth` | Border Width | style |
| `borderColor` | Border Color | style |
| `borderStyle` | Border Style | style |
| `opacity` | Opacity | style |
| `boxShadow` | Box Shadow | style |
| `filter` | Filter | style |
| `backdropFilter` | Backdrop Filter | style |
| `mixBlendMode` | Blend Mode | style |
| `transform` | Transform | style |
| `display` | Display | style |
| `position` | Position | style |
| `overflow` | Overflow | style |
| `flexDirection` | Direction | style |
| `justifyContent` | Justify | style |
| `alignItems` | Align Items | style |
| `gap` | Gap | style |
| `zIndex` | Z-Index | style |

### `PROP_PROPERTIES`

| Key | Label |
|-----|-------|
| `text` | Text |
| `label` | Label |
| `src` | Image Source |
| `alt` | Alt Text |
| `href` | Link URL |
| `placeholder` | Placeholder |

---

## React Integration: `useNodeProperty`

Defined in `packages/builder-react/src/hooks/`. Connects a `PropertyDescriptor` to the builder
dispatch, reading from `BuilderState` and dispatching on change:

```ts
const { value, setValue, isOverridden } = useNodeProperty<string>(nodeId, descriptor);
```

- `value` — resolved value at the active breakpoint
- `setValue(v)` — dispatches `descriptor.toPayload(nodeId, v, breakpoint)`
- `isOverridden` — true when breakpoint has an explicit override

---

## Shared UI Controls: `PropertyControls`

Defined in `packages/builder-editor/src/properties/PropertyControls.tsx`.

Pre-built React controls that wire a `PropertyDescriptor` to a UI input via `useNodeProperty`:

| Component | For |
|-----------|-----|
| `PropertyInput` | Text/number input |
| `PropertyColorPicker` | Color swatch + hex input |
| `PropertySelect` | Dropdown |
| `PropertySlider` | Range slider |
| `TextFormatControls` | Bold/Italic/Underline/Strikethrough toggle group |
| `TextAlignControls` | Left/Center/Right/Justify toggle group |
| `FontWeightSelect` | 100–900 weight dropdown |

### Usage

```tsx
import { STYLE_PROPERTIES } from "@ui-builder/builder-core";
import { PropertyInput, TextAlignControls } from "@ui-builder/builder-editor";

<PropertyInput nodeId={selectedId} descriptor={STYLE_PROPERTIES.fontSize} />
<TextAlignControls nodeId={selectedId} />
```

---

## `PropSchema` vs `PropertyDescriptor`

These are complementary, not competing:

| | `PropSchema` | `PropertyDescriptor` |
|---|---|---|
| Defined in | `ComponentDefinition` JSON | `PropertyDescriptor.ts` |
| Purpose | Describe what props a component has | Describe how to read/write a property |
| Used by | `PropertyPanel` auto-render | `ContextualToolbar`, `PropertyControls` |
| Breakpoint-aware | No | Yes |
| Generates dispatch | No | Yes |

`PropSchema` drives dynamic control rendering in `PropertyPanel`. `PropertyDescriptor` drives
shared controls that appear in multiple contexts (toolbar + panel).

---

## Adding a New Shared Property

1. Call `createStyleProperty(key, label)` or `createPropProperty(key, label)`.
2. Add the result to `STYLE_PROPERTIES` or `PROP_PROPERTIES` in `PropertyDescriptor.ts`.
3. Import and use `<PropertyInput>` or the appropriate `PropertyControls` component in the toolbar
   or panel where the control is needed.

---

_For component-level prop schema, see [DATA_MODEL.md](./DATA_MODEL.md) — `ComponentDefinition`.  
For the commands dispatched, see [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md)._

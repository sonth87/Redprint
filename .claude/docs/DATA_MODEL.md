# Data Model & Component Protocol

Comprehensive reference for BuilderDocument schema, BuilderNode structure, component definitions, and type contracts.

---

## BuilderNode

```ts
interface BuilderNode {
  id: string; // UUID v4, globally unique
  type: string; // component type key
  parentId: string | null; // null = root node
  order: number; // position within siblings
  props: Record<string, unknown>; // component-specific properties
  style: StyleConfig; // base styles
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  interactions: InteractionConfig[];
  slot?: string; // named slot in parent (if applicable)
  locked?: boolean; // locked = no select, move
  hidden?: boolean; // hidden on canvas and runtime
  name?: string; // human-readable label in layer panel
  metadata: NodeMetadata;
}

interface NodeMetadata {
  createdAt: string;
  updatedAt: string;
  pluginData?: Record<string, unknown>; // plugin-owned metadata per namespace
  tags?: string[];
}
```

---

## StyleConfig

Complete style configuration supporting box model, typography, layout (flex/grid/block), visual effects, filters, positioning, and transforms.

```ts
interface StyleConfig {
  // Box model
  margin?: BoxValue;
  padding?: BoxValue;
  width?: SizeValue;
  height?: SizeValue;
  minWidth?: SizeValue;
  maxWidth?: SizeValue;
  minHeight?: SizeValue;
  maxHeight?: SizeValue;

  // Typography
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string | number;
  letterSpacing?: string;
  color?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textDecoration?: string;
  textTransform?: string;

  // Layout
  display?: "flex" | "grid" | "block" | "inline-block" | "inline" | "none";
  flexDirection?: string;
  flexWrap?: string;
  alignItems?: string;
  justifyContent?: string;
  alignSelf?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;

  // Visual
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  border?: BorderValue;
  borderRadius?: string;
  boxShadow?: string;
  opacity?: number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  cursor?: string;
  pointerEvents?: string;

  // Filters
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;

  // Position
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  zIndex?: number;

  // Transform
  transform?: string;
  transformOrigin?: string;
  transition?: string;
}
```

---

## Responsive Configuration

```ts
type Breakpoint = "desktop" | "tablet" | "mobile";

interface BreakpointConfig {
  breakpoint: Breakpoint;
  label: string; // display in toolbar
  minWidth: number; // px
  maxWidth?: number; // undefined = unbounded
  icon?: string; // icon key for toolbar
}

const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { breakpoint: "desktop", label: "Desktop", minWidth: 1024, icon: "monitor" },
  { breakpoint: "tablet", label: "Tablet", minWidth: 768, maxWidth: 1023, icon: "tablet" },
  { breakpoint: "mobile", label: "Mobile", minWidth: 0, maxWidth: 767, icon: "smartphone" },
];
```

Custom breakpoints must be configurable per builder instance, overriding defaults.

---

## Interaction Configuration

```ts
type InteractionTrigger =
  | "click" | "dblclick" | "hover" | "mouseenter" | "mouseleave"
  | "focus" | "blur" | "submit" | "change"
  | "keydown" | "keyup" | "mount" | "unmount" | "scroll" | "intersect";

type InteractionAction =
  | { type: "navigate"; url: string; target?: "_blank" | "_self" }
  | { type: "triggerApi"; endpoint: string; method: string; headers?: Record<string, string>; body?: unknown }
  | { type: "setState"; key: string; value: unknown }
  | { type: "toggleVisibility"; targetId: string }
  | { type: "addClass"; targetId: string; className: string }
  | { type: "removeClass"; targetId: string; className: string }
  | { type: "showModal"; targetId: string }
  | { type: "hideModal"; targetId: string }
  | { type: "scrollTo"; targetId: string; behavior?: ScrollBehavior }
  | { type: "emit"; event: string; payload?: unknown }
  | { type: "custom"; handler: string; params?: unknown };

interface InteractionConfig {
  id: string;
  trigger: InteractionTrigger;
  conditions?: Condition[];
  actions: InteractionAction[];
  stopPropagation?: boolean;
  preventDefault?: boolean;
}

interface Condition {
  variable: string;
  operator: "eq" | "neq" | "gt" | "lt" | "gte" | "lte" | "contains" | "truthy" | "falsy";
  value?: unknown;
}
```

---

## BuilderDocument

```ts
interface BuilderDocument {
  id: string;
  schemaVersion: string; // semver e.g. "2.1.0"
  createdAt: string; // ISO 8601
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

interface VariableDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue: unknown;
  description?: string;
}

interface CanvasConfig {
  width?: number; // canvas width hint (px), undefined = fluid
  backgroundColor?: string;
  showGrid?: boolean;
  gridSize?: number; // px, default 8
  snapEnabled?: boolean;
  snapThreshold?: number; // px distance to trigger snap, default 6
  rulerEnabled?: boolean;
}

interface DocumentMetadata {
  author?: string;
  tags?: string[];
  thumbnail?: string;
  pluginData?: Record<string, unknown>;
}
```

---

## ComponentDefinition

```ts
interface ComponentDefinition {
  // Identity
  type: string; // unique key, e.g. "text-block", "hero-section"
  name: string; // human-readable
  category: string; // grouping in component palette
  version: string; // semver
  icon?: string; // SVG string or icon key
  description?: string; // tooltip in palette
  tags?: string[]; // for filter/search

  // Capabilities
  capabilities: ComponentCapabilities;

  // Property schema (drives dynamic property panels)
  propSchema: PropSchema[];

  // Default values
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;

  // Container rules (if canContainChildren)
  containerConfig?: ContainerConfig;

  // Rendering
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;

  // Quick actions (appear on context toolbar when selected)
  quickActions?: QuickAction[];

  // Lifecycle
  lifecycle?: ComponentLifecycle;

  // A11y
  a11y?: ComponentA11yConfig;

  // Editor hints
  editorConfig?: ComponentEditorConfig;
}

interface ComponentCapabilities {
  canContainChildren: boolean;
  acceptedChildTypes?: string[]; // undefined = accept all
  canResize: boolean;
  canResizeWidth?: boolean; // default = canResize
  canResizeHeight?: boolean; // default = canResize
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

interface ComponentEditorConfig {
  minWidth?: number; // px, resize constraint
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeHandles?: ResizeHandle[];
  showBoundingBox?: boolean; // default true
  selectionColor?: string;
  showQuickActions?: boolean; // default true
}

interface ComponentLifecycle {
  onInit?: (ctx: ComponentContext) => void;
  onMount?: (ctx: ComponentContext) => void;
  onUpdate?: (ctx: ComponentContext, prevProps: Record<string, unknown>) => void;
  onDestroy?: (ctx: ComponentContext) => void;
  onSelect?: (ctx: ComponentContext) => void;
  onDeselect?: (ctx: ComponentContext) => void;
}

interface ComponentA11yConfig {
  role?: string;
  ariaLabel?: string | ((props: Record<string, unknown>) => string);
  ariaDescribedBy?: string;
  focusable?: boolean;
}
```

---

## PropSchema

Dynamic property control definitions:

```ts
type PropSchema =
  | { key: string; type: "string"; label: string; default?: string; multiline?: boolean; placeholder?: string }
  | { key: string; type: "number"; label: string; default?: number; min?: number; max?: number; step?: number; unit?: string }
  | { key: string; type: "boolean"; label: string; default?: boolean }
  | { key: string; type: "select"; label: string; options: SelectOption[]; default?: string; multiple?: boolean }
  | { key: string; type: "color"; label: string; default?: string; allowGradient?: boolean; allowTransparent?: boolean }
  | { key: string; type: "image"; label: string; accept?: string[] }
  | { key: string; type: "video"; label: string }
  | { key: string; type: "richtext"; label: string; toolbar?: RichtextToolbarConfig }
  | { key: string; type: "data-binding"; label: string; sourceType?: string }
  | { key: string; type: "json"; label: string }
  | { key: string; type: "spacing"; label: string; default?: BoxValue }
  | { key: string; type: "border"; label: string; default?: BorderValue }
  | { key: string; type: "shadow"; label: string }
  | { key: string; type: "icon"; label: string }
  | { key: string; type: "font"; label: string }
  | { key: string; type: "slider"; label: string; min: number; max: number; step?: number; default?: number }
  | { key: string; type: "group"; label: string; children: PropSchema[]; collapsible?: boolean };
```

---

## ContainerConfig

Rules for components that can contain children:

```ts
interface ContainerConfig {
  layoutType: "flow" | "flex" | "grid" | "absolute" | "slot-based";
  slots?: SlotConfig[];
  maxChildren?: number;
  minChildren?: number;
  allowedChildTypes?: string[]; // undefined = all
  disallowedChildTypes?: string[];
  restrictNesting?: string[];
  dropZoneConfig?: DropZoneConfig;
  emptyStateConfig?: EmptyStateConfig;
}

interface SlotConfig {
  name: string;
  label: string;
  required?: boolean;
  allowedTypes?: string[];
  maxChildren?: number;
}

interface EmptyStateConfig {
  message?: string;
  icon?: string;
  allowDrop?: boolean; // default true
}
```

---

## QuickAction

Actions appearing on context toolbar when component is selected:

```ts
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  tooltip?: string;
  group?: string;
  isToggle?: boolean;
  isActive?: (ctx: ComponentContext) => boolean;
  isDisabled?: (ctx: ComponentContext) => boolean;
  isVisible?: (ctx: ComponentContext) => boolean;
  execute: (ctx: ComponentContext) => void | Command;
  shortcut?: string; // e.g. "Ctrl+D"
}
```

---

_For command execution, state management, and history tracking, see `COMMAND_SYSTEM.md`._
_For rendering pipeline and runtime behavior, see `RUNTIME.md`._

---

## PaletteCatalog

JSON-serialisable catalog that drives the **Add Elements** panel. Designed to be loaded from a
static file today and a remote API endpoint in the future.

**File:** `packages/builder-core/src/presets/palette-types.ts`

### Type hierarchy

```
PaletteCatalog
  └── PaletteGroup[]          (e.g. "Text", "Image", "Button")
        └── PaletteType[]     (e.g. "Titles", "Paragraphs")
              └── PaletteItem[] (named presets — different props/style combos of the same componentType)
```

```ts
interface PaletteCatalog {
  version: string;          // semver e.g. "1.0.0"
  groups: PaletteGroup[];
}

interface PaletteGroup {
  id: string;               // matches a ComponentGroup.id e.g. "text"
  label: string;            // fallback label
  icon: string;             // Lucide icon name (kebab-case) e.g. "type"
  order: number;
  i18n?: Record<string, string>;
  types: PaletteType[];
}

interface PaletteType {
  id: string;               // unique within group e.g. "titles"
  label: string;
  icon?: string;
  order: number;
  /**
   * Controls item layout in the panel.
   * "grid" (default): 2-column grid, vertical cards — suits thumbnails.
   * "list": single column, horizontal rows — suits text-heavy items.
   */
  layout?: "grid" | "list";
  description?: string;
  i18n?: Record<string, string>;
  items: PaletteItem[];
}

interface PaletteItem {
  id: string;               // unique within type, used as React key
  componentType: string;    // must match a registered ComponentDefinition.type
  name: string;             // fallback display name
  description?: string;
  thumbnail?: string | null;  // URL or data-URI; null = use live preview
  i18n?: Record<string, { name?: string; description?: string }>;
  props: Record<string, unknown>;         // merged onto component defaultProps on ADD_NODE
  style?: Partial<StyleConfig>;           // merged onto component defaultStyle
  responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  children?: PresetChildNode[];           // for container presets
  tags?: string[];                        // used for cross-group search
}
```

### PaletteDragData

Serialised payload placed in `dataTransfer` when dragging a palette item onto the canvas.
Also used internally by `useClickToAdd`.

```ts
interface PaletteDragData {
  source: "palette-item";
  componentType: string;
  presetData: {
    props?: Record<string, unknown>;
    style?: Partial<StyleConfig>;
    responsiveStyle?: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
    responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
  };
}
```

`handleDrop` in `useDragHandlers` distinguishes palette drags (source `"palette-item"`) from
legacy component-type drags (`"application/builder-component-type"` MIME type).

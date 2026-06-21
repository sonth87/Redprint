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
  schemaVersion: string; // semver e.g. "2.5.0"
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
  popups: Record<string, PopupDefinition>;
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

## Popup Model

Popups are document-level overlay surfaces, not page-flow nodes. A popup owns a
detached content root in `nodes` through `PopupDefinition.rootNodeId`; that root
is rendered only by the popup layer and is not a child of the page `rootNodeId`.

```ts
type PopupKind = "modal" | "drawer" | "bottomSheet" | "bar" | "fullscreen";
type PopupPlacement = "center" | "top" | "bottom" | "left" | "right";

interface PopupDefinition {
  id: string;
  name: string;
  enabled: boolean;
  rootNodeId: string;
  kind: PopupKind;
  placement: PopupPlacement;
  kindConfig: PopupKindConfig;
  autoTrigger:
    | { type: "manual" }
    | { type: "pageLoad"; delayMs?: number }
    | { type: "scrollDepth"; percent: number }
    | { type: "sectionVisible"; targetNodeId: string; threshold?: number };
  behavior: PopupBehavior;
  animation: PopupAnimation;
  rules: PopupRules;
  runtimeState?: PopupRuntimeStateConfig; // V3 — stacking/z-index policy
  goals?: PopupGoal[];                    // V4 — conversion goals
  variants?: PopupVariant[];             // V4 — A/B variants (popup-owned content)
  experiment?: PopupExperiment;          // V4 — assignment policy
  metadata: PopupMetadata;
}
```

`kind` describes the surface type; `placement` describes where it appears. V1
supports modal, drawer, bottom sheet, bar, and fullscreen. Popup content uses
normal builder nodes under a built-in `PopupContent` root.

Kind-specific sizing belongs in `kindConfig`. Modal configs may carry `width`,
`height`, `draggable`, `resizable`, and anchored `offsetX`/`offsetY`; drawers
carry `width`; bottom sheets carry `initialHeight`/`snapPoints`; bars carry
`height`, `sticky`, and `pushPageContent`. The editor popup shell resize/drag
controls update these config fields rather than mutating `PopupContent` styles.

### V3 optional fields (schema 2.4.0)

All optional and defaulted — V2 documents remain valid (`popupV3Migration`
fills behavior defaults and bumps the version).

```ts
interface PopupBehavior {
  // ...V2 fields...
  closeOnRouteChange?: boolean;
  closeOnOutsideInteraction?: boolean;
  preventBackgroundInteraction?: boolean;
  inertBackground?: boolean;           // inert + aria-hidden the page behind topmost modal
  reducedMotion?: "respect" | "ignore"; // default "respect"
}

interface PopupRuntimeStateConfig {     // PopupDefinition.runtimeState
  stackMode?: "single" | "multiple" | "replace-same-kind"; // default "single"
  zIndexBase?: number;                  // default 10000
}

interface PopupModalConfig {
  // ...V2 fields...
  runtimeDraggable?: boolean;           // end-user drag at runtime (runtime-only)
  runtimeResizable?: boolean;
  dragBounds?: "viewport" | "none";     // default "viewport"
}

interface PopupBottomSheetConfig {
  // ...V2 fields...
  runtimeDraggable?: boolean;           // snap-drag (gesture is a planned follow-up)
  closeBelowSnapPoint?: string;
}
```

The runtime lifecycle (`opening→open→closing→closed`), stacking, and reduced-
motion logic are pure helpers in `builder-core/src/popups/lifecycle.ts`, shared by
the runtime renderer and the editor preview. Runtime drag/resize and lifecycle
state never mutate `BuilderDocument`. See RUNTIME.md → Popup Lifecycle State Machine.

### V4 optional fields (schema 2.5.0)

All optional — V2/V3 documents remain valid (`popupV4Migration` only bumps the
version; absence of these fields means "base behavior, no experiment").

```ts
interface PopupGoal {
  id: string;
  name: string;
  type: "click" | "submit" | "close" | "customEvent" | "urlVisit";
  targetNodeId?: string;  // click/submit — a node inside popup content
  eventName?: string;     // customEvent — matches runtime popup:goal emit
  urlPattern?: string;    // urlVisit
}

interface PopupVariant {
  id: string;
  name: string;
  weight: number;         // normalized at runtime; <= 0 excluded
  enabled: boolean;
  popupPatch?: Partial<…>; // config patch over base (no identity/content/variants)
  rootNodeId?: string;    // optional popup-owned content root; omit → reuse base
}

interface PopupExperiment {
  enabled: boolean;
  assignment: "random" | "sticky";
  seed?: string;
  winnerVariantId?: string; // forces this variant (experiment concluded)
}
```

**Node ownership (V4):** variant `rootNodeId` trees are **owned by the popup**.
`DELETE_POPUP` cascade-deletes every variant content root (snapshotted for undo);
`DUPLICATE_POPUP` deep-clones each variant root with fresh ids and copies
goals/experiment (goal ids regenerated). Pure assignment helpers
(`normalizeWeights`, `pickVariant`, `resolveVariantAssignment`,
`resolvePopupForVariant`) live in `builder-core/src/popups/experiment.ts` and are
shared by runtime + editor preview. Runtime variant assignment and analytics
never mutate `BuilderDocument`. See RUNTIME.md → A/B Variant Assignment & Analytics.

---

### V5 optional fields (schema 2.6.0)

All optional — V4 documents remain valid (`popupV5Migration` only bumps the
version; absence of these fields means "no targeting, no scheduling, no frequency
cap, no localization").

```ts
// Localization — locale-owned content root (same ownership rule as V4 variants)
interface PopupLocaleContent {
  locale: string;          // BCP-47 tag, e.g. "fr", "fr-CA", "zh-Hans"
  rootNodeId?: string;     // popup-owned content root; omit → reuse base + patch only
  popupPatch?: Partial<…>; // config patch applied on top of base (excludes identity/locales/variants)
}

// Targeting — composable condition groups
type PopupConditionOperator =
  | "eq" | "neq" | "gt" | "lt" | "gte" | "lte"
  | "contains" | "truthy" | "falsy"
  | "in" | "notIn" | "matches";

interface PopupTargetingCondition {
  variable: string;         // dot-notation key from RendererConfig.popupContext
  operator: PopupConditionOperator;
  value?: unknown;
}

interface PopupTargetingGroup {
  match: "all" | "any";    // AND / OR within the group
  conditions: PopupTargetingCondition[];
}

interface PopupTargeting {
  enabled: boolean;
  groups?: PopupTargetingGroup[]; // groups combined with AND across groups
}

// Scheduling
interface PopupSchedule {
  enabled: boolean;
  startDate?: string;       // ISO 8601 — hide before this date
  endDate?: string;         // ISO 8601 — hide after this date
  timezone?: string;        // IANA timezone string (e.g. "America/New_York")
  timeWindow?: {
    startHour: number;      // 0–23, inclusive
    endHour: number;        // 0–23, inclusive
    daysOfWeek?: number[];  // 0=Sunday … 6=Saturday; omit = every day
  };
}

// Frequency
type FrequencyUnit = "session" | "hour" | "day" | "week" | "month";

interface PopupFrequencyRule {
  maxShows: number;
  per: FrequencyUnit;
}

interface PopupFrequencyConfig {
  cap?: PopupFrequencyRule;
  suppressAfterGoalIds?: string[]; // suppress if any listed goal already converted
  storageKeyPrefix?: string;       // custom storage key namespace
}

// PopupRules extended (V5 additions, all optional):
// frequency?: PopupFrequencyConfig;
// targeting?: PopupTargeting;
// scheduling?: PopupSchedule;

// PopupDefinition extended (V5 additions, all optional):
// locales?: PopupLocaleContent[];
// fallbackLocale?: string;  // used when navigator locale matches nothing
```

**Node ownership (V5):** locale `rootNodeId` trees follow the **same popup-ownership
rule as V4 variants** — `DELETE_POPUP` cascade-deletes them (snapshotted for undo);
`DUPLICATE_POPUP` deep-clones each locale root with fresh ids. Locale resolution
order: exact match → language-prefix match ("fr" matches "fr-CA") → `fallbackLocale`
→ base content. Pure evaluation helpers (`evaluateTargeting`, `evaluateSchedule`,
`evaluateFrequency`, `resolveLocaleContent`) live in
`builder-core/src/popups/rules.ts`. Runtime evaluation never mutates
`BuilderDocument`. See RUNTIME.md → V5 Pre-open Eligibility.

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
  inlineEditable?: boolean; // double-click enters inline editor when a richtext prop exists
}

type EditorInteractionPolicy =
  | "auto"
  | "shielded"
  | "container"
  | "inline-edit"
  | "component-managed"
  | "native";

interface ComponentEditorConfig {
  minWidth?: number; // px, resize constraint
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeHandles?: ResizeHandle[];
  showBoundingBox?: boolean; // default true
  selectionColor?: string;
  showQuickActions?: boolean; // default true
  interactionPolicy?: EditorInteractionPolicy; // default "auto"
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

### EditorInteractionPolicy

`interactionPolicy` controls how `builder-react` shields runtime DOM behavior on the editor canvas.
It is an editor hint only; runtime and preview renderers remain interactive.

- `"auto"`: resolver default. Containers (`canContainChildren`) become `"container"`;
  inline editable leaves become `"inline-edit"`; other leaves become `"shielded"`.
- `"shielded"`: component subtree is visual-only in editor mode. Descendant pointer
  events, native text selection, link/image dragging, runtime clicks, and runtime
  focus/key activation are suppressed so selection, move, and resize belong to the editor.
- `"container"`: subtree is not shielded, allowing child nodes inside `Section`,
  `Container`, `Grid`, `Column`, `Row`, and `Repeater` to remain selectable.
- `"inline-edit"`: normal editor mode is shielded like a leaf component, but double-click
  can enter the component's inline rich-text editor when `inlineEditable` is true.
- `"component-managed"`: component owns special editor interactions internally. Use
  sparingly for components such as `GalleryPro` Freestyle until their direct manipulation
  is moved into a dedicated edit mode or settings panel.
- `"native"`: no editor shield is applied. This is reserved for advanced integrations
  that intentionally need native DOM interaction on the canvas.

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

---

## Built-in Component Library (`builder-components`)

**Package:** `@ui-builder/builder-components`  
**Location:** `packages/builder-components/`  
**Depends on:** `@ui-builder/builder-core` only (no React peer beyond renderer functions)

Provides 17 ready-to-use `ComponentDefinition` objects covering the full base component set. Consumers register them at builder init time.

### Base Components

| Type | Category | Notes |
|---|---|---|
| `Section` | layout | Full-width page section, contains children; also exposes a stable anchor `id` |
| `Container` | layout | Generic flex/grid container |
| `Grid` | layout | CSS grid with configurable columns |
| `Column` | layout | Grid/flex column child |
| `Text` | content | Paragraph / inline text block |
| `Button` | content | CTA button with variant + size props |
| `Image` | media | Responsive image with alt text |
| `Divider` | content | Horizontal rule / decorative divider |
| `TextMarquee` | content | Horizontally scrolling ticker text |
| `CollapsibleText` | content | Expandable read-more paragraph |
| `TextMask` | content | Text clipped to an image (CSS mask) |
| `GalleryGrid` | media | Fixed-column photo grid |
| `GallerySlider` | media | Horizontal scroll photo slider |
| `Shape` | decoration | SVG shapes (circle, rect, triangle, star…) |
| `NavigationMenu` | navigation | Horizontal / vertical / hamburger nav |
| `Repeater` | layout | Template repeater for data lists |
| `Anchor` | navigation | Invisible scroll-target anchor point, in addition to section anchors |

### NavigationMenu V2 Props

`NavigationMenu` uses a tree-shaped `items` prop while continuing to render legacy
`{ label, href }` entries. The V2 item contract is:

```ts
type MenuTarget =
  | { type: "anchor"; anchorId: string; behavior?: "smooth" | "auto" }
  | { type: "page"; path: string; pageId?: string }
  | { type: "url"; url: string; target?: "_self" | "_blank" }
  | { type: "none" };

type MenuItem = {
  id: string;
  label: string;
  target: MenuTarget;
  hidden?: boolean;
  children?: MenuItem[];
};
```

Menu layout props include `orientation`, `mobileBehavior`, `hamburgerMode`,
`widthMode`, `overflowMode`, `fillItems`, `alignment`, `dropdownMode`,
`dropdownWidthMode`, and spacing controls such as `itemGap`, `rowGap`,
`dropdownMargin`, `dropdownGap`, and `columnGap`. Dropdown visual props include
`dropdownPadding`, `dropdownRadius`, `dropdownMinWidth`, `dropdownShadow`,
`dropdownBg`, `dropdownBorderColor`, `dropdownItemHoverBg`, `dropdownOffsetX`,
and `dropdownOffsetY`.

Desktop submenu rendering is recursive. Top-level dropdowns and nested flyouts
must support hover and keyboard focus, with parent hover/focus bridges so moving
from a menu item into its submenu does not close the submenu. Column dropdowns
render nested children inline within the column instead of as detached flyouts.

`widthMode` controls the menu container width only: `fullWidth` makes the menu
bleed to the full viewport width (`100vw`) even when it is nested inside a
constrained container, while `wrap` returns the menu to content-sized width. It
must not imply `fillItems`; item distribution is controlled only by `fillItems`.
Vertical menus in `wrap` mode ignore the component default `width: 100%` and
render at intrinsic content width unless the user resizes them or switches to
`fullWidth`. `overflowMode: "scroll"` uses click scroll controls instead of
exposing a native horizontal scrollbar.
When `overflowMode: "wrap"` is used on a horizontal menu, the menu keeps an
intrinsic content height so the editor selection frame expands and contracts with
the actual wrapped rows while side-resizing changes width.

Every `Section` is also a valid anchor target. Its runtime DOM `id` resolves from
`props.anchorId`, `props.htmlId`, `props.slug`, then the node id. Manage Menu
therefore offers both explicit `Anchor` nodes and all document `Section` nodes
when configuring an anchor target.

### Usage

```ts
import { BASE_COMPONENTS } from "@ui-builder/builder-components";

const builder = createBuilder({ document });
for (const comp of BASE_COMPONENTS) {
  builder.registry.registerComponent(comp);
}
```

### Extending Components

`extendComponent(base, overrides)` creates a new `ComponentDefinition` by shallow-merging a base
definition with overrides. The `type` field in overrides is required (must be unique).

```ts
import { extendComponent, TextComponent } from "@ui-builder/builder-components";

export const HeroBanner = extendComponent(TextComponent, {
  type: "HeroBanner",
  name: "Hero Banner",
  defaultProps: { ...TextComponent.defaultProps, fontSize: "52px", fontWeight: "800" },
  propSchema: [
    ...(TextComponent.propSchema ?? []),
    { key: "gradientFrom", label: "Gradient Start", type: "color", default: "#4f46e5" },
  ],
  editorRenderer: ({ node, style }) => <HeroBannerView node={node} style={style} />,
  runtimeRenderer: ({ node, style }) => <HeroBannerView node={node} style={style} />,
});
```

If `propSchema` or `capabilities` are supplied in overrides, they **fully replace** the base
(no deep merge). All other fields are shallowly merged; overrides win on conflict.

### Adding Project-Specific Components

Register custom components alongside `BASE_COMPONENTS`. See
`apps/playground/src/components/sample-components.tsx` for a live example that defines
`TestimonialCardComponent`, `PricingCardComponent`, and `HeroBannerComponent`.

# Editor UI: Canvas, Panels & Interaction

Complete reference for editor interface, canvas system, panel architecture, selection, snapping, and keyboard shortcuts.

---

## Canvas & Viewport System

Canvas is the central editing area where users drag/drop and edit interfaces.

### Viewport State

```ts
interface ViewportState {
  zoom: number; // 0.1 – 4.0, default 1.0
  panOffset: Point; // offset from canvas origin
  canvasRect: Rect; // canvas render area size
  containerRect: Rect; // canvas viewport (scroll container) size
}

interface ZoomConfig {
  min: number; // default 0.1
  max: number; // default 4.0
  step: number; // default 0.1
  wheelSensitivity: number;
  pinchSensitivity: number;
}
```

### Canvas Configuration

```ts
interface CanvasConfig {
  width?: number; // px, undefined = fluid/responsive
  backgroundColor?: string; // default '#ffffff'
  showGrid: boolean; // default false
  gridSize: number; // px, default 8
  snapEnabled: boolean; // default true
  snapThreshold: number; // px, default 6
  snapToGrid: boolean; // snap to grid lines
  snapToComponents: boolean; // snap to component edges
  rulerEnabled: boolean; // default false
  showHelperLines: boolean; // default true
  helperLineColor?: string; // default primary theme color
}
```

**Keyboard Controls:**

- `Ctrl+0` = Fit to screen
- `Ctrl+1` = 100% zoom
- `Ctrl++` / `Ctrl+-` = Zoom in/out
- `Space+Drag` = Pan canvas
- `Ctrl+;` = Toggle grid
- `Ctrl+'` = Toggle snap

### Component Interaction On Canvas

The canvas treats component content as a visual preview by default. Runtime DOM
interactions such as anchors, buttons, gallery controls, dropdown hover behavior,
video controls, and native image dragging should not run while the user is editing
the document.

`builder-react` applies an Editor Interaction Shield from `NodeRenderer` in editor
mode:

- Leaf components resolve to `shielded` by default, so descendant DOM does not
  receive pointer events, native link/image drag is suppressed, and runtime
  focus/key activation is blocked.
- Components with `inlineEditable` resolve to `inline-edit`; normal click/drag
  still select and move the component, while double-click enters the inline editor.
- Components with `canContainChildren` resolve to `container`; their subtree is not
  shielded so child nodes remain selectable and draggable through `data-node-id`.
- Components can override with `editorConfig.interactionPolicy` when they need a
  special editor mode, such as `component-managed` for `GalleryPro` Freestyle.

Preview/runtime modes remain fully interactive.

---

## Grid & Helper Lines

**Grid:**
- Only renders in editor mode
- Use CSS background pattern (not DOM elements per cell — performance)
- Toggle via `Ctrl+;` or toolbar checkbox
- Supports dot grid (points) or line grid (both configurable)

**Helper Lines:**
```ts
interface HelperLine {
  id: string;
  type: "container-bound" | "margin" | "padding" | "custom";
  orientation: "horizontal" | "vertical";
  position: number; // px from canvas top/left
  label?: string;
  color?: string;
  dashed?: boolean;
  nodeId?: string; // source node
}
```

Helper lines:
- Display on container hover
- Persist when container selected
- Never render in runtime
- Customizable by plugins

---

## Drag & Drop System

```ts
type DropPosition = 'before' | 'after' | 'inside' | 'replace' | 'slot'

interface DropTarget {
  nodeId: string
  position: DropPosition
  slotName?: string           // if position === 'slot'
  insertIndex?: number        // index in children
}

interface DragSource {
  type: 'existing-node'       // dragging from canvas
  nodeId: string
}
| {
  type: 'new-component'       // dragging from palette
  componentType: string
}

interface DragOperation {
  source: DragSource
  currentTarget: DropTarget | null
  isValid: boolean
  invalidReason?: string
  startPosition: Point
  currentPosition: Point
  ghostOffset: Point          // render ghost element offset
}
```

**Drop Validation:**

```ts
type DropValidator = (
  source: DragSource,
  target: DropTarget,
  document: BuilderDocument,
) => { valid: boolean; reason?: string };
```

Built-in validation checks:
- Type restrictions per container
- Max children limit
- Prevent nesting element into its descendant
- Slot availability

Invalid drops show visual feedback (red color, prohibition icon).

---

## Selection System

### Single Selection

```ts
interface SelectionManager {
  select(nodeId: string): void;
  deselect(nodeId: string): void;
  clearSelection(): void;
  getSelectedIds(): string[];
  getSelectedNodes(): BuilderNode[];
  isSelected(nodeId: string): boolean;
}
```

On select:
- Show selection bounding box with resize handles
- Display quick action toolbar
- Update right panel with node properties
- Cannot select locked nodes

### Multi-Selection

- `Shift+Click` = Add to selection
- `Ctrl+A` = Select all (in active container)
- Rubber-band: drag on canvas (not on node) to create selection rect

```ts
interface MultiSelectOperation {
  rect: Rect; // rubber-band rect in canvas coordinates
  selectedNodes: string[];
  includePartiallyContained: boolean; // default false
}
```

Multi-select operations:
- Move group together
- Delete group
- Group into container
- Align (left, right, top, bottom, center-h, center-v)
- Distribute (equal spacing h/v)

### Selection Box & Resize Handles

```ts
type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

interface ResizeOperation {
  nodeId: string;
  handle: ResizeHandle;
  startBounds: Rect;
  startPoint: Point;
  currentPoint: Point;
  maintainAspectRatio: boolean; // true when holding Shift
  fromCenter: boolean; // true when holding Alt
}
```

Resize handles show/hide based on `ComponentCapabilities`:
- `canResizeWidth: false` → hide E/W/NE/NW/SE/SW
- `canResizeHeight: false` → hide N/S/NE/NW/SE/SW
- `maintainAspectRatio: true` → default lock ratio

---

## Snap & Alignment Engine

```ts
interface SnapEngine {
  calculateSnapTargets(
    movingNodeIds: string[],
    document: BuilderDocument,
    viewport: ViewportState,
  ): SnapTarget[];

  findClosestSnap(
    currentBounds: Rect,
    snapTargets: SnapTarget[],
    threshold: number,
  ): SnapResult | null;
}

interface SnapTarget {
  type: "edge" | "center" | "grid" | "spacing";
  orientation: "horizontal" | "vertical";
  position: number;
  sourceNodeId?: string;
  label?: string;
}

interface SnapResult {
  snapX?: number;
  snapY?: number;
  activeTargets: SnapTarget[];
  delta: Point;
}
```

**Snap Types:**

- **Edge snap**: Snap left/right/top/bottom edges
- **Center snap**: Snap center (h/v) to other centers or container
- **Grid snap**: Snap to grid if enabled
- **Spacing snap**: Show equal-spacing guides (Figma-style)

**Visual Indicators:**

- Snap guide lines (primary color)
- Distance labels (px) for spacing snaps
- Guides disappear on canvas release
- Never visible in runtime

---

## Quick Action Toolbar

Context toolbar floating above selected component:

```ts
interface QuickToolbarConfig {
  position: "above" | "below" | "auto";
  offset: number; // px from selection box
  showDelay?: number; // ms, default 0
  hideOnDrag?: boolean; // default true
}
```

**Built-in Actions:**

| Action              | Icon | Shortcut | Description     |
| ------------------- | ---- | -------- | --------------- |
| Move up (z-index)   | ↑    | `]`      | Up 1 layer      |
| Move down           | ↓    | `[`      | Down 1 layer    |
| Move to front       | ⬆    | `Ctrl+]` | Top            |
| Move to back        | ⬇    | `Ctrl+[` | Bottom         |
| Duplicate           | ⊕    | `Ctrl+D` | Duplicate      |
| Delete              | 🗑   | `Delete` | Remove         |
| Wrap in container   | □    | —        | Wrap           |
| Lock/Unlock         | 🔒   | `Ctrl+L` | Lock toggle    |
| Hide                | 👁   | `Ctrl+H` | Hide toggle    |
| More options        | ⋯    | —        | Dropdown       |

Component-specific actions from `ComponentDefinition.quickActions` appear after built-ins.

**Positioning Logic:**

```ts
function calculateToolbarPosition(
  nodeRect: Rect,
  toolbarSize: Size,
  canvasRect: Rect,
  canvasTransform: ViewportState,
): Point {
  // Preferred: above node
  // Fallback: below if no space above
  // Fallback 2: inside node top if too small
}
```

Toolbar must always stay in viewport.

---

## Editor Panel System

Extensible panel architecture — plugins can add panels, tabs, controls.

```ts
interface EditorPanel {
  id: string;
  position: "left" | "right" | "bottom" | "floating";
  title: string;
  icon?: string;
  defaultWidth?: number;
  defaultHeight?: number;
  minWidth?: number;
  maxWidth?: number;
  resizable: boolean;
  collapsible: boolean;
  defaultVisible: boolean;
  render: (ctx: PanelContext) => ReactNode;
  order?: number;
}

interface PanelContext {
  builder: BuilderAPI;
  selectedNodes: BuilderNode[];
  document: BuilderDocument;
  state: BuilderState;
  dispatch: (command: Command) => void;
}
```

### Left Panel — Add Elements (Palette System)

The palette system is a **JSON-driven, 3-level hierarchy**: Group → Type → Item (preset).  
It replaces the old static `ComponentPalette` when `paletteCatalog` is passed to `<BuilderEditor>`.

#### Components

| Component | File | Purpose |
|---|---|---|
| `FloatingPalette` | `panels/left/FloatingPalette.tsx` | Draggable icon strip (docked to left edge). Persists position in `localStorage["ui-builder:palette-position"]`. |
| `AddElementsPanel` | `panels/left/AddElementsPanel.tsx` | Full-height docked panel (380px). Group icon rail on left + searchable content area on right. |
| `PaletteItemCard` | `panels/left/PaletteItemCard.tsx` | Individual item card. Supports `layout: "grid"` (vertical card) or `layout: "list"` (horizontal row). |

#### Mode switching

```
paletteCatalog passed?
  YES → paletteMode = "floating"  → <FloatingPalette>  (draggable icon strip)
              ↓ click group
        paletteMode = "docked"   → <AddElementsPanel>  (full panel)
              ↓ click X
        paletteMode = "floating"  (back to strip)
  NO  → legacy <FloatingPanel> + <ComponentPalette>  (backward compat)
```

#### Item layout per type

Each `PaletteType` in the catalog has an optional `layout` field:

| Value | Appearance | Best for |
|---|---|---|
| `"grid"` (default) | 2-column grid, vertical cards with preview area | Images, shapes, containers |
| `"list"` | Single column, horizontal rows | Text, buttons, galleries, menus — label is primary |

For `Text`-type components with `layout: "list"`, the entire row renders as the **styled text itself** (scaled font-size/weight/family/color) — no separate preview thumbnail.

#### Adding items — two modes

| Mode | Hook | Behaviour |
|---|---|---|
| Drag-to-canvas | `useDragHandlers.handlePaletteDragStart` | Sets `dataTransfer` with `PaletteDragData` JSON; `handleDrop` parses it and dispatches `ADD_NODE` + responsive overrides |
| Click-to-add | `useClickToAdd` (`hooks/useClickToAdd.ts`) | Computes canvas-centre from `panOffset`/`zoom`/`containerRef`; dispatches `ADD_NODE` + responsive overrides at that position |

#### Data flow

```
PaletteCatalog (JSON)
  → loaded by consumer (e.g. useBuilderSetup → palette-catalog.json)
  → passed as prop to <BuilderEditor paletteCatalog={...}>
  → EditorInner → FloatingPalette / AddElementsPanel
  → PaletteItem click/drag → ADD_NODE command (with preset props + style)
```

**Search** filters across `item.name`, `item.tags`, and `item.i18n[locale].name` in real time.

#### i18n

All palette chrome strings (`"Add Elements"`, `"Search…"`, group/type labels from catalog) use the `palette.*` namespace in `en.json` / `vi.json`. Item names inside catalog items travel with the JSON via their own `i18n` field.

### Right Panel — Property Panel

Displays properties of selected node(s):

```
[Node name ✏️]
[Design][Events][Effects][Data][Advanced]
├─ Dynamic controls generated from PropSchema
├─ Multi-select shows shared properties
└─ Dedicated scrolling, minimal re-renders
```

**Tabs:**

| Tab        | Content                                              |
| ---------- | ---------------------------------------------------- |
| Design     | Props, style (size, spacing, typography, effects)   |
| Events     | Interaction config (trigger → action)               |
| Effects    | Animation, transition, transform                    |
| Data       | Data binding, variables                             |
| Advanced   | CSS class, custom attrs, SEO, A11y                  |

Tab system is extensible via `PropertyPanelTab` interface.

### Popup Layer

Popups are edited in a document-level overlay layer. The editor has two active
surfaces:

- **Page surface:** normal page editing under `document.rootNodeId`.
- **Popup surface:** active popup editing under `document.popups[id].rootNodeId`.

Popup editing also has a selection mode stored at
`editor.activePopupSelection`:

- `"shell"` selects the popup shell object. The right panel shows popup identity,
  layout, behavior, triggers, rules, and animation controls.
- `"content"` targets normal builder nodes inside the popup content root. The
  right panel shows the selected component properties, and selection overlays,
  resize handles, contextual toolbars, drag/drop, keyboard shortcuts, and
  click-to-add behave like page canvas editing.

`SET_ACTIVE_POPUP` selects `"shell"` by default and clears `selectedNodeIds`.
`SET_ACTIVE_POPUP_SELECTION` switches between shell/content. Exiting popup
editing clears both `activePopupId` and `activePopupSelection`.

The active popup also renders a popup shell frame above the page. This shell has
its own mini toolbar and kind-specific resize/drag controls so authors can
select the popup surface, edit content, duplicate, enable/disable, preview,
delete, exit popup editing, and adjust shell size without confusing it with the
`PopupContent` node. Modal drag stores anchored `kindConfig.offsetX/offsetY`;
shell resize mutates only popup `kindConfig`.

Layer tree renders separate **Page** and **Popups** groups. Selecting Page exits
popup editing. Selecting a popup name selects the shell; expanding a popup shows
its `PopupContent` root and children. Popup rows show kind, enabled state, and
active selection state. **A/B variants** that own a content tree appear as
nested **Variant ·** groups under the popup, each showing its own content tree.

The floating **Popups** panel supports:

- Create blank popup or create from template
- Enable/disable, duplicate, delete, and select popup shell
- Filter template cards by category, with kind and trigger metadata
- Save the active popup as a template through the popup template registry

Editor preview mode is UI-only and does not mutate the document (no history
entries). It hides editor handles/overlays and renders close button, Escape
close, and backdrop close close to runtime behavior.

**Preview parity (V3):** preview drives the *same* lifecycle state machine as the
runtime, sourced from `builder-core/src/popups/lifecycle.ts` (via
`usePopupPreviewLifecycle`). Enter/exit animations, ESC, backdrop, and close
button all play through `opening→open→closing→closed`, so what authors see
matches production. A **preview debug strip** (`PopupPreviewController`) shows the
current lifecycle state and the active trigger/frequency-rule summary, with
Open (replay enter), Close (play exit), Reset, and Exit controls.

**Analytics & A/B (V4):** the popup shell property panel adds two sections after
Rules. **Goals** lists conversion goals (add/edit/remove; type click/submit/close/
customEvent/urlVisit; click/submit goals pick a target content node). **A/B Test**
toggles the experiment, sets assignment (random/sticky) + seed, and manages a
variant list — add "copy content" (popup-owned content root) or "patch only"
variants, set weight/enabled, **Edit content** (dispatches
`SET_ACTIVE_POPUP_VARIANT` so the canvas edits that variant's tree), mark a
winner, or remove. The preview debug strip shows a badge with goal/variant counts
and the active assignment mode. All edits go through commands (undoable); the
active-variant selection is editor-only (no undo).

**Localization, Targeting, Scheduling & Frequency (V5):** four additional panel
sections added after A/B Test.

- **Localization** — locale list (BCP-47 tags); **Copy content** clones the base
  content tree as a popup-owned root (`ADD_POPUP_LOCALE cloneFromBase:true`);
  **Patch only** adds a patch-only locale without its own tree. **Edit content**
  dispatches `SET_ACTIVE_POPUP_LOCALE` so the canvas edits that locale's tree (same
  pattern as `SET_ACTIVE_POPUP_VARIANT`). The layer tree shows locale roots as
  sub-groups beneath variant groups.

- **Targeting** — enable toggle; add/remove `TargetingGroup`; within each group:
  `match` select (all/any), condition rows (variable dot-path, operator, value).
  All operators from `PopupConditionOperator` are available including `in`,
  `notIn`, `matches` (regex).

- **Schedule** — enable toggle; startDate, endDate (ISO date inputs), IANA
  timezone text input, `timeWindow` hour range and day-of-week checkboxes.

- **Frequency** — cap enable toggle; `maxShows` number and `per` unit select
  (session/hour/day/week/month); `suppressAfterGoalIds` multi-select from defined
  goals; custom storage key prefix.

`activePopupLocale` in `EditorState` tracks which locale content tree the canvas
edits. Priority chain for `activeRootNodeId`: variant root → locale root → base.
Locale editing is cleared when `SET_ACTIVE_POPUP` fires (same as variant editing).

**Campaigns (V6):** an additional panel section in the popup property panel:

- **Campaign** — dropdown to assign/unassign the popup to a campaign
  (`ASSIGN_POPUP_CAMPAIGN`). Shows current campaign status/policy as read-only text.
  Amber warning badge when the popup belongs to a non-published campaign (it will be
  blocked at runtime). Priority number input dispatches `SET_POPUP_PRIORITY`.

The floating **Campaigns** panel (`CampaignPanel.tsx`) is opened via a toolbar button
at the top of the editor. Features:

- Create new campaign (name input + Add button)
- Per-campaign row: inline name editing, status badge, member-popup count
- Expandable details per row: status dropdown (transitions via `SET_CAMPAIGN_STATUS`),
  conflict policy dropdown (`UPDATE_CAMPAIGN`), delete button (`DELETE_CAMPAIGN`)

The layer tree groups popups under their campaign headers (with status badge) when any
campaign exists. Ungrouped popups are listed last. Campaign grouping is read-only in the
layer tree — assignment is done in the property panel or the Campaigns floating panel.

`activeCampaignId` in `EditorState` tracks which campaign is focused in the Campaigns
panel. Dispatched via `SET_ACTIVE_CAMPAIGN` (no undo, editor-only).

Events tab actions `showModal` and `hideModal` present a popup picker while
preserving the serialized action shape `{ type, targetId }`.

### Top Toolbar

```
[Undo][Redo] | [Desktop][Tablet][Mobile] | [100%▼] | [Grid✓][Snap✓] | [👁 Panels] | [?][↑Import][↓Export]
```

Controls:
- Undo/Redo
- Breakpoint selector
- Zoom selector (dropdown + input)
- Fit to screen
- Grid/Snap/Helper toggles
- Panel visibility
- Settings, import, export, help

---

## Keyboard Shortcut System

```ts
interface ShortcutDefinition {
  id: string;
  label: string;
  description?: string;
  category: string;
  keys: string; // e.g. "Ctrl+D"
  action: (ctx: ShortcutContext) => void;
  isActive?: (ctx: ShortcutContext) => boolean;
  priority?: number; // higher = override
}

interface ShortcutContext {
  state: BuilderState;
  dispatch: (command: Command) => void;
  event: KeyboardEvent;
}
```

**Built-in Shortcuts:**

| Shortcut               | Action                       |
| ---------------------- | ---------------------------- |
| `Ctrl+Z`               | Undo                         |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo                    |
| `Ctrl+D`               | Duplicate                    |
| `Delete` / `Backspace` | Delete                       |
| `Ctrl+C` / `Ctrl+X` / `Ctrl+V` | Copy/Cut/Paste     |
| `Ctrl+A`               | Select all                   |
| `Escape`               | Deselect/exit container      |
| `Enter`                | Enter container              |
| `Tab` / `Shift+Tab`    | Next/prev sibling            |
| `Arrow keys`           | Nudge 1px                    |
| `Shift+Arrow`          | Nudge 10px                   |
| `Ctrl+G` / `Ctrl+Shift+G` | Group/ungroup          |
| `Ctrl+L`               | Lock/unlock                  |
| `Ctrl+H`               | Hide/show                    |
| `Ctrl+]` / `Ctrl+[`    | Move to front/back           |
| `]` / `[`              | Move up/down 1 layer         |
| `Ctrl+0` / `Ctrl+1`    | Fit/100% zoom                |
| `Ctrl++` / `Ctrl+-`    | Zoom in/out                  |
| `Ctrl+;`               | Toggle grid                  |
| `Ctrl+'`               | Toggle snap                  |

**Conflict Resolution:**

- Plugin shortcuts have precedence via `priority`
- Conflict warning logged in dev mode
- Shortcuts inactive during text editing
- User override capability (future feature)

---

_For component palette details and property control generation, see `RUNTIME.md` (Dynamic Component Loading)._
_For layout and interaction rules, see `DATA_MODEL.md`._

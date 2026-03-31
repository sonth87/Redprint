# UI Builder Library — Technical Specification v2.1

**AI-Agent Engineering Spec — Revised with UI/UX Requirements**

> Spec này dành cho AI Agent đọc để hiểu toàn bộ project, lên kế hoạch phát triển, và sinh code/structure theo từng module. Mọi interface contract định nghĩa ở đây được coi là immutable trừ khi có version bump chính thức.

---

## Mục lục

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Design Principles](#3-core-design-principles)
4. [Document Model](#4-document-model)
5. [Component Protocol Specification](#5-component-protocol-specification)
6. [Layout & Interaction System](#6-layout--interaction-system)
7. [State & Command System](#7-state--command-system)
8. [History System](#8-history-system)
9. [Canvas & Viewport System](#9-canvas--viewport-system)
10. [Editor Panel System](#10-editor-panel-system)
11. [Quick Action Toolbar System](#11-quick-action-toolbar-system)
12. [Snap & Alignment Engine](#12-snap--alignment-engine)
13. [Selection System](#13-selection-system)
14. [Rendering System](#14-rendering-system)
15. [Plugin & Extension System](#15-plugin--extension-system)
16. [Dynamic Component Loading](#16-dynamic-component-loading)
17. [Asset Management System](#17-asset-management-system)
18. [Keyboard Shortcut System](#18-keyboard-shortcut-system)
19. [Import / Export System](#19-import--export-system)
20. [Document Evolution & Versioning](#20-document-evolution--versioning)
21. [Accessibility (A11y)](#21-accessibility-a11y)
22. [Error Boundary Contracts](#22-error-boundary-contracts)
23. [Developer Experience Requirements](#23-developer-experience-requirements)
24. [Non-Functional Requirements](#24-non-functional-requirements)
25. [Module Requirements Summary](#25-module-requirements-summary)
26. [Expected Project Structure](#26-expected-project-structure)
27. [Integration Points](#27-integration-points)

---

## 1. Project Overview

### Objective

Build một **UI Builder Library** dạng modular, extensible, cho phép người dùng kéo thả để tạo giao diện web — tương tự LadiPage, Webflow. Library được thiết kế như một **platform**, không phải một bộ component đơn thuần.

### Core User Capabilities

- Kéo thả component vào canvas để tạo layout
- Select component để xem và chỉnh thuộc tính qua property panel bên phải
- Di chuyển, resize, duplicate, xoá component trên canvas
- Snap component vào nhau khi di chuyển (magnetic snap)
- Xem helper lines để biết phạm vi container/wrapper
- Cấu hình responsive trên nhiều breakpoint (desktop/tablet/mobile)
- Load component từ dịch vụ ngoài (dynamic remote components)
- Undo/redo toàn bộ thao tác
- Import/export document schema
- Toggle grid, snap, panel visibility qua toolbar

### Scope Boundary

Spec này bao gồm **library layer only**. Backend services (manifest API, CDN, auth, persistence) nằm ngoài scope nhưng integration contract được định nghĩa ở Section 27.

---

## 2. Architecture Overview

### Package Dependency Rules

```
builder-core          ← không phụ thuộc gì
builder-react         ← phụ thuộc builder-core
builder-editor        ← phụ thuộc builder-core, builder-react
builder-renderer      ← phụ thuộc builder-core, builder-react
```

| Package            | Vai trò                                             |
| ------------------ | --------------------------------------------------- |
| `builder-core`     | Engine trung tâm — framework-agnostic               |
| `builder-react`    | React adapter layer                                 |
| `builder-editor`   | Visual editor — canvas, panel, drag-drop, toolbar   |
| `builder-renderer` | Runtime renderer — production, không có editor code |

**Ràng buộc cứng:** `builder-core` không được có bất kỳ runtime dependency nào vào React, DOM, hay browser API. Tất cả DOM interaction phải thông qua adapter ở `builder-react` hoặc `builder-editor`.

### Tổng quan data flow

```
[Inputs]
Document Schema → builder-core (parse, validate, migrate)
Component Defs  → ComponentRegistry
Plugins         → PluginEngine
Runtime Context → BuilderState

[Core loop]
User action → Command → CommandEngine → StateManager → EventBus
EventBus → builder-react (subscription) → React re-render
EventBus → builder-editor (overlay, panel refresh)

[Outputs]
builder-renderer → Runtime UI (production)
builder-editor   → Editor UI (authoring)
StateManager     → Updated Document Schema
EventBus         → Interaction Events
```

---

## 3. Core Design Principles

### 3.1 Component-driven

Không có component nào được hardcode. Tất cả phải đăng ký qua:

```ts
builder.registerComponent(definition: ComponentDefinition): void
builder.unregisterComponent(type: string): void
builder.getComponent(type: string): ComponentDefinition | undefined
builder.listComponents(filter?: ComponentFilter): ComponentDefinition[]
```

### 3.2 Schema-driven UI

Document schema là nguồn sự thật duy nhất cho cả rendering và editing. Renderer tạo ra UI chỉ từ schema, không cần config bổ sung.

### 3.3 Plugin-first

Mọi tính năng non-core phải có thể implement như plugin. Core expose stable plugin API được versioned độc lập. Plugin không được truy cập internal state của core ngoài defined interface.

### 3.4 Framework-agnostic core

`builder-core` có thể được dùng với bất kỳ framework nào (React, Vue, Svelte, vanilla JS) mà không cần sửa đổi.

### 3.5 Contract-first interfaces

Mỗi package boundary phải được định nghĩa là TypeScript interface contract trước khi implementation. AI Agent sinh code phải coi các contract này là immutable.

### 3.6 Fail-safe degradation

- Component definition bị thiếu → render `UnknownComponentPlaceholder`, không throw
- Plugin load fail → tiếp tục không có plugin đó, emit diagnostic event
- Remote component load fail → render `RemoteComponentErrorPlaceholder`
- Command fail → không thay đổi state, emit `command:error`

### 3.7 Extension-first panel system

Editor panels (left, right, top, bottom) phải là extensible — plugin có thể thêm panel, tab, hay control mà không sửa core editor code.

---

## 4. Document Model

### 4.1 BuilderNode

```ts
interface BuilderNode {
  id: string; // UUID v4, globally unique
  type: string; // component type key
  parentId: string | null; // null = root node
  order: number; // thứ tự trong siblings
  props: Record<string, unknown>; // component-specific properties
  style: StyleConfig; // base styles
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  interactions: InteractionConfig[];
  slot?: string; // named slot trong parent (nếu có)
  locked?: boolean; // locked = không select, không move
  hidden?: boolean; // ẩn trên canvas lẫn runtime
  name?: string; // human-readable label trong layer panel
  metadata: NodeMetadata;
}

interface NodeMetadata {
  createdAt: string;
  updatedAt: string;
  pluginData?: Record<string, unknown>; // plugin-owned metadata per namespace
  tags?: string[];
}
```

### 4.2 StyleConfig

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
  borderTop?: BorderValue;
  borderRight?: BorderValue;
  borderBottom?: BorderValue;
  borderLeft?: BorderValue;
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

### 4.3 Responsive Configuration

```ts
type Breakpoint = "desktop" | "tablet" | "mobile";

interface BreakpointConfig {
  breakpoint: Breakpoint;
  label: string; // hiển thị trong toolbar
  minWidth: number; // px
  maxWidth?: number; // undefined = unbounded
  icon?: string; // icon key cho toolbar
}

const DEFAULT_BREAKPOINTS: BreakpointConfig[] = [
  { breakpoint: "desktop", label: "Desktop", minWidth: 1024, icon: "monitor" },
  {
    breakpoint: "tablet",
    label: "Tablet",
    minWidth: 768,
    maxWidth: 1023,
    icon: "tablet",
  },
  {
    breakpoint: "mobile",
    label: "Mobile",
    minWidth: 0,
    maxWidth: 767,
    icon: "smartphone",
  },
];
```

Custom breakpoints phải configurable per-builder-instance, override defaults.

### 4.4 Interaction Configuration

```ts
type InteractionTrigger =
  | "click"
  | "dblclick"
  | "hover"
  | "mouseenter"
  | "mouseleave"
  | "focus"
  | "blur"
  | "submit"
  | "change"
  | "keydown"
  | "keyup"
  | "mount"
  | "unmount"
  | "scroll"
  | "intersect";

type InteractionAction =
  | { type: "navigate"; url: string; target?: "_blank" | "_self" }
  | {
      type: "triggerApi";
      endpoint: string;
      method: string;
      headers?: Record<string, string>;
      body?: unknown;
    }
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
  operator:
    | "eq"
    | "neq"
    | "gt"
    | "lt"
    | "gte"
    | "lte"
    | "contains"
    | "truthy"
    | "falsy";
  value?: unknown;
}
```

### 4.5 BuilderDocument

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

## 5. Component Protocol Specification

### 5.1 ComponentDefinition

```ts
interface ComponentDefinition {
  // Identity
  type: string; // unique key, e.g. "text-block", "hero-section"
  name: string; // human-readable
  category: string; // grouping trong component palette
  version: string; // semver
  icon?: string; // SVG string hoặc icon key
  description?: string; // tooltip trong palette
  tags?: string[]; // để filter/search

  // Capabilities
  capabilities: ComponentCapabilities;

  // Property schema (drive dynamic property panels)
  propSchema: PropSchema[];

  // Default values
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;

  // Container rules (nếu canContainChildren)
  containerConfig?: ContainerConfig;

  // Rendering
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;

  // Quick actions (hiện trên context toolbar khi select)
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
  acceptedChildTypes?: string[]; // undefined = chấp nhận tất cả
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
  isDragDisabled?: boolean; // không cho drag (e.g. fixed root)
  isDropDisabled?: boolean; // không nhận drop vào bên trong
}

interface ComponentEditorConfig {
  minWidth?: number; // px, giới hạn khi resize
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeHandles?: ResizeHandle[]; // custom resize handles
  showBoundingBox?: boolean; // default true
  selectionColor?: string; // custom selection color
  showQuickActions?: boolean; // default true
}

interface ComponentLifecycle {
  onInit?: (ctx: ComponentContext) => void;
  onMount?: (ctx: ComponentContext) => void;
  onUpdate?: (
    ctx: ComponentContext,
    prevProps: Record<string, unknown>,
  ) => void;
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

### 5.2 PropSchema

```ts
type PropSchema =
  | {
      key: string;
      type: "string";
      label: string;
      default?: string;
      multiline?: boolean;
      placeholder?: string;
    }
  | {
      key: string;
      type: "number";
      label: string;
      default?: number;
      min?: number;
      max?: number;
      step?: number;
      unit?: string;
    }
  | { key: string; type: "boolean"; label: string; default?: boolean }
  | {
      key: string;
      type: "select";
      label: string;
      options: SelectOption[];
      default?: string;
      multiple?: boolean;
    }
  | {
      key: string;
      type: "color";
      label: string;
      default?: string;
      allowGradient?: boolean;
      allowTransparent?: boolean;
    }
  | { key: string; type: "image"; label: string; accept?: string[] }
  | { key: string; type: "video"; label: string }
  | {
      key: string;
      type: "richtext";
      label: string;
      toolbar?: RichtextToolbarConfig;
    }
  | { key: string; type: "data-binding"; label: string; sourceType?: string }
  | { key: string; type: "json"; label: string }
  | { key: string; type: "spacing"; label: string; default?: BoxValue }
  | { key: string; type: "border"; label: string; default?: BorderValue }
  | { key: string; type: "shadow"; label: string }
  | { key: string; type: "icon"; label: string }
  | { key: string; type: "font"; label: string }
  | {
      key: string;
      type: "slider";
      label: string;
      min: number;
      max: number;
      step?: number;
      default?: number;
    }
  | {
      key: string;
      type: "group";
      label: string;
      children: PropSchema[];
      collapsible?: boolean;
    };

interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}
```

### 5.3 ContainerConfig

```ts
interface ContainerConfig {
  layoutType: "flow" | "flex" | "grid" | "absolute" | "slot-based";
  slots?: SlotConfig[];
  maxChildren?: number;
  minChildren?: number;
  allowedChildTypes?: string[]; // undefined = tất cả
  disallowedChildTypes?: string[];
  restrictNesting?: string[]; // type không được nest bên trong
  dropZoneConfig?: DropZoneConfig;
  emptyStateConfig?: EmptyStateConfig;
}

interface SlotConfig {
  name: string; // slot identifier
  label: string; // hiển thị trong editor
  required?: boolean;
  allowedTypes?: string[];
  maxChildren?: number;
}

interface EmptyStateConfig {
  message?: string; // text hiển thị khi container trống
  icon?: string;
  allowDrop?: boolean; // default true
}
```

### 5.4 QuickAction

Quick actions là các nút xuất hiện trên context toolbar khi component được select.

```ts
interface QuickAction {
  id: string;
  icon: string;
  label: string;
  tooltip?: string;
  group?: string; // group actions thành section
  isToggle?: boolean;
  isActive?: (ctx: ComponentContext) => boolean;
  isDisabled?: (ctx: ComponentContext) => boolean;
  isVisible?: (ctx: ComponentContext) => boolean;
  execute: (ctx: ComponentContext) => void | Command;
  shortcut?: string; // e.g. "Ctrl+D"
}
```

---

## 6. Layout & Interaction System

### 6.1 Layout Models

| Layout       | Mô tả                                                          |
| ------------ | -------------------------------------------------------------- |
| `flow`       | Block flow, children stack theo document order                 |
| `flex`       | Flexbox — direction, wrapping, alignment configurable          |
| `grid`       | CSS grid — column/row templates configurable                   |
| `absolute`   | Free-form positioning bằng x/y coordinates                     |
| `slot-based` | Container định nghĩa named slots; children gán vào slot cụ thể |

### 6.2 Drag-and-drop Contracts

```ts
type DropPosition = 'before' | 'after' | 'inside' | 'replace' | 'slot'

interface DropTarget {
  nodeId: string
  position: DropPosition
  slotName?: string           // nếu position === 'slot'
  insertIndex?: number        // index trong children
}

interface DragSource {
  type: 'existing-node'       // kéo node đang có trên canvas
  nodeId: string
}
| {
  type: 'new-component'       // kéo từ component palette
  componentType: string
}

interface DragOperation {
  source: DragSource
  currentTarget: DropTarget | null
  isValid: boolean            // target có hợp lệ không
  invalidReason?: string
  startPosition: Point
  currentPosition: Point
  ghostOffset: Point          // offset để render ghost element
}
```

Mọi drop phải được validate theo `ContainerConfig` của target. Drop không hợp lệ phải có visual feedback rõ ràng (màu đỏ, icon cấm).

### 6.3 Drop Validation Rules

```ts
interface DropValidationResult {
  valid: boolean;
  reason?: string; // message hiển thị cho user
}

type DropValidator = (
  source: DragSource,
  target: DropTarget,
  document: BuilderDocument,
) => DropValidationResult;
```

Built-in validation phải check: type restrictions của container, max children limit, disallow nesting một element vào descendant của chính nó, slot availability.

---

## 7. State & Command System

### 7.1 Command Interface

```ts
interface Command<T = unknown> {
  type: string;
  payload: T;
  description?: string; // human-readable cho history UI
  timestamp?: number;
  groupId?: string; // nhóm commands thành atomic transaction
}

interface CommandResult {
  success: boolean;
  error?: string;
  affectedNodeIds?: string[];
}

interface ReversibleCommand<T = unknown> extends Command<T> {
  getInverse(currentState: BuilderState): Command;
}
```

### 7.2 Built-in Commands

| Command type              | Payload                                                                | Mô tả                           |
| ------------------------- | ---------------------------------------------------------------------- | ------------------------------- |
| `ADD_NODE`                | `{ parentId, componentType, props?, style?, position?, insertIndex? }` | Thêm node mới                   |
| `REMOVE_NODE`             | `{ nodeId }`                                                           | Xoá node và descendants         |
| `MOVE_NODE`               | `{ nodeId, targetParentId, position, insertIndex? }`                   | Di chuyển sang parent khác      |
| `REORDER_NODE`            | `{ nodeId, insertIndex }`                                              | Reorder trong cùng parent       |
| `DUPLICATE_NODE`          | `{ nodeId, offset? }`                                                  | Duplicate node và descendants   |
| `UPDATE_PROPS`            | `{ nodeId, props }`                                                    | Cập nhật props                  |
| `UPDATE_STYLE`            | `{ nodeId, style, breakpoint? }`                                       | Cập nhật style                  |
| `UPDATE_RESPONSIVE_STYLE` | `{ nodeId, breakpoint, style }`                                        | Style override cho breakpoint   |
| `UPDATE_INTERACTIONS`     | `{ nodeId, interactions }`                                             | Cập nhật interaction config     |
| `RENAME_NODE`             | `{ nodeId, name }`                                                     | Đổi tên node                    |
| `LOCK_NODE`               | `{ nodeId }`                                                           | Lock node                       |
| `UNLOCK_NODE`             | `{ nodeId }`                                                           | Unlock node                     |
| `HIDE_NODE`               | `{ nodeId }`                                                           | Ẩn node                         |
| `SHOW_NODE`               | `{ nodeId }`                                                           | Hiện node                       |
| `GROUP_NODES`             | `{ nodeIds, containerType? }`                                          | Group nhiều nodes vào container |
| `UNGROUP_NODES`           | `{ nodeId }`                                                           | Ungroup container               |
| `SET_VARIABLE`            | `{ key, value }`                                                       | Cập nhật document variable      |
| `UPDATE_CANVAS_CONFIG`    | `{ config }`                                                           | Cập nhật canvas settings        |
| `LOAD_COMPONENT`          | `{ manifestUrl, componentType }`                                       | Load remote component           |

### 7.3 State Model

```ts
interface BuilderState {
  document: BuilderDocument;
  editor: EditorState;
  interaction: InteractionState;
  ui: UIState;
}

interface EditorState {
  selectedNodeIds: string[];
  hoveredNodeId: string | null;
  activeBreakpoint: Breakpoint;
  activeTool: EditorTool;
  zoom: number;
  panOffset: Point;
  clipboard: ClipboardData | null;
}

type EditorTool = "select" | "pan" | "insert" | "comment";

interface InteractionState {
  dragOperation: DragOperation | null;
  resizeOperation: ResizeOperation | null;
  isMultiSelecting: boolean;
  multiSelectRect: Rect | null; // rubber-band selection rect
}

interface UIState {
  panels: PanelState;
  quickToolbar: QuickToolbarState;
  notifications: Notification[];
}

interface PanelState {
  leftPanel: { visible: boolean; width: number; activeTab: string };
  rightPanel: { visible: boolean; width: number; activeTab: string };
  bottomPanel: { visible: boolean; height: number };
  topToolbar: { visible: boolean };
}

interface QuickToolbarState {
  visible: boolean;
  targetNodeId: string | null;
  position: Point;
}
```

---

## 8. History System

### 8.1 Command-based History

```ts
interface HistoryEntry {
  id: string;
  command: Command;
  inverseCommand: Command; // precomputed khi execute
  timestamp: number;
  groupId?: string; // entries cùng groupId undo/redo cùng nhau
  description: string; // label hiển thị trong history panel
}

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number; // default 100
}
```

### 8.2 Requirements

- Undo/redo phải atomic với grouped commands
- History phải serialisable (JSON-safe) để có thể save/restore session
- Plugin commands phải cung cấp inverse command khi đăng ký
- History panel phải hiển thị description của mỗi entry
- Selective undo (undo một entry cụ thể) là optional/future feature

---

## 9. Canvas & Viewport System

Canvas là khu vực trung tâm nơi người dùng kéo thả và chỉnh sửa giao diện. Đây là một trong những component phức tạp nhất của editor.

### 9.1 Viewport State

```ts
interface ViewportState {
  zoom: number; // 0.1 – 4.0, default 1.0
  panOffset: Point; // offset từ canvas origin
  canvasRect: Rect; // kích thước vùng canvas render
  containerRect: Rect; // kích thước vùng canvas hiển thị (scroll container)
}
```

### 9.2 Canvas Config (phần DocumentLevel)

```ts
interface CanvasConfig {
  width?: number; // px, undefined = fluid/responsive
  backgroundColor?: string; // default '#ffffff'
  showGrid: boolean; // default false
  gridSize: number; // px, default 8
  snapEnabled: boolean; // default true
  snapThreshold: number; // px, default 6
  snapToGrid: boolean; // snap vào grid lines
  snapToComponents: boolean; // snap vào edges của components khác
  rulerEnabled: boolean; // default false
  showHelperLines: boolean; // default true — đường giới hạn container
  helperLineColor?: string; // default primary color của theme
}
```

### 9.3 Grid Rendering

- Grid chỉ render ở editor mode, không bao giờ render ở runtime
- Grid overlay phải dùng CSS background pattern, không dùng SVG/DOM element cho mỗi cell (performance)
- Grid toggle qua keyboard shortcut `Ctrl+;` (customizable) và toolbar checkbox
- Grid có 2 loại: dot grid (chấm tại giao điểm) và line grid (đường thẳng) — configurable

### 9.4 Helper Lines

Helper lines là các đường chỉ dẫn giúp người dùng biết phạm vi của container trên web thực (wrapper width, margin, v.v.).

```ts
interface HelperLine {
  id: string;
  type: "container-bound" | "margin" | "padding" | "custom";
  orientation: "horizontal" | "vertical";
  position: number; // px từ canvas top/left
  label?: string;
  color?: string;
  dashed?: boolean;
  nodeId?: string; // node tạo ra helper line này
}
```

Helper lines phải:

- Hiển thị khi hover vào container/wrapper node
- Hiển thị persistent khi container được select
- Không xuất hiện trong runtime render
- Có thể custom bởi plugin (e.g. responsive grid helper)

### 9.5 Zoom & Pan

```ts
interface ZoomConfig {
  min: number; // default 0.1
  max: number; // default 4.0
  step: number; // default 0.1
  wheelSensitivity: number;
  pinchSensitivity: number;
}
```

- Zoom vào cursor position (không phải center canvas)
- `Ctrl+0` = fit to viewport
- `Ctrl+1` = 100%
- `Ctrl++` / `Ctrl+-` = zoom in/out
- Pan bằng Space + drag hoặc middle mouse button
- Viewport phải scroll khi canvas lớn hơn viewport

### 9.6 Scroll Behaviour

Canvas container phải hỗ trợ scroll cả horizontal và vertical khi canvas content lớn hơn viewport. Scroll không được làm mất snap/alignment state.

---

## 10. Editor Panel System

Hệ thống panel phải extensible — plugin có thể thêm panel, tab, control mà không sửa core editor.

### 10.1 Panel Architecture

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
  order?: number; // thứ tự trong panel list
}

interface PanelContext {
  builder: BuilderAPI;
  selectedNodes: BuilderNode[];
  document: BuilderDocument;
  state: BuilderState;
  dispatch: (command: Command) => void;
}
```

### 10.2 Left Panel — Component Palette

```
┌─────────────────────┐
│ 🔍 Tìm kiếm...      │
├─────────────────────┤
│ ▾ Base Components   │
│   □ Text Block      │
│   □ Image           │
│   □ Button          │
│   □ Container       │
│   □ ...             │
├─────────────────────┤
│ ▾ Custom Components │ ← load từ remote service
│   □ Hero Section    │
│   □ Card            │
├─────────────────────┤
│ ▾ Từ Plugins        │
│   □ ...             │
└─────────────────────┘
```

**Requirements:**

- Tìm kiếm component theo tên, tag, category
- Filter theo category
- Component entry phải hiển thị: icon, tên, tooltip mô tả khi hover
- Drag từ palette vào canvas tạo component mới
- Double-click vào palette entry có thể thêm vào root (nếu có root container)
- Loading state khi fetch remote components
- Error state nếu remote service không khả dụng
- Component có thể đánh dấu favourite

### 10.3 Right Panel — Property Panel

Right panel hiển thị thuộc tính của component/node đang được select.

```
┌─────────────────────────────┐
│ IMAGE1  ✏️                  │ ← tên node, click để rename
│ [Thiết kế][SựKiện][Hiệu ứng]│ ← tabs
│ [Dữ liệu][Nâng cao]         │
├─────────────────────────────┤
│ Thiết lập ảnh               │
│  Link ảnh  [https://...]    │
│  Thư viện ảnh [Chọn ảnh]   │
│  Nhấp chuột thứ 2 [toggle] │
│  Ảnh so sánh    [toggle]   │
├─────────────────────────────┤
│ Kích thước                  │
│  W [345.72]    H [195.3]   │
├─────────────────────────────┤
│ Viền & bo góc               │
│  ...                        │
├─────────────────────────────┤
│ Đổ bóng                     │
│  ...                        │
└─────────────────────────────┘
```

**Tab structure:**

| Tab          | Nội dung                                                                |
| ------------ | ----------------------------------------------------------------------- |
| **Thiết kế** | Props, style (size, spacing, typography, color, border, shadow, filter) |
| **Sự kiện**  | Interaction config — trigger → action                                   |
| **Hiệu ứng** | Animation, transition, transform                                        |
| **Dữ liệu**  | Data binding, variables                                                 |
| **Nâng cao** | CSS class, custom attributes, SEO, A11y                                 |

**Requirements:**

- Tab phải extensible — plugin có thể thêm tab
- Controls sinh tự động từ `PropSchema` của component
- Multi-select: hiển thị shared properties, mixed-value state
- Panel không được re-render toàn bộ khi chỉ một giá trị thay đổi
- Scroll riêng cho panel content

### 10.4 Tab Manifest

```ts
interface PropertyPanelTab {
  id: string;
  label: string;
  icon?: string;
  order?: number;
  isVisible?: (
    nodes: BuilderNode[],
    definition: ComponentDefinition,
  ) => boolean;
  render: (ctx: PanelContext) => ReactNode;
}
```

### 10.5 Top Toolbar

```
[Undo][Redo] | [Desktop][Tablet][Mobile] | [100%▼] | [Grid✓][Snap✓] | [👁 Panels] | [?][↑Import][↓Export]
```

**Canvas config controls (top-right):**

- Toggle Grid (`Ctrl+;`)
- Toggle Snap (`Ctrl+'`)
- Toggle Helper Lines

**View controls:**

- Zoom selector (dropdown + input)
- Fit to screen
- Toggle panel visibility

**Action controls:**

- Undo / Redo
- History panel toggle
- Import / Export
- Preview (render ở runtime mode)
- Help

---

## 11. Quick Action Toolbar System

Context toolbar xuất hiện nổi ngay phía trên component khi được select.

### 11.1 Toolbar Behaviour

```ts
interface QuickToolbarConfig {
  position: "above" | "below" | "auto"; // auto = tuỳ vị trí trên canvas
  offset: number; // px từ selection box
  showDelay?: number; // ms, default 0
  hideOnDrag?: boolean; // default true
}
```

### 11.2 Built-in Quick Actions (có trên mọi component)

| Action              | Icon | Shortcut | Mô tả             |
| ------------------- | ---- | -------- | ----------------- |
| Move up (z-index)   | ↑    | `]`      | Lên 1 lớp         |
| Move down (z-index) | ↓    | `[`      | Xuống 1 lớp       |
| Move to front       | ⬆    | `Ctrl+]` | Lên trên cùng     |
| Move to back        | ⬇    | `Ctrl+[` | Xuống dưới cùng   |
| Duplicate           | ⊕    | `Ctrl+D` | Duplicate node    |
| Delete              | 🗑   | `Delete` | Xoá node          |
| Wrap in container   | □    | —        | Bọc vào container |
| Lock/Unlock         | 🔒   | `Ctrl+L` | Lock/unlock node  |
| Hide                | 👁   | `Ctrl+H` | Ẩn node           |
| More options        | ⋯    | —        | Dropdown actions  |

### 11.3 Component-specific Actions

Component definition cung cấp custom quick actions qua `ComponentDefinition.quickActions`. Các actions này xuất hiện trên toolbar sau built-in actions.

Ví dụ cho Image component:

- "Thay ảnh" → mở asset picker
- "Fit" / "Fill" / "Crop" → toggle object-fit mode

### 11.4 Toolbar Positioning Logic

```ts
function calculateToolbarPosition(
  nodeRect: Rect,
  toolbarSize: Size,
  canvasRect: Rect,
  canvasTransform: ViewportState,
): Point {
  // Preferred: above node
  // Fallback: below node nếu không đủ space phía trên
  // Fallback thứ 2: inside node top nếu node quá nhỏ
}
```

Toolbar phải luôn nằm trong viewport — không được bị clip bởi canvas edge.

---

## 12. Snap & Alignment Engine

### 12.1 Snap Engine

```ts
interface SnapEngine {
  // Tính snap targets từ tất cả visible nodes
  calculateSnapTargets(
    movingNodeIds: string[],
    document: BuilderDocument,
    viewport: ViewportState,
  ): SnapTarget[];

  // Tìm snap candidate gần nhất
  findClosestSnap(
    currentBounds: Rect,
    snapTargets: SnapTarget[],
    threshold: number,
  ): SnapResult | null;
}

interface SnapTarget {
  type: "edge" | "center" | "grid" | "spacing";
  orientation: "horizontal" | "vertical";
  position: number; // canvas coordinate
  sourceNodeId?: string; // node tạo ra target này
  label?: string;
}

interface SnapResult {
  snapX?: number; // vị trí snap theo X (nếu có)
  snapY?: number; // vị trí snap theo Y (nếu có)
  activeTargets: SnapTarget[]; // targets đang active để render guide lines
  delta: Point; // offset cần apply
}
```

### 12.2 Snap Types

**Edge snap:** Snap left/right/top/bottom edges của node đang di chuyển vào edges của các node khác trong cùng container.

**Center snap:** Snap center (horizontal/vertical) của node vào center của các node khác hoặc container.

**Grid snap:** Snap vào grid lines nếu `canvasConfig.snapToGrid = true`.

**Spacing snap:** Hiển thị equal-spacing guides khi khoảng cách giữa các node bằng nhau (Figma-style).

### 12.3 Visual Snap Indicators

Khi snap active:

- Render snap guide lines màu primary xuyên qua canvas
- Hiển thị distance labels (px) giữa các node nếu là spacing snap
- Snap guides chỉ visible trong editor, không trong runtime

---

## 13. Selection System

### 13.1 Single Selection

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

Khi select:

- Hiển thị selection bounding box với resize handles
- Hiển thị quick action toolbar
- Update right panel với node properties
- Không select locked nodes

### 13.2 Multi-selection

- `Shift+Click` = thêm vào selection
- `Ctrl+A` = select all (trong active container)
- Rubber-band selection: drag trên canvas (không phải trên node) để tạo selection rect

```ts
interface MultiSelectOperation {
  rect: Rect; // rubber-band rect trong canvas coordinates
  selectedNodes: string[]; // nodes có bounding box intersect với rect
  includePartiallyContained: boolean; // default false — chỉ fully contained
}
```

Multi-select operations:

- Di chuyển group cùng nhau
- Delete group
- Group thành container
- Align (left, right, top, bottom, center horizontal, center vertical)
- Distribute (equal spacing horizontal/vertical)

### 13.3 Selection Box & Resize Handles

```ts
type ResizeHandle =
  | "n"
  | "s"
  | "e"
  | "w" // cardinal
  | "ne"
  | "nw"
  | "se"
  | "sw"; // diagonal

interface ResizeOperation {
  nodeId: string;
  handle: ResizeHandle;
  startBounds: Rect;
  startPoint: Point;
  currentPoint: Point;
  maintainAspectRatio: boolean; // true khi giữ Shift
  fromCenter: boolean; // true khi giữ Alt
}
```

Resize handles chỉ hiển thị theo `ComponentCapabilities`:

- `canResizeWidth: false` → ẩn E/W/NE/NW/SE/SW handles
- `canResizeHeight: false` → ẩn N/S/NE/NW/SE/SW handles
- `maintainAspectRatio: true` → mặc định giữ tỉ lệ

---

## 14. Rendering System

### 14.1 Editor Rendering

Editor render hai layer riêng biệt:

**Document layer** — render actual component tree dùng `editorRenderer` của từng component. Đây là canvas WYSIWYG.

**Overlay layer** — render selection boxes, resize handles, hover highlights, drag targets, helper lines, snap guides, drop indicators. Layer này `position: absolute` on top, `pointer-events` được manage để không block component interaction.

### 14.2 Runtime Rendering

Runtime renderer phải:

- Resolve component từ registry
- Apply style merge: base style + active breakpoint responsive style
- Bind interactions
- Render qua `runtimeRenderer`
- Không include bất kỳ editor-related code trong bundle

### 14.3 Rendering Pipeline

```
Document
  → Node tree traversal (depth-first)
    → Component resolution (registry lookup → fallback nếu không có)
    → Props resolution (defaults merge + node props)
    → Style resolution (base + responsive merge theo breakpoint)
    → Interaction binding
    → Render call (editorRenderer | runtimeRenderer)
      → Output DOM
```

### 14.4 Performance

- Memoize component renders theo node id + props hash
- Batch style recalculation khi switch breakpoint
- Lazy-evaluate children của collapsed containers
- Incremental re-render: chỉ re-render changed subtrees
- Runtime bundle phải tree-shakeable
- Editor code không được leak vào runtime bundle

---

## 15. Plugin & Extension System

### 15.1 Plugin Interface

```ts
interface BuilderPlugin {
  id: string;
  name: string;
  version: string;
  minCoreVersion?: string; // semver requirement
  dependencies?: Record<string, string>; // pluginId → semver range

  install(api: PluginAPI): void | Promise<void>;
  initialize?(api: PluginAPI): void | Promise<void>;
  destroy?(api: PluginAPI): void | Promise<void>;
}

interface PluginAPI {
  // Component
  registerComponent(def: ComponentDefinition): void;
  unregisterComponent(type: string): void;

  // Commands
  registerCommand(
    type: string,
    handler: CommandHandler,
    inverseHandler: InverseCommandHandler,
    description?: string,
  ): void;

  // Editor extensions
  registerEditorPanel(panel: EditorPanel): void;
  registerPropertyTab(tab: PropertyPanelTab): void;
  registerPropertyControl(type: string, control: PropertyControl): void;
  registerQuickAction(componentType: string | "*", action: QuickAction): void;
  registerToolbarItem(item: ToolbarItem): void;

  // Layout
  registerLayoutRule(rule: LayoutRule): void;
  registerSnapTarget(factory: SnapTargetFactory): void;

  // Events
  on(event: string, handler: EventHandler): Unsubscribe;
  emit(event: string, payload?: unknown): void;

  // State access (read-only)
  getDocument(): Readonly<BuilderDocument>;
  getState(): Readonly<BuilderState>;
  getSelectedNodes(): Readonly<BuilderNode[]>;

  // Dispatch commands
  dispatch(command: Command): Promise<CommandResult>;

  // Assets
  registerAssetProvider(provider: AssetProvider): void;

  // Shortcuts
  registerShortcut(shortcut: ShortcutDefinition): void;

  // Diagnostics
  log(level: "info" | "warn" | "error", message: string, data?: unknown): void;
}
```

### 15.2 Plugin Lifecycle Rules

- `install` phải hoàn thành trước khi bất kỳ builder operation nào
- Plugin fail ở `install` phải rollback tất cả registrations đã thực hiện
- `destroy` phải idempotent
- Plugin không được access internal state của core ngoài `PluginAPI`
- Plugin không được phụ thuộc vào internal API của plugin khác

---

## 16. Dynamic Component Loading

### 16.1 Component Manifest Contract

```ts
interface ComponentManifest {
  serviceId: string;
  name: string;
  version: string;
  components: ComponentManifestEntry[];
}

interface ComponentManifestEntry {
  type: string;
  name: string;
  category: string;
  version: string;
  bundleUrl: string; // ES module URL
  integrityHash?: string; // SRI hash
  dependencies?: string[]; // component types cần trước
  minCoreVersion?: string; // semver requirement
  icon?: string;
  description?: string;
  tags?: string[];
}
```

### 16.2 Loading Process

1. Fetch manifest từ service URL
2. Validate manifest schema + version compatibility
3. Resolve dependency order
4. Fetch component bundle (với integrity check nếu có hash)
5. Execute bundle trong isolated scope (sandbox)
6. Extract `ComponentDefinition` export
7. Validate definition schema
8. Register qua `builder.registerComponent()`
9. Emit `component:loaded` event
10. Update component palette

### 16.3 Network Contract

- Manifest fetch timeout: 10s (configurable)
- Bundle fetch timeout: 30s (configurable)
- Retry: 3 lần với exponential backoff
- Failed component → render `RemoteComponentErrorPlaceholder`
- Loaded bundles cache trong session

### 16.4 Security & Sandbox

- Component bundles chạy trong sandboxed scope
- Bundle không có direct access vào `window`, `document`, `localStorage`
- Sandbox chỉ expose: render context, limited DOM API cho component's own subtree, `ComponentContext`
- Integrity hash validation bắt buộc ở production mode
- Version conflict phải surface là warning, không silent override

---

## 17. Asset Management System

### 17.1 Asset Types

```ts
type AssetType = "image" | "video" | "font" | "icon" | "file";

interface Asset {
  id: string;
  type: AssetType;
  name: string;
  url: string;
  thumbnailUrl?: string;
  size?: number; // bytes
  dimensions?: { width: number; height: number };
  mimeType?: string;
  uploadedAt?: string;
  tags?: string[];
  source: "local" | "url" | string; // string = provider id
}

interface AssetManifest {
  version: string;
  assets: Asset[];
}
```

### 17.2 Asset Provider Interface

Plugin hoặc service có thể provide asset source:

```ts
interface AssetProvider {
  id: string;
  name: string;
  icon?: string;
  supportedTypes: AssetType[];

  // List/search assets
  listAssets(query: AssetQuery): Promise<AssetListResult>;

  // Upload (nếu hỗ trợ)
  upload?(file: File): Promise<Asset>;

  // Delete (nếu hỗ trợ)
  delete?(assetId: string): Promise<void>;
}

interface AssetQuery {
  type?: AssetType;
  search?: string;
  page?: number;
  pageSize?: number;
  tags?: string[];
}
```

### 17.3 Asset Picker

Image/video prop controls trong property panel phải mở Asset Picker:

- Hiển thị assets từ tất cả registered providers
- Hỗ trợ upload mới
- Hỗ trợ nhập URL trực tiếp
- Preview trước khi chọn
- Search và filter theo type/tag

---

## 18. Keyboard Shortcut System

### 18.1 Shortcut Definition

```ts
interface ShortcutDefinition {
  id: string;
  label: string;
  description?: string;
  category: string;
  keys: string; // e.g. "Ctrl+D", "Delete", "Shift+ArrowUp"
  action: (ctx: ShortcutContext) => void;
  isActive?: (ctx: ShortcutContext) => boolean; // context condition
  priority?: number; // higher = override lower
}

interface ShortcutContext {
  state: BuilderState;
  dispatch: (command: Command) => void;
  event: KeyboardEvent;
}
```

### 18.2 Built-in Shortcuts

| Shortcut                  | Action                               |
| ------------------------- | ------------------------------------ |
| `Ctrl+Z`                  | Undo                                 |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Redo                                 |
| `Ctrl+D`                  | Duplicate node                       |
| `Delete` / `Backspace`    | Xoá node                             |
| `Ctrl+C`                  | Copy                                 |
| `Ctrl+X`                  | Cut                                  |
| `Ctrl+V`                  | Paste                                |
| `Ctrl+A`                  | Select all                           |
| `Escape`                  | Deselect / exit container            |
| `Enter`                   | Enter container (select first child) |
| `Tab`                     | Select next sibling                  |
| `Shift+Tab`               | Select previous sibling              |
| `Arrow keys`              | Nudge position (1px)                 |
| `Shift+Arrow`             | Nudge position (10px)                |
| `Ctrl+G`                  | Group selection                      |
| `Ctrl+Shift+G`            | Ungroup                              |
| `Ctrl+L`                  | Lock/unlock                          |
| `Ctrl+H`                  | Hide/show                            |
| `Ctrl+]`                  | Move to front                        |
| `Ctrl+[`                  | Move to back                         |
| `]`                       | Move up 1 layer                      |
| `[`                       | Move down 1 layer                    |
| `Ctrl+0`                  | Fit to screen                        |
| `Ctrl+1`                  | 100% zoom                            |
| `Ctrl++`                  | Zoom in                              |
| `Ctrl+-`                  | Zoom out                             |
| `Space+Drag`              | Pan canvas                           |
| `Ctrl+;`                  | Toggle grid                          |
| `Ctrl+'`                  | Toggle snap                          |

### 18.3 Shortcut Conflict Resolution

- Plugin-registered shortcuts được ưu tiên bằng `priority` field
- Conflict warning được log ở development mode
- User có thể override shortcuts qua settings (future feature)
- Shortcuts không active trong text editing mode (inside richtext component)

---

## 19. Import / Export System

### 19.1 Export Formats

```ts
type ExportFormat = "json" | "html" | "react" | "zip";

interface ExportConfig {
  format: ExportFormat;
  includeAssets?: boolean; // embed assets vs reference URLs
  minify?: boolean;
  prettyPrint?: boolean;
  targetNodeId?: string; // export subtree thay vì whole doc
}

interface ExportResult {
  content: string | Blob;
  filename: string;
  mimeType: string;
}
```

| Format  | Mô tả                                 |
| ------- | ------------------------------------- |
| `json`  | Raw document schema (BuilderDocument) |
| `html`  | Static HTML với inline CSS            |
| `react` | React component code (future)         |
| `zip`   | HTML + assets bundle                  |

### 19.2 Import Formats

```ts
interface ImportConfig {
  format: "json"; // v1 chỉ support JSON
  mergeStrategy: "replace" | "merge" | "append";
}

interface ImportResult {
  document: BuilderDocument;
  warnings: string[];
  migratedFrom?: string; // schema version trước migration
}
```

Import phải:

- Validate schema trước khi apply
- Chạy migration nếu cần
- Hiển thị warnings nếu có data loss
- Support drag & drop file vào editor để import

---

## 20. Document Evolution & Versioning

### 20.1 Schema Versioning

Mỗi `BuilderDocument` có `schemaVersion` field (semver). Library declare `CURRENT_SCHEMA_VERSION`. Load document → compare → chạy migration nếu cần.

### 20.2 Migration Engine

```ts
interface SchemaMigration {
  fromVersion: string; // semver
  toVersion: string; // semver
  description: string;
  migrate(document: BuilderDocument): BuilderDocument;
  rollback?(document: BuilderDocument): BuilderDocument;
}

interface MigrationEngine {
  register(migration: SchemaMigration): void;
  migrate(document: BuilderDocument, targetVersion?: string): BuilderDocument;
  canMigrate(fromVersion: string, toVersion: string): boolean;
  getMigrationPath(fromVersion: string, toVersion: string): SchemaMigration[];
}
```

- Migrations phải là pure functions (không side effects)
- Engine apply migration trong chain: v1 → v2 → v3
- Unknown fields phải được preserve trong `legacyData`
- Breaking schema changes = major version bump + migration function bắt buộc

### 20.3 Backward Compatibility Policy

- Documents từ mọi prior version phải renderable sau migration
- Migration không được silently drop data
- `legacyData` map giữ fields không recognize được

---

## 21. Accessibility (A11y)

### 21.1 Runtime Output

- Component definitions declare ARIA roles và labels
- Runtime renderer apply ARIA attributes từ `ComponentDefinition.a11y` và node-level overrides
- Generated HTML phải pass WCAG 2.1 Level AA cho basic components

### 21.2 Editor Accessibility

- Canvas navigation bằng keyboard: Tab/Shift+Tab cho sibling, Enter để vào container, Escape để thoát
- Selection, drag, resize phải có keyboard alternative
- Property panel phải fully keyboard accessible
- Tất cả interactive elements phải có focus indicators
- Screen reader announcements cho major state changes (node added/removed/selected)

---

## 22. Error Boundary Contracts

### 22.1 Render Errors

Nếu `runtimeRenderer` hoặc `editorRenderer` throw:

- Catch lỗi tại node boundary
- Render `ErrorPlaceholder` thay thế
- Emit `component:render-error` event
- Continue render phần còn lại của document tree

### 22.2 Command Errors

Nếu command fail:

- Không apply command vào state
- Add error entry vào diagnostic log
- Emit `command:error` event
- Document state unchanged (no partial mutation)

### 22.3 Plugin Errors

- Plugin lỗi ở `install`/`initialize` → catch và report → builder continue ở degraded state
- Plugin error không được crash toàn bộ editor

### 22.4 Remote Component Errors

- Manifest fetch fail → show error state trong palette, retry available
- Bundle load fail → `RemoteComponentErrorPlaceholder` ở canvas
- Runtime render error của remote component → `ErrorPlaceholder`

---

## 23. Developer Experience Requirements

### 23.1 TypeScript

- Tất cả packages viết bằng TypeScript, ship full type declarations
- Public API surface được document bằng TSDoc comments
- Strict mode bắt buộc

### 23.2 Testing

- `builder-core` phải fully unit-testable không cần DOM
- Command system: given state + command → expected output state (pure function test)
- Migration engine: test coverage cho mọi registered migration
- Editor interactions (drag, drop, resize): synthetic events
- Snapshot tests cho rendering pipeline

### 23.3 Bundle

| Package            | Output           | Peer deps |
| ------------------ | ---------------- | --------- |
| `builder-core`     | ESM + CJS        | không có  |
| `builder-react`    | ESM only         | React ≥18 |
| `builder-editor`   | ESM + CSS bundle | React ≥18 |
| `builder-renderer` | ESM              | React ≥18 |

- `builder-renderer` phải installable độc lập, không kéo editor code
- Tree-shaking support cho tất cả packages

### 23.4 Development Mode Diagnostics

Ở development mode, builder log:

- Missing component registrations (node type không tìm thấy)
- Schema validation warnings
- Plugin dependency conflicts
- Slow renders (>16ms) với component name
- Attempted direct state mutation (bypass commands)
- Snap target calculation time nếu >8ms
- Remote component load failures

---

## 24. Non-Functional Requirements

### Performance Targets

| Metric                                       | Target                 |
| -------------------------------------------- | ---------------------- |
| Canvas FPS khi drag (200 nodes visible)      | 60 fps                 |
| Initial document parse + render (≤500 nodes) | <200ms                 |
| Remote component load không block canvas     | Required               |
| Undo/redo complete time                      | <1 render frame (16ms) |
| Property panel update khi select             | <32ms                  |
| Snap calculation per frame                   | <8ms                   |
| Canvas zoom/pan                              | 60fps                  |

### Scalability

- Document: up to 5,000 nodes
- Component registry: up to 500 types
- Concurrent plugins: up to 50
- History depth: configurable, default 100

### Maintainability

- Package boundaries enforced bằng lint rules (no cross-package imports ngoài defined contracts)
- All public APIs versioned với deprecation warnings trước khi remove
- Changelog maintained per package (CHANGELOG.md)
- Breaking changes phải major version bump

---

## 25. Module Requirements Summary

### builder-core phải implement

- Document management (`BuilderDocument`, `BuilderNode`, type definitions)
- Component registry
- Command engine với inverse-command support
- History stack
- Event bus
- Plugin engine với lifecycle management
- `BuilderState` manager
- Schema validator (PropSchema validation, document validation)
- Migration engine
- Responsive breakpoint config + style resolution

### builder-react phải provide

- React renderer tiêu thụ document nodes
- `BuilderContext` + `BuilderProvider`
- Hooks: `useBuilder`, `useNode`, `useNodeChildren`, `useSelection`, `useBreakpoint`, `useCommand`, `useHistory`
- Subscription bridge từ core event bus → React re-render cycle

### builder-editor phải implement

- Canvas component (zoom/pan/scroll, grid, ruler)
- Overlay layer (selection, hover, snap guides, helper lines)
- Drag-and-drop system với drop validation
- Multi-selection + rubber-band selection
- Resize system với aspect-ratio lock
- Snap & alignment engine
- Quick Action Toolbar
- Left Panel (Component Palette)
- Right Panel (Property Panel với dynamic tab/control generation)
- Top Toolbar (breakpoint, zoom, canvas config, shortcuts)
- Asset Picker
- Keyboard shortcut manager
- Import/Export UI

### builder-renderer phải implement

- Runtime document renderer
- Component resolution với fallback
- Prop + style resolution pipeline (base + responsive merge)
- Interaction binding + event delegation
- Performance-optimised render loop
- SSR-compatible rendering (server-side hydration)
- Lazy loading của component bundles

---

## 26. Expected Project Structure

```
builder/
├── builder-core/
│   ├── src/
│   │   ├── document/          # BuilderDocument, BuilderNode, types
│   │   ├── registry/          # ComponentDefinition registry
│   │   ├── commands/          # Command engine, built-in commands, inverses
│   │   ├── history/           # History stack
│   │   ├── events/            # Event bus
│   │   ├── plugins/           # Plugin engine, PluginAPI
│   │   ├── state/             # BuilderState, state manager
│   │   ├── validation/        # Schema validation, PropSchema validation
│   │   ├── migration/         # Migration engine, migration registry
│   │   └── responsive/        # Breakpoint config, style resolution
│   ├── tests/
│   └── package.json
│
├── builder-react/
│   ├── src/
│   │   ├── renderer/          # React component tree renderer
│   │   ├── hooks/             # useBuilder, useNode, useSelection, etc.
│   │   └── context/           # BuilderContext, BuilderProvider
│   ├── tests/
│   └── package.json
│
├── builder-editor/
│   ├── src/
│   │   ├── canvas/            # Canvas root, zoom/pan/scroll, grid, ruler
│   │   ├── overlay/           # SelectionOverlay, HoverOverlay, SnapOverlay, HelperLines
│   │   ├── dragdrop/          # DragOperation, drop validation, ghost element, drop indicator
│   │   ├── selection/         # SelectionManager, multi-select, rubber-band
│   │   ├── resize/            # ResizeOperation, handle rendering, aspect-ratio lock
│   │   ├── snap/              # SnapEngine, SnapTargetFactory, snap guide rendering
│   │   ├── toolbar/           # Top toolbar, breakpoint selector, canvas config controls
│   │   ├── quick-toolbar/     # QuickActionToolbar, positioning logic
│   │   ├── panels/
│   │   │   ├── left/          # ComponentPalette, search/filter, remote component status
│   │   │   ├── right/         # PropertyPanel, tab system, dynamic control generation
│   │   │   └── bottom/        # Optional bottom panel (layer tree, etc.)
│   │   ├── controls/          # Dynamic property controls (string, number, color, image, etc.)
│   │   ├── assets/            # AssetPicker, AssetProvider integration
│   │   ├── shortcuts/         # ShortcutManager, ShortcutDefinition registry
│   │   └── import-export/     # ImportModal, ExportModal
│   ├── styles/                # Editor CSS bundle
│   ├── tests/
│   └── package.json
│
└── builder-renderer/
    ├── src/
    │   ├── runtime/           # Runtime render loop, hydration, SSR
    │   ├── resolver/          # Component resolution, fallback logic
    │   ├── pipeline/          # Prop merge, style merge, interaction binding
    │   └── loader/            # Dynamic component loader, manifest fetcher, sandbox
    ├── tests/
    └── package.json
```

---

## 27. Integration Points

Các integration points này **nằm ngoài scope** của library nhưng contract được define ở đây để AI Agent biết dependency boundaries.

| Service                | Method                        | Contract                                                                                           |
| ---------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------- |
| Component Manifest API | `GET {manifestUrl}`           | Response: `ComponentManifest`                                                                      |
| Component Bundle CDN   | `GET {bundleUrl}`             | Response: ES module với default export `ComponentDefinition`                                       |
| Document Persistence   | Event-driven                  | Library emit `document:changed` với full `BuilderDocument` payload. Consumer tự lưu.               |
| Auth / Permissions     | Init config                   | Consumer pass `permissions` object khi khởi tạo builder. Library check trước khi execute commands. |
| Asset Upload Service   | Via `AssetProvider` interface | Consumer implement và register provider.                                                           |
| Analytics / Telemetry  | Event bus                     | Consumer subscribe events: `node:added`, `node:removed`, `component:loaded`, `command:executed`    |

### Permission Contract

```ts
interface BuilderPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAddComponents: boolean;
  canLoadRemoteComponents: boolean;
  canExport: boolean;
  canImport: boolean;
  allowedComponentTypes?: string[]; // undefined = all
  restrictedCommands?: string[]; // command types bị cấm
}
```

---

## Appendix A: Event Catalogue

Events được emit qua event bus (subscribable bởi plugin và consumer):

| Event                   | Payload                                | Khi nào                   |
| ----------------------- | -------------------------------------- | ------------------------- |
| `document:changed`      | `BuilderDocument`                      | Mỗi khi document thay đổi |
| `node:added`            | `{ node: BuilderNode }`                | Node được thêm            |
| `node:removed`          | `{ nodeId: string }`                   | Node bị xoá               |
| `node:moved`            | `{ nodeId, fromParentId, toParentId }` | Node di chuyển            |
| `node:updated`          | `{ nodeId, changes }`                  | Props/style cập nhật      |
| `selection:changed`     | `{ selectedIds: string[] }`            | Selection thay đổi        |
| `breakpoint:changed`    | `{ breakpoint: Breakpoint }`           | Switch breakpoint         |
| `command:executed`      | `{ command, result }`                  | Sau mỗi command           |
| `command:error`         | `{ command, error }`                   | Command fail              |
| `history:undo`          | `{ entry: HistoryEntry }`              | Sau undo                  |
| `history:redo`          | `{ entry: HistoryEntry }`              | Sau redo                  |
| `component:loaded`      | `{ type: string }`                     | Remote component loaded   |
| `component:error`       | `{ type: string, error }`              | Component render error    |
| `plugin:installed`      | `{ pluginId: string }`                 | Plugin install xong       |
| `plugin:error`          | `{ pluginId: string, error }`          | Plugin error              |
| `canvas:config-changed` | `{ config: CanvasConfig }`             | Canvas config thay đổi    |
| `drag:start`            | `{ operation: DragOperation }`         | Bắt đầu drag              |
| `drag:end`              | `{ operation: DragOperation, result }` | Kết thúc drag             |

---

## Appendix B: Placeholder Components

| Component type                    | Khi nào render                               |
| --------------------------------- | -------------------------------------------- |
| `UnknownComponentPlaceholder`     | Component type không tìm thấy trong registry |
| `RemoteComponentErrorPlaceholder` | Remote component load fail                   |
| `ErrorPlaceholder`                | Component render throw error                 |
| `EmptyContainerPlaceholder`       | Container không có children (editor only)    |
| `LoadingPlaceholder`              | Component đang load (remote)                 |

---

_Spec version: 2.1 | Cập nhật: bổ sung UI/UX requirements từ editor interface — Canvas System, Panel System, Quick Toolbar, Snap Engine, Selection System, Asset Management, Keyboard Shortcuts, Import/Export._

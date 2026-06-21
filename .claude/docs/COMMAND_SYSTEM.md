# Command System, State Management & History

Reference for command execution, state model, undo/redo mechanism, and schema versioning.

---

## Command Interface

```ts
interface Command<T = unknown> {
  type: string;
  payload: T;
  description?: string; // human-readable for history UI
  timestamp?: number;
  groupId?: string; // group commands into atomic transaction
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

---

## Built-in Commands

| Command              | Payload                                                      | Description              |
| -------------------- | ------------------------------------------------------------ | ------------------------ |
| `ADD_NODE`           | `{ parentId, componentType, props?, style?, position? }`     | Add new node             |
| `REMOVE_NODE`        | `{ nodeId }`                                                 | Delete node + descendants|
| `MOVE_NODE`          | `{ nodeId, targetParentId, position: 'before'\|'after'\|'inside'\|'slot', slotName?, insertIndex? }` | Move to different parent |
| `REORDER_NODE`       | `{ nodeId, insertIndex }`                                    | Reorder within parent    |
| `DUPLICATE_NODE`     | `{ nodeId, offset? }`                                        | Duplicate node           |
| `UPDATE_PROPS`       | `{ nodeId, props }`                                          | Update properties       |
| `UPDATE_STYLE`       | `{ nodeId, style, breakpoint? }`                             | Update styles           |
| `UPDATE_RESPONSIVE_STYLE` | `{ nodeId, breakpoint, style }`                        | Breakpoint-specific style|
| `UPDATE_INTERACTIONS`| `{ nodeId, interactions }`                                   | Update interactions     |
| `RENAME_NODE`        | `{ nodeId, name }`                                           | Rename node             |
| `LOCK_NODE`          | `{ nodeId }`                                                 | Lock node               |
| `UNLOCK_NODE`        | `{ nodeId }`                                                 | Unlock node             |
| `HIDE_NODE`          | `{ nodeId }`                                                 | Hide node               |
| `SHOW_NODE`          | `{ nodeId }`                                                 | Show node               |
| `GROUP_NODES`        | `{ nodeIds, containerType? }`                                | Group into container    |
| `UNGROUP_NODES`      | `{ nodeId }`                                                 | Ungroup container       |
| `SET_VARIABLE`       | `{ key, value }`                                             | Set document variable   |
| `UPDATE_CANVAS_CONFIG` | `{ config }`                                               | Update canvas settings  |
| `LOAD_COMPONENT`     | `{ manifestUrl, componentType }`                             | Load remote component   || `TOGGLE_RESPONSIVE_HIDDEN` | `{ nodeId, breakpoint }`                                           | Toggle hidden at breakpoint |
| `CREATE_POPUP`       | `{ popupId?, rootNodeId?, name, kind?, placement?, popup?, root? }` | Create popup + content root |
| `UPDATE_POPUP`       | `{ popupId, popup }`                                        | Update popup settings |
| `DELETE_POPUP`       | `{ popupId }`                                               | Delete popup + content subtree |
| `DUPLICATE_POPUP`    | `{ popupId, newPopupId?, newRootNodeId?, name? }`           | Duplicate popup + subtree |
| `ENABLE_POPUP`       | `{ popupId }`                                               | Enable popup |
| `DISABLE_POPUP`      | `{ popupId }`                                               | Disable popup |
| `ADD_POPUP_GOAL`     | `{ popupId, goalId?, goal? }`                               | V4 — add a conversion goal |
| `UPDATE_POPUP_GOAL`  | `{ popupId, goalId, goal }`                                 | V4 — edit a goal |
| `REMOVE_POPUP_GOAL`  | `{ popupId, goalId }`                                       | V4 — remove a goal |
| `ADD_POPUP_VARIANT`  | `{ popupId, variantId?, rootNodeId?, name?, weight?, cloneFromBase?, popupPatch? }` | V4 — add A/B variant (clones base content if `cloneFromBase`) |
| `UPDATE_POPUP_VARIANT` | `{ popupId, variantId, variant }`                        | V4 — edit a variant |
| `REMOVE_POPUP_VARIANT` | `{ popupId, variantId }`                                 | V4 — remove a variant (cascade-deletes its content root) |
| `UPDATE_POPUP_EXPERIMENT` | `{ popupId, experiment }`                             | V4 — update experiment/assignment config |
| `SET_ACTIVE_POPUP_VARIANT` | `{ popupId, variantId: string \| null }`             | V4 — edit a variant's content on canvas (no undo) |
| `ADD_POPUP_LOCALE`   | `{ popupId, locale, rootNodeId?, cloneFromBase?, popupPatch? }`    | V5 — add locale (clones base content if `cloneFromBase`) |
| `UPDATE_POPUP_LOCALE` | `{ popupId, locale, patch }`                                       | V5 — edit a locale entry |
| `REMOVE_POPUP_LOCALE` | `{ popupId, locale }`                                              | V5 — remove a locale (cascade-deletes its content root) |
| `UPDATE_POPUP_TARGETING` | `{ popupId, targeting: Partial<PopupTargeting> }`             | V5 — update targeting condition groups |
| `UPDATE_POPUP_SCHEDULE` | `{ popupId, schedule: Partial<PopupSchedule> }`                | V5 — update scheduling config |
| `UPDATE_POPUP_FREQUENCY` | `{ popupId, frequency: Partial<PopupFrequencyConfig> }`       | V5 — update frequency cap config |
| `SET_ACTIVE_POPUP_LOCALE` | `{ popupId, locale: string \| null }`                        | V5 — edit a locale's content on canvas (no undo) |
| `UPDATE_RESPONSIVE_PROPS` | `{ nodeId, breakpoint, props }`                                     | Breakpoint-specific props override |
| `RESET_RESPONSIVE_STYLE` | `{ nodeId, breakpoint }`                                             | Clear all breakpoint style overrides |
| `ENTER_TEXT_EDIT`    | `{ nodeId }`                                                                 | Enter inline text edit mode (no undo) |
| `EXIT_TEXT_EDIT`     | `{ nodeId }`                                                                 | Exit inline text edit mode (no undo) |
| `SET_CANVAS_MODE`    | `{ mode }`                                                                   | Set canvas edit mode (no undo) |
| `SET_ACTIVE_POPUP`   | `{ popupId: string \| null }`                                                 | Enter/exit popup edit layer (no undo) |
| `SET_ACTIVE_POPUP_SELECTION` | `{ selection: "shell" \| "content" \| null }`                         | Select popup shell vs content editing target (no undo) |
| `SELECT_NODE`        | `{ nodeId, multi? }`                                                         | Select node (editor-only, no undo) |
| `DESELECT_NODE`      | `{ nodeId }`                                                                 | Deselect node (editor-only, no undo) |
| `CLEAR_SELECTION`    | `{}`                                                                         | Clear all selection (editor-only, no undo) |
| `SET_CLIPBOARD`      | `{ data }`                                                                   | Set clipboard data (editor-only, no undo) |
| `COMPONENT_RENDER_ERROR` | `{ nodeId, error }`                                                      | Record render error (no undo) |
---

## State Model

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

**State Management Rules:**

- All state changes flow through Command system
- Direct state mutation is forbidden (enforced in dev mode)
- State is immutable — each command produces new state object
- Subscriptions trigger re-renders only on affected subtrees

**Popup runtime note:** opening or closing a popup in production runtime is local
runtime UI state, not a document mutation and not an undoable command. Creating,
editing, enabling, disabling, duplicating, and deleting popup definitions in the
editor must still go through the command engine.

---

## History System

Command-based undo/redo:

```ts
interface HistoryEntry {
  id: string;
  command: Command;
  inverseCommand: Command; // precomputed at execution
  timestamp: number;
  groupId?: string; // entries with same groupId undo/redo together
  description: string; // label shown in history panel
}

interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  maxSize: number; // default 100
}
```

**Requirements:**

- Undo/redo must be atomic with grouped commands
- History must be serializable (JSON-safe) for session save/restore
- Plugin commands must provide inverse command when registering
- History panel displays description of each entry
- Selective undo (undo specific entry) is optional/future feature

---

## Schema Versioning & Migration

Each `BuilderDocument` declares `schemaVersion` (semver). Library declares `CURRENT_SCHEMA_VERSION`. Load: compare → migrate if needed.

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

Current `CURRENT_SCHEMA_VERSION` is `2.6.0`. Consumer-registered popup
migrations: `popupV3Migration` (`2.3.0 → 2.4.0`, fills behavior defaults),
`popupV4Migration` (`2.4.0 → 2.5.0`, additive — goals/variants/experiment), and
`popupV5Migration` (`2.5.0 → 2.6.0`, additive — locales/targeting/scheduling/
frequency are all optional, so it only bumps the version).

**Migration Contracts:**

- Migrations are pure functions (no side effects)
- Engine applies migrations in chain: v1 → v2 → v3
- Unknown fields preserved in `legacyData`
- Breaking changes = major version bump + migration function required

---

## Backward Compatibility Policy

- Documents from any prior version must be renderable after migration
- Migrations never silently drop data
- `legacyData` map preserves unrecognized fields
- Schema version bumps follow semantic versioning strictly

---

_For command execution flow, see `EDITOR_UI.md` (Canvas section)._
_For event emission after commands, see `INTEGRATION.md`._

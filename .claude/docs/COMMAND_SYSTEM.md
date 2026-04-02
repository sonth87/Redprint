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
| `MOVE_NODE`          | `{ nodeId, targetParentId, position, insertIndex? }`         | Move to different parent |
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
| `LOAD_COMPONENT`     | `{ manifestUrl, componentType }`                             | Load remote component   |

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

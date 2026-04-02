# Integration Points & Event API

Reference for external service contracts, event catalogue, and system boundaries.

---

## Integration Points

These integration points lie **outside library scope** but contracts are defined for AI Agents to understand dependency boundaries.

### External Services

| Service                  | Method                         | Contract                                                                  |
| ------------------------ | ------------------------------ | -------------------------------------------------------------------------- |
| Component Manifest API   | `GET {manifestUrl}`            | Response: `ComponentManifest`                                              |
| Component Bundle CDN     | `GET {bundleUrl}`              | Response: ES module with default export `ComponentDefinition`              |
| Document Persistence    | Event-driven                   | Emit `document:changed` with full `BuilderDocument`. Consumer saves.       |
| Auth / Permissions       | Init config                    | Consumer pass `permissions` object at init. Library checks before execute. |
| Asset Upload Service     | Via `AssetProvider` interface  | Consumer implements and registers provider.                                |
| Analytics / Telemetry   | Event bus                      | Consumer subscribes: `node:added`, `command:executed`, etc.                |

### Permission Contract

Applied at command level before execution:

```ts
interface BuilderPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAddComponents: boolean;
  canLoadRemoteComponents: boolean;
  canExport: boolean;
  canImport: boolean;
  allowedComponentTypes?: string[]; // undefined = all
  restrictedCommands?: string[]; // command types forbidden
}
```

### Document Persistence Pattern

```ts
// Consumer implementation
builder.on("document:changed", (doc: BuilderDocument) => {
  // Save to database, file system, or API
  await api.saveDocument(doc);
  
  // Update UI state
  setIsSaving(false);
  showNotification("Document saved");
});
```

### Asset Provider Implementation

```ts
class AWSAssetProvider implements AssetProvider {
  id = "aws-s3";
  name = "AWS S3";
  supportedTypes = ["image", "video"];
  
  async listAssets(query: AssetQuery) {
    // Call AWS API, filter according to query
  }
  
  async upload(file: File) {
    // Upload to S3
    // Return signed URL
    return { id: uuid(), url: signedUrl, ... };
  }
}

// Register at builder init
builder.registerPlugin(
  new AssetProviderPlugin(new AWSAssetProvider())
);
```

---

## Event Catalogue

Events are emitted via event bus (subscribable by plugins and consumer).

### Document Events

| Event                   | Payload                                | Triggered When                   |
| ----------------------- | -------------------------------------- | -------------------------------- |
| `document:changed`      | `BuilderDocument`                      | Any document mutation            |
| `document:loaded`       | `{ document: BuilderDocument }`        | Document loaded/imported         |
| `document:saved`        | `{ id: string; timestamp: string }`    | Document persisted (consumer)    |

### Node Events

| Event                   | Payload                                | Triggered When              |
| ----------------------- | -------------------------------------- | --------------------------- |
| `node:added`            | `{ node: BuilderNode }`                | Node created                |
| `node:removed`          | `{ nodeId: string }`                   | Node deleted                |
| `node:moved`            | `{ nodeId, fromParentId, toParentId }` | Node parent changed         |
| `node:updated`          | `{ nodeId, changes }`                  | Props/style updated         |
| `node:selected`         | `{ nodeId: string }`                   | Node selected               |
| `node:deselected`       | `{ nodeId: string }`                   | Node deselected             |

### Selection & Interaction Events

| Event                   | Payload                                | Triggered When                |
| ----------------------- | -------------------------------------- | ----------------------------- |
| `selection:changed`     | `{ selectedIds: string[] }`            | Selection modified            |
| `breakpoint:changed`    | `{ breakpoint: Breakpoint }`           | Switch responsive breakpoint  |
| `drag:start`            | `{ operation: DragOperation }`         | Begin drag                    |
| `drag:end`              | `{ operation: DragOperation; result }` | Complete drag                 |
| `resize:start`          | `{ operation: ResizeOperation }`       | Begin resize                  |
| `resize:end`            | `{ operation: ResizeOperation }`       | Complete resize               |

### Command & History Events

| Event                   | Payload                            | Triggered When         |
| ----------------------- | ---------------------------------- | ---------------------- |
| `command:executed`      | `{ command, result }`              | After command handled  |
| `command:error`         | `{ command, error }`               | Command failed         |
| `history:undo`          | `{ entry: HistoryEntry }`          | After undo             |
| `history:redo`          | `{ entry: HistoryEntry }`          | After redo             |

### Component & Plugin Events

| Event                   | Payload                            | Triggered When                    |
| ----------------------- | ---------------------------------- | --------------------------------- |
| `component:loaded`      | `{ type: string }`                 | Remote component loaded           |
| `component:render-error`| `{ type, error, nodeId }`          | Component render threw            |
| `component:unloaded`    | `{ type: string }`                 | Component unregistered            |
| `plugin:installed`      | `{ pluginId: string }`             | Plugin install completed          |
| `plugin:error`          | `{ pluginId: string; error }`      | Plugin error occurred             |

### Canvas & Viewport Events

| Event                   | Payload                            | Triggered When                |
| ----------------------- | ---------------------------------- | ----------------------------- |
| `canvas:config-changed` | `{ config: CanvasConfig }`         | Canvas settings updated       |
| `viewport:zoomed`       | `{ zoom: number }`                 | Zoom level changed            |
| `viewport:panned`       | `{ offset: Point }`                | Pan offset changed            |

### UI State Events

| Event                   | Payload                                          | Triggered When                    |
| ----------------------- | ---------------------------------------------- | --------------------------------- |
| `panel:opened`          | `{ panelId: string }`                           | Panel toggled visible             |
| `panel:closed`          | `{ panelId: string }`                           | Panel toggled hidden              |
| `notification:show`     | `{ type, message, duration }`                  | Notification displayed            |
| `error:boundary`        | `{ category, message, context }`               | Error caught at boundary          |

---

## Performance Targets

Expected performance metrics:

| Metric                                       | Target                |
| -------------------------------------------- | --------------------- |
| Canvas FPS during drag (200 nodes visible)   | 60 fps                |
| Initial document parse (≤500 nodes)          | <200ms                |
| Remote component load (non-blocking canvas)  | Required              |
| Undo/redo complete time                      | <1 frame (16ms)       |
| Property panel update on select              | <32ms                 |
| Snap calculation per frame                   | <8ms                  |
| Canvas zoom/pan interactions                 | 60fps                 |

---

## Scalability Limits

Tested and recommended limits:

| Resource                | Limit          | Notes                        |
| ----------------------- | -------------- | ---------------------------- |
| Document nodes          | 5,000          | 200 visible in viewport      |
| Component registry      | 500 types      | With remote components       |
| Concurrent plugins      | 50             | Before engine bottleneck     |
| History depth           | Configurable   | Default 100 entries          |
| Breakpoints per doc     | 20             | Practical limit for UI       |
| Nested container depth  | Unlimited      | No DOM nesting limit in React |

---

## Module Requirements Summary

| Module            | Must Implement                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------- |
| `builder-core`    | Document model, registry, commands + inverse, history, event bus, plugin engine, validation      |
| `builder-react`   | React renderer, hooks, context, subscription bridge                                              |
| `builder-editor`  | Canvas, panels, toolbar, drag-drop, selection, resize, snap, keyboard shortcuts, import/export  |
| `builder-renderer`| Runtime rendering, component resolution, style/prop merge, interaction binding, lazy loading     |

---

## Expected Project Structure

```
.claude/docs/
├── SPECIFICATION.md       ← Architecture, principles, design system
├── DATA_MODEL.md          ← BuilderDocument, BuilderNode, types
├── COMMAND_SYSTEM.md      ← Commands, state, history, versioning
├── EDITOR_UI.md           ← Canvas, panels, selection, snap, shortcuts
├── RUNTIME.md             ← Rendering, loading, assets, import/export
├── PLUGINS.md             ← Plugin API, lifecycle, patterns
├── ACCESSIBILITY.md       ← A11y, error handling
└── INTEGRATION.md         ← This file — integration points, events

packages/builder-core/docs/
└── API.md                 ← Deep-dive API reference

packages/builder-editor/docs/
├── CANVAS_INTERNALS.md    ← Canvas implementation details
├── PANEL_ARCHITECTURE.md  ← Panel system internals
└── DRAG_DROP.md           ← Drag-drop state machine

packages/builder-renderer/docs/
└── RENDERING_PIPELINE.md  ← Runtime rendering architecture
```

---

_View [SPECIFICATION.md](./SPECIFICATION.md) for project overview and architecture._
_View [DATA_MODEL.md](./DATA_MODEL.md) for complete type definitions._
_View [COMMAND_SYSTEM.md](./COMMAND_SYSTEM.md) for state management patterns._
_View [EDITOR_UI.md](./EDITOR_UI.md) for editor interface reference._
_View [RUNTIME.md](./RUNTIME.md) for rendering and asset systems._
_View [PLUGINS.md](./PLUGINS.md) for extension mechanisms._
_View [ACCESSIBILITY.md](./ACCESSIBILITY.md) for a11y and error handling._

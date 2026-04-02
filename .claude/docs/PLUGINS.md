# Plugin System & Extension API

Complete reference for plugin architecture, lifecycle, API surface, and best practices.

---

## Plugin Interface

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
```

---

## PluginAPI Surface

### Component Registration

```ts
// Register/unregister components
registerComponent(def: ComponentDefinition): void;
unregisterComponent(type: string): void;
```

### Command Registration

```ts
registerCommand(
  type: string,
  handler: CommandHandler,
  inverseHandler: InverseCommandHandler,
  description?: string,
): void;
```

### Editor Extensions

```ts
// Panels and tabs
registerEditorPanel(panel: EditorPanel): void;
registerPropertyTab(tab: PropertyPanelTab): void;
registerPropertyControl(type: string, control: PropertyControl): void;

// Quick actions and toolbar
registerQuickAction(componentType: string | "*", action: QuickAction): void;
registerToolbarItem(item: ToolbarItem): void;
```

### Layout & Snap

```ts
registerLayoutRule(rule: LayoutRule): void;
registerSnapTarget(factory: SnapTargetFactory): void;
```

### Events

```ts
on(event: string, handler: EventHandler): Unsubscribe;
emit(event: string, payload?: unknown): void;
```

### State Access (Read-only)

```ts
getDocument(): Readonly<BuilderDocument>;
getState(): Readonly<BuilderState>;
getSelectedNodes(): Readonly<BuilderNode[]>;
```

### Command Dispatch

```ts
dispatch(command: Command): Promise<CommandResult>;
```

### Assets & Shortcuts

```ts
registerAssetProvider(provider: AssetProvider): void;
registerShortcut(shortcut: ShortcutDefinition): void;
```

### Diagnostics

```ts
log(level: "info" | "warn" | "error", message: string, data?: unknown): void;
```

---

## Plugin Lifecycle Rules

1. **Install:** Must complete before any builder operation
   - Plugin fail at `install` → rollback all registrations
   - Cannot access `getState()` or subscription at this stage

2. **Initialize:** Optional, called after all plugins installed
   - Perform setup that depends on other plugins
   - Can subscribe to events, access state

3. **Destroy:** Called when plugin unloaded or builder destroyed
   - Must be idempotent
   - Clean up listeners, timers, resources
   - No state mutation allowed

**Access Restrictions:**

- Plugins cannot access internal state beyond `PluginAPI`
- Plugins cannot depend on other plugins' internal implementations
- Plugin errors don't crash builder (catch at engine level)

---

## Plugin Dependencies

Declare dependencies on other plugins:

```ts
interface BuilderPlugin {
  dependencies?: {
    "plugin-analytics": "^1.0.0",
    "plugin-cloud-storage": "^2.1.0"
  }
}
```

Engine resolves dependency graph:
- Validates all dependencies satisfy requirements
- Installs in dependency order
- Surface conflicts as fatal errors

---

## Common Plugin Patterns

### Custom Component Plugin

```ts
export const MyCustomComponent: BuilderPlugin = {
  id: "plugin-custom-component",
  name: "Custom Component",
  version: "1.0.0",
  
  install(api) {
    api.registerComponent({
      type: "my-custom-button",
      name: "Custom Button",
      category: "Buttons",
      // ... full ComponentDefinition
    });
  },
};
```

### Command Plugin

```ts
export const MyCommandPlugin: BuilderPlugin = {
  id: "plugin-custom-command",
  version: "1.0.0",
  
  install(api) {
    api.registerCommand(
      "APPLY_THEME",
      (state, payload) => ({ ...state, /* apply theme */ }),
      (state, payload) => ({ ...state, /* reverse */ }),
      "Apply design theme",
    );
  },
};
```

### Asset Provider Plugin

```ts
export const CloudStoragePlugin: BuilderPlugin = {
  id: "plugin-cloud-storage",
  version: "1.0.0",
  
  install(api) {
    api.registerAssetProvider({
      id: "cloud-storage",
      name: "Cloud Storage",
      supportedTypes: ["image", "video"],
      async listAssets(query) {
        // fetch from API
      },
      async upload(file) {
        // upload to service
      },
    });
  },
};
```

### Editor Extension Plugin

```ts
export const AnalyticsPlugin: BuilderPlugin = {
  id: "plugin-analytics",
  version: "1.0.0",
  
  install(api) {
    // Add analytics tab to property panel
    api.registerPropertyTab({
      id: "analytics",
      label: "Analytics",
      render: (ctx) => <AnalyticsPanel />,
    });
    
    // Track events
    api.on("command:executed", (event) => {
      trackEvent("command", event.command.type);
    });
  },
};
```

---

## Plugin Error Handling

**Installation Error:**

```
PluginA install fails
→ Rollback all PluginA registrations
→ Continue loading remaining plugins
→ Emit plugin:error event
→ Builder runs in degraded state
```

**Runtime Error:**

```
PluginA event handler throws
→ Catch error
→ Log to diagnostic
→ Continue (don't crash editor)
→ Emit plugin:error event
```

Graceful degradation is critical — plugin bugs must never kill the builder.

---

## Plugin Security

- Plugins execute in browser context (no sandbox)
- Plugins can access DOM, network, storage
- Validation responsibility on plugin consumer
- Use CSP (Content Security Policy) at application level if needed
- Integrity verification via manifest hash (future enhancement)

---

_For PluginAPI event contracts, see `INTEGRATION.md`._
_For component definition schema, see `DATA_MODEL.md`._
_For editor panel UI, see `EDITOR_UI.md`._

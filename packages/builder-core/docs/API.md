# Builder Core API Reference

Deep-dive reference for `builder-core` package APIs, types, and usage patterns.

> **Overview:** See [.claude/docs/COMMAND_SYSTEM.md](../../../.claude/docs/COMMAND_SYSTEM.md) for command patterns and the state model. This file covers implementation-level API details.

---

## Public API Surface

### BuilderAPI

Main entry point for all builder operations.

```ts
interface BuilderAPI {
  // Document access
  getDocument(): BuilderDocument;
  loadDocument(schema: BuilderDocument): void;

  // Component registry
  registerComponent(def: ComponentDefinition): void;
  unregisterComponent(type: string): void;
  getComponent(type: string): ComponentDefinition | undefined;
  listComponents(filter?: ComponentFilter): ComponentDefinition[];

  // Command execution
  dispatch(command: Command): Promise<CommandResult>;

  // History navigation
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;

  // Plugin management
  installPlugin(plugin: BuilderPlugin): Promise<void>;
  uninstallPlugin(pluginId: string): Promise<void>;

  // Event subscription
  on(event: string, handler: EventHandler): Unsubscribe;
  off(event: string, handler: EventHandler): void;
  emit(event: string, payload?: unknown): void;

  // State access (read-only)
  getState(): Readonly<BuilderState>;
}
```

---

## Command Engine

Command execution and inverse command pattern implementation.

```ts
interface CommandEngine {
  execute(command: Command): Promise<CommandResult>;
  getHistory(): Readonly<HistoryState>;
}
```

---

## Registry System

Component registration and lookup.

```ts
interface ComponentRegistry {
  register(def: ComponentDefinition): void;
  unregister(type: string): void;
  get(type: string): ComponentDefinition | undefined;
  list(filter?: ComponentFilter): ComponentDefinition[];
  has(type: string): boolean;
}
```

---

## Event Bus

Event emission and subscription system.

```ts
interface EventBus {
  on(event: string, handler: EventHandler): Unsubscribe;
  off(event: string, handler: EventHandler): void;
  once(event: string, handler: EventHandler): Unsubscribe;
  emit(event: string, payload?: unknown): void;
}
```

---

## Type Exports

All public types are exported from `@ui-builder/builder-core`:

```ts
export {
  BuilderDocument,
  BuilderNode,
  ComponentDefinition,
  ComponentCapabilities,
  PropSchema,
  StyleConfig,
  InteractionConfig,
  Command,
  BuilderState,
  HistoryEntry,
  BuilderPlugin,
  PluginAPI,
  // ... and ~50 more types
}
```

---

_For detailed schema specifications, see [.claude/docs/DATA_MODEL.md](../../../.claude/docs/DATA_MODEL.md)._
_For command patterns, see [.claude/docs/COMMAND_SYSTEM.md](../../../.claude/docs/COMMAND_SYSTEM.md)._
_For plugin development, see [.claude/docs/PLUGINS.md](../../../.claude/docs/PLUGINS.md)._

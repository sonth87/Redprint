import type { BuilderState } from "./state/types";
import type { BuilderConfig, BuilderAPI as IBuilderAPI } from "./BuilderAPI";
import type { Command, CommandResult } from "./commands/types";
import type { BuilderPlugin } from "./plugins/types";
import { EventBus } from "./events/EventBus";
import { ComponentRegistry } from "./registry/ComponentRegistry";
import { CommandEngine } from "./commands/CommandEngine";
import { HistoryStack } from "./history/HistoryStack";
import { PluginEngine } from "./plugins/PluginEngine";
import { MigrationEngine } from "./migration/MigrationEngine";
import { registerAllHandlers } from "./commands/handlers";
import { DEFAULT_BREAKPOINTS } from "./responsive/constants";
import { CURRENT_SCHEMA_VERSION } from "./document/constants";
import { v4 as uuidv4 } from "uuid";

/**
 * Factory function — creates and initialises a builder instance.
 *
 * @param config - Optional configuration overrides
 * @returns A fully initialised BuilderAPI instance
 *
 * @example
 * const builder = createBuilder({
 *   document: { name: 'My Page' },
 *   permissions: { canEdit: true },
 * });
 * builder.dispatch({ type: 'ADD_NODE', payload: { parentId: 'root', componentType: 'text' } });
 */
export function createBuilder(config: BuilderConfig = {}): IBuilderAPI {
  const eventBus = new EventBus();
  const registry = new ComponentRegistry();
  const historyStack = new HistoryStack(config.historyMaxSize ?? 100);
  const migrationEngine = new MigrationEngine();

  // Build initial state
  const rootNodeId = uuidv4();
  const now = new Date().toISOString();

  const initialDocument = {
    id: uuidv4(),
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: now,
    updatedAt: now,
    name: config.document?.name ?? "Untitled",
    description: config.document?.description,
    nodes: {
      [rootNodeId]: {
        id: rootNodeId,
        type: "root",
        parentId: null,
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        metadata: { createdAt: now, updatedAt: now },
      },
    },
    rootNodeId,
    breakpoints: DEFAULT_BREAKPOINTS,
    variables: {},
    assets: { version: "1.0", assets: [] },
    plugins: [],
    canvasConfig: {
      showGrid: true,
      gridSize: 8,
      snapEnabled: true,
      snapThreshold: 6,
      snapToGrid: true,
      snapToComponents: true,
      rulerEnabled: true,
      showHelperLines: true,
    },
    metadata: {},
    ...config.document,
  };

  const initialState: BuilderState = {
    document: initialDocument as BuilderState["document"],
    editor: {
      selectedNodeIds: [],
      hoveredNodeId: null,
      activeBreakpoint: "desktop",
      activeTool: "select",
      zoom: 1,
      panOffset: { x: 0, y: 0 },
      clipboard: null,
      canvasMode: "single",
    },
    interaction: {
      dragOperation: null,
      resizeOperation: null,
      isMultiSelecting: false,
      multiSelectRect: null,
    },
    ui: {
      panels: {
        leftPanel: { visible: true, width: 260, activeTab: "components" },
        rightPanel: { visible: true, width: 300, activeTab: "properties" },
        bottomPanel: { visible: false, height: 200 },
        topToolbar: { visible: true },
      },
      quickToolbar: { visible: false, targetNodeId: null, position: { x: 0, y: 0 } },
      notifications: [],
    },
  };

  const commandEngine = new CommandEngine(
    initialState,
    eventBus,
    historyStack,
    config.permissions?.restrictedCommands ?? [],
  );

  // Register all built-in command handlers (critical — must happen before any dispatch)
  registerAllHandlers(commandEngine, registry, eventBus);

  // Build the PluginAPI implementation
  const pluginStorageMap = new Map<string, Map<string, unknown>>();
  const assetProviders: import("./document/assets").AssetProvider[] = [];

  const pluginAPI: import("./plugins/types").PluginAPI = {
    getState: () => commandEngine.getState(),
    dispatch: (cmd) => commandEngine.dispatch(cmd),
    registerComponent: (def) => registry.registerComponent(def),
    unregisterComponent: (type) => registry.unregisterComponent(type),
    on: (event, handler) => eventBus.on(event, handler),
    emit: (event, payload) => eventBus.emit(event, payload),
    registerAssetProvider: (provider) => assetProviders.push(provider),
    registerMigration: (migration) => migrationEngine.register(migration),
    getPluginData: (pluginId, key) => pluginStorageMap.get(pluginId)?.get(key),
    setPluginData: (pluginId, key, value) => {
      if (!pluginStorageMap.has(pluginId)) {
        pluginStorageMap.set(pluginId, new Map());
      }
      pluginStorageMap.get(pluginId)!.set(key, value);
    },
  };

  const pluginEngine = new PluginEngine(pluginAPI);

  // Install initial plugins
  const initialPlugins = config.plugins ?? [];
  for (const plugin of initialPlugins) {
    pluginEngine.install(plugin);
  }

  // Initialise async (fire-and-forget — errors are isolated per plugin)
  pluginEngine.initializeAll().catch((_err) => {
    // errors isolated per plugin; no console in framework-agnostic core
  });

  // State subscribers — notified on every successful command execution
  const stateListeners = new Set<(state: BuilderState) => void>();

  // Internal bridge: command:executed → stateListeners
  // Extracted so `subscribe()` can re-establish it after a destroy() + re-use
  // cycle (happens during React 18 StrictMode's double-mount in dev).
  const bridgeHandler = () => {
    const state = commandEngine.getState();
    for (const listener of stateListeners) {
      listener(state);
    }
  };

  const ensureBridge = () => {
    if (eventBus.listenerCount("command:executed") === 0) {
      eventBus.on("command:executed", bridgeHandler);
    }
  };

  // Register the initial bridge
  ensureBridge();

  return {
    getState: () => commandEngine.getState(),
    dispatch: (command: Command): CommandResult => commandEngine.dispatch(command),
    undo: () => commandEngine.undo(),
    redo: () => commandEngine.redo(),
    get canUndo() { return historyStack.canUndo; },
    get canRedo() { return historyStack.canRedo; },
    registry,
    eventBus,
    subscribe: (listener: (state: BuilderState) => void) => {
      stateListeners.add(listener);
      // Re-establish the internal bridge if it was destroyed
      ensureBridge();
      return () => {
        stateListeners.delete(listener);
      };
    },
    use: (plugin: BuilderPlugin) => {
      pluginEngine.install(plugin);
    },
    destroy: () => {
      pluginEngine.destroyAll();
      eventBus.off();
      stateListeners.clear();
    },
  };
}

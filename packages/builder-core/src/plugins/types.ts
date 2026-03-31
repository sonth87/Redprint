/**
 * Plugin system type contracts.
 */

import type { BuilderState } from "../state/types";
import type { Command, CommandResult } from "../commands/types";
import type { ComponentDefinition } from "../registry/types";
import type { BuilderEventType, BuilderEventMap, Unsubscribe } from "../events/types";
import type { AssetProvider } from "../document/assets";
import type { SchemaMigration } from "../migration/types";

// ── PluginAPI ──────────────────────────────────────────────────────────────

export interface PluginAPI {
  // State
  getState(): BuilderState;
  dispatch(command: Command): CommandResult;

  // Component registration
  registerComponent(definition: ComponentDefinition): void;
  unregisterComponent(type: string): boolean;

  // Event bus
  on<K extends BuilderEventType>(event: K, handler: (payload: BuilderEventMap[K]) => void): Unsubscribe;
  emit<K extends BuilderEventType>(event: K, payload: BuilderEventMap[K]): void;

  // Asset providers
  registerAssetProvider(provider: AssetProvider): void;

  // Schema migration
  registerMigration(migration: SchemaMigration): void;

  // Plugin metadata
  getPluginData(pluginId: string, key: string): unknown;
  setPluginData(pluginId: string, key: string, value: unknown): void;
}

// ── BuilderPlugin ──────────────────────────────────────────────────────────

export interface BuilderPlugin {
  id: string;
  name: string;
  version: string;
  /** Optional list of other plugin IDs this plugin requires */
  requires?: string[];

  /**
   * Install phase — called synchronously when plugin is registered.
   * Register commands, component definitions here.
   * @param api - Full plugin API access
   */
  install(api: PluginAPI): void;

  /**
   * Initialize phase — called after all plugins are installed.
   * Perform setup that depends on other plugins.
   * @param api - Full plugin API access
   */
  initialize?(api: PluginAPI): void | Promise<void>;

  /**
   * Destroy phase — called on plugin removal or builder teardown.
   * Cleanup subscriptions, timers, resources.
   * @param api - Full plugin API access
   */
  destroy?(api: PluginAPI): void;
}

import type { BuilderPlugin, PluginAPI } from "./types";

/**
 * PluginEngine — manages plugin installation, initialization, and teardown.
 *
 * Fail-safe: plugin errors during install/initialize are caught and reported,
 * but do NOT crash the builder. The plugin is marked as failed and skipped.
 *
 * @example
 * const engine = new PluginEngine(pluginAPI);
 * engine.install(myPlugin);
 * await engine.initializeAll();
 */
export class PluginEngine {
  private readonly plugins = new Map<string, BuilderPlugin>();
  private readonly failedPlugins = new Map<string, unknown>();
  private readonly api: PluginAPI;

  constructor(api: PluginAPI) {
    this.api = api;
  }

  /**
   * Install a plugin. Checks dependency requirements before installing.
   *
   * @param plugin - The plugin to install
   * @returns true if installed successfully, false if failed
   */
  install(plugin: BuilderPlugin): boolean {
    if (this.plugins.has(plugin.id)) {
      console.warn(`[PluginEngine] Plugin "${plugin.id}" is already installed`);
      return false;
    }

    // Check required plugins
    if (plugin.requires?.length) {
      for (const dep of plugin.requires) {
        if (!this.plugins.has(dep)) {
          const error = `Plugin "${plugin.id}" requires "${dep}" which is not installed`;
          console.error(`[PluginEngine] ${error}`);
          this.failedPlugins.set(plugin.id, new Error(error));
          return false;
        }
      }
    }

    try {
      plugin.install(this.api);
      this.plugins.set(plugin.id, plugin);
      this.api.emit("plugin:installed", { pluginId: plugin.id });
      return true;
    } catch (err) {
      this.failedPlugins.set(plugin.id, err);
      this.api.emit("plugin:error", { pluginId: plugin.id, error: err });
      console.error(`[PluginEngine] Error during plugin.install() for "${plugin.id}":`, err);
      return false;
    }
  }

  /**
   * Initialize all successfully installed plugins.
   * Called after all plugins have been installed.
   */
  async initializeAll(): Promise<void> {
    for (const plugin of this.plugins.values()) {
      if (!plugin.initialize) continue;
      try {
        await plugin.initialize(this.api);
      } catch (err) {
        this.failedPlugins.set(plugin.id, err);
        this.plugins.delete(plugin.id);
        this.api.emit("plugin:error", { pluginId: plugin.id, error: err });
        console.error(
          `[PluginEngine] Error during plugin.initialize() for "${plugin.id}":`,
          err,
        );
      }
    }
  }

  /**
   * Uninstall a plugin by ID.
   *
   * @param pluginId - The plugin ID to uninstall
   */
  uninstall(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;

    try {
      plugin.destroy?.(this.api);
    } catch (err) {
      console.error(`[PluginEngine] Error during plugin.destroy() for "${pluginId}":`, err);
    }

    this.plugins.delete(pluginId);
  }

  /**
   * Destroy all installed plugins. Called on builder teardown.
   */
  destroyAll(): void {
    for (const pluginId of this.plugins.keys()) {
      this.uninstall(pluginId);
    }
  }

  /**
   * Returns true if the given plugin ID is installed and operational.
   */
  isInstalled(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Returns a list of installed plugin IDs.
   */
  listPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }
}

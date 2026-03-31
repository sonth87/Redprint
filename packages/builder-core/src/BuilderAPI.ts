import type { BuilderState } from "./state/types";
import type { BuilderDocument } from "./document/types";
import type { Command, CommandResult } from "./commands/types";
import type { BuilderPlugin } from "./plugins/types";
import type { ComponentRegistry } from "./registry/ComponentRegistry";
import type { EventBus } from "./events/EventBus";


/**
 * Top-level builder configuration passed to createBuilder().
 */
export interface BuilderPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canAddComponents: boolean;
  canLoadRemoteComponents: boolean;
  canExport: boolean;
  canImport: boolean;
  allowedComponentTypes?: string[];
  restrictedCommands?: string[];
}

export interface BuilderConfig {
  document?: Partial<BuilderDocument>;
  permissions?: Partial<BuilderPermissions>;
  plugins?: BuilderPlugin[];
  historyMaxSize?: number;
}

export interface BuilderAPI {
  // State
  getState(): BuilderState;
  dispatch(command: Command): CommandResult;
  undo(): CommandResult;
  redo(): CommandResult;

  // Subscription
  subscribe(listener: (state: BuilderState) => void): () => void;

  // Core instances
  registry: ComponentRegistry;
  eventBus: EventBus;

  // Plugins
  use(plugin: BuilderPlugin): void;

  // Teardown
  destroy(): void;
}

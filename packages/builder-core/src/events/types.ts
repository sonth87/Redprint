/**
 * Event bus type contracts.
 */

import type { BuilderDocument, BuilderNode, CanvasConfig } from "../document/types";
import type { Breakpoint } from "../responsive/types";
import type { Command, CommandResult } from "../commands/types";
import type { HistoryEntry } from "../history/types";
import type { DragOperation } from "../state/types";

/**
 * Typed event catalogue — all events emittable through the EventBus.
 * Plugins and consumer applications subscribe to these events.
 */
export interface BuilderEventMap {
  "document:changed": BuilderDocument;
  "node:added": { node: BuilderNode };
  "node:removed": { nodeId: string };
  "node:moved": { nodeId: string; fromParentId: string | null; toParentId: string | null };
  "node:updated": { nodeId: string; changes: Partial<BuilderNode> };
  "selection:changed": { selectedIds: string[] };
  "breakpoint:changed": { breakpoint: Breakpoint };
  "command:executed": { command: Command; result: CommandResult };
  "command:error": { command: Command; error: string };
  "history:undo": { entry: HistoryEntry };
  "history:redo": { entry: HistoryEntry };
  "component:loaded": { type: string };
  "component:error": { type: string; error: unknown };
  "component:render-error": { nodeId: string; type: string; error: unknown };
  "plugin:installed": { pluginId: string };
  "plugin:error": { pluginId: string; error: unknown };
  "canvas:config-changed": { config: CanvasConfig };
  "drag:start": { operation: DragOperation };
  "drag:end": { operation: DragOperation; result: { success: boolean } };
}

export type BuilderEventType = keyof BuilderEventMap;
export type BuilderEvent<K extends BuilderEventType = BuilderEventType> = {
  type: K;
  payload: BuilderEventMap[K];
};

export type EventHandler<K extends BuilderEventType = BuilderEventType> = (
  payload: BuilderEventMap[K],
) => void;

export type Unsubscribe = () => void;

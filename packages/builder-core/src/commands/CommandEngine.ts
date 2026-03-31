import type { BuilderState } from "../state/types";
import type { Command, CommandResult, CommandHandler } from "./types";
import type { EventBus } from "../events/EventBus";
import type { HistoryStack } from "../history/HistoryStack";
import type { HistoryEntry } from "../history/types";
import { v4 as uuidv4 } from "uuid";

/**
 * CommandEngine — the central dispatcher for all state mutations.
 *
 * All changes to BuilderState MUST go through this engine.
 * - Dispatches commands to registered handlers
 * - Computes and stores inverse commands in the history stack
 * - Emits command:executed or command:error events
 * - Enforces permissions (if configured)
 *
 * No handler = error. Partial mutation is never applied.
 */
export class CommandEngine {
  private readonly handlers = new Map<string, CommandHandler>();
  private readonly inverseHandlers = new Map<
    string,
    (state: BuilderState, payload: unknown) => Command
  >();
  private state: BuilderState;
  private readonly eventBus: EventBus;
  private readonly historyStack: HistoryStack;
  private readonly restrictedCommands: Set<string>;

  constructor(
    initialState: BuilderState,
    eventBus: EventBus,
    historyStack: HistoryStack,
    restrictedCommands: string[] = [],
  ) {
    this.state = initialState;
    this.eventBus = eventBus;
    this.historyStack = historyStack;
    this.restrictedCommands = new Set(restrictedCommands);
  }

  /**
   * Register a command handler along with its optional inverse handler.
   *
   * @param type - Command type string
   * @param handler - Function that produces a new state from current state + payload
   * @param inverseHandler - Optional: produces the inverse command for undo support
   */
  registerHandler<T = unknown>(
    type: string,
    handler: CommandHandler<T>,
    inverseHandler?: (state: BuilderState, payload: T) => Command,
  ): void {
    this.handlers.set(type, handler as CommandHandler);
    if (inverseHandler) {
      this.inverseHandlers.set(type, inverseHandler as (s: BuilderState, p: unknown) => Command);
    }
  }

  /**
   * Dispatch a command.
   *
   * Steps:
   * 1. Check permissions
   * 2. Compute inverse (from current state BEFORE mutation)
   * 3. Call registered handler → nextState
   * 4. Push HistoryEntry if invertible
   * 5. Update this.state and emit events
   *
   * If any step fails, state is NOT changed and command:error is emitted.
   *
   * @param command - The command to execute
   * @returns CommandResult
   */
  dispatch(command: Command): CommandResult {
    if (this.restrictedCommands.has(command.type)) {
      const result: CommandResult = {
        success: false,
        error: `Command "${command.type}" is restricted by permissions`,
      };
      this.eventBus.emit("command:error", { command, error: result.error! });
      return result;
    }

    const handler = this.handlers.get(command.type);
    if (!handler) {
      const result: CommandResult = {
        success: false,
        error: `No handler registered for command type "${command.type}"`,
      };
      this.eventBus.emit("command:error", { command, error: result.error! });
      return result;
    }

    let nextState: BuilderState;
    try {
      // Compute inverse BEFORE mutation (from current state)
      const inverseHandler = this.inverseHandlers.get(command.type);
      const inverseCommand = inverseHandler
        ? inverseHandler(this.state, command.payload)
        : undefined;

      // Apply the handler
      nextState = handler(this.state, command.payload);

      // Push to history if we have an inverse
      if (inverseCommand) {
        const entry: HistoryEntry = {
          id: uuidv4(),
          command,
          inverseCommand,
          timestamp: command.timestamp ?? Date.now(),
          groupId: command.groupId,
          description: command.description ?? command.type,
        };
        this.historyStack.push(entry);
      }

      // Commit state
      this.state = nextState;

      const result: CommandResult = { success: true };
      this.eventBus.emit("command:executed", { command, result });

      // Emit document:changed if the document changed
      if (nextState.document !== this.state.document || nextState.document !== undefined) {
        this.eventBus.emit("document:changed", nextState.document);
      }

      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const result: CommandResult = { success: false, error };
      this.eventBus.emit("command:error", { command, error });
      return result;
    }
  }

  /**
   * Undo the last command (or group).
   */
  undo(): CommandResult {
    const entries = this.historyStack.undo();
    if (entries.length === 0) {
      return { success: false, error: "Nothing to undo" };
    }

    for (const entry of entries) {
      const result = this.dispatch(entry.inverseCommand);
      if (!result.success) {
        return result;
      }
      this.eventBus.emit("history:undo", { entry });
    }

    return { success: true };
  }

  /**
   * Redo the last undone command (or group).
   */
  redo(): CommandResult {
    const entries = this.historyStack.redo();
    if (entries.length === 0) {
      return { success: false, error: "Nothing to redo" };
    }

    for (const entry of entries) {
      const result = this.dispatch(entry.command);
      if (!result.success) {
        return result;
      }
      this.eventBus.emit("history:redo", { entry });
    }

    return { success: true };
  }

  /**
   * Returns the current immutable state snapshot.
   */
  getState(): BuilderState {
    return this.state;
  }
}

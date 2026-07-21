/**
 * Command system type contracts.
 * All state changes in the builder go through this contract.
 */

import type { BuilderState } from "../state/types";

export interface Command<T = unknown> {
  type: string;
  payload: T;
  /** Human-readable description for history panel */
  description?: string;
  timestamp?: number;
  /** Group commands into atomic transactions for undo/redo */
  groupId?: string;
  /**
   * Within a `groupId`, whether to coalesce this command into the group's single
   * history entry (gesture behavior: a rapid same-target stream → one undo).
   * Defaults to `true` when a `groupId` is set. Set `false` for a *batch* of
   * commands that share a groupId but each need their own inverse (e.g. AI
   * generation adding many different nodes) — they push separate entries that
   * `HistoryStack.undo()` still gathers and reverts as one atomic block.
   */
  coalesce?: boolean;
}

export interface CommandResult {
  success: boolean;
  error?: string;
  affectedNodeIds?: string[];
}

export interface ReversibleCommand<T = unknown> extends Command<T> {
  /**
   * Compute the inverse command from the current state.
   * Must be a pure function — no side effects.
   */
  getInverse(currentState: BuilderState): Command;
}

export type CommandHandler<T = unknown> = (
  state: BuilderState,
  payload: T,
) => BuilderState;

export type InverseCommandHandler<T = unknown> = (
  state: BuilderState,
  payload: T,
) => Command;

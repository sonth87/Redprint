import type { HistoryEntry, HistoryState } from "./types";

/**
 * Undo/redo history stack with atomic grouped command support.
 *
 * Requirements from spec:
 * - Undo/redo must be atomic with grouped commands (same groupId)
 * - History must be serializable (JSON-safe)
 * - Max history depth configurable (default 100)
 *
 * @example
 * const history = new HistoryStack(100);
 * history.push(entry);
 * const undoneEntry = history.undo(); // returns the entry to inverse-apply
 */
export class HistoryStack {
  private past: HistoryEntry[] = [];
  private future: HistoryEntry[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  /**
   * Push a new entry onto the past stack.
   * Clears the future stack (any redo history).
   * Trims past stack if it exceeds maxSize.
   *
   * @param entry - The HistoryEntry to push
   */
  push(entry: HistoryEntry): void {
    this.future = [];
    this.past.push(entry);
    if (this.past.length > this.maxSize) {
      this.past.shift();
    }
  }

  /**
   * Coalesce a continuous gesture into a single history entry.
   *
   * If the top of `past` already has the given `groupId`, updates its `command`
   * to `newCommand` (so redo replays the final state) while keeping the
   * original `inverseCommand` (so undo restores the pre-gesture state).
   *
   * Returns `true` if coalesced, `false` if the entry must be pushed normally.
   */
  coalesce(groupId: string, newCommand: import("../commands/types").Command): boolean {
    if (this.past.length === 0) return false;
    const top = this.past[this.past.length - 1]!;
    if (top.groupId !== groupId) return false;
    this.past[this.past.length - 1] = { ...top, command: newCommand };
    return true;
  }

  /**
   * Undo the most recent entry (or group).
   * Returns the entries to reverse-apply, ordered last-in-first-out.
   *
   * @returns Array of HistoryEntry to reverse (empty if nothing to undo)
   */
  undo(): HistoryEntry[] {
    if (this.past.length === 0) return [];

    const last = this.past[this.past.length - 1]!;
    const groupId = last.groupId;

    if (!groupId) {
      // Single entry undo
      const entry = this.past.pop()!;
      this.future.push(entry);
      return [entry];
    }

    // Grouped undo — collect all entries with the same groupId from top of stack
    const group: HistoryEntry[] = [];
    while (this.past.length > 0 && this.past[this.past.length - 1]!.groupId === groupId) {
      const entry = this.past.pop()!;
      group.push(entry);
      this.future.push(entry);
    }
    // group is already in reverse order (popped from end)
    return group;
  }

  /**
   * Redo the most recently undone entry (or group).
   * Returns the entries to re-apply, ordered first-in-first-out.
   *
   * @returns Array of HistoryEntry to re-apply (empty if nothing to redo)
   */
  redo(): HistoryEntry[] {
    if (this.future.length === 0) return [];

    const last = this.future[this.future.length - 1]!;
    const groupId = last.groupId;

    if (!groupId) {
      const entry = this.future.pop()!;
      this.past.push(entry);
      return [entry];
    }

    // Grouped redo
    const group: HistoryEntry[] = [];
    while (this.future.length > 0 && this.future[this.future.length - 1]!.groupId === groupId) {
      const entry = this.future.pop()!;
      group.push(entry);
      this.past.push(entry);
    }
    return group.reverse();
  }

  /**
   * Returns the current history state for serialisation.
   */
  getState(): HistoryState {
    return {
      past: [...this.past],
      future: [...this.future],
      maxSize: this.maxSize,
    };
  }

  /**
   * Restores history state from a serialised snapshot.
   *
   * @param state - Serialised HistoryState
   */
  restoreState(state: HistoryState): void {
    this.past = [...state.past];
    this.future = [...state.future];
  }

  /** Whether undo is available */
  get canUndo(): boolean {
    return this.past.length > 0;
  }

  /** Whether redo is available */
  get canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Total number of past entries */
  get pastCount(): number {
    return this.past.length;
  }

  /** Clear all history */
  clear(): void {
    this.past = [];
    this.future = [];
  }
}

/**
 * History system type contracts.
 */
import type { Command } from "../commands/types";

export interface HistoryEntry {
  id: string;
  command: Command;
  /** Precomputed inverse command — enables O(1) undo */
  inverseCommand: Command;
  timestamp: number;
  /** Entries with same groupId undo/redo together atomically */
  groupId?: string;
  description: string;
}

export interface HistoryState {
  past: HistoryEntry[];
  future: HistoryEntry[];
  /** Maximum entries — default 100 */
  maxSize: number;
}

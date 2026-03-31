/**
 * BuilderContext type contracts.
 */
import type { BuilderAPI, BuilderPermissions } from "@ui-builder/builder-core";
import type { BuilderState, EditorState } from "@ui-builder/builder-core";
import type { Command, CommandResult } from "@ui-builder/builder-core";
import type { Breakpoint } from "@ui-builder/builder-core";
import type { BuilderNode } from "@ui-builder/builder-core";

export interface BuilderContextValue {
  /** The full builder API instance */
  builder: BuilderAPI;
  /** Current immutable state snapshot */
  state: BuilderState;
  /** Active breakpoint */
  breakpoint: Breakpoint;
  /** Shorthand dispatch */
  dispatch: (command: Command) => CommandResult;
  /** Current permissions */
  permissions: Partial<BuilderPermissions>;
}

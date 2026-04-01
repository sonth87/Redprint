import React, { useCallback, useEffect, useRef, useState } from "react";
import { BuilderContext } from "./BuilderContext";
import type { BuilderContextValue } from "./types";
import { createBuilder } from "@ui-builder/builder-core";
import type { BuilderConfig, BuilderAPI, BuilderPermissions, BuilderState } from "@ui-builder/builder-core";

export interface BuilderProviderProps {
  /** Optional: pre-created builder instance. If not provided, one is created from config. */
  builder?: BuilderAPI;
  /** Config used to create a builder instance if none is provided */
  config?: BuilderConfig;
  permissions?: Partial<BuilderPermissions>;
  children: React.ReactNode;
}

/**
 * Provides the builder context to the component tree.
 *
 * Usage:
 * ```tsx
 * <BuilderProvider config={{ document: { name: 'My Page' } }}>
 *   <BuilderEditor />
 * </BuilderProvider>
 * ```
 */
export function BuilderProvider({
  builder: externalBuilder,
  config,
  permissions = {},
  children,
}: BuilderProviderProps) {
  // Create or adopt builder instance
  const builderRef = useRef<BuilderAPI>(
    externalBuilder ?? createBuilder(config),
  );
  const builder = builderRef.current;

  const [state, setState] = useState<BuilderState>(() => builder.getState());

  // Breakpoint is derived from state — no separate state needed
  const breakpoint = state.editor.activeBreakpoint;

  // Bridge core EventBus → React re-render on every command execution
  useEffect(() => {
    const unsub = builder.subscribe((nextState) => setState(nextState));
    return unsub;
  }, [builder]);

  const dispatch = useCallback(
    (command: Parameters<typeof builder.dispatch>[0]) => builder.dispatch(command),
    [builder],
  );

  const value: BuilderContextValue = {
    builder,
    state,
    breakpoint,
    dispatch,
    permissions,
  };

  return <BuilderContext.Provider value={value}>{children}</BuilderContext.Provider>;
}

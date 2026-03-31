import React, { useCallback, useEffect, useRef, useState } from "react";
import { BuilderContext } from "./BuilderContext";
import type { BuilderContextValue } from "./types";
import { createBuilder } from "@ui-builder/builder-core";
import type { BuilderConfig, BuilderAPI, BuilderPermissions, BuilderState, Breakpoint } from "@ui-builder/builder-core";

export interface BuilderProviderProps {
  /** Optional: pre-created builder instance. If not provided, one is created from config. */
  builder?: BuilderAPI;
  /** Config used to create a builder instance if none is provided */
  config?: BuilderConfig;
  /** Initial active breakpoint — defaults to 'desktop' */
  initialBreakpoint?: Breakpoint;
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
  initialBreakpoint = "desktop",
  permissions = {},
  children,
}: BuilderProviderProps) {
  // Create or adopt builder instance
  const builderRef = useRef<BuilderAPI>(
    externalBuilder ?? createBuilder(config),
  );
  const builder = builderRef.current;

  const [state, setState] = useState<BuilderState>(() => builder.getState());
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(initialBreakpoint);

  // Bridge core EventBus → React re-render
  useEffect(() => {
    // Subscribe to ALL state-changing events that require re-render
    const unsubs = [
      builder.subscribe((nextState) => setState(nextState)),
    ];

    // Also update breakpoint when it changes
    const unsub2 = (builder as BuilderAPI & { _eventBus?: any })._eventBus?.on?.(
      "breakpoint:changed",
      ({ breakpoint: bp }: { breakpoint: Breakpoint }) => setBreakpoint(bp),
    );

    return () => {
      unsubs.forEach((u) => u?.());
      unsub2?.();
    };
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

  return React.createElement(BuilderContext.Provider, { value }, children);
}

import React, { createContext, useContext } from "react";
import type { Breakpoint } from "@ui-builder/builder-core";

/**
 * Allows a canvas subtree to override the active breakpoint independently
 * from the global EditorState. Used by the dual-canvas layout so each canvas
 * can render a different device breakpoint simultaneously while sharing the
 * same BuilderProvider (and therefore the same document state).
 *
 * When null, consumers fall back to state.editor.activeBreakpoint.
 */
export const BreakpointOverrideContext = createContext<Breakpoint | null>(null);

export interface BreakpointOverrideProviderProps {
  breakpoint: Breakpoint;
  children: React.ReactNode;
}

/**
 * Wrap a canvas subtree with this provider to force all NodeRenderers
 * inside it to resolve styles/props against the given breakpoint.
 *
 * @example
 * <BreakpointOverrideProvider breakpoint="mobile">
 *   <NodeRenderer nodeId={rootId} />
 * </BreakpointOverrideProvider>
 */
export function BreakpointOverrideProvider({ breakpoint, children }: BreakpointOverrideProviderProps) {
  return (
    <BreakpointOverrideContext.Provider value={breakpoint}>
      {children}
    </BreakpointOverrideContext.Provider>
  );
}

export function useBreakpointOverride(): Breakpoint | null {
  return useContext(BreakpointOverrideContext);
}

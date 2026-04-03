import type { Breakpoint } from "@ui-builder/builder-core";
import { useBuilder } from "./useBuilder";
import { useBreakpointOverride } from "../context/BreakpointOverrideContext";

/**
 * Returns the effective breakpoint for the current render context.
 *
 * Priority:
 * 1. BreakpointOverrideContext (set by dual-canvas BreakpointOverrideProvider)
 * 2. Global state.editor.activeBreakpoint
 *
 * All NodeRenderers should use this hook instead of reading the state directly
 * so that dual-canvas mode works correctly.
 *
 * @example
 * const breakpoint = useResolvedBreakpoint();
 * const style = resolveStyle(node.style, node.responsiveStyle, breakpoint);
 */
export function useResolvedBreakpoint(): Breakpoint {
  const { state } = useBuilder();
  const override = useBreakpointOverride();
  return override ?? state.editor.activeBreakpoint;
}

import { useCallback } from "react";
import { useBuilder } from "./useBuilder";
import type { Breakpoint } from "@ui-builder/builder-core";

/**
 * Returns the current active breakpoint and a setter.
 *
 * @example
 * const { breakpoint, setBreakpoint } = useBreakpoint();
 */
export function useBreakpoint(): {
  breakpoint: Breakpoint;
  setBreakpoint: (bp: Breakpoint) => void;
  breakpoints: import("@ui-builder/builder-core").BreakpointConfig[];
} {
  const { state, dispatch } = useBuilder();
  const breakpoint = state.editor.activeBreakpoint;

  const setBreakpoint = useCallback(
    (bp: Breakpoint) => {
      dispatch({
        type: "SET_BREAKPOINT",
        payload: { breakpoint: bp },
        description: "Change breakpoint",
      });
    },
    [dispatch],
  );

  return {
    breakpoint,
    setBreakpoint,
    breakpoints: state.document.breakpoints,
  };
}

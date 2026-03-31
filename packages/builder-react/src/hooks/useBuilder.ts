import { useContext } from "react";
import { BuilderContext } from "../context/BuilderContext";
import type { BuilderContextValue } from "../context/types";

/**
 * Primary hook for accessing the builder context.
 *
 * Must be used inside a `<BuilderProvider>`.
 *
 * @example
 * const { state, dispatch, builder } = useBuilder();
 */
export function useBuilder(): BuilderContextValue {
  const ctx = useContext(BuilderContext);
  if (!ctx) {
    throw new Error(
      "[useBuilder] Must be used inside a <BuilderProvider>. " +
        "Make sure the component is wrapped in <BuilderProvider>.",
    );
  }
  return ctx;
}

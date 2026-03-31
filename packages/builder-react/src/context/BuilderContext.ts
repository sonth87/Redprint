import { createContext } from "react";
import type { BuilderContextValue } from "./types";

/**
 * The main React context for the builder.
 * Consumers should use the `useBuilder` hook rather than accessing this directly.
 */
export const BuilderContext = createContext<BuilderContextValue | null>(null);
BuilderContext.displayName = "BuilderContext";

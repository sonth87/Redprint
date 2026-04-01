/**
 * @ui-builder/builder-react — public API
 *
 * React adapter for the UI Builder Library.
 * Exports context providers, hooks, and components.
 */

// Context
export { BuilderProvider } from "./context/BuilderProvider";
export type { BuilderProviderProps } from "./context/BuilderProvider";
export { BuilderContext } from "./context/BuilderContext";
export type { BuilderContextValue } from "./context/types";

// Hooks
export { useBuilder } from "./hooks/useBuilder";
export { useNode } from "./hooks/useNode";
export { useSelection } from "./hooks/useSelection";
export { useDocument } from "./hooks/useDocument";
export { useBreakpoint } from "./hooks/useBreakpoint";
export { useHistory } from "./hooks/useHistory";
export { usePlugin } from "./hooks/usePlugin";

// Properties
export { useNodeProperty } from "./hooks/useNodeProperty";

// Components
export { NodeRenderer } from "./components/NodeRenderer";
export type { NodeRendererProps } from "./components/NodeRenderer";

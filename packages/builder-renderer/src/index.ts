/**
 * @ui-builder/builder-renderer — public API
 *
 * Production runtime renderer for the UI Builder Library.
 * Renders BuilderDocument into a React element tree.
 *
 * @example
 * import { RuntimeRenderer } from '@ui-builder/builder-renderer';
 * <RuntimeRenderer document={doc} registry={registry} />
 */

// Primary component
export { RuntimeRenderer } from "./RuntimeRenderer";
export type { RuntimeRendererProps } from "./RuntimeRenderer";

// Types
export type {
  ComponentManifest,
  ComponentManifestEntry,
  ComponentLoadStatus,
  LoadState,
  RenderContext,
  ResolvedNode,
  RendererConfig,
} from "./types";

// Loader
export { DynamicLoader } from "./loader/DynamicLoader";
export { ComponentResolver, createPlaceholderDefinition } from "./loader/DynamicLoader";

// Pipeline utilities
export { StylePipeline } from "./pipeline/StylePipeline";
export { InteractionBinder, TRIGGER_TO_REACT_EVENT } from "./pipeline/InteractionBinder";
export type { BoundInteractions } from "./pipeline/InteractionBinder";

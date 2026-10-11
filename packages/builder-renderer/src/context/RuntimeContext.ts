import { createContext, useContext } from "react";
import type {
  BuilderDocument,
  Breakpoint,
  ComponentDefinition,
  ComponentRegistry,
  PopupAnalyticsEvent,
} from "@ui-builder/builder-core";

export interface RuntimeContextValue {
  document: BuilderDocument;
  registry: ComponentRegistry;
  breakpoint: Breakpoint;
  variables: Record<string, unknown>;
  setVariable: (key: string, value: unknown) => void;
  openPopup: (popupId: string) => void;
  closePopup: (popupId: string, reason?: PopupAnalyticsEvent["closeReason"]) => void;
  attachNodeIds: boolean;
  missingComponentFallback?: ComponentDefinition;
  /**
   * Runtime-only visibility overrides toggled by the `toggleVisibility` interaction
   * action — never mutates the document, resets on reload (roadmap 01/01, 3.2).
   */
  hiddenNodeIds: Set<string>;
  /** Runtime-only className overrides from `addClass`/`removeClass` (roadmap 01/01, 3.3). */
  nodeClassOverrides: Map<string, Set<string>>;
  /** Bridge for the `emit` interaction action (RendererConfig.onCustomEvent). */
  onCustomEvent?: (event: string, payload?: unknown) => void;
  /** Bridge for the `custom` interaction action (RendererConfig.customActionHandlers). */
  customActionHandlers?: Record<string, (params?: unknown) => void>;
  /** Bridge for Form.submitAction "emit" (RendererConfig.onFormSubmit, roadmap 03/04). */
  onFormSubmit?: (formName: string, fields: Record<string, unknown>) => void;
  toggleNodeVisibility: (targetId: string) => void;
  addNodeClass: (targetId: string, className: string) => void;
  removeNodeClass: (targetId: string, className: string) => void;
}

export const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export function useRuntimeContext(): RuntimeContextValue {
  const ctx = useContext(RuntimeContext);
  if (!ctx) throw new Error("[RuntimeRenderer] Used outside <RuntimeRenderer>");
  return ctx;
}

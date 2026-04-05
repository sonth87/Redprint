/**
 * defineComponent — JSON-driven helper for declaring ComponentDefinitions.
 *
 * Provides a typed, validated factory so that component packages can define
 * their components as plain JSON objects without manually constructing the full
 * interface shape.
 *
 * defineComponentGroup / defineComponentSubGroup are companion helpers for
 * registering group/sub-group metadata.
 *
 * @example
 * export const HeadingComponent = defineComponent({
 *   type: "Heading",
 *   name: "Heading",
 *   group: "text",
 *   subGroup: "heading",
 *   version: "1.0.0",
 *   capabilities: { inlineEditable: true, canContainChildren: false, ... },
 *   propSchema: [
 *     { key: "content", type: "richtext", label: "Content", toolbar: { bold: true } },
 *     { key: "level",   type: "select",   label: "Level", options: [...] },
 *   ],
 *   defaultProps: { content: "<h2>Heading</h2>", level: "h2" },
 *   i18n: { vi: { name: "Tiêu đề" } },
 *   editorRenderer: ...,
 *   runtimeRenderer: ...,
 * });
 */

import type {
  ComponentDefinition,
  ComponentGroup,
  ComponentSubGroup,
  ComponentCapabilities,
  PropSchema,
  ComponentRenderer,
  ComponentLifecycle,
  ComponentA11yConfig,
  ComponentEditorConfig,
  ContainerConfig,
  QuickAction,
  ComponentI18nMap,
} from "./types";
import type { StyleConfig } from "../document/types";

// ── Minimal required input for defineComponent ────────────────────────────

export interface ComponentConfig {
  type: string;
  name: string;
  /** Palette group id (e.g. "text", "button") */
  group?: string;
  /** Palette sub-group id (e.g. "heading", "paragraph") */
  subGroup?: string;
  /**
   * `category` is kept for backward-compatibility with code that reads
   * ComponentDefinition.category. If omitted, defaults to the group id or "misc".
   */
  category?: string;
  version?: string;
  icon?: string;
  description?: string;
  tags?: string[];
  i18n?: ComponentI18nMap;
  capabilities: ComponentCapabilities;
  propSchema?: PropSchema[];
  defaultProps?: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;
  containerConfig?: ContainerConfig;
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;
  quickActions?: QuickAction[];
  lifecycle?: ComponentLifecycle;
  a11y?: ComponentA11yConfig;
  editorConfig?: ComponentEditorConfig;
}

/**
 * Factory that converts a plain config object into a fully-typed
 * ComponentDefinition. Supplies sensible defaults for optional fields.
 */
export function defineComponent(config: ComponentConfig): ComponentDefinition {
  return {
    type: config.type,
    name: config.name,
    category: config.category ?? config.group ?? "misc",
    group: config.group,
    subGroup: config.subGroup,
    i18n: config.i18n,
    version: config.version ?? "1.0.0",
    icon: config.icon,
    description: config.description,
    tags: config.tags,
    capabilities: config.capabilities,
    propSchema: config.propSchema ?? [],
    defaultProps: config.defaultProps ?? {},
    defaultStyle: config.defaultStyle,
    containerConfig: config.containerConfig,
    editorRenderer: config.editorRenderer,
    runtimeRenderer: config.runtimeRenderer,
    quickActions: config.quickActions,
    lifecycle: config.lifecycle,
    a11y: config.a11y,
    editorConfig: config.editorConfig,
  };
}

/**
 * Typed helper to declare a ComponentGroup config object.
 * Pass the result to GroupRegistry.registerGroup().
 */
export function defineComponentGroup(config: ComponentGroup): ComponentGroup {
  return config;
}

/**
 * Typed helper to declare a ComponentSubGroup config object.
 * Pass the result to GroupRegistry.registerSubGroup().
 */
export function defineComponentSubGroup(config: ComponentSubGroup): ComponentSubGroup {
  return config;
}

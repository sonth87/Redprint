/**
 * ComponentRegistry type contracts.
 */

import type { BuilderDocument, BuilderNode, StyleConfig } from "../document/types";
import type { InteractionConfig } from "../document/interactions";
import type { Breakpoint } from "../responsive/types";

// ── Prop Schema ───────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
}

export interface RichtextToolbarConfig {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  link?: boolean;
  list?: boolean;
  align?: boolean;
  /** Enable font-size selector in the toolbar */
  fontSize?: boolean;
  /** Enable text (foreground) colour picker */
  color?: boolean;
  /** Enable text-highlight (background) colour picker */
  highlight?: boolean;
}

export type PropSchema =
  | { key: string; type: "string"; label: string; default?: string; multiline?: boolean; placeholder?: string; required?: boolean; description?: string }
  | { key: string; type: "number"; label: string; default?: number; min?: number; max?: number; step?: number; unit?: string; required?: boolean; description?: string }
  | { key: string; type: "boolean"; label: string; default?: boolean; required?: boolean; description?: string }
  | { key: string; type: "select"; label: string; options: SelectOption[]; default?: string; multiple?: boolean; description?: string }
  | { key: string; type: "color"; label: string; default?: string; allowGradient?: boolean; allowTransparent?: boolean }
  | { key: string; type: "image"; label: string; accept?: string | string[]; required?: boolean; focalPoint?: boolean }
  | { key: string; type: "video"; label: string; accept?: string | string[]; required?: boolean }
  | { key: string; type: "richtext"; label: string; toolbar?: RichtextToolbarConfig; required?: boolean }
  | { key: string; type: "data-binding"; label: string; sourceType?: string; required?: boolean }
  | { key: string; type: "json"; label: string; required?: boolean }
  | { key: string; type: "spacing"; label: string; default?: import("@ui-builder/shared").BoxValue }
  | { key: string; type: "border"; label: string; default?: import("@ui-builder/shared").BorderValue }
  | { key: string; type: "shadow"; label: string }
  | { key: string; type: "icon"; label: string }
  | { key: string; type: "font"; label: string }
  | { key: string; type: "slider"; label: string; min: number; max: number; step?: number; default?: number }
  | { key: string; type: "row"; children: PropSchema[] }
  | { key: string; type: "group"; label: string; children: PropSchema[]; collapsible?: boolean };

// ── Container & Layout ────────────────────────────────────────────────────

export interface SlotConfig {
  name: string;
  label: string;
  required?: boolean;
  allowedTypes?: string[];
  maxChildren?: number;
}

export interface DropZoneConfig {
  highlightColor?: string;
  label?: string;
}

export interface EmptyStateConfig {
  message?: string;
  icon?: string;
  allowDrop?: boolean;
}

export interface ContainerConfig {
  layoutType: "flow" | "flex" | "grid" | "absolute" | "slot-based";
  slots?: SlotConfig[];
  maxChildren?: number;
  minChildren?: number;
  allowedChildTypes?: string[];
  disallowedChildTypes?: string[];
  restrictNesting?: string[];
  dropZoneConfig?: DropZoneConfig;
  emptyStateConfig?: EmptyStateConfig;
}

// ── Component Group / Sub-group ───────────────────────────────────────────

/**
 * A top-level group in the component palette (e.g. "Văn bản", "Nút bấm", "Ảnh").
 * Declared via defineComponentGroup() or GroupRegistry.registerGroup().
 */
export interface ComponentGroup {
  /** Unique identifier, e.g. "text", "button", "media" */
  id: string;
  /** Display label (fallback when i18n key not found) */
  label: string;
  /** SVG string or lucide icon name */
  icon?: string;
  /** Ordering weight — lower values appear first */
  order: number;
  /** i18n key for the label, e.g. "groups.text" */
  i18nKey?: string;
}

/**
 * A sub-group nested under a ComponentGroup.
 * e.g. "Tiêu đề", "Đoạn văn", "Danh sách" inside "Văn bản".
 */
export interface ComponentSubGroup {
  id: string;
  parentGroupId: string;
  label: string;
  icon?: string;
  order: number;
  i18nKey?: string;
}

// ── Component Capabilities ────────────────────────────────────────────────

export interface ComponentCapabilities {
  canContainChildren: boolean;
  /** undefined = accept all child types */
  acceptedChildTypes?: string[];
  canResize: boolean;
  /** Defaults to canResize */
  canResizeWidth?: boolean;
  /** Defaults to canResize */
  canResizeHeight?: boolean;
  maintainAspectRatio?: boolean;
  canRotate?: boolean;
  canTriggerEvents: boolean;
  canBindData: boolean;
  canBeHidden: boolean;
  canBeLocked: boolean;
  isRootEligible?: boolean;
  /** Disables dragging this node */
  isDragDisabled?: boolean;
  /** Disables dropping into this node */
  isDropDisabled?: boolean;
  /**
   * When true, double-clicking this component on the canvas enters inline
   * rich-text editing mode (tiptap). The component must have at least one
   * prop with type "richtext".
   */
  inlineEditable?: boolean;
  /** Enables AI text-generation tools (rewrite, shorten, expand…) on the contextual toolbar */
  aiTextGeneration?: boolean;
  /** Enables AI image-generation tools (generate, style transfer…) on the contextual toolbar */
  aiImageGeneration?: boolean;
}

// ── Editor config ─────────────────────────────────────────────────────────

export type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

export interface ComponentEditorConfig {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizeHandles?: ResizeHandle[];
  showBoundingBox?: boolean;
  selectionColor?: string;
  showQuickActions?: boolean;
}

// ── Lifecycle ─────────────────────────────────────────────────────────────

export interface ComponentContext {
  nodeId: string;
  node: BuilderNode;
  document: BuilderDocument;
  dispatch: (command: import("../commands/types").Command) => void;
}

export interface ComponentLifecycle {
  onInit?: (ctx: ComponentContext) => void;
  onMount?: (ctx: ComponentContext) => void;
  onUpdate?: (ctx: ComponentContext, prevProps: Record<string, unknown>) => void;
  onDestroy?: (ctx: ComponentContext) => void;
  onSelect?: (ctx: ComponentContext) => void;
  onDeselect?: (ctx: ComponentContext) => void;
}

// ── A11y ──────────────────────────────────────────────────────────────────

export interface ComponentA11yConfig {
  role?: string;
  ariaLabel?: string | ((props: Record<string, unknown>) => string);
  ariaDescribedBy?: string;
  focusable?: boolean;
}

// ── Quick Action ──────────────────────────────────────────────────────────

export interface QuickAction {
  id: string;
  icon: string;
  label: string;
  tooltip?: string;
  group?: string;
  isToggle?: boolean;
  isActive?: (ctx: ComponentContext) => boolean;
  isDisabled?: (ctx: ComponentContext) => boolean;
  isVisible?: (ctx: ComponentContext) => boolean;
  execute: (ctx: ComponentContext) => void | import("../commands/types").Command;
  shortcut?: string;
}

// ── Renderer ──────────────────────────────────────────────────────────────

export type ComponentRenderer = (props: {
  node: BuilderNode;
  children?: unknown;
  style: StyleConfig;
  interactions: InteractionConfig[];
  breakpoint: Breakpoint;
}) => unknown;

// ── ComponentDefinition ───────────────────────────────────────────────────

/**
 * Per-locale display strings for a component. Keyed by locale code.
 * @example { en: { name: "Text", description: "A text block" }, vi: { name: "Văn bản" } }
 */
export type ComponentI18nMap = Record<string, { name?: string; description?: string }>;

export interface ComponentDefinition {
  /** Unique type key, e.g. "text-block" */
  type: string;
  name: string;
  category: string;
  /**
   * The top-level group id this component belongs to (e.g. "text", "button").
   * Maps to ComponentGroup.id in GroupRegistry.
   */
  group?: string;
  /**
   * The sub-group id within the group (e.g. "heading", "paragraph").
   * Maps to ComponentSubGroup.id in GroupRegistry.
   */
  subGroup?: string;
  /** Per-locale display overrides. Falls back to `name`/`description` fields. */
  i18n?: ComponentI18nMap;
  /** semver */
  version: string;
  /** SVG string or icon key */
  icon?: string;
  description?: string;
  tags?: string[];
  capabilities: ComponentCapabilities;
  /** Drives dynamic property panel generation */
  propSchema: PropSchema[];
  defaultProps: Record<string, unknown>;
  defaultStyle?: Partial<StyleConfig>;
  containerConfig?: ContainerConfig;
  editorRenderer: ComponentRenderer;
  runtimeRenderer: ComponentRenderer;
  quickActions?: QuickAction[];
  lifecycle?: ComponentLifecycle;
  a11y?: ComponentA11yConfig;
  editorConfig?: ComponentEditorConfig;
}

// ── Filter ────────────────────────────────────────────────────────────────

export interface ComponentFilter {
  category?: string;
  tags?: string[];
  search?: string;
  capabilities?: Partial<ComponentCapabilities>;
}

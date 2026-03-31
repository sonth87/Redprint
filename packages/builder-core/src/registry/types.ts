/**
 * ComponentRegistry type contracts.
 */

import type { BuilderDocument, BuilderNode, StyleConfig } from "../document/types";
import type { InteractionConfig } from "../document/interactions";

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
}

export type PropSchema =
  | { key: string; type: "string"; label: string; default?: string; multiline?: boolean; placeholder?: string }
  | { key: string; type: "number"; label: string; default?: number; min?: number; max?: number; step?: number; unit?: string }
  | { key: string; type: "boolean"; label: string; default?: boolean }
  | { key: string; type: "select"; label: string; options: SelectOption[]; default?: string; multiple?: boolean }
  | { key: string; type: "color"; label: string; default?: string; allowGradient?: boolean; allowTransparent?: boolean }
  | { key: string; type: "image"; label: string; accept?: string[] }
  | { key: string; type: "video"; label: string }
  | { key: string; type: "richtext"; label: string; toolbar?: RichtextToolbarConfig }
  | { key: string; type: "data-binding"; label: string; sourceType?: string }
  | { key: string; type: "json"; label: string }
  | { key: string; type: "spacing"; label: string; default?: import("@ui-builder/shared").BoxValue }
  | { key: string; type: "border"; label: string; default?: import("@ui-builder/shared").BorderValue }
  | { key: string; type: "shadow"; label: string }
  | { key: string; type: "icon"; label: string }
  | { key: string; type: "font"; label: string }
  | { key: string; type: "slider"; label: string; min: number; max: number; step?: number; default?: number }
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
}) => unknown;

// ── ComponentDefinition ───────────────────────────────────────────────────

export interface ComponentDefinition {
  /** Unique type key, e.g. "text-block" */
  type: string;
  name: string;
  category: string;
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

import type React from "react";
import type {
  BuilderNode,
  Breakpoint,
  ComponentDefinition,
  InteractionConfig,
} from "@ui-builder/builder-core";

// ── Shared context passed to all plugin sections ─────────────────────────────

export interface PropertyPanelContext {
  node: BuilderNode;
  definition: ComponentDefinition;
  style: Record<string, unknown>;
  resolvedProps: Record<string, unknown>;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
}

// ── Style section identifiers ─────────────────────────────────────────────────

export type StyleSection =
  | "size"
  | "spacing"
  | "typography"
  | "background"
  | "border"
  | "layout"
  | "shadow"
  | "filter"
  | "transform"
  | "visual";

// ── Plugin contract ───────────────────────────────────────────────────────────

export interface PropertyPanelPlugin {
  /** Component type(s) this plugin handles */
  componentType: string | string[];
  /** Human-readable display name (optional) */
  displayName?: string;
  /** Extra sections injected BEFORE generic style sections in Design tab */
  designSectionsBefore?: React.FC<PropertyPanelContext>;
  /** Extra sections injected AFTER generic style sections in Design tab */
  designSectionsAfter?: React.FC<PropertyPanelContext>;
  /** Which default style sections to hide for this component type */
  hideSections?: StyleSection[];
}

// ── PropertyPanel public API ──────────────────────────────────────────────────

export interface PropertyPanelProps {
  selectedNode: BuilderNode | null;
  definition: ComponentDefinition | null;
  breakpoint?: Breakpoint;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
  onInteractionsChange?: (interactions: InteractionConfig[]) => void;
  /** Notify parent which spacing type is being hovered (for canvas highlight) */
  onSpacingHover?: (type: "padding" | "margin" | null) => void;
}

// ── Shadow & Filter helpers ───────────────────────────────────────────────────

export interface ShadowComponents {
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface FilterItem {
  name: string;
  value: number;
}

export interface TransformComponents {
  rotate: number;
  scaleX: number;
  scaleY: number;
  translateX: number;
  translateY: number;
}

/**
 * Core document model types for the UI Builder Library.
 * These are immutable contracts from Technical Specification v2.1.
 */

import type { Breakpoint, BreakpointConfig } from "../responsive/types";
import type { BoxValue, BorderValue } from "@ui-builder/shared";
import type { InteractionConfig } from "./interactions";
import type { Asset, AssetManifest } from "./assets";

// ── StyleConfig ───────────────────────────────────────────────────────────

export interface StyleConfig {
  // Box model
  margin?: string | BoxValue;
  padding?: string | BoxValue;
  width?: string;
  height?: string;
  minWidth?: string;
  maxWidth?: string;
  minHeight?: string;
  maxHeight?: string;

  // Typography
  fontSize?: string;
  fontWeight?: string | number;
  fontFamily?: string;
  lineHeight?: string | number;
  letterSpacing?: string;
  color?: string;
  textAlign?: "left" | "center" | "right" | "justify";
  textDecoration?: string;
  textTransform?: string;

  // Layout
  display?: "flex" | "grid" | "block" | "inline-block" | "inline" | "inline-flex" | "none";
  flexDirection?: string;
  flexWrap?: string;
  alignItems?: string;
  justifyContent?: string;
  alignSelf?: string;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string;
  gap?: string;
  rowGap?: string;
  columnGap?: string;
  gridTemplateColumns?: string;
  gridTemplateRows?: string;
  gridColumn?: string;
  gridRow?: string;

  // Visual
  background?: string;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  backgroundRepeat?: string;
  border?: string | BorderValue;
  borderTop?: string | BorderValue;
  borderRight?: string | BorderValue;
  borderBottom?: string | BorderValue;
  borderLeft?: string | BorderValue;
  borderRadius?: string;
  borderWidth?: string;
  borderColor?: string;
  borderStyle?: string;
  boxShadow?: string;
  opacity?: number;
  overflow?: string;
  overflowX?: string;
  overflowY?: string;
  cursor?: string;
  pointerEvents?: string;
  objectFit?: string;
  objectPosition?: string;
  // CSS flex shorthand
  flex?: string;

  // Filters
  filter?: string;
  backdropFilter?: string;
  mixBlendMode?: string;

  // Position
  position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  zIndex?: number;

  // Transform
  transform?: string;
  transformOrigin?: string;
  transition?: string;
}

// ── NodeMetadata ──────────────────────────────────────────────────────────

export interface NodeMetadata {
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  /** Plugin-owned metadata per namespace key */
  pluginData?: Record<string, unknown>;
  tags?: string[];
}

// ── BuilderNode ───────────────────────────────────────────────────────────

export interface BuilderNode {
  /** UUID v4, globally unique */
  id: string;
  /** Component type key — must match a registered ComponentDefinition */
  type: string;
  /** null = root node */
  parentId: string | null;
  /** Sibling order (lower = earlier) */
  order: number;
  /** Component-specific properties */
  props: Record<string, unknown>;
  /** Base styles (applied at all breakpoints) */
  style: StyleConfig;
  /** Breakpoint-specific style overrides */
  responsiveStyle: Partial<Record<Breakpoint, Partial<StyleConfig>>>;
  /** Interaction bindings */
  interactions: InteractionConfig[];
  /** Named slot assignment within parent (if applicable) */
  slot?: string;
  /** Locked = not selectable, not moveable */
  locked?: boolean;
  /** Hidden on canvas and at runtime */
  hidden?: boolean;
  /** Human-readable label in layer panel */
  name?: string;
  metadata?: NodeMetadata;
  /** Per-breakpoint visibility override. true = hidden on that breakpoint only. */
  responsiveHidden?: Partial<Record<Breakpoint, boolean>>;
  /** Per-breakpoint prop overrides (e.g. different text on mobile). Merged onto base props. */
  responsiveProps?: Partial<Record<Breakpoint, Record<string, unknown>>>;
}

// ── Variable & Plugin Reference ───────────────────────────────────────────

export interface VariableDefinition {
  key: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  defaultValue: unknown;
  description?: string;
}

export interface PluginReference {
  pluginId: string;
  version: string;
  config?: Record<string, unknown>;
}

// ── CanvasConfig ──────────────────────────────────────────────────────────

export interface CanvasConfig {
  /** Canvas width hint in px. undefined = fluid/responsive */
  width?: number;
  height?: number;
  backgroundColor?: string;
  showGrid: boolean;
  /** Grid size in px, default 8 */
  gridSize: number;
  snapEnabled: boolean;
  /** Snap threshold distance in px, default 6 */
  snapThreshold: number;
  snapToGrid: boolean;
  snapToComponents: boolean;
  rulerEnabled: boolean;
  showHelperLines: boolean;
  helperLineColor?: string;
}

// ── DocumentMetadata ──────────────────────────────────────────────────────

export interface DocumentMetadata {
  author?: string;
  tags?: string[];
  thumbnail?: string;
  pluginData?: Record<string, unknown>;
}

// ── BuilderDocument ───────────────────────────────────────────────────────

export interface BuilderDocument {
  id: string;
  /** semver, e.g. "2.1.0" */
  schemaVersion: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  name: string;
  description?: string;
  /** Flat map of all nodes, keyed by node.id */
  nodes: Record<string, BuilderNode>;
  /** ID of the root node */
  rootNodeId: string;
  breakpoints: BreakpointConfig[];
  variables: Record<string, VariableDefinition>;
  assets: AssetManifest;
  plugins: PluginReference[];
  canvasConfig: CanvasConfig;
  metadata: DocumentMetadata;
}

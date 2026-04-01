/**
 * Shared PropertyDescriptor system.
 *
 * This unifies property editing logic so that both the contextual toolbar
 * and the property panel dispatch the exact same commands — zero duplication.
 */

import type { StyleConfig } from "../document/types";
import type { Breakpoint } from "../responsive/types";

// ── Descriptor types ──────────────────────────────────────────────────────

export type PropertyCategory = "style" | "prop" | "layout";

export interface PropertyDescriptor<T = unknown> {
  key: string;
  category: PropertyCategory;
  label: string;
  /** Get the current value from a node */
  getValue: (node: { props: Record<string, unknown>; style: StyleConfig }, breakpoint?: Breakpoint) => T;
  /** Build the dispatch payload for a change */
  toPayload: (nodeId: string, value: T, breakpoint?: Breakpoint) => {
    type: string;
    payload: Record<string, unknown>;
    description: string;
  };
}

// ── Factory helpers ───────────────────────────────────────────────────────

/**
 * Create a descriptor for a style property (e.g. fontSize, color).
 * Dispatches UPDATE_STYLE with the correct breakpoint.
 */
export function createStyleProperty<T = string>(
  key: keyof StyleConfig & string,
  label: string,
): PropertyDescriptor<T> {
  return {
    key,
    category: "style",
    label,
    getValue: (node) => (node.style as Record<string, unknown>)[key] as T,
    toPayload: (nodeId, value, breakpoint) => ({
      type: "UPDATE_STYLE",
      payload: { nodeId, style: { [key]: value }, breakpoint },
      description: `Set ${label}`,
    }),
  };
}

/**
 * Create a descriptor for a component prop (e.g. text, src, label).
 * Dispatches UPDATE_PROPS.
 */
export function createPropProperty<T = unknown>(
  key: string,
  label: string,
): PropertyDescriptor<T> {
  return {
    key,
    category: "prop",
    label,
    getValue: (node) => node.props[key] as T,
    toPayload: (nodeId, value) => ({
      type: "UPDATE_PROPS",
      payload: { nodeId, props: { [key]: value } },
      description: `Set ${label}`,
    }),
  };
}

// ── Pre-built property descriptors ────────────────────────────────────────

export const STYLE_PROPERTIES = {
  // Typography
  fontSize: createStyleProperty<string>("fontSize", "Font Size"),
  fontWeight: createStyleProperty<string>("fontWeight", "Font Weight"),
  fontFamily: createStyleProperty<string>("fontFamily", "Font Family"),
  color: createStyleProperty<string>("color", "Color"),
  textAlign: createStyleProperty<string>("textAlign", "Text Align"),
  lineHeight: createStyleProperty<string>("lineHeight", "Line Height"),
  letterSpacing: createStyleProperty<string>("letterSpacing", "Letter Spacing"),
  textDecoration: createStyleProperty<string>("textDecoration", "Text Decoration"),
  textTransform: createStyleProperty<string>("textTransform", "Text Transform"),

  // Size
  width: createStyleProperty<string>("width", "Width"),
  height: createStyleProperty<string>("height", "Height"),
  minWidth: createStyleProperty<string>("minWidth", "Min Width"),
  maxWidth: createStyleProperty<string>("maxWidth", "Max Width"),
  minHeight: createStyleProperty<string>("minHeight", "Min Height"),
  maxHeight: createStyleProperty<string>("maxHeight", "Max Height"),

  // Spacing
  padding: createStyleProperty<string>("padding", "Padding"),
  margin: createStyleProperty<string>("margin", "Margin"),

  // Background
  backgroundColor: createStyleProperty<string>("backgroundColor", "Background"),
  backgroundImage: createStyleProperty<string>("backgroundImage", "Background Image"),

  // Border
  borderRadius: createStyleProperty<string>("borderRadius", "Border Radius"),
  borderWidth: createStyleProperty<string>("borderWidth", "Border Width"),
  borderColor: createStyleProperty<string>("borderColor", "Border Color"),
  borderStyle: createStyleProperty<string>("borderStyle", "Border Style"),

  // Effects
  opacity: createStyleProperty<string>("opacity", "Opacity"),
  boxShadow: createStyleProperty<string>("boxShadow", "Box Shadow"),
  filter: createStyleProperty<string>("filter", "Filter"),
  backdropFilter: createStyleProperty<string>("backdropFilter", "Backdrop Filter"),
  mixBlendMode: createStyleProperty<string>("mixBlendMode", "Blend Mode"),
  transform: createStyleProperty<string>("transform", "Transform"),

  // Layout
  display: createStyleProperty<string>("display", "Display"),
  position: createStyleProperty<string>("position", "Position"),
  overflow: createStyleProperty<string>("overflow", "Overflow"),
  flexDirection: createStyleProperty<string>("flexDirection", "Direction"),
  justifyContent: createStyleProperty<string>("justifyContent", "Justify"),
  alignItems: createStyleProperty<string>("alignItems", "Align Items"),
  gap: createStyleProperty<string>("gap", "Gap"),
  zIndex: createStyleProperty<string>("zIndex", "Z-Index"),
} as const;

/** Commonly used prop descriptors */
export const PROP_PROPERTIES = {
  text: createPropProperty<string>("text", "Text"),
  label: createPropProperty<string>("label", "Label"),
  src: createPropProperty<string>("src", "Image Source"),
  alt: createPropProperty<string>("alt", "Alt Text"),
  href: createPropProperty<string>("href", "Link URL"),
  placeholder: createPropProperty<string>("placeholder", "Placeholder"),
} as const;

/**
 * figmaMapper — converts Figma node tree into BuilderNode[].
 *
 * Strategy:
 *  - FRAME / GROUP with layoutMode != "NONE" → Container (flex)
 *  - FRAME / GROUP without Auto Layout → Container (absolute children)
 *  - TEXT → RichText component
 *  - RECTANGLE / ELLIPSE → Container (visual box)
 *  - INSTANCE → treated as FRAME (flatten)
 *  - VECTOR / STAR / POLYGON → skipped (too complex for Phase 1)
 *
 * The returned node list is flat (Record<id, node>) and can be batch-dispatched.
 */

import { v4 as uuidv4 } from "uuid";
import type { BuilderNode, StyleConfig } from "@ui-builder/builder-core";
import type { FigmaNode, FigmaColor, FigmaPaint, FigmaEffect, FigmaTypeStyle } from "./figmaApiClient";

// ── Colour helpers ─────────────────────────────────────────────────────────

function figmaColorToRgba(c: FigmaColor, opacity = 1): string {
  const r = Math.round(c.r * 255);
  const g = Math.round(c.g * 255);
  const b = Math.round(c.b * 255);
  const a = +(c.a * opacity).toFixed(3);
  if (a >= 1) return `rgb(${r},${g},${b})`;
  return `rgba(${r},${g},${b},${a})`;
}

function paintToBackground(paint: FigmaPaint): string | null {
  if (paint.visible === false) return null;
  const alpha = paint.opacity ?? 1;
  switch (paint.type) {
    case "SOLID":
      return paint.color ? figmaColorToRgba(paint.color, alpha) : null;
    case "IMAGE":
      // Phase 1: use a placeholder grey
      return "rgba(180,180,180,0.3)";
    case "GRADIENT_LINEAR":
    case "GRADIENT_RADIAL":
      // Simplified: just use first stop colour
      return "rgba(200,200,200,0.5)";
    default:
      return null;
  }
}

function paintsToBackground(fills: FigmaPaint[] | undefined): string | undefined {
  if (!fills || fills.length === 0) return undefined;
  // Use first visible fill
  for (const fill of [...fills].reverse()) {
    const bg = paintToBackground(fill);
    if (bg) return bg;
  }
  return undefined;
}

// ── Shadow helpers ─────────────────────────────────────────────────────────

function effectsToBoxShadow(effects: FigmaEffect[] | undefined): string | undefined {
  if (!effects || effects.length === 0) return undefined;
  const shadows = effects
    .filter((e) => (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") && e.visible !== false)
    .map((e) => {
      const c = e.color ? figmaColorToRgba(e.color) : "rgba(0,0,0,0.25)";
      const x = e.offset?.x ?? 0;
      const y = e.offset?.y ?? 0;
      const blur = e.radius ?? 0;
      const spread = e.spread ?? 0;
      const inset = e.type === "INNER_SHADOW" ? "inset " : "";
      return `${inset}${x}px ${y}px ${blur}px ${spread}px ${c}`;
    });
  return shadows.length > 0 ? shadows.join(", ") : undefined;
}

// ── Border helpers ─────────────────────────────────────────────────────────

function strokesToBorder(
  strokes: FigmaPaint[] | undefined,
  strokeWeight: number | undefined
): string | undefined {
  if (!strokes || strokes.length === 0 || !strokeWeight) return undefined;
  const stroke = strokes.find((s) => s.visible !== false && s.type === "SOLID");
  if (!stroke?.color) return undefined;
  return `${strokeWeight}px solid ${figmaColorToRgba(stroke.color)}`;
}

// ── Border radius helpers ─────────────────────────────────────────────────

function cornerRadiusToCSS(
  cornerRadius: number | undefined,
  rectangleCornerRadii: [number, number, number, number] | undefined
): string | undefined {
  if (rectangleCornerRadii) {
    const [tl, tr, br, bl] = rectangleCornerRadii;
    if (tl === tr && tr === br && br === bl) {
      return tl > 0 ? `${tl}px` : undefined;
    }
    return `${tl}px ${tr}px ${br}px ${bl}px`;
  }
  if (cornerRadius && cornerRadius > 0) return `${cornerRadius}px`;
  return undefined;
}

// ── Text style helpers ─────────────────────────────────────────────────────

function textAlignMap(a: FigmaTypeStyle["textAlignHorizontal"]): StyleConfig["textAlign"] {
  switch (a) {
    case "CENTER": return "center";
    case "RIGHT": return "right";
    case "JUSTIFIED": return "justify";
    default: return "left";
  }
}

function typeStyleToCSS(ts: FigmaTypeStyle | undefined): Partial<StyleConfig> {
  if (!ts) return {};
  const style: Partial<StyleConfig> = {};
  if (ts.fontFamily) style.fontFamily = ts.fontFamily;
  if (ts.fontSize) style.fontSize = `${ts.fontSize}px`;
  if (ts.fontWeight) style.fontWeight = ts.fontWeight;
  if (ts.lineHeightPx) style.lineHeight = `${ts.lineHeightPx}px`;
  if (ts.letterSpacing) style.letterSpacing = `${ts.letterSpacing}px`;
  if (ts.textAlignHorizontal) style.textAlign = textAlignMap(ts.textAlignHorizontal);
  if (ts.textDecoration === "UNDERLINE") style.textDecoration = "underline";
  if (ts.textDecoration === "STRIKETHROUGH") style.textDecoration = "line-through";
  return style;
}

// ── Auto Layout → Flex helpers ─────────────────────────────────────────────

function primaryAxisAlignToJustify(align: string | undefined): string {
  switch (align) {
    case "MAX": return "flex-end";
    case "CENTER": return "center";
    case "SPACE_BETWEEN": return "space-between";
    default: return "flex-start";
  }
}

function counterAxisAlignToAlign(align: string | undefined): string {
  switch (align) {
    case "MAX": return "flex-end";
    case "CENTER": return "center";
    case "BASELINE": return "baseline";
    default: return "flex-start";
  }
}

// ── Supported node types ───────────────────────────────────────────────────

const CONTAINER_TYPES = new Set(["FRAME", "GROUP", "COMPONENT", "INSTANCE", "SECTION"]);
const TEXT_TYPES = new Set(["TEXT"]);
const SHAPE_TYPES = new Set(["RECTANGLE", "ELLIPSE", "POLYGON", "STAR", "LINE", "VECTOR"]);
const SKIP_TYPES = new Set(["BOOLEAN_OPERATION"]);

// ── Main mapper ────────────────────────────────────────────────────────────

export interface FigmaMapResult {
  /** Flat map of all generated BuilderNodes, keyed by node.id */
  nodes: Record<string, BuilderNode>;
  /** ID of the root node (direct child of canvas rootNodeId) */
  rootId: string;
}

/**
 * Convert a Figma node tree into a flat BuilderNode map.
 *
 * @param figmaNode     Root Figma node to convert
 * @param parentId      Builder parentId to attach to (the canvas root or Section)
 * @param insertOrder   Starting sibling order
 */
export function mapFigmaNodeToBuilder(
  figmaNode: FigmaNode,
  parentId: string,
  insertOrder = 0
): FigmaMapResult {
  const nodes: Record<string, BuilderNode> = {};
  const rootId = uuidv4();

  // Root node is attached to the builder parent, which is typically a flex column.
  // We don't force absolute positioning on the root unless it's explicitly absolute.
  const parentBounds = null; // Forces normal flex flow for the root instead of absolute positioning.

  _mapNode(figmaNode, rootId, parentId, insertOrder, nodes, parentBounds, false);

  return { nodes, rootId };
}

// ── Recursive mapper ───────────────────────────────────────────────────────

function _mapNode(
  figma: FigmaNode,
  nodeId: string,
  parentId: string | null,
  order: number,
  out: Record<string, BuilderNode>,
  parentBounds: { x: number; y: number } | null,
  parentIsAutoLayout = false
): void {
  if (figma.visible === false) return;

  const type = figma.type;

  if (SKIP_TYPES.has(type) && !SHAPE_TYPES.has(type)) return;

  const bounds = figma.absoluteBoundingBox;
  const now = new Date().toISOString();

  const isAutoLayoutChild = parentIsAutoLayout && figma.layoutPositioning !== "ABSOLUTE";
  const parentBoundsForChild = isAutoLayoutChild ? null : parentBounds;

  // Compute sizing and flex properties
  let w: string | undefined = undefined;
  let h: string | undefined = undefined;
  let flexGrow: number | undefined = undefined;
  let alignSelf: string | undefined = undefined;

  if (isAutoLayoutChild) {
    if (figma.layoutSizingHorizontal === "FILL") w = "100%";
    else if (figma.layoutSizingHorizontal === "HUG") w = undefined; // allow natural flow
    else w = bounds ? `${bounds.width}px` : undefined;

    if (figma.layoutSizingVertical === "FILL") h = "100%";
    else if (figma.layoutSizingVertical === "HUG") h = undefined;
    else h = bounds ? `${bounds.height}px` : undefined;

    if (figma.layoutGrow === 1) flexGrow = 1;
    if (figma.layoutAlign === "STRETCH") alignSelf = "stretch";
  } else {
    // Exact absolute sizing fallback
    w = bounds ? `${bounds.width}px` : "auto";
    h = bounds ? `${bounds.height}px` : "auto";
  }

  // ── Determine node type and build style ─────────────────────────────────
  let componentType: string;
  let style: StyleConfig;
  let props: Record<string, unknown> = {};

  if (TEXT_TYPES.has(type)) {
    // ── TEXT node ─────────────────────────────────────────────────────────
    componentType = "Text";

    const textColor = figma.fills?.find(
      (f) => f.type === "SOLID" && f.visible !== false
    );
    const color = textColor?.color
      ? figmaColorToRgba(textColor.color, textColor.opacity ?? 1)
      : undefined;

    style = {
      ...typeStyleToCSS(figma.style),
      color,
      width: w,
      height: h,
      flexGrow,
      alignSelf,
      ...positionStyle(bounds, parentBoundsForChild),
    };

    props = {
      text: figma.characters ? figma.characters.replace(/\n/g, "<br/>") : "",
      tag: deriveTextTag(figma.style),
    };

  } else if (CONTAINER_TYPES.has(type)) {
    // ── CONTAINER node (FRAME / GROUP / INSTANCE) ──────────────────────────
    componentType = "Container";

    const isAutoLayout = figma.layoutMode && figma.layoutMode !== "NONE";

    const bg = paintsToBackground(figma.fills);
    const border = strokesToBorder(figma.strokes, figma.strokeWeight);
    const boxShadow = effectsToBoxShadow(figma.effects);
    const borderRadius = cornerRadiusToCSS(figma.cornerRadius, figma.rectangleCornerRadii);

    if (isAutoLayout) {
      // Flex container
      const isRow = figma.layoutMode === "HORIZONTAL";
      const pt = figma.paddingTop ?? 0;
      const pr = figma.paddingRight ?? 0;
      const pb = figma.paddingBottom ?? 0;
      const pl = figma.paddingLeft ?? 0;
      const hasPadding = pt || pr || pb || pl;

      props = {
        name: figma.name,
        display: "flex",
        direction: isRow ? "row" : "column",
        gap: figma.itemSpacing ? `${figma.itemSpacing}px` : "0px",
        padding: hasPadding ? `${pt}px ${pr}px ${pb}px ${pl}px` : "0px",
        showPlaceholder: false,
      };

      style = {
        display: "flex",
        flexDirection: isRow ? "row" : "column",
        flexWrap: figma.layoutWrap === "WRAP" ? "wrap" : "nowrap",
        justifyContent: primaryAxisAlignToJustify(figma.primaryAxisAlignItems),
        alignItems: counterAxisAlignToAlign(figma.counterAxisAlignItems),
        gap: figma.itemSpacing ? `${figma.itemSpacing}px` : undefined,
        padding: hasPadding ? `${pt}px ${pr}px ${pb}px ${pl}px` : undefined,
        width: w,
        height: h,
        flexGrow,
        alignSelf,
        backgroundColor: bg,
        border,
        boxShadow,
        borderRadius,
        opacity: figma.opacity !== undefined && figma.opacity < 1 ? figma.opacity : undefined,
        overflow: figma.clipsContent ? "hidden" : undefined,
        ...positionStyle(bounds, parentBoundsForChild),
      };
    } else {
      // Absolute positioned container
      props = {
        name: figma.name,
        display: "block",
        padding: "0px",
        gap: "0px",
        showPlaceholder: false,
      };

      style = {
        position: "relative",
        width: w,
        height: h,
        flexGrow,
        alignSelf,
        backgroundColor: bg,
        border,
        boxShadow,
        borderRadius,
        opacity: figma.opacity !== undefined && figma.opacity < 1 ? figma.opacity : undefined,
        overflow: figma.clipsContent ? "hidden" : undefined,
        ...positionStyle(bounds, parentBoundsForChild),
      };
    }
  } else if (SHAPE_TYPES.has(type)) {
    // ── SHAPE (RECTANGLE / ELLIPSE) ──────────────────────────────────────
    componentType = "Container";

    const bg = paintsToBackground(figma.fills);
    const border = strokesToBorder(figma.strokes, figma.strokeWeight);
    const boxShadow = effectsToBoxShadow(figma.effects);
    const borderRadius =
      type === "ELLIPSE"
        ? "50%"
        : cornerRadiusToCSS(figma.cornerRadius, figma.rectangleCornerRadii);

    style = {
      display: "flex",
      width: w,
      height: h,
      flexGrow,
      alignSelf,
      backgroundColor: bg,
      border,
      borderRadius,
      boxShadow,
      opacity: figma.opacity !== undefined && figma.opacity < 1 ? figma.opacity : undefined,
      ...positionStyle(bounds, parentBoundsForChild),
    };

    props = {
      name: figma.name,
      display: "block",
      padding: "0px",
      gap: "0px",
      showPlaceholder: false,
    };

  } else {
    // Unknown / skip
    return;
  }

  // Strip undefined values for cleanliness
  const cleanStyle = stripUndefined(style as Record<string, unknown>) as StyleConfig;
  const cleanProps = stripUndefined(props);

  const node: BuilderNode = {
    id: nodeId,
    type: componentType,
    parentId,
    order,
    props: cleanProps,
    style: cleanStyle,
    responsiveStyle: {},
    interactions: [],
    name: figma.name,
    metadata: {
      createdAt: now,
      updatedAt: now,
      pluginData: { figmaNodeId: figma.id, figmaNodeType: figma.type },
    },
  };

  out[nodeId] = node;

  // ── Recurse into children ─────────────────────────────────────────────
  if (CONTAINER_TYPES.has(type) && figma.children) {
    const isAutoLayout = figma.layoutMode && figma.layoutMode !== "NONE";
    // If this node doesn't have bounds, pass down the last known parentBounds so children have a reference
    const childParentBounds = bounds ?? parentBoundsForChild;

    figma.children
      .filter((c) => c.visible !== false)
      .forEach((child, idx) => {
        if (SKIP_TYPES.has(child.type) && !SHAPE_TYPES.has(child.type)) return;
        const childId = uuidv4();
        _mapNode(child, childId, nodeId, idx, out, childParentBounds, isAutoLayout);
      });
  }
}

// ── Position helper ────────────────────────────────────────────────────────

function positionStyle(
  bounds: { x: number; y: number; width: number; height: number } | undefined,
  parentBounds: { x: number; y: number } | null
): Partial<StyleConfig> {
  // If parent is Auto Layout (parentBounds=null) or node has no known bounds, return empty.
  if (!bounds || !parentBounds) return {};
  return {
    position: "absolute",
    left: `${bounds.x - parentBounds.x}px`,
    top: `${bounds.y - parentBounds.y}px`,
  };
}

// ── Text tag heuristic ─────────────────────────────────────────────────────

function deriveTextTag(style: FigmaTypeStyle | undefined): string {
  if (!style) return "p";
  const sz = style.fontSize ?? 0;
  const fw = style.fontWeight ?? 400;
  if (sz >= 36 || (sz >= 24 && fw >= 700)) return "h1";
  if (sz >= 28 || (sz >= 20 && fw >= 700)) return "h2";
  if (sz >= 22 || (sz >= 18 && fw >= 600)) return "h3";
  return "p";
}

// ── Utility ───────────────────────────────────────────────────────────────

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Partial<T>;
}

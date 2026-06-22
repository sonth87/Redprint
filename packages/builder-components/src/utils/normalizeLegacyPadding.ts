import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";

/**
 * Layout components that historically stored padding in `props.padding` (a
 * component prop) in addition to / instead of `style.padding`. The duplicate
 * caused canvas (props.padding) and the Spacing panel (style.padding) to drift
 * out of sync. Padding is now driven exclusively by `style.padding`.
 *
 * @see Container / Row / Column / Grid renderers
 */
const LEGACY_PADDING_TYPES = new Set(["Container", "Row", "Column", "Grid"]);

/**
 * Convert a legacy `props.padding` value into a CSS-ready `style.padding` string.
 * Row/Column/Grid stored a bare number (rendered as `${n}px`); Container stored
 * a string that may already be a shorthand (e.g. "80px 24px"). A bare numeric
 * string is treated like a number and gets a `px` suffix.
 */
function toCssPadding(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return `${value}px`;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return undefined;
    return /^-?\d+(\.\d+)?$/.test(trimmed) ? `${trimmed}px` : trimmed;
  }
  return undefined;
}

/**
 * Migrate a single node's legacy `props.padding` into `style.padding`.
 * `props.padding` is the value that was actually rendered before this change, so
 * it wins and becomes the new source of truth (then it is removed from props).
 * Returns the same node reference when nothing changed.
 */
function normalizeNode(node: BuilderNode): BuilderNode {
  if (!LEGACY_PADDING_TYPES.has(node.type)) return node;
  if (!("padding" in node.props)) return node;

  const { padding, ...restProps } = node.props;
  const css = toCssPadding(padding);

  return {
    ...node,
    props: restProps,
    style: css !== undefined ? { ...node.style, padding: css } : node.style,
  };
}

/**
 * Walk every node in the document and fold legacy `props.padding` into
 * `style.padding` for layout components. Pure — returns a new document only when
 * at least one node changed, otherwise the original reference.
 *
 * Call this once when loading a document (it is idempotent).
 *
 * @example
 * const doc = normalizeLegacyPadding(loadedDocument);
 */
export function normalizeLegacyPadding(document: BuilderDocument): BuilderDocument {
  let changed = false;
  const nodes: Record<string, BuilderNode> = {};

  for (const [id, node] of Object.entries(document.nodes)) {
    const next = normalizeNode(node);
    if (next !== node) changed = true;
    nodes[id] = next;
  }

  return changed ? { ...document, nodes } : document;
}

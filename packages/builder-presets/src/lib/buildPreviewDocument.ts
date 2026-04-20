import type { BuilderDocument, BuilderNode, StyleConfig } from "@ui-builder/builder-core";
import { CURRENT_SCHEMA_VERSION, DEFAULT_BREAKPOINTS } from "@ui-builder/builder-core";
import type { PaletteItemChild } from "../types/palette.types";

export function buildPreviewDocument(
  type: string,
  props: Record<string, unknown>,
  style: Partial<StyleConfig>,
  children?: PaletteItemChild[],
): BuilderDocument {
  const rootId = "root";
  const nodes: Record<string, BuilderNode> = {};

  nodes[rootId] = {
    id: rootId,
    type,
    parentId: null,
    order: 0,
    props,
    style: style as StyleConfig,
    responsiveStyle: {},
    interactions: [],
  };

  if (children) {
    addChildNodes(children, rootId, nodes);
  }

  return {
    id: "preview-doc",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    name: `${type} Preview`,
    nodes,
    rootNodeId: rootId,
    breakpoints: DEFAULT_BREAKPOINTS,
    variables: {},
    assets: { version: "1.0", assets: [] },
    plugins: [],
    canvasConfig: {
      showGrid: false,
      gridSize: 8,
      snapEnabled: false,
      snapThreshold: 6,
      snapToGrid: false,
      snapToComponents: false,
      rulerEnabled: false,
      showHelperLines: false,
    },
    metadata: {},
  };
}

function addChildNodes(
  children: PaletteItemChild[],
  parentId: string,
  nodes: Record<string, BuilderNode>,
): void {
  children.forEach((child, index) => {
    // Stable positional ID: e.g. "root-0", "root-0-2", etc.
    const id = `${parentId}-${index}`;
    nodes[id] = {
      id,
      type: child.componentType,
      parentId,
      order: index,
      props: child.props ?? {},
      style: (child.style ?? {}) as StyleConfig,
      responsiveStyle: {},
      interactions: [],
      ...(child.name ? { name: child.name } : {}),
    };
    if (child.children?.length) {
      addChildNodes(child.children, id, nodes);
    }
  });
}

import { CURRENT_SCHEMA_VERSION } from "../document/constants";
import type { BuilderDocument, BuilderNode, NodeMetadata, StyleConfig } from "../document/types";
import { DEFAULT_BREAKPOINTS } from "../responsive/constants";
import type { PresetDefinition, PresetNodeConstraints, PresetNodeDefinition, PresetNodeEditorConfig } from "./schema";

export const PRESET_NODE_PLUGIN_DATA_KEY = "@ui-builder/preset-node";

interface PresetNodePluginData {
  role?: string;
  editor?: PresetNodeEditorConfig;
  constraints?: PresetNodeConstraints;
}

function nowIso(): string {
  return new Date().toISOString();
}

function getPresetNodePluginData(metadata?: NodeMetadata): PresetNodePluginData | undefined {
  const pluginData = metadata?.pluginData?.[PRESET_NODE_PLUGIN_DATA_KEY];
  if (!pluginData || typeof pluginData !== "object") {
    return undefined;
  }
  return pluginData as PresetNodePluginData;
}

function toNodeMetadata(node: PresetNodeDefinition): NodeMetadata | undefined {
  const pluginData: PresetNodePluginData = {};

  if (node.role) {
    pluginData.role = node.role;
  }
  if (node.editor) {
    pluginData.editor = node.editor;
  }
  if (node.constraints) {
    pluginData.constraints = node.constraints;
  }

  if (Object.keys(pluginData).length === 0) {
    return undefined;
  }

  const timestamp = nowIso();
  return {
    createdAt: timestamp,
    updatedAt: timestamp,
    pluginData: {
      [PRESET_NODE_PLUGIN_DATA_KEY]: pluginData,
    },
  };
}

function addPresetNodeToDocument(
  node: PresetNodeDefinition,
  parentId: string | null,
  order: number,
  nodes: Record<string, BuilderNode>,
): void {
  nodes[node.id] = {
    id: node.id,
    type: node.componentType,
    parentId,
    order,
    props: node.props ?? {},
    style: (node.style ?? {}) as StyleConfig,
    responsiveStyle: node.responsiveStyle ?? {},
    responsiveProps: node.responsiveProps,
    interactions: node.interactions ?? [],
    slot: node.slot,
    name: node.name,
    metadata: toNodeMetadata(node),
  };

  node.children?.forEach((child, index) => {
    addPresetNodeToDocument(child, node.id, index, nodes);
  });
}

export function presetToDocument(
  preset: PresetDefinition,
  options?: Partial<Pick<BuilderDocument, "id" | "name" | "description">>,
): BuilderDocument {
  const timestamp = nowIso();
  const nodes: Record<string, BuilderNode> = {};

  addPresetNodeToDocument(preset.root, null, 0, nodes);

  return {
    id: options?.id ?? "preview-doc",
    schemaVersion: CURRENT_SCHEMA_VERSION,
    createdAt: timestamp,
    updatedAt: timestamp,
    name: options?.name ?? preset.name,
    description: options?.description ?? preset.description,
    nodes,
    rootNodeId: preset.root.id,
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

function buildPresetNodeFromDocument(doc: BuilderDocument, nodeId: string): PresetNodeDefinition {
  const node = doc.nodes[nodeId];
  if (!node) {
    throw new Error(`Cannot serialize preset node "${nodeId}" because it does not exist in the document.`);
  }
  const pluginData = getPresetNodePluginData(node.metadata);

  const children = Object.values(doc.nodes)
    .filter((candidate) => candidate.parentId === nodeId)
    .sort((a, b) => a.order - b.order)
    .map((child) => buildPresetNodeFromDocument(doc, child.id));

  return {
    id: node.id,
    componentType: node.type,
    ...(node.name ? { name: node.name } : {}),
    ...(Object.keys(node.props).length > 0 ? { props: node.props } : {}),
    ...(Object.keys(node.style).length > 0 ? { style: node.style } : {}),
    ...(node.responsiveProps && Object.keys(node.responsiveProps).length > 0
      ? { responsiveProps: node.responsiveProps }
      : {}),
    ...(node.responsiveStyle && Object.keys(node.responsiveStyle).length > 0
      ? { responsiveStyle: node.responsiveStyle }
      : {}),
    ...(node.interactions.length > 0 ? { interactions: node.interactions } : {}),
    ...(node.slot ? { slot: node.slot } : {}),
    ...(pluginData?.role ? { role: pluginData.role } : {}),
    ...(pluginData?.editor ? { editor: pluginData.editor } : {}),
    ...(pluginData?.constraints ? { constraints: pluginData.constraints } : {}),
    ...(children.length > 0 ? { children } : {}),
  };
}

export function documentToPreset(
  doc: BuilderDocument,
  basePreset?: Partial<PresetDefinition>,
): PresetDefinition {
  const root = doc.nodes[doc.rootNodeId];
  if (!root) {
    throw new Error(`Cannot serialize preset because root node "${doc.rootNodeId}" is missing.`);
  }
  const rootNode = buildPresetNodeFromDocument(doc, doc.rootNodeId);

  return {
    id: basePreset?.id ?? root.id,
    version: basePreset?.version ?? "2.0.0",
    kind: basePreset?.kind ?? "variant",
    componentType: basePreset?.componentType ?? root.type,
    name: basePreset?.name ?? doc.name ?? root.name ?? root.type,
    ...(basePreset?.description ?? doc.description
      ? { description: basePreset?.description ?? doc.description }
      : {}),
    ...(basePreset?.thumbnail !== undefined ? { thumbnail: basePreset.thumbnail } : {}),
    ...(basePreset?.category ? { category: basePreset.category } : {}),
    ...(basePreset?.tags ? { tags: basePreset.tags } : {}),
    ...(basePreset?.i18n ? { i18n: basePreset.i18n } : {}),
    ...(basePreset?.purpose ? { purpose: basePreset.purpose } : {}),
    ...(basePreset?.industryHints ? { industryHints: basePreset.industryHints } : {}),
    ...(basePreset?.layoutVariant ? { layoutVariant: basePreset.layoutVariant } : {}),
    ...(basePreset?.extendsPresetId ? { extendsPresetId: basePreset.extendsPresetId } : {}),
    ...(basePreset?.authoring ? { authoring: basePreset.authoring } : {}),
    ...(basePreset?.placement ? { placement: basePreset.placement } : {}),
    root: rootNode,
  };
}

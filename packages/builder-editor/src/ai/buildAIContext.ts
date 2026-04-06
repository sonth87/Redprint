/**
 * buildAIContext — creates a serialisable snapshot of the builder state
 * for the AI assistant to reason about.
 */
import type { BuilderState, ComponentDefinition, PaletteCatalog } from "@ui-builder/builder-core";
import type { AIBuilderContext, AIPageNode, AIPresetGroup } from "./types";

export interface BuildAIContextOptions {
  /**
   * When true, include a full map of all page nodes in the context snapshot.
   * Enables the AI to reference existing node IDs for targeted edits.
   * Can significantly increase token usage for large documents.
   * Default: false
   */
  includePageContext?: boolean;
  /**
   * Palette catalog to include as a preset reference.
   * When provided, the AI context will include an `availablePresets` block
   * listing every named preset variant (e.g. "Heading 1", "Classic Nav")
   * with its componentType, props, and style — so the AI can suggest or
   * generate precise ADD_NODE payloads using real presets.
   */
  paletteCatalog?: PaletteCatalog;
}

export function buildAIContext(
  state: BuilderState,
  components: ComponentDefinition[],
  options: BuildAIContextOptions = {},
): AIBuilderContext {
  const doc = state.document;
  const selectedId = state.editor.selectedNodeIds[0] ?? null;
  const selectedNode = selectedId ? doc.nodes[selectedId] : null;
  const selectedDef = selectedNode
    ? components.find((c) => c.type === selectedNode.type) ?? null
    : null;

  let pageNodes: Record<string, AIPageNode> | undefined;
  if (options.includePageContext) {
    pageNodes = {};
    for (const node of Object.values(doc.nodes)) {
      pageNodes[node.id] = {
        id: node.id,
        type: node.type,
        name: node.name,
        parentId: node.parentId,
        order: node.order,
        props: node.props,
        style: node.style as Record<string, unknown>,
      };
    }
  }

  // Build a slim preset reference from the palette catalog so the AI knows
  // every named variant and its exact props/style to use in ADD_NODE payloads.
  let availablePresets: AIPresetGroup[] | undefined;
  if (options.paletteCatalog) {
    availablePresets = options.paletteCatalog.groups
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((group) => ({
        group: group.label,
        types: group.types
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((t) => ({
            type: t.label,
            items: t.items.map((item) => ({
              id: item.id,
              name: item.name,
              componentType: item.componentType,
              props: item.props,
              style: item.style as Record<string, unknown> | undefined,
              tags: item.tags,
            })),
          })),
      }));
  }

  return {
    document: {
      name: doc.name,
      nodeCount: Object.keys(doc.nodes).length,
      rootNodeId: doc.rootNodeId,
    },
    selectedNode: selectedNode
      ? {
          id: selectedNode.id,
          type: selectedNode.type,
          name: selectedNode.name,
          props: selectedNode.props,
          style: selectedNode.style as Record<string, unknown>,
          capabilities: selectedDef?.capabilities
            ? Object.entries(selectedDef.capabilities)
                .filter(([, v]) => Boolean(v))
                .map(([k]) => k)
            : undefined,
          propSchema: selectedDef?.propSchema
            .filter((s) => s.type !== "group")
            .map((s) => ({ key: s.key, label: s.label, type: s.type })),
        }
      : null,
    availableComponents: components.map((c) => ({
      type: c.type,
      name: c.name,
      category: c.category,
      capabilities: Object.entries(c.capabilities)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
      propSchema: c.propSchema
        .filter((s) => s.type !== "group")
        .map((s) => ({ key: s.key, label: s.label, type: s.type })),
    })),
    activeBreakpoint: state.editor.activeBreakpoint,
    pageNodes,
    availablePresets,
  };
}

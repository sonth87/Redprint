/**
 * buildAIContext — creates a serialisable snapshot of the builder state
 * for the AI assistant to reason about.
 */
import type { BuilderState, ComponentDefinition, PaletteCatalog } from "@ui-builder/builder-core";
import type { AIBuilderContext, AIPageNode, AIPageNodeSlim, AIPageNodeSummary, AIPresetGroup } from "./types";
import { serializeComponentsCompact, deriveNestingRules } from "./serializeComponents";
import { serializePresetsCompact } from "./serializePresets";

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
  /** Design tokens for consistent styling across AI-generated sections. Phase 2A. */
  designTokens?: AIBuilderContext["designTokens"];
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

  // Always build pageNodes (needed for fullPageMode clearing)
  // Phase 3A: Hierarchical page context (slim tree + focused nodes) when includePageContext is true
  const allPageNodes: Record<string, AIPageNode> = {};
  for (const node of Object.values(doc.nodes)) {
    allPageNodes[node.id] = {
      id: node.id,
      type: node.type,
      name: node.name,
      parentId: node.parentId,
      order: node.order,
      props: node.props,
      style: node.style as Record<string, unknown>,
    };
  }

  const pageNodes = allPageNodes;
  let pageNodesSummary: AIPageNodeSummary | undefined;

  if (options.includePageContext) {
    // Build slim tree for ALL nodes (structure only)
    const tree: Record<string, AIPageNodeSlim> = {};
    for (const node of Object.values(doc.nodes)) {
      tree[node.id] = {
        id: node.id,
        type: node.type,
        name: node.name,
        parentId: node.parentId,
        order: node.order,
      };
    }

    // Identify focused set: selected node + parent + all siblings
    const focusedIds = new Set<string>();
    if (selectedId) {
      focusedIds.add(selectedId);
      const selectedNode = doc.nodes[selectedId];
      if (selectedNode?.parentId && doc.nodes[selectedNode.parentId]) {
        focusedIds.add(selectedNode.parentId);
        // Add all siblings (same parent)
        for (const sibling of Object.values(doc.nodes)) {
          if (sibling.parentId === selectedNode.parentId) {
            focusedIds.add(sibling.id);
          }
        }
      }
    }

    // Build focused nodes map with full detail
    const focusedNodes: Record<string, AIPageNode> = {};
    for (const nodeId of focusedIds) {
      if (allPageNodes[nodeId]) {
        focusedNodes[nodeId] = allPageNodes[nodeId];
      }
    }

    pageNodesSummary = {
      tree,
      focusedNodes,
    };
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

  // Phase 1B: compact component manifest + nesting rules
  const componentsManifest = serializeComponentsCompact(components);
  const nestingRules = deriveNestingRules(components);

  // Phase 1C: compact preset summary
  const availablePresetsCompact = options.paletteCatalog ? serializePresetsCompact(options.paletteCatalog) : undefined;

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
            .filter((s) => s.type !== "group" && s.type !== "row")
            .map((s) => ({ key: s.key, label: (s as { label?: string }).label ?? s.key, type: s.type })),
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
        .filter((s) => s.type !== "group" && s.type !== "row")
        .map((s) => ({ key: s.key, label: (s as { label?: string }).label ?? s.key, type: s.type })),
    })),
    activeBreakpoint: state.editor.activeBreakpoint,
    pageNodes,
    pageNodesSummary,
    availablePresets,
    componentsManifest,
    nestingRules,
    availablePresetsCompact,
    // Phase 2A: design tokens from config
    designTokens: options.designTokens,
  };
}

/**
 * buildAIContext — creates a serialisable snapshot of the builder state
 * for the AI assistant to reason about.
 */
import type { BuilderState, ComponentDefinition, PaletteCatalog } from "@ui-builder/builder-core";
import type { AIBuilderContext, AIPageNode, AIPageNodeSlim, AIPageNodeSummary, AIPropSchemaEntry, AIPresetGroup, AIComponentHints } from "./types";
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

function serializeAIPropSchemaEntry(schema: ComponentDefinition["propSchema"][number]): AIPropSchemaEntry {
  const base: AIPropSchemaEntry = {
    key: schema.key,
    label: "label" in schema ? schema.label : schema.key,
    type: schema.type,
  };

  if ("required" in schema && schema.required !== undefined) base.required = schema.required;
  if ("default" in schema && schema.default !== undefined) base.default = schema.default;
  if ("min" in schema && schema.min !== undefined) base.min = schema.min;
  if ("max" in schema && schema.max !== undefined) base.max = schema.max;
  if ("step" in schema && schema.step !== undefined) base.step = schema.step;
  if ("unit" in schema && schema.unit !== undefined) base.unit = schema.unit;
  if ("multiple" in schema && schema.multiple !== undefined) base.multiple = schema.multiple;
  if ("options" in schema && Array.isArray(schema.options)) {
    base.options = schema.options.map((option) => ({ value: option.value, label: option.label }));
  }
  if ("children" in schema && Array.isArray(schema.children)) {
    base.children = schema.children.map(serializeAIPropSchemaEntry);
  }

  return base;
}

function serializeAIPropSchema(schema: ComponentDefinition["propSchema"] | undefined): AIPropSchemaEntry[] | undefined {
  if (!schema) return undefined;
  return schema.map(serializeAIPropSchemaEntry);
}

/**
 * Serialize a component's aiHints for the wire (roadmap 03/01). Caps list
 * fields so a component that over-declares (e.g. 20 bestFor) doesn't blow up
 * manifest token size; `excludeFromAI` components are filtered out entirely
 * before this runs (see `aiComponents` in buildAIContext), so it's omitted here.
 */
function serializeAIHints(hints: ComponentDefinition["aiHints"]): AIComponentHints | undefined {
  if (!hints) return undefined;
  return {
    purpose: hints.purpose,
    bestFor: hints.bestFor?.slice(0, 5),
    sectionAffinity: hints.sectionAffinity,
    contentSlots: hints.contentSlots,
    fallbackTo: hints.fallbackTo,
    examples: hints.examples?.slice(0, 3),
  };
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

  // Components that opt out of AI (roadmap 03/01, e.g. Anchor/PopupContent) are
  // never offered as something the AI can create — filtered before any AI-facing
  // serialization below. The selected-node lookup above stays against the full
  // list since the user may already have one on canvas.
  const aiComponents = components.filter((c) => !c.aiHints?.excludeFromAI);

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
  const componentsManifest = serializeComponentsCompact(aiComponents);
  const nestingRules = deriveNestingRules(aiComponents);

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
          propSchema: serializeAIPropSchema(selectedDef?.propSchema),
        }
      : null,
    availableComponents: aiComponents.map((c) => ({
      type: c.type,
      name: c.name,
      category: c.category,
      capabilities: Object.entries(c.capabilities)
        .filter(([, v]) => Boolean(v))
        .map(([k]) => k),
      propSchema: serializeAIPropSchema(c.propSchema),
      defaultProps: c.defaultProps,
      aiHints: serializeAIHints(c.aiHints),
    })),
    activeBreakpoint: state.editor.activeBreakpoint,
    activeSurface: state.editor.activePopupId && doc.popups?.[state.editor.activePopupId]
      ? {
          type: "popup",
          popupId: state.editor.activePopupId,
          rootNodeId: doc.popups[state.editor.activePopupId]!.rootNodeId,
          selection: state.editor.activePopupSelection ?? null,
        }
      : { type: "page" },
    availablePopups: Object.values(doc.popups ?? {}).map((popup) => ({
      id: popup.id,
      name: popup.name,
      enabled: popup.enabled,
      kind: popup.kind,
      placement: popup.placement,
      rootNodeId: popup.rootNodeId,
      autoTrigger: popup.autoTrigger.type,
    })),
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

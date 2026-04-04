/**
 * buildAIContext — creates a serialisable snapshot of the builder state
 * for the AI assistant to reason about.
 */
import type { BuilderState, ComponentDefinition } from "@ui-builder/builder-core";
import type { AIBuilderContext } from "./types";

export function buildAIContext(
  state: BuilderState,
  components: ComponentDefinition[],
): AIBuilderContext {
  const doc = state.document;
  const selectedId = state.editor.selectedNodeIds[0] ?? null;
  const selectedNode = selectedId ? doc.nodes[selectedId] : null;
  const selectedDef = selectedNode
    ? components.find((c) => c.type === selectedNode.type) ?? null
    : null;

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
  };
}

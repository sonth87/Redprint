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
        }
      : null,
    availableComponents: components.map((c) => ({
      type: c.type,
      name: c.name,
      category: c.category,
    })),
    activeBreakpoint: state.editor.activeBreakpoint,
  };
}

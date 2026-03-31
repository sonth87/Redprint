import { useBuilder } from "./useBuilder";
import type { BuilderDocument } from "@ui-builder/builder-core";

/**
 * Returns the current document and the root node.
 *
 * @example
 * const { document, rootNode } = useDocument();
 */
export function useDocument(): {
  document: BuilderDocument;
  rootNode: import("@ui-builder/builder-core").BuilderNode | undefined;
} {
  const { state } = useBuilder();
  return {
    document: state.document,
    rootNode: state.document.nodes[state.document.rootNodeId],
  };
}

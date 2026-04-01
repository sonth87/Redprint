/**
 * useNodeProperty — shared hook for reading & writing a node property.
 *
 * Used by BOTH the contextual toolbar and property panel.
 * Ensures they dispatch the exact same command type/payload.
 *
 * @example
 * const { value, setValue } = useNodeProperty(nodeId, STYLE_PROPERTIES.fontSize);
 */
import { useCallback, useMemo } from "react";
import { useBuilder } from "./useBuilder";
import type { PropertyDescriptor } from "@ui-builder/builder-core";

export function useNodeProperty<T>(
  nodeId: string | null,
  descriptor: PropertyDescriptor<T>,
) {
  const { state, dispatch } = useBuilder();
  const breakpoint = state.editor.activeBreakpoint;

  const node = nodeId ? state.document.nodes[nodeId] : undefined;

  const value = useMemo<T | undefined>(() => {
    if (!node) return undefined;
    return descriptor.getValue(node, breakpoint);
  }, [node, descriptor, breakpoint]);

  const setValue = useCallback(
    (newValue: T) => {
      if (!nodeId) return;
      const cmd = descriptor.toPayload(nodeId, newValue, breakpoint);
      dispatch({
        type: cmd.type,
        payload: cmd.payload,
        description: cmd.description,
      });
    },
    [nodeId, descriptor, breakpoint, dispatch],
  );

  return { value, setValue };
}

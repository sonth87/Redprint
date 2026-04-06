import { useState, useCallback, useEffect } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { CMD_ENTER_TEXT_EDIT, CMD_EXIT_TEXT_EDIT } from "@ui-builder/builder-core";
import type { BuilderNode, ComponentRegistry } from "@ui-builder/builder-core";

type DispatchFn = (action: { type: string; payload: unknown; description?: string }) => void;

interface UseInlineTextEditOptions {
  editingNodeId: string | null;
  editingPropKey: string | null;
  nodes: Record<string, BuilderNode>;
  registry: ComponentRegistry | null | undefined;
  dispatch: DispatchFn;
}

export interface UseInlineTextEditReturn {
  tiptapEditor: TiptapEditor | null;
  setTiptapEditor: (ed: TiptapEditor | null) => void;
  editingOverrideRect: { x: number; y: number; width: number; height: number } | null;
  setEditingOverrideRect: (r: { x: number; y: number; width: number; height: number } | null) => void;
  handleInlineCommit: (html: string) => void;
  handleInlineExit: () => void;
  handleCanvasDoubleClick: (e: React.MouseEvent) => void;
}

/**
 * Manages inline richtext editing state and handlers.
 * Clears tiptap editor + rect override whenever `editingNodeId` becomes null.
 */
export function useInlineTextEdit({
  editingNodeId,
  editingPropKey,
  nodes,
  registry,
  dispatch,
}: UseInlineTextEditOptions): UseInlineTextEditReturn {
  const [tiptapEditor, setTiptapEditor] = useState<TiptapEditor | null>(null);
  const [editingOverrideRect, setEditingOverrideRect] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  // Reset local state when exiting text-edit mode
  useEffect(() => {
    if (!editingNodeId) {
      setTiptapEditor(null);
      setEditingOverrideRect(null);
    }
  }, [editingNodeId]);

  const handleInlineCommit = useCallback(
    (html: string) => {
      if (!editingNodeId || !editingPropKey) return;
      dispatch({
        type: "UPDATE_PROPS",
        payload: { nodeId: editingNodeId, props: { [editingPropKey]: html } },
        description: `Update ${editingPropKey}`,
      });
    },
    [editingNodeId, editingPropKey, dispatch],
  );

  const handleInlineExit = useCallback(() => {
    setTiptapEditor(null);
    dispatch({
      type: CMD_EXIT_TEXT_EDIT,
      payload: {},
      description: "Exit text edit",
    });
  }, [dispatch]);

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (editingNodeId) return; // already editing
      const target = e.target as HTMLElement;
      const el = target.closest("[data-node-id]") as HTMLElement | null;
      if (!el) return;
      const nodeId = el.dataset.nodeId!;
      const node = nodes[nodeId];
      if (!node) return;
      const def = registry?.getComponent(node.type);
      if (!def?.capabilities.inlineEditable) return;
      const richtextProp = def.propSchema.find((p) => p.type === "richtext");
      if (!richtextProp) return;
      e.stopPropagation();
      dispatch({
        type: CMD_ENTER_TEXT_EDIT,
        payload: { nodeId, propKey: richtextProp.key },
        description: "Enter text edit",
      });
    },
    [editingNodeId, nodes, registry, dispatch],
  );

  return {
    tiptapEditor,
    setTiptapEditor,
    editingOverrideRect,
    setEditingOverrideRect,
    handleInlineCommit,
    handleInlineExit,
    handleCanvasDoubleClick,
  };
}

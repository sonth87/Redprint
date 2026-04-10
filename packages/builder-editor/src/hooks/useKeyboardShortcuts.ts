import { useEffect, useMemo, useRef } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import { ShortcutManager } from "../shortcuts/ShortcutManager";
import { v4 as uuidv4 } from "uuid";

interface ClipboardData {
  nodeIds: string[];
  operation: "copy" | "cut";
  snapshot: Record<string, BuilderNode>;
}

interface UseKeyboardShortcutsOptions {
  selectedNodeIds: string[];
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  clipboard: ClipboardData | null;
  breakpoint: string;
  /** When set, a node is in inline text-edit mode — arrow keys must not trigger nudge. */
  editingNodeId: string | null;
  canvasContainerRef: React.RefObject<HTMLElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string; groupId?: string }) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  setBreakpoint?: (bp: "desktop" | "mobile") => void;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteNodes?: (nodeIds: string[]) => void;
}

function collectSubtree(
  rootId: string,
  nodes: Record<string, BuilderNode>
): Record<string, BuilderNode> {
  const result: Record<string, BuilderNode> = {};
  const queue = [rootId];
  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes[id];
    if (node) {
      result[id] = node;
      for (const n of Object.values(nodes)) {
        if (n.parentId === id) queue.push(n.id);
      }
    }
  }
  return result;
}

export function useKeyboardShortcuts({
  selectedNodeIds,
  rootNodeId,
  nodes,
  clipboard,
  breakpoint,
  editingNodeId,
  canvasContainerRef,
  dispatch,
  clearSelection,
  undo,
  redo,
  setBreakpoint,
  onDeleteNode,
  onDeleteNodes,
}: UseKeyboardShortcutsOptions): void {
  const manager = useMemo(() => new ShortcutManager(), []);
  const selectedNodeId = selectedNodeIds[0] ?? null;

  // Refs for arrow nudge coalescing
  const nudgeGroupIdRef = useRef<string | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleUndoRedo = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) return;
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) { e.preventDefault(); redo(); return; }
    };
    window.addEventListener("keydown", handleUndoRedo);
    return () => window.removeEventListener("keydown", handleUndoRedo);
  }, [undo, redo]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = globalThis.document?.activeElement;
      const isTyping =
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.contentEditable === "true";

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && (e.key === "z" || e.key === "y")) return;

      const hasMultiSelect = selectedNodeIds.length > 1;

      // Copy
      if (ctrl && e.key === "c" && selectedNodeId && !isTyping) {
        e.preventDefault();
        const snapshot: Record<string, BuilderNode> = {};
        selectedNodeIds.forEach(id => {
          Object.assign(snapshot, collectSubtree(id, nodes));
        });
        dispatch({
          type: "SET_CLIPBOARD",
          payload: { data: { nodeIds: selectedNodeIds, operation: "copy", snapshot } },
          description: "Copy",
        });
        return;
      }

      // Paste
      if (ctrl && e.key === "v" && !isTyping) {
        e.preventDefault();
        if (!clipboard) return;
        clipboard.nodeIds.forEach(nodeId => {
          const src = clipboard.snapshot[nodeId];
          if (!src) return;
          dispatch({
            type: "ADD_NODE",
            payload: {
              nodeId: uuidv4(),
              parentId: src.parentId ?? rootNodeId,
              componentType: src.type,
              props: src.props,
              style: src.style,
            },
            description: "Paste",
          });
        });
        return;
      }

      // Duplicate
      if (ctrl && e.key === "d" && selectedNodeId && !isTyping) {
        e.preventDefault();
        if (hasMultiSelect) {
          const newNodeIds = selectedNodeIds.map(() => uuidv4());
          dispatch({
            type: "DUPLICATE_NODES",
            payload: { nodeIds: selectedNodeIds, offset: { x: 20, y: 20 }, newNodeIds },
            description: "Duplicate multiple",
          });
        } else {
          dispatch({
            type: "DUPLICATE_NODE",
            payload: { nodeId: selectedNodeId, offset: { x: 20, y: 20 }, newNodeId: uuidv4() },
            description: "Duplicate",
          });
        }
        return;
      }

      // Delete
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId && !isTyping) {
        if (selectedNodeIds.includes(rootNodeId)) return;
        e.preventDefault();

        if (hasMultiSelect) {
          if (onDeleteNodes) {
            onDeleteNodes(selectedNodeIds);
          } else {
            dispatch({ type: "REMOVE_NODES", payload: { nodeIds: selectedNodeIds }, description: "Delete multiple" });
          }
        } else {
          if (onDeleteNode) {
            onDeleteNode(selectedNodeId);
          } else {
            dispatch({ type: "REMOVE_NODE", payload: { nodeId: selectedNodeId }, description: "Delete" });
          }
        }
        return;
      }

      if (e.key === "Escape") { clearSelection(); return; }

      // Device Breakpoint Shortcuts
      if (!ctrl && !e.shiftKey && !e.altKey && setBreakpoint && !isTyping) {
        if (e.key === "d" || e.key === "D") { e.preventDefault(); setBreakpoint("desktop"); return; }
        if (e.key === "m" || e.key === "M") { e.preventDefault(); setBreakpoint("mobile"); return; }
      }

      // Nudge
      if (selectedNodeId && !ctrl && !editingNodeId && !isTyping) {
        
        const step = e.shiftKey ? 10 : 1;
        let dx = 0, dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;

        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
          if (!nudgeGroupIdRef.current) nudgeGroupIdRef.current = uuidv4();
          nudgeTimerRef.current = setTimeout(() => { nudgeGroupIdRef.current = null; }, 500);

          selectedNodeIds.forEach(id => {
            const node = nodes[id];
            if (!node) return;
            const left = parseFloat(String(node.style.left ?? "0")) || 0;
            const top = parseFloat(String(node.style.top ?? "0")) || 0;
            dispatch({
              type: "UPDATE_STYLE",
              payload: {
                nodeId: id,
                style: { position: "absolute", left: `${left + dx}px`, top: `${top + dy}px` },
                breakpoint,
              },
              groupId: nudgeGroupIdRef.current ?? undefined,
              description: "Nudge",
            });
          });
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeIds,
    selectedNodeId,
    nodes,
    rootNodeId,
    clipboard,
    dispatch,
    clearSelection,
    breakpoint,
    editingNodeId,
    canvasContainerRef,
    setBreakpoint,
    onDeleteNode,
    onDeleteNodes,
  ]);

  // Suppress unused variable warning for manager — available for future extension
  void manager;
}

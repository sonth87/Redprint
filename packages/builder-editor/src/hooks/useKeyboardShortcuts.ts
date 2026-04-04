import { useEffect, useMemo } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";
import { ShortcutManager } from "../shortcuts/ShortcutManager";
import { v4 as uuidv4 } from "uuid";

interface ClipboardData {
  nodeIds: string[];
  operation: "copy" | "cut";
  snapshot: Record<string, BuilderNode>;
}

interface UseKeyboardShortcutsOptions {
  selectedNodeId: string | null;
  rootNodeId: string;
  nodes: Record<string, BuilderNode>;
  clipboard: ClipboardData | null;
  breakpoint: string;
  canvasContainerRef: React.RefObject<HTMLElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
  clearSelection: () => void;
  undo: () => void;
  redo: () => void;
  setBreakpoint?: (bp: "desktop" | "mobile") => void;
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
  selectedNodeId,
  rootNodeId,
  nodes,
  clipboard,
  breakpoint,
  canvasContainerRef,
  dispatch,
  clearSelection,
  undo,
  redo,
  setBreakpoint,
}: UseKeyboardShortcutsOptions): void {
  const manager = useMemo(() => new ShortcutManager(), []);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey;

      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        redo();
        return;
      }

      if (ctrl && e.key === "c" && selectedNodeId) {
        e.preventDefault();
        const snapshot = collectSubtree(selectedNodeId, nodes);
        dispatch({
          type: "SET_CLIPBOARD",
          payload: {
            data: { nodeIds: [selectedNodeId], operation: "copy", snapshot },
          },
          description: "Copy",
        });
        return;
      }

      if (ctrl && e.key === "v") {
        e.preventDefault();
        if (!clipboard) return;
        for (const nodeId of clipboard.nodeIds) {
          const src = clipboard.snapshot[nodeId];
          if (!src) continue;
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
        }
        return;
      }

      if (ctrl && e.key === "d" && selectedNodeId) {
        e.preventDefault();
        dispatch({
          type: "DUPLICATE_NODE",
          payload: {
            nodeId: selectedNodeId,
            offset: { x: 20, y: 20 },
            newNodeId: uuidv4(),
          },
          description: "Duplicate",
        });
        return;
      }

      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedNodeId &&
        selectedNodeId !== rootNodeId
      ) {
        const active = globalThis.document?.activeElement;
        if (
          active?.tagName === "INPUT" ||
          active?.tagName === "TEXTAREA" ||
          (active as HTMLElement)?.contentEditable === "true"
        )
          return;
        e.preventDefault();
        dispatch({
          type: "REMOVE_NODE",
          payload: { nodeId: selectedNodeId },
          description: "Delete",
        });
        return;
      }

      if (e.key === "Escape") {
        clearSelection();
        return;
      }

      // Device breakpoint shortcuts (D = desktop, M = mobile)
      // Only fire when not typing in an input
      if (!ctrl && !e.shiftKey && !e.altKey && setBreakpoint) {
        const active = globalThis.document?.activeElement;
        const isTyping =
          active?.tagName === "INPUT" ||
          active?.tagName === "TEXTAREA" ||
          (active as HTMLElement)?.contentEditable === "true";
        if (!isTyping) {
          if (e.key === "d" || e.key === "D") {
            e.preventDefault();
            setBreakpoint("desktop");
            return;
          }
          if (e.key === "m" || e.key === "M") {
            e.preventDefault();
            setBreakpoint("mobile");
            return;
          }
        }
      }

      if (selectedNodeId && !ctrl) {
        const step = e.shiftKey ? 10 : 1;
        let dx = 0;
        let dy = 0;
        if (e.key === "ArrowLeft") dx = -step;
        if (e.key === "ArrowRight") dx = step;
        if (e.key === "ArrowUp") dy = -step;
        if (e.key === "ArrowDown") dy = step;
        if (dx !== 0 || dy !== 0) {
          e.preventDefault();
          const node = nodes[selectedNodeId];
          if (!node) return;
          const left = parseFloat(String(node.style.left ?? "0")) || 0;
          const top = parseFloat(String(node.style.top ?? "0")) || 0;
          dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId: selectedNodeId,
              style: {
                position: "absolute",
                left: `${left + dx}px`,
                top: `${top + dy}px`,
              },
              breakpoint,
            },
            description: "Nudge",
          });
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [
    selectedNodeId,
    nodes,
    rootNodeId,
    clipboard,
    undo,
    redo,
    dispatch,
    clearSelection,
    breakpoint,
    canvasContainerRef,
    setBreakpoint,
  ]);

  // Suppress unused variable warning for manager — available for future extension
  void manager;
}

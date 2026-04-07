/**
 * useFigmaImport — orchestration hook for the Figma import flow.
 *
 * Handles:
 *  - PAT persistence in localStorage
 *  - URL parsing
 *  - API fetch (via Vite proxy)
 *  - Figma → BuilderNode mapping
 *  - Batch dispatching ADD_NODE commands onto the canvas
 */

import { useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useBuilder } from "@ui-builder/builder-react";
import { parseFigmaUrl } from "../figma/figmaUrlParser";
import { fetchFigmaNode } from "../figma/figmaApiClient";
import { mapFigmaNodeToBuilder } from "../figma/figmaMapper";
import type { BuilderNode } from "@ui-builder/builder-core";

const PAT_STORAGE_KEY = "figma_personal_access_token";

export type FigmaImportMode = "add" | "replace";

export interface FigmaImportState {
  /** PAT value (stored in localStorage) */
  pat: string;
  setPat: (value: string) => void;

  isLoading: boolean;
  /** Current status message to show in the dialog */
  status: string;
  error: string | null;

  /** Kick off the import */
  handleImport: (url: string, mode: FigmaImportMode) => Promise<void>;
  /** Reset error/status */
  reset: () => void;
}

export function useFigmaImport(onSuccess?: () => void): FigmaImportState {
  const { dispatch, state } = useBuilder();

  const [pat, _setPat] = useState<string>(
    () => localStorage.getItem(PAT_STORAGE_KEY) ?? ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  const setPat = useCallback((value: string) => {
    _setPat(value);
    if (value) {
      localStorage.setItem(PAT_STORAGE_KEY, value);
    } else {
      localStorage.removeItem(PAT_STORAGE_KEY);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setStatus("");
  }, []);

  const handleImport = useCallback(
    async (url: string, mode: FigmaImportMode) => {
      setError(null);
      setIsLoading(true);

      try {
        // ── Step 1: Parse URL ────────────────────────────────────────────
        setStatus("Đang phân tích URL Figma...");
        const { fileKey, nodeId } = parseFigmaUrl(url);

        if (!nodeId) {
          throw new Error(
            "URL chưa chứa node-id. Hãy chọn một frame/group cụ thể trên Figma rồi copy URL (F — Share frame link)."
          );
        }

        // ── Step 2: Fetch from Figma API ─────────────────────────────────
        setStatus("Đang tải dữ liệu từ Figma...");
        const response = await fetchFigmaNode(fileKey, nodeId, pat);

        // The response.nodes is keyed by node-id (with ":" separator)
        const normalizedNodeId = nodeId;
        const nodeEntry = response.nodes[normalizedNodeId];
        if (!nodeEntry) {
          // Try URL-encoded variant
          const altKey = Object.keys(response.nodes)[0];
          if (!altKey) {
            throw new Error("Figma API trả về dữ liệu rỗng. Kiểm tra lại node-id.");
          }
          const figmaNode = response.nodes[altKey]?.document;
          if (!figmaNode) throw new Error("Không đọc được dữ liệu từ Figma.");
          return _applyNodes(figmaNode, mode);
        }

        // ── Step 3: Map → BuilderNodes ────────────────────────────────────
        setStatus("Đang chuyển đổi sang Builder format...");
        const figmaNode = nodeEntry.document;
        await _applyNodes(figmaNode, mode);

      } catch (err) {
        setError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.");
      } finally {
        setIsLoading(false);
        setStatus("");
      }

      async function _applyNodes(figmaNode: Parameters<typeof mapFigmaNodeToBuilder>[0], mode: FigmaImportMode) {
        setStatus("Đang render lên canvas...");

        const rootNodeId = state.document.rootNodeId;

        // Find a Section to attach to (or create one)
        const sections = Object.values(state.document.nodes)
          .filter((n) => n.parentId === rootNodeId)
          .sort((a, b) => a.order - b.order);

        let parentId: string;
        let insertOrder: number;

        if (mode === "replace") {
          // Delete all existing sections, then add into root
          // For simplicity in Phase 1: just add as a new section after existing ones
          parentId = rootNodeId;
          insertOrder = sections.length;
        } else {
          // "add" mode: append as a new section
          parentId = rootNodeId;
          insertOrder = sections.length;
        }

        // Create a wrapper Section node first
        const sectionId = uuidv4();
        const sectionNode: BuilderNode = {
          id: sectionId,
          type: "Section",
          parentId,
          order: insertOrder,
          props: { minHeight: 400 },
          style: {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            minHeight: "400px",
            position: "relative",
            backgroundColor: "#ffffff",
          },
          responsiveStyle: {},
          interactions: [],
          name: `Figma: ${figmaNode.name}`,
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };

        // Now map the figma tree, attaching to the section
        const { nodes: mappedNodes, rootId } = mapFigmaNodeToBuilder(figmaNode, sectionId, 0);

        // Dispatch section first
        dispatch({
          type: "ADD_NODE",
          payload: {
            nodeId: sectionId,
            parentId,
            componentType: "Section",
            props: sectionNode.props,
            style: sectionNode.style,
            insertIndex: insertOrder,
          },
          description: `Import Figma: ${figmaNode.name}`,
        } as never);

        // Dispatch the root mapped node and all descendants
        // We need to batch them via multiple ADD_NODE commands
        // Dispatch in BFS order so parents exist before children
        const ordered = bfsOrder(mappedNodes, rootId);
        for (const node of ordered) {
          dispatch({
            type: "ADD_NODE",
            payload: {
              nodeId: node.id,
              parentId: node.parentId ?? sectionId,
              componentType: node.type,
              props: node.props,
              style: node.style,
              insertIndex: node.order,
              name: node.name,
            },
            description: `Figma node: ${node.name}`,
          } as never);
        }

        onSuccess?.();
      }
    },
    [dispatch, pat, state.document, onSuccess]
  );

  return { pat, setPat, isLoading, status, error, handleImport, reset };
}

// ── BFS traversal helper ───────────────────────────────────────────────────

function bfsOrder(
  nodes: Record<string, BuilderNode>,
  rootId: string
): BuilderNode[] {
  const result: BuilderNode[] = [];
  const queue: string[] = [rootId];

  while (queue.length > 0) {
    const id = queue.shift()!;
    const node = nodes[id];
    if (!node) continue;
    result.push(node);

    // Enqueue children sorted by order
    const children = Object.values(nodes)
      .filter((n) => n.parentId === id)
      .sort((a, b) => a.order - b.order);
    children.forEach((c) => queue.push(c.id));
  }

  return result;
}

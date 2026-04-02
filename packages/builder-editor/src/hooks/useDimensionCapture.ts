import { useEffect } from "react";
import type { BuilderNode } from "@ui-builder/builder-core";

interface UseDimensionCaptureOptions {
  nodes: Record<string, BuilderNode>;
  breakpoint: string;
  canvasFrameRef: React.RefObject<HTMLDivElement | null>;
  dispatch: (action: { type: string; payload: unknown; description?: string }) => void;
}

export function useDimensionCapture({
  nodes,
  breakpoint,
  canvasFrameRef,
  dispatch,
}: UseDimensionCaptureOptions): void {
  useEffect(() => {
    if (!canvasFrameRef.current) return;
    for (const [nodeId, node] of Object.entries(nodes)) {
      const n = node as BuilderNode;
      if (n.style?.position === "absolute" && !n.style.width && !n.style.height) {
        const el = canvasFrameRef.current.querySelector(
          `[data-node-id="${nodeId}"]`
        ) as HTMLElement;
        if (el && el.offsetWidth > 0 && el.offsetHeight > 0) {
          dispatch({
            type: "UPDATE_STYLE",
            payload: {
              nodeId,
              style: {
                width: `${el.offsetWidth}px`,
                height: `${el.offsetHeight}px`,
              },
              breakpoint,
            },
            description: "Capture component dimensions",
          });
        }
      }
    }
  }, [nodes, breakpoint, dispatch, canvasFrameRef]);
}

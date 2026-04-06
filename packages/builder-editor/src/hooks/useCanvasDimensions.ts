import { useMemo } from "react";
import { DEVICE_VIEWPORT_PRESETS } from "@ui-builder/builder-core";
import { DEFAULT_SECTION_HEIGHT_PX } from "@ui-builder/shared";
import type { BuilderDocument, BuilderNode } from "@ui-builder/builder-core";

interface UseCanvasDimensionsOptions {
  document: BuilderDocument;
  breakpoint: string;
}

export interface UseCanvasDimensionsReturn {
  canvasWidth: number;
  canvasMinHeight: number;
  sectionNodes: BuilderNode[];
  sectionsTotalHeight: number;
}

/**
 * Derives canvas width, minimum height, and ordered section list from the
 * active breakpoint and document config.
 */
export function useCanvasDimensions({ document, breakpoint }: UseCanvasDimensionsOptions): UseCanvasDimensionsReturn {
  const preset = DEVICE_VIEWPORT_PRESETS[breakpoint as keyof typeof DEVICE_VIEWPORT_PRESETS];

  const canvasWidth =
    breakpoint === "desktop"
      ? (document.canvasConfig.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width)
      : (preset?.width ?? DEVICE_VIEWPORT_PRESETS.desktop.width);

  const sectionNodes = useMemo(
    () =>
      Object.values(document.nodes)
        .filter((n) => n.parentId === document.rootNodeId && n.type === "Section")
        .sort((a, b) => a.order - b.order),
    [document.nodes, document.rootNodeId],
  );

  const sectionsTotalHeight = useMemo(() => {
    if (sectionNodes.length === 0) return 0;
    return sectionNodes.reduce((sum, n) => {
      const h = typeof n.props.minHeight === "number" ? n.props.minHeight : DEFAULT_SECTION_HEIGHT_PX;
      return sum + h;
    }, 0);
  }, [sectionNodes]);

  const canvasMinHeight =
    sectionsTotalHeight > 0
      ? sectionsTotalHeight
      : breakpoint === "desktop"
        ? (document.canvasConfig.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height)
        : (preset?.height ?? DEVICE_VIEWPORT_PRESETS.desktop.height);

  return { canvasWidth, canvasMinHeight, sectionNodes, sectionsTotalHeight };
}

/**
 * figmaApiClient — calls the Figma REST API to fetch node data.
 *
 * In development (Vite dev server), requests are routed through the proxy
 * at /figma-api → https://api.figma.com to bypass CORS.
 *
 * API reference: https://www.figma.com/developers/api#files-nodes-endpoint
 */

/** Minimal typing for the Figma /files/{key}/nodes response */
export interface FigmaNodesResponse {
  name: string;
  nodes: Record<
    string,
    {
      document: FigmaNode;
      components: Record<string, unknown>;
      schemaVersion: number;
      styles: Record<string, unknown>;
    }
  >;
}

export interface FigmaColor {
  r: number; // 0-1
  g: number; // 0-1
  b: number; // 0-1
  a: number; // 0-1
}

export interface FigmaPaint {
  type: "SOLID" | "GRADIENT_LINEAR" | "GRADIENT_RADIAL" | "GRADIENT_ANGULAR" | "GRADIENT_DIAMOND" | "IMAGE" | "EMOJI" | "VIDEO";
  visible?: boolean;
  opacity?: number;
  color?: FigmaColor;
  imageRef?: string;
  gradientHandlePositions?: unknown[];
  gradientStops?: unknown[];
}

export interface FigmaEffect {
  type: "DROP_SHADOW" | "INNER_SHADOW" | "LAYER_BLUR" | "BACKGROUND_BLUR";
  visible?: boolean;
  radius?: number;
  color?: FigmaColor;
  offset?: { x: number; y: number };
  spread?: number;
}

export interface FigmaTypeStyle {
  fontFamily?: string;
  fontPostScriptName?: string;
  fontSize?: number;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeightPx?: number;
  lineHeightPercent?: number;
  italic?: boolean;
  textDecoration?: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  textAlignHorizontal?: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED";
  textCase?: "ORIGINAL" | "UPPER" | "LOWER" | "TITLE";
}

export interface FigmaBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FigmaNode {
  id: string;
  name: string;
  type: string;
  visible?: boolean;
  children?: FigmaNode[];

  // Layout
  absoluteBoundingBox?: FigmaBoundingBox;
  absoluteRenderBounds?: FigmaBoundingBox;
  constraints?: { vertical: string; horizontal: string };

  // Auto Layout
  layoutMode?: "NONE" | "HORIZONTAL" | "VERTICAL";
  primaryAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "SPACE_BETWEEN";
  counterAxisAlignItems?: "MIN" | "MAX" | "CENTER" | "BASELINE";
  primaryAxisSizingMode?: "FIXED" | "AUTO";
  counterAxisSizingMode?: "FIXED" | "AUTO";
  itemSpacing?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  layoutWrap?: "NO_WRAP" | "WRAP";
  layoutSizingHorizontal?: "FIXED" | "HUG" | "FILL";
  layoutSizingVertical?: "FIXED" | "HUG" | "FILL";
  layoutAlign?: "INHERIT" | "STRETCH" | "MIN" | "CENTER" | "MAX";
  layoutGrow?: number;
  layoutPositioning?: "AUTO" | "ABSOLUTE";

  // Visual
  fills?: FigmaPaint[];
  strokes?: FigmaPaint[];
  strokeWeight?: number;
  strokeAlign?: "INSIDE" | "OUTSIDE" | "CENTER";
  cornerRadius?: number;
  rectangleCornerRadii?: [number, number, number, number];
  opacity?: number;
  effects?: FigmaEffect[];
  blendMode?: string;
  clipsContent?: boolean;

  // Text specific
  characters?: string;
  style?: FigmaTypeStyle;
  characterStyleOverrides?: number[];
  styleOverrideTable?: Record<string, FigmaTypeStyle>;

  // Rotation
  rotation?: number;
}

// ── API Fetch ──────────────────────────────────────────────────────────────

const FIGMA_API_BASE = "/figma-api";

/**
 * Fetch a Figma node (and its children) by file key and node ID.
 * Uses the Vite dev proxy to avoid CORS issues.
 */
export async function fetchFigmaNode(
  fileKey: string,
  nodeId: string,
  personalAccessToken: string
): Promise<FigmaNodesResponse> {
  // Figma API expects node-id with ":" separator, URL-encoded
  const encodedNodeId = encodeURIComponent(nodeId);
  const url = `${FIGMA_API_BASE}/v1/files/${fileKey}/nodes?ids=${encodedNodeId}&depth=999`;

  const response = await fetch(url, {
    headers: {
      "X-Figma-Token": personalAccessToken,
    },
  });

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail = body?.message ?? body?.err ?? "";
    } catch {
      // ignore parse error
    }

    if (response.status === 403) {
      throw new Error(
        `Không có quyền truy cập file Figma. Kiểm tra lại Personal Access Token.${detail ? ` (${detail})` : ""}`
      );
    }
    if (response.status === 404) {
      throw new Error(
        "Không tìm thấy file hoặc node Figma. Kiểm tra lại URL."
      );
    }
    throw new Error(
      `Figma API lỗi ${response.status}${detail ? `: ${detail}` : ""}`
    );
  }

  return response.json() as Promise<FigmaNodesResponse>;
}

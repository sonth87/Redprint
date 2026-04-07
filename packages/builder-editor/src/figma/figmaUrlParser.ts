/**
 * figmaUrlParser — extract fileKey and nodeId from a Figma URL.
 *
 * Supported URL formats:
 *   https://www.figma.com/file/<fileKey>/...?node-id=<nodeId>
 *   https://www.figma.com/design/<fileKey>/...?node-id=<nodeId>
 *   https://www.figma.com/proto/<fileKey>/...?node-id=<nodeId>
 */

export interface FigmaUrlParts {
  fileKey: string;
  /** Raw node-id from URL, e.g. "123-456" or "123%3A456" */
  nodeId: string | null;
}

/**
 * Parse a Figma URL and return { fileKey, nodeId }.
 * Throws if the URL is not a valid Figma file/design/proto URL.
 */
export function parseFigmaUrl(rawUrl: string): FigmaUrlParts {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("URL không hợp lệ. Vui lòng kiểm tra lại.");
  }

  const host = url.hostname.toLowerCase();
  if (!host.includes("figma.com")) {
    throw new Error("URL phải là URL Figma (figma.com).");
  }

  // pathname is like: /file/<key>/Title  or  /design/<key>/Title  or  /proto/<key>/Title
  const segments = url.pathname.split("/").filter(Boolean);
  const typeIndex = segments.findIndex((s) =>
    ["file", "design", "proto", "board"].includes(s)
  );
  if (typeIndex === -1 || !segments[typeIndex + 1]) {
    throw new Error(
      "Không tìm thấy file key trong URL. Hãy copy URL trực tiếp từ thanh địa chỉ Figma."
    );
  }

  const fileKey = segments[typeIndex + 1]!;

  // node-id can be encoded as "123%3A456" or "123-456"
  const rawNodeId =
    url.searchParams.get("node-id") ?? url.searchParams.get("node_id");
  const nodeId = rawNodeId ? decodeNodeId(rawNodeId) : null;

  return { fileKey, nodeId };
}

/**
 * Normalize node-id to "123:456" format (colon-separated).
 * Figma URLs sometimes use "-" or "%3A" as separator.
 */
export function decodeNodeId(raw: string): string {
  // Decode percent-encoded colon  "%3A" → ":"
  const decoded = decodeURIComponent(raw);
  // Some formats use "-" instead of ":"  e.g. "123-456"
  // but "0:1" is also valid — only replace first occurrence ambiguity
  // Figma's own format is "123:456"
  return decoded.replace(/-(?=\d)/, ":");
}

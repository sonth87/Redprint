/**
 * URL guard — SSRF-safe scheme/host validation shared across packages.
 *
 * `isPrivateHost` mirrors apps/api/src/services/url-guard.ts (server-side guard for
 * AI-supplied media/link values). `isSafeFetchEndpoint` is a stricter variant for the
 * `triggerApi` interaction action (packages/builder-renderer), where the URL is a
 * fetch() target configured by the page author rather than displayed content — see
 * docs/roadmap/01-interactions-events/01-runtime-dead-actions.md, section 3.4.
 */

/** Hostnames / IP patterns that must never be reachable from a client-side fetch. */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;

  // IPv4 private / loopback / link-local / metadata ranges.
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127) return true; // loopback
    if (a === 10) return true; // private
    if (a === 192 && b === 168) return true; // private
    if (a === 172 && b >= 16 && b <= 31) return true; // private
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 0) return true;
  }

  return false;
}

/**
 * Validate an endpoint URL for the `triggerApi` interaction action before fetch()
 * is called. Unlike `isPrivateHost` callers that reject-and-fallback on AI content,
 * this is a hard allow/deny gate — a rejected endpoint means the action is a no-op.
 *
 * Allowed: `https://` to a non-private host, or `http://localhost`/`http://127.0.0.1`
 * (local dev backends). Rejected: everything else — `http:` to a real host,
 * `javascript:`, `data:`, private/loopback/link-local IPs, malformed URLs.
 */
export function isSafeFetchEndpoint(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return false;
  }

  if (url.protocol === "https:") {
    return !isPrivateHost(url.hostname);
  }

  if (url.protocol === "http:") {
    const host = url.hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  }

  return false;
}

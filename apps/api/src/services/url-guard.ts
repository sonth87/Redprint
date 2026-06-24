/**
 * URL guard — SSRF-safe validation for AI-supplied URLs.
 *
 * The LLM can emit arbitrary `src` / `href` / `link` values. Even though these
 * become plain HTML attributes (not server-side fetches), we treat the model as
 * untrusted input (blueprint 12-security §1, §3): reject links that point at
 * private / internal / metadata hosts, and reject unexpected schemes.
 */

/** Hostnames / IP patterns that must never appear in an AI-supplied absolute URL. */
function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets

  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1" || host === "0.0.0.0") return true;

  // IPv4 private / loopback / link-local / metadata ranges.
  const v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 127) return true;                          // loopback
    if (a === 10) return true;                           // private
    if (a === 192 && b === 168) return true;             // private
    if (a === 172 && b >= 16 && b <= 31) return true;    // private
    if (a === 169 && b === 254) return true;             // link-local / cloud metadata
    if (a === 0) return true;
  }

  return false;
}

/**
 * Validate an AI-supplied image/media `src`. Returns a trimmed safe value, or
 * `null` if it should be rejected (caller falls back to a known-good image).
 *
 * Allowed: `https://` (non-private host), `data:image/…`, root-relative `/path`.
 * Rejected: `http://`, private hosts, and anything else.
 */
export function safeMediaUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed; // root-relative
  if (/^data:image\//i.test(trimmed)) return trimmed;

  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (isPrivateHost(url.hostname)) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  return null; // http:// and unknown schemes rejected
}

/**
 * Validate an AI-supplied link `href` (nav items, gallery links). Returns a safe
 * value or `null` to drop the link (keeping the surrounding element).
 *
 * Allowed: in-page anchors (`#id`), root-relative paths (`/path`),
 * `mailto:` / `tel:`, and `https://` to a non-private host.
 * Rejected: `http://`, private hosts, `javascript:`, and unknown schemes.
 */
export function safeLinkUrl(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("#")) return trimmed;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  if (/^(mailto:|tel:)/i.test(trimmed)) return trimmed;

  if (/^https:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (isPrivateHost(url.hostname)) return null;
      return trimmed;
    } catch {
      return null;
    }
  }

  return null; // http://, javascript:, data:, unknown schemes rejected
}

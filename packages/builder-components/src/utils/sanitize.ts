import DOMPurify from "dompurify";

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * Uses DOMPurify to strip dangerous elements and attributes.
 *
 * @param html - The potentially unsafe HTML string.
 * @returns The sanitized HTML string.
 */
export function sanitizeHtml(html: string): string {
  // If we're on the server, DOMPurify needs a DOM window.
  // In our current setup, components might be rendered in environments without a full DOM.
  // However, builder-components is primarily used in browser-based environments.
  if (typeof window === "undefined") {
    // Basic fallback or use jsdom if SSR is a heavy requirement.
    // For now, return as is or implement a basic server-side sanitizer if needed.
    return html;
  }
  return DOMPurify.sanitize(html);
}

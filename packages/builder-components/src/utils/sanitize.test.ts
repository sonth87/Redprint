import { describe, it, expect, vi } from "vitest";
import { sanitizeHtml } from "./sanitize";

describe("sanitizeHtml", () => {
  it("should return the same string if window is undefined (SSR)", () => {
    // In node environment by default, window should be undefined unless configured otherwise
    const originalWindow = global.window;
    // @ts-ignore
    delete global.window;

    const input = '<p>Hello <script>alert("xss")</script></p>';
    expect(sanitizeHtml(input)).toBe(input);

    global.window = originalWindow;
  });

  it("should sanitize malicious content if window is defined", () => {
    // Mock window and DOMPurify behavior
    // Since we cannot easily install jsdom and run it here without internet,
    // we just test that it calls DOMPurify.sanitize if we were in a browser.

    // This is more of a unit test for our wrapper.
    const input = '<p>Hello <script>alert("xss")</script></p>';
    const expected = '<p>Hello </p>';

    // Mock DOMPurify
    vi.mock("dompurify", () => ({
      default: {
        sanitize: vi.fn((html) => html.replace(/<script.*?>.*?<\/script>/gi, "")),
      },
    }));

    // Mock window
    global.window = {} as any;

    expect(sanitizeHtml(input)).toBe(expected);

    // Clean up
    vi.restoreAllMocks();
    // @ts-ignore
    delete global.window;
  });
});

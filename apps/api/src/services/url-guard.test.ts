import { describe, expect, it } from "vitest";
import { safeLinkUrl, safeMediaUrl } from "./url-guard.js";

describe("safeMediaUrl", () => {
  it("allows https images on public hosts", () => {
    expect(safeMediaUrl("https://images.unsplash.com/photo.jpg")).toBe(
      "https://images.unsplash.com/photo.jpg",
    );
  });

  it("allows data:image and root-relative paths", () => {
    expect(safeMediaUrl("data:image/png;base64,AAAA")).toBe("data:image/png;base64,AAAA");
    expect(safeMediaUrl("/assets/hero.png")).toBe("/assets/hero.png");
  });

  it("rejects http and private/internal hosts", () => {
    expect(safeMediaUrl("http://images.unsplash.com/photo.jpg")).toBeNull();
    expect(safeMediaUrl("https://localhost/secret.png")).toBeNull();
    expect(safeMediaUrl("https://127.0.0.1/x.png")).toBeNull();
    expect(safeMediaUrl("https://10.0.0.5/x.png")).toBeNull();
    expect(safeMediaUrl("https://192.168.1.1/x.png")).toBeNull();
    expect(safeMediaUrl("https://169.254.169.254/latest/meta-data")).toBeNull();
    expect(safeMediaUrl("https://172.16.0.1/x.png")).toBeNull();
  });

  it("rejects empty / undefined", () => {
    expect(safeMediaUrl(undefined)).toBeNull();
    expect(safeMediaUrl("   ")).toBeNull();
  });
});

describe("safeLinkUrl", () => {
  it("allows anchors, root-relative, mailto, tel and public https", () => {
    expect(safeLinkUrl("#pricing")).toBe("#pricing");
    expect(safeLinkUrl("/contact")).toBe("/contact");
    expect(safeLinkUrl("mailto:hi@example.com")).toBe("mailto:hi@example.com");
    expect(safeLinkUrl("tel:+15551234")).toBe("tel:+15551234");
    expect(safeLinkUrl("https://example.com/page")).toBe("https://example.com/page");
  });

  it("rejects http, javascript, and private hosts", () => {
    expect(safeLinkUrl("http://example.com")).toBeNull();
    expect(safeLinkUrl("javascript:alert(1)")).toBeNull();
    expect(safeLinkUrl("https://localhost/admin")).toBeNull();
    expect(safeLinkUrl("https://192.168.0.10/")).toBeNull();
  });
});

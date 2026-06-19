import { describe, expect, it } from "vitest";
import {
  findActiveMenuItem,
  flattenVisibleMenuItems,
  isSafeMenuHref,
  normalizeMenuItems,
  resolveMenuHref,
} from "./menu";

describe("menu helpers", () => {
  it("normalizes legacy href items into V2 targets", () => {
    const items = normalizeMenuItems([
      { label: "Home", href: "#home" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "https://example.com/contact" },
    ]);

    expect(items[0]?.target).toEqual({ type: "anchor", anchorId: "home", behavior: "smooth" });
    expect(items[1]?.target).toEqual({ type: "page", path: "/about" });
    expect(items[2]?.target).toEqual({ type: "url", url: "https://example.com/contact", target: "_self" });
    expect(items.every((item) => item.id)).toBe(true);
  });

  it("keeps nested V2 children and excludes hidden items from flat visible output", () => {
    const items = normalizeMenuItems([
      {
        id: "services",
        label: "Services",
        target: { type: "anchor", anchorId: "services" },
        children: [
          { id: "booking", label: "Booking", target: { type: "page", path: "/booking" } },
          { id: "hidden", label: "Hidden", hidden: true, target: { type: "none" } },
        ],
      },
    ]);

    expect(items[0]?.children?.length).toBe(2);
    expect(flattenVisibleMenuItems(items).map(({ item }) => item.id)).toEqual(["services", "booking"]);
  });

  it("sanitizes unsafe hrefs", () => {
    expect(isSafeMenuHref("javascript:alert(1)")).toBe(false);
    expect(isSafeMenuHref("data:text/html,boom")).toBe(false);
    expect(resolveMenuHref({ type: "url", url: "javascript:alert(1)" })).toBe("#");
    expect(resolveMenuHref({ type: "url", url: "mailto:hello@example.com" })).toBe("mailto:hello@example.com");
  });

  it("finds active anchor/page items and child matches", () => {
    const items = normalizeMenuItems([
      {
        id: "work",
        label: "Work",
        target: { type: "anchor", anchorId: "work" },
        children: [{ id: "case-study", label: "Case Study", target: { type: "page", path: "/case-study/" } }],
      },
    ]);

    expect(findActiveMenuItem(items, { activeAnchorId: "work" })?.id).toBe("work");
    expect(findActiveMenuItem(items, { pathname: "/case-study" })?.id).toBe("case-study");
  });
});

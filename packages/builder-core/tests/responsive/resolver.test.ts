import { describe, it, expect } from "vitest";
import { resolveStyle, resolveProps, resolveVisibility } from "../../src/responsive/resolver";
import type { BuilderNode, StyleConfig } from "../../src/document/types";

// ── resolveStyle ────────────────────────────────────────────────────────────

describe("resolveStyle", () => {
  const base: StyleConfig = { width: "100%", height: "auto", fontSize: "16px" };

  it("returns base style when no override for breakpoint", () => {
    const result = resolveStyle(base, {}, "mobile");
    expect(result).toEqual(base);
  });

  it("returns base style when responsiveStyle is undefined for breakpoint", () => {
    const result = resolveStyle(base, { desktop: { fontSize: "18px" } }, "mobile");
    expect(result).toEqual(base);
  });

  it("shallow merges override on top of base", () => {
    const result = resolveStyle(base, { mobile: { fontSize: "12px", color: "red" } }, "mobile");
    expect(result).toEqual({ width: "100%", height: "auto", fontSize: "12px", color: "red" });
  });

  it("does not mutate base style", () => {
    const original = { ...base };
    resolveStyle(base, { mobile: { fontSize: "12px" } }, "mobile");
    expect(base).toEqual(original);
  });

  it("returns base style unchanged for desktop when no desktop override", () => {
    const result = resolveStyle(base, { mobile: { fontSize: "12px" } }, "desktop");
    expect(result).toEqual(base);
  });

  it("applies desktop override when breakpoint is desktop", () => {
    const result = resolveStyle(base, { desktop: { fontSize: "20px" } }, "desktop");
    expect(result.fontSize).toBe("20px");
  });
});

// ── resolveProps ────────────────────────────────────────────────────────────

describe("resolveProps", () => {
  const baseProps = { text: "Hello world", color: "blue", count: 3 };

  it("returns base props when responsiveProps is undefined", () => {
    const result = resolveProps(baseProps, undefined, "mobile");
    expect(result).toEqual(baseProps);
  });

  it("returns base props when no override for breakpoint", () => {
    const result = resolveProps(baseProps, {}, "mobile");
    expect(result).toEqual(baseProps);
  });

  it("shallow merges override on top of base props", () => {
    const result = resolveProps(
      baseProps,
      { mobile: { text: "Hi", count: 1 } },
      "mobile",
    );
    expect(result).toEqual({ text: "Hi", color: "blue", count: 1 });
  });

  it("does not affect desktop when mobile override exists", () => {
    const result = resolveProps(
      baseProps,
      { mobile: { text: "Hi" } },
      "desktop",
    );
    expect(result).toEqual(baseProps);
  });

  it("does not mutate baseProps", () => {
    const original = { ...baseProps };
    resolveProps(baseProps, { mobile: { text: "Hi" } }, "mobile");
    expect(baseProps).toEqual(original);
  });

  it("override can add new prop key not in base", () => {
    const result = resolveProps(baseProps, { mobile: { extraProp: "value" } }, "mobile");
    expect((result as Record<string, unknown>).extraProp).toBe("value");
    expect(result.text).toBe("Hello world");
  });
});

// ── resolveVisibility ───────────────────────────────────────────────────────

function makeNode(
  hidden: boolean,
  responsiveHidden?: Partial<Record<"desktop" | "tablet" | "mobile", boolean>>,
): Pick<BuilderNode, "hidden" | "responsiveHidden"> {
  return { hidden, responsiveHidden };
}

describe("resolveVisibility", () => {
  it("returns true when node is not hidden", () => {
    expect(resolveVisibility(makeNode(false), "desktop")).toBe(true);
    expect(resolveVisibility(makeNode(false), "mobile")).toBe(true);
  });

  it("returns false when node.hidden is true (global hide)", () => {
    expect(resolveVisibility(makeNode(true), "desktop")).toBe(false);
    expect(resolveVisibility(makeNode(true), "mobile")).toBe(false);
  });

  it("returns false when responsiveHidden[breakpoint] is true", () => {
    const node = makeNode(false, { mobile: true });
    expect(resolveVisibility(node, "mobile")).toBe(false);
  });

  it("returns true on desktop when only mobile is hidden", () => {
    const node = makeNode(false, { mobile: true });
    expect(resolveVisibility(node, "desktop")).toBe(true);
  });

  it("returns false when both global hidden and responsive hidden", () => {
    const node = makeNode(true, { mobile: true });
    expect(resolveVisibility(node, "desktop")).toBe(false);
    expect(resolveVisibility(node, "mobile")).toBe(false);
  });

  it("returns true when responsiveHidden[breakpoint] is false explicitly", () => {
    const node = makeNode(false, { mobile: false });
    expect(resolveVisibility(node, "mobile")).toBe(true);
  });

  it("returns true when responsiveHidden is defined but breakpoint key absent", () => {
    const node = makeNode(false, { tablet: true });
    expect(resolveVisibility(node, "mobile")).toBe(true);
    expect(resolveVisibility(node, "desktop")).toBe(true);
  });

  it("handles all breakpoints independently", () => {
    const node = makeNode(false, { desktop: false, tablet: true, mobile: true });
    expect(resolveVisibility(node, "desktop")).toBe(true);
    expect(resolveVisibility(node, "tablet")).toBe(false);
    expect(resolveVisibility(node, "mobile")).toBe(false);
  });
});

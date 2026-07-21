import { afterEach, describe, expect, it } from "vitest";
import {
  runQualityGate,
  partitionByMode,
  contrastRatio,
  plainText,
  resolveGateMode,
} from "./quality-gate.js";
import { buildDeterministicPagePlan } from "./page-plan-generator.js";
import { compileFallbackSection } from "./section-plan-compiler.js";
import type { AICommandSuggestion, GeneratePageRequest } from "../types/ai.types.js";

function section(id: string): AICommandSuggestion {
  return { type: "ADD_NODE", payload: { nodeId: id, componentType: "Section", parentId: "root", props: {} }, description: "" };
}
function text(nodeId: string, parentId: string, tag: string, body: string, style: Record<string, unknown> = {}, extra: Record<string, unknown> = {}): AICommandSuggestion {
  return {
    type: "ADD_NODE",
    payload: { nodeId, componentType: "Text", parentId, props: { text: `<p>${body}</p>`, tag }, style, ...extra },
    description: "",
  };
}

const ORIGINAL_ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("plainText", () => {
  it("strips tags and decodes entities", () => {
    expect(plainText("<h3>A &amp; B</h3><p>hi</p>")).toBe("A & B hi");
  });
});

describe("contrastRatio", () => {
  it("computes ~21 for black on white", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
  });
  it("computes ~1 for white on white (fails)", () => {
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  });
  it("returns null for unparseable colors (named/gradient/var)", () => {
    expect(contrastRatio("rebeccapurple", "#fff")).toBeNull();
    expect(contrastRatio("var(--x)", "#fff")).toBeNull();
  });
});

describe("runQualityGate — individual checks", () => {
  it("blocks strong placeholder text", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "Your headline here")];
    const issues = runQualityGate(cmds, {});
    expect(issues.find((i) => i.code === "placeholder_content" && i.severity === "block")).toBeTruthy();
  });

  it("warns (not blocks) on weak placeholder like xxxx", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "xxxx section")];
    const issues = runQualityGate(cmds, {});
    const p = issues.find((i) => i.code === "placeholder_content");
    expect(p?.severity).toBe("warn");
  });

  it("passes clean real content", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "Gentle grooming for every pet", { color: "#111", backgroundColor: "#fff" }, { responsiveStyle: { mobile: { fontSize: "28px" } } })];
    expect(runQualityGate(cmds, {})).toHaveLength(0);
  });

  it("warns on low contrast", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "Hello", { color: "#eeeeee", backgroundColor: "#ffffff" })];
    expect(runQualityGate(cmds, {}).find((i) => i.code === "low_contrast")).toBeTruthy();
  });

  it("warns on a giant heading with no mobile font", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h1", "Big hero", { fontSize: "56px" })];
    expect(runQualityGate(cmds, {}).find((i) => i.code === "missing_mobile_font")).toBeTruthy();
  });

  it("does NOT warn when a mobile font is present", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h1", "Big hero", { fontSize: "56px" }, { responsiveStyle: { mobile: { fontSize: "34px" } } })];
    expect(runQualityGate(cmds, {}).find((i) => i.code === "missing_mobile_font")).toBeFalsy();
  });

  it("blocks an empty section (skeleton with no children)", () => {
    const issues = runQualityGate([section("s1")], {});
    expect(issues.find((i) => i.code === "empty_section" && i.severity === "block")).toBeTruthy();
  });

  it("warns on overlong heading", () => {
    const long = "A".repeat(130);
    const cmds = [section("s1"), text("s1-h", "s1", "h2", long)];
    expect(runQualityGate(cmds, {}).find((i) => i.code === "overlong_heading")).toBeTruthy();
  });

  it("detects duplicate headings across sections", () => {
    const seenHeadings = new Map<string, string>();
    const cmds = [
      section("s1"), text("s1-h", "s1", "h2", "Our Services"),
      section("s2"), text("s2-h", "s2", "h2", "our services"),
    ];
    const issues = runQualityGate(cmds, {}, { seenHeadings });
    expect(issues.find((i) => i.code === "duplicate_heading")).toBeTruthy();
  });

  it("wrong_language: warns when vi requested but heading is plain English", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "Complete pricing packages here")];
    const issues = runQualityGate(cmds, {}, { locale: "vi" });
    expect(issues.find((i) => i.code === "wrong_language")).toBeTruthy();
  });

  it("wrong_language: no warn when vi requested and heading has diacritics", () => {
    const cmds = [section("s1"), text("s1-h", "s1", "h2", "Bảng giá dịch vụ rõ ràng")];
    const issues = runQualityGate(cmds, {}, { locale: "vi" });
    expect(issues.find((i) => i.code === "wrong_language")).toBeFalsy();
  });
});

describe("exemptBlock (fallback path)", () => {
  it("downgrades block issues to warn", () => {
    const issues = runQualityGate([section("s1")], {}, { exemptBlock: true });
    expect(issues.every((i) => i.severity === "warn")).toBe(true);
    expect(issues.find((i) => i.code === "empty_section")).toBeTruthy();
  });
});

describe("partitionByMode + AI_QG_DISABLE", () => {
  it("mode=block returns blocking issues", () => {
    const issues = runQualityGate([section("s1"), text("s1-h", "s1", "h2", "Lorem ipsum dolor")], {});
    const { blocking } = partitionByMode(issues, "block");
    expect(blocking.length).toBeGreaterThan(0);
  });
  it("mode=warn downgrades blocks to warnings (nothing blocking)", () => {
    const issues = runQualityGate([section("s1"), text("s1-h", "s1", "h2", "Lorem ipsum dolor")], {});
    const { blocking, warnings } = partitionByMode(issues, "warn");
    expect(blocking).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });
  it("mode=off returns nothing", () => {
    const issues = runQualityGate([section("s1")], {});
    expect(partitionByMode(issues, "off")).toEqual({ blocking: [], warnings: [] });
  });
  it("AI_QG_DISABLE removes a specific check", () => {
    process.env.AI_QG_DISABLE = "empty_section";
    expect(runQualityGate([section("s1")], {}).find((i) => i.code === "empty_section")).toBeFalsy();
  });
  it("resolveGateMode defaults to block", () => {
    delete process.env.AI_QUALITY_GATE;
    expect(resolveGateMode()).toBe("block");
  });
});

describe("fallback pack passes the gate clean (no block issues)", () => {
  function makeRequest(prompt: string): GeneratePageRequest {
    return {
      prompt,
      availableComponents: [
        { type: "Section", name: "Section", category: "layout" },
        { type: "Text", name: "Text", category: "content" },
        { type: "Button", name: "Button", category: "content" },
        { type: "Image", name: "Image", category: "media" },
        { type: "Divider", name: "Divider", category: "layout" },
      ],
      designTokens: { primaryColor: "#111827", backgroundColor: "#ffffff", textColor: "#111827" },
    } as GeneratePageRequest;
  }

  it("pet-care VI fallback has no blocking quality issues", () => {
    const request = makeRequest("Trang cho tiệm chăm sóc thú cưng");
    const plan = buildDeterministicPagePlan(request, "job-qg-vi");
    const commands = plan.sections.flatMap((s) => compileFallbackSection(s, plan, request));
    const issues = runQualityGate(commands, request.designTokens ?? {}, { locale: "vi" });
    const { blocking } = partitionByMode(issues, "block");
    expect(blocking).toHaveLength(0);
  });

  it("generic EN fallback has no blocking quality issues", () => {
    const request = makeRequest("A landing page for an accounting firm");
    const plan = buildDeterministicPagePlan(request, "job-qg-en");
    const commands = plan.sections.flatMap((s) => compileFallbackSection(s, plan, request));
    const issues = runQualityGate(commands, request.designTokens ?? {}, { locale: "en" });
    const { blocking } = partitionByMode(issues, "block");
    expect(blocking).toHaveLength(0);
  });
});

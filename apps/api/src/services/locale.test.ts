import { describe, expect, it } from "vitest";
import { resolveLocale, localeLabel } from "./section-plan-compiler.js";
import type { CreativeBrief, GeneratePageRequest } from "../types/ai.types.js";

function request(overrides: Partial<GeneratePageRequest> = {}): GeneratePageRequest {
  return {
    prompt: "",
    availableComponents: [],
    ...overrides,
  } as GeneratePageRequest;
}

function brief(rawPrompt: string): CreativeBrief {
  return {
    rawPrompt,
    inferredIndustry: "",
    inferredPageType: "landing page",
    primaryGoal: "collect_leads",
    targetAudience: "general",
    tone: "friendly",
    styleDirection: "clean",
    assumedBusinessDetails: [],
    requiredContentAreas: [],
  } as CreativeBrief;
}

describe("resolveLocale (roadmap 02/03)", () => {
  it("prefers an explicit generationOptions.locale over the prompt script", () => {
    const req = request({ prompt: "a page in plain English", generationOptions: { locale: "vi" } });
    expect(resolveLocale(req, brief("a page in plain English"))).toBe("vi");
  });

  it("treats 'auto' as infer, not a literal locale", () => {
    const req = request({ prompt: "trang landing tiếng Việt", generationOptions: { locale: "auto" } });
    expect(resolveLocale(req, brief("trang landing tiếng Việt"))).toBe("vi");
  });

  it("detects Vietnamese from diacritics when no explicit locale", () => {
    expect(resolveLocale(request(), brief("Tạo trang cho tiệm cắt tóc"))).toBe("vi");
  });

  it("does NOT misdetect diacritic-free Vietnamese as English when locale is explicit", () => {
    // The old isVietnamese() regex failed on "lam trang landing cho tiem cat toc".
    const req = request({ generationOptions: { locale: "vi" } });
    expect(resolveLocale(req, brief("lam trang landing cho tiem cat toc"))).toBe("vi");
  });

  it("detects CJK scripts", () => {
    expect(resolveLocale(request(), brief("ペットケアのランディングページ"))).toBe("ja");
    expect(resolveLocale(request(), brief("애완동물 관리 페이지"))).toBe("ko");
  });

  it("falls back to en", () => {
    expect(resolveLocale(request(), brief("a landing page for a barber shop"))).toBe("en");
  });

  it("works with only a request (no brief) — planner stage", () => {
    expect(resolveLocale(request({ prompt: "trang tiếng Việt" }))).toBe("vi");
    expect(resolveLocale(request({ prompt: "english page", generationOptions: { locale: "ja" } }))).toBe("ja");
  });
});

describe("localeLabel", () => {
  it("maps known codes to language names", () => {
    expect(localeLabel("vi")).toBe("Vietnamese");
    expect(localeLabel("en")).toBe("English");
    expect(localeLabel("ja")).toBe("Japanese");
  });

  it("returns the code itself for unknown locales", () => {
    expect(localeLabel("xx")).toBe("xx");
  });
});

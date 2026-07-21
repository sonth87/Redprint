import { describe, expect, it } from "vitest";
import { classifyAIError } from "./ai-error-classifier.js";

describe("classifyAIError", () => {
  it("bypasses provider errors that would otherwise block the page", () => {
    expect(classifyAIError(new Error("LLM request timed out after 20000ms"))).toMatchObject({
      kind: "timeout",
      retryable: false,
    });
    expect(classifyAIError(new Error("Gemini error 503: model is currently experiencing high demand"))).toMatchObject({
      kind: "overloaded",
      retryable: false,
    });
  });

  it("keeps repairable output errors retryable", () => {
    expect(classifyAIError(new Error("Could not extract valid JSON object"))).toMatchObject({
      kind: "invalid_json",
      retryable: true,
    });
    expect(classifyAIError(new Error("secondaryCtaLabel: Expected string, received null"))).toMatchObject({
      kind: "schema_error",
      retryable: true,
    });
  });

  it("treats a quality-gate block as retryable (roadmap 02/04)", () => {
    expect(
      classifyAIError(new Error("Quality gate blocked section: placeholder_content (Placeholder text: ...)")),
    ).toMatchObject({ kind: "quality_block", retryable: true });
  });
});


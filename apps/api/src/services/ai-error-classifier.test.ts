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
});


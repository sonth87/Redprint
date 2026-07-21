import { describe, expect, it } from "vitest";
import { shouldHideAfterSubmit } from "./RuntimeRenderer";

describe("shouldHideAfterSubmit (roadmap 03/04 — popup hideAfterSubmit rule)", () => {
  it("closes the popup when a submit goal fires and hideAfterSubmit is true", () => {
    expect(shouldHideAfterSubmit("submit", true)).toBe(true);
  });

  it("does not close when hideAfterSubmit is false", () => {
    expect(shouldHideAfterSubmit("submit", false)).toBe(false);
  });

  it("does not close when hideAfterSubmit is unset", () => {
    expect(shouldHideAfterSubmit("submit", undefined)).toBe(false);
  });

  it("never closes for a click goal, even if hideAfterSubmit is true", () => {
    expect(shouldHideAfterSubmit("click", true)).toBe(false);
  });
});

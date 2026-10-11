/**
 * Pure decision for the `hideAfterSubmit` popup rule (roadmap 03/04): true only
 * when the goal that just fired was a `submit` goal AND the popup's rules opt
 * into auto-close. Extracted as a standalone function so this decision is
 * unit-testable without a real DOM/jsdom (this monorepo has neither).
 */
export function shouldHideAfterSubmit(
  goalType: "click" | "submit",
  hideAfterSubmit: boolean | undefined,
): boolean {
  return goalType === "submit" && hideAfterSubmit === true;
}

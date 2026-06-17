import { describe, expect, it } from "vitest";
import { validatePropsAgainstContract } from "./prop-schema-validator.js";
import type { ComponentContract } from "./component-contract-resolver.js";

const contract: ComponentContract = {
  type: "Demo",
  name: "Demo",
  category: "content",
  canContainChildren: false,
  requiredProps: [{ key: "label", label: "Label", type: "string", required: true }],
  optionalProps: [
    {
      key: "variant",
      label: "Variant",
      type: "select",
      required: false,
      default: "primary",
      options: [
        { value: "primary", label: "Primary" },
        { value: "secondary", label: "Secondary" },
      ],
    },
    { key: "count", label: "Count", type: "number", required: false, min: 1, max: 3, default: 1 },
  ],
  defaultProps: {},
  variants: ["primary", "secondary"],
  constraints: [],
  fallbackTo: ["Text"],
  examples: [],
  contractSource: "propSchema",
};

describe("prop schema validator", () => {
  it("repairs missing optional props from defaults", () => {
    const result = validatePropsAgainstContract(contract, { label: "Book now" });

    expect(result.valid).toBe(true);
    expect(result.repairedProps.variant).toBe("primary");
    expect(result.repairedProps.count).toBe(1);
  });

  it("rejects invalid enum and number range values", () => {
    const result = validatePropsAgainstContract(contract, { label: "Book now", variant: "ghost", count: 8 });

    expect(result.valid).toBe(false);
    expect(result.errors.map((error) => error.code)).toContain("invalid_option");
    expect(result.errors.map((error) => error.code)).toContain("above_max");
  });
});

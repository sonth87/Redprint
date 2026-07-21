import { describe, expect, it } from "vitest";
import { candidateComponentsForSection, formatComponentContractsForPrompt, resolveComponentContracts } from "./component-contract-resolver.js";
import type { GeneratePageRequest } from "../types/ai.types.js";

const components: GeneratePageRequest["availableComponents"] = [
  {
    type: "NavigationMenu",
    name: "Navigation Menu",
    category: "navigation",
    capabilities: ["canResize"],
    defaultProps: { layout: "horizontal" },
    propSchema: [
      { key: "items", label: "Items", type: "json", required: true },
      {
        key: "layout",
        label: "Layout",
        type: "select",
        default: "horizontal",
        options: [
          { value: "horizontal", label: "Horizontal" },
          { value: "vertical", label: "Vertical" },
        ],
      },
    ],
  },
  {
    type: "CustomBadge",
    name: "Custom Badge",
    category: "content",
    capabilities: [],
    propSchema: [{ key: "label", label: "Label", type: "string", required: true }],
  },
];

describe("component contract resolver", () => {
  it("resolves detailed contracts from available component schema and curated metadata", () => {
    const contracts = resolveComponentContracts(components, ["NavigationMenu", "CustomBadge", "Missing"]);
    const nav = contracts.find((contract) => contract.type === "NavigationMenu");
    const custom = contracts.find((contract) => contract.type === "CustomBadge");

    expect(nav?.contractSource).toBe("merged");
    expect(nav?.requiredProps.map((prop) => prop.key)).toContain("items");
    expect(nav?.optionalProps.find((prop) => prop.key === "layout")?.options?.map((option) => option.value)).toEqual(["horizontal", "vertical"]);
    expect(custom?.contractSource).toBe("propSchema");
  });

  it("formats on-demand contracts for section prompts", () => {
    const text = formatComponentContractsForPrompt(resolveComponentContracts(components, ["NavigationMenu"]));

    expect(text).toContain("NavigationMenu");
    expect(text).toContain("required:");
    expect(text).toContain("constraints:");
  });

  it("chooses available candidate components for a section", () => {
    expect(candidateComponentsForSection("header", components)).toEqual(["NavigationMenu"]);
  });
});

describe("aiHints in contract resolution (roadmap 03/01)", () => {
  it("a component's own aiHints.examples override the curated examples table", () => {
    const withExamples: GeneratePageRequest["availableComponents"] = [
      {
        type: "NavigationMenu",
        name: "Navigation Menu",
        category: "navigation",
        propSchema: [{ key: "items", label: "Items", type: "json", required: true }],
        aiHints: { purpose: "Nav.", examples: ["custom nav example from aiHints"] },
      },
    ];
    const contracts = resolveComponentContracts(withExamples, ["NavigationMenu"]);
    expect(contracts[0]?.examples).toEqual(["custom nav example from aiHints"]);
  });

  it("falls back to the curated examples table when aiHints declares none", () => {
    const contracts = resolveComponentContracts(components, ["NavigationMenu"]);
    expect(contracts.find((c) => c.type === "NavigationMenu")?.examples).toEqual([
      "header navigation with anchor targets, page links, and optional submenu children",
    ]);
  });

  it("candidateComponentsForSection self-nominates a component via sectionAffinity", () => {
    const withAffinity: GeneratePageRequest["availableComponents"] = [
      ...components,
      {
        type: "PricingTable",
        name: "Pricing Table",
        category: "content",
        aiHints: { purpose: "Pricing tiers.", sectionAffinity: ["pricing"] },
      },
    ];
    // "pricing" has no hardcoded entry (falls to DEFAULT_CANDIDATES) — PricingTable
    // must still appear because it self-nominates via sectionAffinity.
    expect(candidateComponentsForSection("pricing", withAffinity)).toContain("PricingTable");
  });

  it("does not self-nominate for a section type not listed in sectionAffinity", () => {
    const withAffinity: GeneratePageRequest["availableComponents"] = [
      ...components,
      {
        type: "PricingTable",
        name: "Pricing Table",
        category: "content",
        aiHints: { purpose: "Pricing tiers.", sectionAffinity: ["pricing"] },
      },
    ];
    expect(candidateComponentsForSection("footer", withAffinity)).not.toContain("PricingTable");
  });
});

/**
 * End-to-end test for roadmap 03/01 (aiHints self-description). Registers a
 * fake `PricingTable` component with full aiHints — never known to any server
 * hardcode (CURATED_COMPONENT_CAPABILITIES, candidateComponentsForSection,
 * REQUIRED_PROPS) — and verifies it flows correctly through manifest merge,
 * section candidate selection, contract resolution/prompt formatting, and
 * command validation, with zero server code changes needed to support it.
 */
import { describe, expect, it } from "vitest";
import { buildComponentCapabilityManifest, formatComponentManifestForPrompt } from "./component-capability-manifest.js";
import {
  candidateComponentsForSection,
  formatComponentContractsForPrompt,
  resolveComponentContracts,
} from "./component-contract-resolver.js";
import { validateCompiledCommandsWithReport, buildContractsByType } from "./section-plan-compiler.js";
import type { AICommandSuggestion, GeneratePageRequest } from "../types/ai.types.js";

const PRICING_TABLE: GeneratePageRequest["availableComponents"][number] = {
  type: "PricingTable",
  name: "Pricing Table",
  category: "content",
  capabilities: ["canResize"], // leaf — no canContainChildren
  propSchema: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "tiers", label: "Tiers", type: "json", required: true },
    { key: "currency", label: "Currency", type: "select", options: [{ value: "usd", label: "USD" }, { value: "vnd", label: "VND" }] },
  ],
  defaultProps: { title: "Pricing", tiers: [], currency: "usd" },
  aiHints: {
    purpose: "Displays side-by-side pricing tiers for a plan comparison.",
    bestFor: ["pricing sections", "plan comparison"],
    sectionAffinity: ["pricing"],
    contentSlots: { heading: "title", items: { prop: "tiers", shape: "array-of-objects", itemKeys: { title: "name", body: "description" }, maxItems: 4 } },
    fallbackTo: ["Grid"],
    examples: ["3-tier pricing table comparing Starter/Growth/Enterprise plans"],
  },
};

const SECTION: GeneratePageRequest["availableComponents"] = [
  { type: "Section", name: "Section", category: "layout", capabilities: ["canContainChildren"] },
  PRICING_TABLE,
];

describe("roadmap 03/01 — PricingTable fixture flows end-to-end without server hardcode", () => {
  it("appears in the capability manifest with its own aiHints (not inferred/curated)", () => {
    const manifest = buildComponentCapabilityManifest(SECTION);
    const entry = manifest.find((c) => c.type === "PricingTable");
    expect(entry).toBeTruthy();
    expect(entry?.purpose).toBe("Displays side-by-side pricing tiers for a plan comparison.");
    expect(entry?.contractSource).toBe("aiHints");

    const prompt = formatComponentManifestForPrompt(manifest);
    expect(prompt).toContain("PricingTable");
    expect(prompt).toContain("Displays side-by-side pricing tiers");
  });

  it("self-nominates as a candidate for the pricing section via sectionAffinity", () => {
    const candidates = candidateComponentsForSection("pricing", SECTION);
    expect(candidates).toContain("PricingTable");
  });

  it("does NOT self-nominate for an unrelated section type", () => {
    const candidates = candidateComponentsForSection("footer", SECTION);
    expect(candidates).not.toContain("PricingTable");
  });

  it("resolves a detailed contract with real required props from propSchema (not a hardcoded table)", () => {
    const contracts = resolveComponentContracts(SECTION, ["PricingTable"]);
    const contract = contracts.find((c) => c.type === "PricingTable");
    expect(contract).toBeTruthy();
    expect(contract?.requiredProps.map((p) => p.key).sort()).toEqual(["tiers", "title"]);
    expect(contract?.examples).toEqual(["3-tier pricing table comparing Starter/Growth/Enterprise plans"]);
    expect(contract?.canContainChildren).toBe(false);

    const prompt = formatComponentContractsForPrompt(contracts);
    expect(prompt).toContain("PricingTable (aiHints)");
    expect(prompt).toContain("required: title:string, tiers:json");
  });

  it("validation gate enforces PricingTable's real required props (title, tiers) with no hardcoded REQUIRED_PROPS entry", () => {
    const availableTypes = new Set(SECTION.map((c) => c.type));
    const contractsByType = buildContractsByType(SECTION);

    const missingRequired: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "sec-1", componentType: "Section", parentId: "root" }, description: "" },
      { type: "ADD_NODE", payload: { nodeId: "pt-1", componentType: "PricingTable", parentId: "sec-1", props: {} }, description: "" },
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(missingRequired, availableTypes, new Set(["root"]), contractsByType);
    expect(valid.map((c) => c.payload.nodeId)).toEqual(["sec-1"]);
    expect(dropped[0]?.reason).toBe("missing_required_props");

    const complete: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "sec-2", componentType: "Section", parentId: "root" }, description: "" },
      {
        type: "ADD_NODE",
        payload: { nodeId: "pt-2", componentType: "PricingTable", parentId: "sec-2", props: { title: "Plans", tiers: [{ name: "Basic" }] } },
        description: "",
      },
    ];
    const result = validateCompiledCommandsWithReport(complete, availableTypes, new Set(["root"]), contractsByType);
    expect(result.valid.map((c) => c.payload.nodeId)).toEqual(["sec-2", "pt-2"]);
    expect(result.dropped).toHaveLength(0);
  });

  it("rejects PricingTable as a parent for a child node (leaf, from capabilities — not aiHints)", () => {
    const availableTypes = new Set(SECTION.map((c) => c.type));
    const contractsByType = buildContractsByType(SECTION);
    const cmds: AICommandSuggestion[] = [
      { type: "ADD_NODE", payload: { nodeId: "sec-1", componentType: "Section", parentId: "root" }, description: "" },
      { type: "ADD_NODE", payload: { nodeId: "pt-1", componentType: "PricingTable", parentId: "sec-1", props: { title: "x", tiers: [{ name: "Basic" }] } }, description: "" },
      { type: "ADD_NODE", payload: { nodeId: "child-1", componentType: "PricingTable", parentId: "pt-1", props: { title: "y", tiers: [{ name: "Basic" }] } }, description: "" },
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(cmds, availableTypes, new Set(["root"]), contractsByType);
    expect(valid.map((c) => c.payload.nodeId)).toEqual(["sec-1", "pt-1"]);
    expect(dropped.find((d) => d.componentType === "PricingTable" && d.reason === "leaf_parent")).toBeTruthy();
  });
});

import { describe, expect, it } from "vitest";
import {
  buildContractsByType,
  validateCompiledCommandsWithReport,
} from "./section-plan-compiler.js";
import type { AICommandSuggestion, GeneratePageRequest } from "../types/ai.types.js";

const AVAILABLE: GeneratePageRequest["availableComponents"] = [
  { type: "Section", name: "Section", category: "layout" },
  { type: "Text", name: "Text", category: "content" },
  { type: "Button", name: "Button", category: "content" },
];

const availableTypes = new Set(AVAILABLE.map((c) => c.type));
const contracts = buildContractsByType(AVAILABLE);

function add(nodeId: string, componentType: string, parentId: string, props: Record<string, unknown> = {}): AICommandSuggestion {
  return { type: "ADD_NODE", payload: { nodeId, componentType, parentId, props }, description: "add" };
}

describe("validateCompiledCommandsWithReport (chat gate)", () => {
  it("keeps a valid nested command and reports nothing", () => {
    const root = "root-1";
    const cmds = [
      add("sec-1", "Section", root),
      add("txt-1", "Text", "sec-1", { text: "Hello" }),
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(
      cmds,
      availableTypes,
      new Set([root]),
      contracts,
    );
    expect(valid).toHaveLength(2);
    expect(dropped).toHaveLength(0);
  });

  it("drops an unknown component type with reason unknown_type", () => {
    const root = "root-1";
    const cmds = [add("x-1", "Carousel3000", root)];
    const { valid, dropped } = validateCompiledCommandsWithReport(cmds, availableTypes, new Set([root]), contracts);
    expect(valid).toHaveLength(0);
    expect(dropped).toEqual([{ type: "ADD_NODE", componentType: "Carousel3000", reason: "unknown_type" }]);
  });

  it("drops a node nested under a leaf parent", () => {
    const root = "root-1";
    const cmds = [
      add("sec-1", "Section", root),
      add("txt-1", "Text", "sec-1", { text: "Hi" }),
      add("btn-1", "Button", "txt-1", { label: "Click" }), // Text is a leaf → invalid parent
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(cmds, availableTypes, new Set([root]), contracts);
    expect(valid.map((c) => c.payload.nodeId)).toEqual(["sec-1", "txt-1"]);
    expect(dropped).toEqual([{ type: "ADD_NODE", componentType: "Button", reason: "leaf_parent" }]);
  });

  it("drops a node missing required props", () => {
    const root = "root-1";
    const cmds = [
      add("sec-1", "Section", root),
      add("txt-1", "Text", "sec-1", {}), // Text requires `text`
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(cmds, availableTypes, new Set([root]), contracts);
    expect(valid.map((c) => c.payload.nodeId)).toEqual(["sec-1"]);
    expect(dropped[0]?.reason).toMatch(/missing_required_props|invalid_props/);
  });

  it("passes through non-ADD_NODE commands untouched", () => {
    const root = "root-1";
    const cmds: AICommandSuggestion[] = [
      { type: "UPDATE_PROPS", payload: { nodeId: "existing-1", props: { text: "x" } }, description: "u" },
    ];
    const { valid, dropped } = validateCompiledCommandsWithReport(cmds, availableTypes, new Set([root]), contracts);
    expect(valid).toHaveLength(1);
    expect(dropped).toHaveLength(0);
  });

  it("honours real parent types from the existing page (leaf existing node rejects children)", () => {
    const root = "root-1";
    const existingTypes = new Map<string, string>([["existing-text", "Text"]]);
    const cmds = [add("btn-1", "Button", "existing-text", { label: "Go" })];
    const { valid, dropped } = validateCompiledCommandsWithReport(
      cmds,
      availableTypes,
      new Set([root, "existing-text"]),
      contracts,
      existingTypes,
    );
    expect(valid).toHaveLength(0);
    expect(dropped[0]?.reason).toBe("leaf_parent");
  });
});

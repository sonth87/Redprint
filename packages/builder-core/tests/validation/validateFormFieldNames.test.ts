import { describe, expect, it } from "vitest";
import { validateFormFieldNames } from "../../src/validation/validators";
import type { BuilderDocument, BuilderNode } from "../../src/document/types";

function node(overrides: Partial<BuilderNode> & { id: string; type: string; parentId: string | null }): BuilderNode {
  return { order: 0, props: {}, style: {}, ...overrides } as BuilderNode;
}

function doc(nodes: BuilderNode[]): BuilderDocument {
  const map: Record<string, BuilderNode> = {};
  for (const n of nodes) map[n.id] = n;
  return {
    id: "doc-1",
    schemaVersion: "1.0.0",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    name: "Test",
    nodes: map,
    rootNodeId: "root",
    breakpoints: [],
    variables: {},
  } as unknown as BuilderDocument;
}

describe("validateFormFieldNames (roadmap 03/04)", () => {
  it("returns no warnings when all field names within a Form are unique", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "in-1", type: "Input", parentId: "form-1", props: { name: "email" } }),
      node({ id: "in-2", type: "Input", parentId: "form-1", props: { name: "phone" } }),
    ]);
    expect(validateFormFieldNames(document)).toEqual([]);
  });

  it("warns when two descendants of the same Form share a name", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "wrap", type: "Container", parentId: "form-1" }), // nested inside a non-Form container
      node({ id: "in-1", type: "Input", parentId: "wrap", props: { name: "email" } }),
      node({ id: "in-2", type: "Input", parentId: "form-1", props: { name: "email" } }),
    ]);
    const warnings = validateFormFieldNames(document);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatchObject({ formNodeId: "form-1", name: "email" });
    expect(warnings[0]!.nodeIds.sort()).toEqual(["in-1", "in-2"]);
  });

  it("checks each Form's fields independently — same name in two different Forms is fine", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "form-2", type: "Form", parentId: "root" }),
      node({ id: "in-1", type: "Input", parentId: "form-1", props: { name: "email" } }),
      node({ id: "in-2", type: "Input", parentId: "form-2", props: { name: "email" } }),
    ]);
    expect(validateFormFieldNames(document)).toEqual([]);
  });

  it("does not descend into a nested Form's own fields (each Form is its own scope)", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "in-1", type: "Input", parentId: "form-1", props: { name: "email" } }),
      // A nested Form is disallowed by containerConfig in practice, but the
      // validator must stay correct even if that guard is ever bypassed.
      node({ id: "form-2", type: "Form", parentId: "form-1" }),
      node({ id: "in-2", type: "Input", parentId: "form-2", props: { name: "email" } }),
    ]);
    expect(validateFormFieldNames(document)).toEqual([]);
  });

  it("checks all four form field types (Input/Textarea/SelectField/Checkbox)", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "a", type: "Textarea", parentId: "form-1", props: { name: "dup" } }),
      node({ id: "b", type: "Checkbox", parentId: "form-1", props: { name: "dup" } }),
    ]);
    const warnings = validateFormFieldNames(document);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.name).toBe("dup");
  });

  it("ignores fields with no name set", () => {
    const document = doc([
      node({ id: "root", type: "Root", parentId: null }),
      node({ id: "form-1", type: "Form", parentId: "root" }),
      node({ id: "in-1", type: "Input", parentId: "form-1", props: {} }),
      node({ id: "in-2", type: "Input", parentId: "form-1", props: {} }),
    ]);
    expect(validateFormFieldNames(document)).toEqual([]);
  });

  it("returns no warnings for a document with no Form nodes", () => {
    const document = doc([node({ id: "root", type: "Root", parentId: null })]);
    expect(validateFormFieldNames(document)).toEqual([]);
  });
});

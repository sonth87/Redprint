import { describe, expect, it } from "vitest";
import type { BuilderDocument, Command } from "@ui-builder/builder-core";
import {
  createStagingDocument,
  groupCommandsByTarget,
  applyCommandsToStaging,
  applySelectedGroupsToStaging,
} from "./stagingDocument";

describe("stagingDocument", () => {
  const baseDoc: BuilderDocument = {
    id: "doc-test",
    version: "1.0.0",
    rootNodeId: "root",
    nodes: {
      root: {
        id: "root",
        type: "Section",
        parentId: null,
        order: 0,
        props: { name: "HeroSection" },
        style: { backgroundColor: "#ffffff" },
        responsiveStyle: {},
        interactions: [],
      },
      btn1: {
        id: "btn1",
        type: "Button",
        parentId: "root",
        order: 0,
        props: { text: "Original Button" },
        style: { color: "#000000" },
        responsiveStyle: {},
        interactions: [],
      },
    },
  };

  it("creates an isolated deep clone that leaves original document untouched", () => {
    const clone = createStagingDocument(baseDoc);
    expect(clone).toEqual(baseDoc);
    expect(clone).not.toBe(baseDoc);

    clone.nodes.root!.props.name = "MutatedSection";
    expect(baseDoc.nodes.root!.props.name).toBe("HeroSection");
  });

  it("groups commands by target node", () => {
    const commands: Command[] = [
      { type: "UPDATE_PROPS", payload: { nodeId: "btn1", props: { text: "New Text" } } },
      { type: "UPDATE_STYLE", payload: { nodeId: "btn1", style: { color: "#ff0000" } } },
      { type: "UPDATE_STYLE", payload: { nodeId: "root", style: { backgroundColor: "#000000" } } },
    ];

    const groups = groupCommandsByTarget(commands, baseDoc);
    expect(groups.length).toBe(2);
    expect(groups[0]?.commands.length).toBe(2);
    expect(groups[1]?.commands.length).toBe(1);
  });

  it("applies commands in staging sandbox without mutating base document", () => {
    const commands: Command[] = [
      { type: "UPDATE_PROPS", payload: { nodeId: "btn1", props: { text: "Staged Text" } } },
    ];

    const { nextDoc, success } = applyCommandsToStaging(baseDoc, commands);
    expect(success).toBe(true);
    expect(nextDoc.nodes.btn1?.props.text).toBe("Staged Text");
    expect(baseDoc.nodes.btn1?.props.text).toBe("Original Button");
  });

  it("supports partial application via applySelectedGroupsToStaging", () => {
    const commands: Command[] = [
      { type: "UPDATE_PROPS", payload: { nodeId: "btn1", props: { text: "Staged Button" } } },
      { type: "UPDATE_STYLE", payload: { nodeId: "root", style: { backgroundColor: "#123456" } } },
    ];

    const { groups } = applyCommandsToStaging(baseDoc, commands);
    expect(groups.length).toBe(2);

    // Disable the root group, keep button group
    const buttonGroup = groups.find((g) => g.title.includes("Button"))!;
    const rootGroup = groups.find((g) => g.title.includes("Section"))!;
    buttonGroup.enabled = true;
    rootGroup.enabled = false;

    const filteredDoc = applySelectedGroupsToStaging(baseDoc, [buttonGroup, rootGroup]);
    expect(filteredDoc.nodes.btn1?.props.text).toBe("Staged Button");
    expect(filteredDoc.nodes.root?.style.backgroundColor).toBe("#ffffff"); // Unchanged!
  });
});

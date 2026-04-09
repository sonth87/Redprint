import { describe, expect, it } from "vitest";
import type { BuilderNode } from "@ui-builder/builder-core";
import { buildMovingSnapshots, shouldUseFlowDrag, type ContainerConfigResolver } from "./dragUtils";

function createNodeElement(
  metrics: { offsetLeft: number; offsetTop: number; offsetWidth: number; offsetHeight: number },
  rect: DOMRect,
): HTMLElement {
  return {
    offsetLeft: metrics.offsetLeft,
    offsetTop: metrics.offsetTop,
    offsetWidth: metrics.offsetWidth,
    offsetHeight: metrics.offsetHeight,
    getBoundingClientRect: () => rect,
  } as unknown as HTMLElement;
}

describe("dragUtils", () => {
  it("captures static nodes from their containing block offsets", () => {
    const frameRect = {
      left: 100,
      top: 120,
      width: 1200,
      height: 800,
      right: 1300,
      bottom: 920,
      x: 100,
      y: 120,
      toJSON: () => ({}),
    } satisfies DOMRect;

    const nodeEl = createNodeElement(
      {
        offsetLeft: 32,
        offsetTop: 96,
        offsetWidth: 211,
        offsetHeight: 57,
      },
      {
        left: 420,
        top: 560,
        width: 211,
        height: 57,
        right: 631,
        bottom: 617,
        x: 420,
        y: 560,
        toJSON: () => ({}),
      } satisfies DOMRect,
    );

    const frameEl = {
      querySelector: (selector: string) =>
        selector === '[data-node-id="button-1"]' ? nodeEl : null,
    } as unknown as HTMLElement;

    const nodes: Record<string, BuilderNode> = {
      "button-1": {
        id: "button-1",
        type: "Button",
        parentId: "container-1",
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Button",
      },
    };

    const [snapshot] = buildMovingSnapshots(["button-1"], nodes, frameEl, frameRect, 1);

    expect(snapshot).toMatchObject({
      nodeId: "button-1",
      startLeft: 32,
      startTop: 96,
      startWidth: 211,
      startHeight: 57,
      wasAbsolute: false,
    });
  });

  it("keeps absolute children on the free-drag path even inside flow parents", () => {
    const nodes: Record<string, BuilderNode> = {
      "column-1": {
        id: "column-1",
        type: "Column",
        parentId: "root",
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Column",
      },
      "shape-1": {
        id: "shape-1",
        type: "Shape",
        parentId: "column-1",
        order: 0,
        props: {},
        style: { position: "absolute", left: "12px", top: "18px" },
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Shape",
      },
      root: {
        id: "root",
        type: "Container",
        parentId: null,
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Root",
      },
    };

    const getContainerConfig: ContainerConfigResolver = (nodeOrType) => {
      const type = typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type;
      return type === "Column" ? { layoutType: "flex" } : undefined;
    };

    expect(shouldUseFlowDrag(nodes["shape-1"], nodes, getContainerConfig)).toBe(false);
  });

  it("uses flow drag for static children inside flow parents", () => {
    const nodes: Record<string, BuilderNode> = {
      "column-1": {
        id: "column-1",
        type: "Column",
        parentId: "root",
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Column",
      },
      "text-1": {
        id: "text-1",
        type: "Text",
        parentId: "column-1",
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Text",
      },
      root: {
        id: "root",
        type: "Container",
        parentId: null,
        order: 0,
        props: {},
        style: {},
        responsiveStyle: {},
        interactions: [],
        hidden: false,
        locked: false,
        name: "Root",
      },
    };

    const getContainerConfig: ContainerConfigResolver = (nodeOrType) => {
      const type = typeof nodeOrType === "string" ? nodeOrType : nodeOrType.type;
      return type === "Column" ? { layoutType: "flex" } : undefined;
    };

    expect(shouldUseFlowDrag(nodes["text-1"], nodes, getContainerConfig)).toBe(true);
  });
});

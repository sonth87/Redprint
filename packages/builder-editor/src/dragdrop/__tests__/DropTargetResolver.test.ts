// Phase 1 tests — DropTargetResolver pure-function coverage
import { describe, it, expect, afterEach } from "vitest";
import {
  parseGridTracks,
  getGridCellClientRect,
  resolveContainerDropPosition,
  resolveDropTarget,
} from "../DropTargetResolver";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { ContainerConfigResolver } from "../../hooks/dragUtils";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeNode(overrides: { id: string } & Partial<BuilderNode>): BuilderNode {
  return {
    id: overrides.id,
    type: overrides.type ?? "Box",
    parentId: overrides.parentId ?? null,
    order: overrides.order ?? 0,
    props: overrides.props ?? {},
    style: overrides.style ?? {},
    responsiveStyle: overrides.responsiveStyle ?? {},
    interactions: overrides.interactions ?? [],
  } as unknown as BuilderNode;
}

function makeRect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    left, top, width, height,
    right: left + width, bottom: top + height,
    x: left, y: top, toJSON: () => ({}),
  } as DOMRect;
}

/**
 * Patch globalThis.getComputedStyle to return a fixture for a specific element,
 * and return a restore function.
 */
function patchGetComputedStyle(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
): () => void {
  const prev = globalThis.getComputedStyle;
  const defaultStyles: Partial<CSSStyleDeclaration> = {
    gridTemplateColumns: "none",
    gridTemplateRows: "none",
    paddingLeft: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    columnGap: "0px",
    rowGap: "0px",
    flexDirection: "column",
    ...styles,
  };
  (globalThis as unknown as Record<string, unknown>).getComputedStyle = (target: Element) =>
    target === el ? defaultStyles : prev(target);
  return () => { (globalThis as unknown as Record<string, unknown>).getComputedStyle = prev; };
}

/**
 * Patch globalThis.document.elementsFromPoint to return a fixed list.
 */
function patchElementsFromPoint(elements: Element[]): () => void {
  const prevDoc = globalThis.document;
  const fakeDoc = {
    ...prevDoc,
    elementsFromPoint: (_x: number, _y: number) => elements,
    querySelector: prevDoc?.querySelector?.bind(prevDoc) ?? (() => null),
  };
  (globalThis as unknown as Record<string, unknown>).document = fakeDoc;
  return () => {
    (globalThis as unknown as Record<string, unknown>).document = prevDoc;
  };
}

function makeContainerEl(
  rect: DOMRect,
  nodeId: string | null = null,
): HTMLElement {
  return {
    getBoundingClientRect: () => rect,
    offsetWidth: rect.width,
    offsetHeight: rect.height,
    getAttribute: (attr: string) => (attr === "data-node-id" ? nodeId : null),
    querySelector: () => null,
  } as unknown as HTMLElement;
}

// ── parseGridTracks ───────────────────────────────────────────────────────

describe("parseGridTracks", () => {
  it("parses px values correctly", () => {
    expect(parseGridTracks("200px 200px 200px")).toEqual([200, 200, 200]);
  });

  it("returns [] for 'none'", () => {
    expect(parseGridTracks("none")).toEqual([]);
  });

  it("returns [] for empty string", () => {
    expect(parseGridTracks("")).toEqual([]);
  });
});

// ── getGridCellClientRect ─────────────────────────────────────────────────

describe("getGridCellClientRect", () => {
  let restore: (() => void) | undefined;
  afterEach(() => { restore?.(); restore = undefined; });

  it("returns correct bounding box for a 3-col grid, col=1", () => {
    const el = makeContainerEl(makeRect(0, 0, 300, 100));
    restore = patchGetComputedStyle(el, {
      gridTemplateColumns: "100px 100px 100px",
      gridTemplateRows: "100px",
    });

    const result = getGridCellClientRect(el, 1, 0);
    expect(result).not.toBeNull();
    expect(result!.left).toBeCloseTo(100);
    expect(result!.top).toBeCloseTo(0);
    expect(result!.width).toBeCloseTo(100);
    expect(result!.height).toBeCloseTo(100);
  });

  it("returns null when gridTemplateColumns is 'none'", () => {
    const el = makeContainerEl(makeRect(0, 0, 300, 100));
    restore = patchGetComputedStyle(el, {});
    expect(getGridCellClientRect(el, 0, 0)).toBeNull();
  });
});

// ── resolveContainerDropPosition (backward-compat) ───────────────────────

describe("resolveContainerDropPosition", () => {
  let restore: (() => void) | undefined;
  afterEach(() => { restore?.(); restore = undefined; });

  it("returns ContainerDropResult shape (no gridCell) for flex container", () => {
    const el = makeContainerEl(makeRect(0, 0, 200, 200));
    restore = patchGetComputedStyle(el, { flexDirection: "column" });
    const containerNode = makeNode({ id: "c1", type: "Column" });
    const siblings: BuilderNode[] = [];

    const result = resolveContainerDropPosition(50, 50, el, containerNode, siblings,
      () => ({ layoutType: "flex" }),
    );
    expect(typeof result.insertIndex).toBe("number");
    expect(result.gridCell).toBeUndefined();
  });

  it("returns gridCell for grid container", () => {
    const el = makeContainerEl(makeRect(0, 0, 300, 100));
    restore = patchGetComputedStyle(el, {
      gridTemplateColumns: "100px 100px 100px",
      gridTemplateRows: "100px",
    });
    const containerNode = makeNode({ id: "g1", type: "Grid" });

    const result = resolveContainerDropPosition(50, 50, el, containerNode, [],
      () => ({ layoutType: "grid" }),
    );
    expect(typeof result.insertIndex).toBe("number");
    expect(result.gridCell).toBeDefined();
    expect(result.gridCell).toHaveProperty("col");
    expect(result.gridCell).toHaveProperty("row");
  });

  it("appends (insertIndex = siblings.length) for absolute container", () => {
    const el = makeContainerEl(makeRect(0, 0, 200, 200));
    restore = patchGetComputedStyle(el, {});
    const containerNode = makeNode({ id: "s1", type: "Section" });
    const siblings = [makeNode({ id: "n1", order: 0 }), makeNode({ id: "n2", order: 1 })];

    const result = resolveContainerDropPosition(50, 50, el, containerNode, siblings,
      () => ({ layoutType: "absolute" }),
    );
    expect(result.insertIndex).toBe(2);
  });
});

// ── resolveDropTarget ─────────────────────────────────────────────────────

describe("resolveDropTarget", () => {
  let restoreDoc: (() => void) | undefined;
  let restoreGCS: (() => void) | undefined;
  afterEach(() => { restoreDoc?.(); restoreDoc = undefined; restoreGCS?.(); restoreGCS = undefined; });

  it("returns null when no data-node-id under cursor", () => {
    const emptyEl = makeContainerEl(makeRect(0, 0, 200, 200), null);
    restoreDoc = patchElementsFromPoint([emptyEl as unknown as Element]);

    const frameEl = { querySelector: () => null } as unknown as HTMLElement;
    const result = resolveDropTarget(100, 100, "drag1", "Box", null, frameEl, {},
      () => undefined,
    );
    expect(result).toBeNull();
  });

  it("returns indicator:line + parentId for flex container", () => {
    const containerEl = makeContainerEl(makeRect(0, 0, 200, 200), "container1");
    restoreDoc = patchElementsFromPoint([containerEl as unknown as Element]);
    restoreGCS = patchGetComputedStyle(containerEl, { flexDirection: "column" });

    const frameEl = {
      querySelector: (sel: string) =>
        sel === '[data-node-id="container1"]' ? containerEl : null,
    } as unknown as HTMLElement;

    const nodes: Record<string, BuilderNode> = {
      container1: makeNode({ id: "container1", type: "Column", parentId: "root" }),
    };
    const getCfg: ContainerConfigResolver = () => ({ layoutType: "flex" });

    const result = resolveDropTarget(50, 50, "drag1", "Box", null, frameEl, nodes, getCfg);
    expect(result).not.toBeNull();
    expect(result!.indicator).toBe("line");
    expect(result!.parentId).toBe("container1");
    expect(typeof result!.insertIndex).toBe("number");
  });

  it("returns indicator:cell-highlight + gridCell for grid container", () => {
    const containerEl = makeContainerEl(makeRect(0, 0, 300, 100), "grid1");
    restoreDoc = patchElementsFromPoint([containerEl as unknown as Element]);
    restoreGCS = patchGetComputedStyle(containerEl, {
      gridTemplateColumns: "100px 100px 100px",
      gridTemplateRows: "100px",
    });

    const frameEl = {
      querySelector: (sel: string) =>
        sel === '[data-node-id="grid1"]' ? containerEl : null,
    } as unknown as HTMLElement;

    const nodes: Record<string, BuilderNode> = {
      grid1: makeNode({ id: "grid1", type: "Grid", parentId: "root" }),
    };
    const getCfg: ContainerConfigResolver = () => ({ layoutType: "grid" });

    const result = resolveDropTarget(50, 50, "drag1", "Box", null, frameEl, nodes, getCfg);
    expect(result).not.toBeNull();
    expect(result!.indicator).toBe("cell-highlight");
    expect(result!.gridCell).toBeDefined();
  });

  it("returns null when disallowedChildTypes includes dragging type", () => {
    const containerEl = makeContainerEl(makeRect(0, 0, 200, 200), "container1");
    restoreDoc = patchElementsFromPoint([containerEl as unknown as Element]);

    const frameEl = { querySelector: () => null } as unknown as HTMLElement;
    const nodes: Record<string, BuilderNode> = {
      container1: makeNode({ id: "container1", type: "Row", parentId: "root" }),
    };
    const getCfg: ContainerConfigResolver = () => ({
      layoutType: "flex",
      disallowedChildTypes: ["Section"],
    });

    const result = resolveDropTarget(50, 50, "drag1", "Section", null, frameEl, nodes, getCfg);
    expect(result).toBeNull();
  });

  it("returns null when hovered container is the current parent (skip guard)", () => {
    // findHoveredFlowContainer skips when id === currentParentId
    const containerEl = makeContainerEl(makeRect(0, 0, 200, 200), "parent1");
    restoreDoc = patchElementsFromPoint([containerEl as unknown as Element]);

    const frameEl = { querySelector: () => null } as unknown as HTMLElement;
    const nodes: Record<string, BuilderNode> = {
      parent1: makeNode({ id: "parent1", type: "Column", parentId: "root" }),
      drag1: makeNode({ id: "drag1", type: "Box", parentId: "parent1" }),
    };
    const getCfg: ContainerConfigResolver = () => ({ layoutType: "flex" });

    const result = resolveDropTarget(50, 50, "drag1", "Box", "parent1", frameEl, nodes, getCfg);
    expect(result).toBeNull();
  });
});

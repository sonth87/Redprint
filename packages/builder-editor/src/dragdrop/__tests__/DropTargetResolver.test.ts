// Phase 1 tests — DropTargetResolver pure-function coverage
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseGridTracks,
  getGridCellClientRect,
  resolveContainerDropPosition,
  resolveDropTarget,
  findHoveredFlowContainer,
} from "../DropTargetResolver";
import type { BuilderNode } from "@ui-builder/builder-core";
import type { ContainerConfigResolver } from "../../hooks/dragUtils";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeNode(overrides: Partial<BuilderNode> & { id: string }): BuilderNode {
  return {
    id: overrides.id,
    type: overrides.type ?? "Box",
    parentId: overrides.parentId ?? null,
    order: overrides.order ?? 0,
    props: overrides.props ?? {},
    styles: overrides.styles ?? {},
  } as BuilderNode;
}

/**
 * Create a minimal HTMLElement mock that satisfies getBoundingClientRect,
 * getComputedStyle, and querySelector calls used by the resolvers.
 */
function makeContainerEl(
  rect: { left: number; top: number; width: number; height: number },
  computedStyles: Partial<CSSStyleDeclaration> = {},
): HTMLElement {
  const el = document.createElement("div");

  // Override getBoundingClientRect
  vi.spyOn(el, "getBoundingClientRect").mockReturnValue({
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => ({}),
  });

  // Patch offsetWidth/offsetHeight for scale calc (no CSS transforms in tests)
  Object.defineProperty(el, "offsetWidth", { value: rect.width, configurable: true });
  Object.defineProperty(el, "offsetHeight", { value: rect.height, configurable: true });

  // Patch getComputedStyle to return our fixture
  const base: Partial<CSSStyleDeclaration> = {
    gridTemplateColumns: "none",
    gridTemplateRows: "none",
    paddingLeft: "0px",
    paddingTop: "0px",
    paddingBottom: "0px",
    columnGap: "0px",
    rowGap: "0px",
    flexDirection: "column",
    ...computedStyles,
  };
  vi.spyOn(globalThis, "getComputedStyle").mockReturnValue(base as CSSStyleDeclaration);

  return el;
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
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns correct bounding box for a 3-col grid", () => {
    // 3 equal 100px columns, container at (0,0), 300×100
    const el = makeContainerEl(
      { left: 0, top: 0, width: 300, height: 100 },
      {
        gridTemplateColumns: "100px 100px 100px",
        gridTemplateRows: "100px",
      },
    );

    const result = getGridCellClientRect(el, 1, 0);
    expect(result).not.toBeNull();
    expect(result!.left).toBeCloseTo(100);
    expect(result!.top).toBeCloseTo(0);
    expect(result!.width).toBeCloseTo(100);
    expect(result!.height).toBeCloseTo(100);
  });

  it("returns null when gridTemplateColumns is 'none'", () => {
    const el = makeContainerEl({ left: 0, top: 0, width: 300, height: 100 });
    expect(getGridCellClientRect(el, 0, 0)).toBeNull();
  });
});

// ── resolveContainerDropPosition (backward-compat) ───────────────────────

describe("resolveContainerDropPosition", () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it("returns ContainerDropResult shape for flex container", () => {
    const el = makeContainerEl(
      { left: 0, top: 0, width: 200, height: 200 },
      { flexDirection: "column" },
    );
    const containerNode = makeNode({ id: "c1", type: "Column" });
    const siblings: BuilderNode[] = [];
    const getCfg = (_type: string) => ({ layoutType: "flex" as const });

    const result = resolveContainerDropPosition(50, 50, el, containerNode, siblings, getCfg);
    expect(result).toHaveProperty("insertIndex");
    expect(typeof result.insertIndex).toBe("number");
    expect(result.gridCell).toBeUndefined();
  });

  it("returns ContainerDropResult shape for grid container", () => {
    const el = makeContainerEl(
      { left: 0, top: 0, width: 300, height: 100 },
      {
        gridTemplateColumns: "100px 100px 100px",
        gridTemplateRows: "100px",
      },
    );
    const containerNode = makeNode({ id: "g1", type: "Grid" });
    const siblings: BuilderNode[] = [];
    const getCfg = (_type: string) => ({ layoutType: "grid" as const });

    const result = resolveContainerDropPosition(50, 50, el, containerNode, siblings, getCfg);
    expect(result).toHaveProperty("insertIndex");
    expect(result).toHaveProperty("gridCell");
    expect(result.gridCell).toHaveProperty("col");
    expect(result.gridCell).toHaveProperty("row");
  });

  it("appends for absolute container", () => {
    const el = makeContainerEl({ left: 0, top: 0, width: 200, height: 200 });
    const containerNode = makeNode({ id: "s1", type: "Section" });
    const siblings = [makeNode({ id: "n1", order: 0 }), makeNode({ id: "n2", order: 1 })];
    const getCfg = (_type: string) => ({ layoutType: "absolute" as const });

    const result = resolveContainerDropPosition(50, 50, el, containerNode, siblings, getCfg);
    expect(result.insertIndex).toBe(2);
  });
});

// ── resolveDropTarget ─────────────────────────────────────────────────────

describe("resolveDropTarget", () => {
  let originalElementsFromPoint: typeof document.elementsFromPoint;
  let originalQuerySelector: typeof document.querySelector;

  beforeEach(() => {
    originalElementsFromPoint = document.elementsFromPoint.bind(document);
    originalQuerySelector = document.querySelector.bind(document);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.elementsFromPoint = originalElementsFromPoint;
    document.querySelector = originalQuerySelector;
  });

  it("returns null when no data-node-id under cursor", () => {
    // Mock elementsFromPoint to return elements without data-node-id
    vi.spyOn(globalThis.document, "elementsFromPoint").mockReturnValue([document.createElement("div")]);

    const frameEl = document.createElement("div");
    const nodes: Record<string, BuilderNode> = {};
    const getCfg: ContainerConfigResolver = () => undefined;

    const result = resolveDropTarget(100, 100, "drag1", "Box", null, frameEl, nodes, getCfg);
    expect(result).toBeNull();
  });

  it("returns indicator:line for flex container", () => {
    const containerEl = document.createElement("div");
    containerEl.setAttribute("data-node-id", "container1");

    vi.spyOn(globalThis.document, "elementsFromPoint").mockReturnValue([containerEl]);
    vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
      flexDirection: "column",
      gridTemplateColumns: "none",
      gridTemplateRows: "none",
      paddingLeft: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
      columnGap: "0px",
      rowGap: "0px",
    } as unknown as CSSStyleDeclaration);
    vi.spyOn(containerEl, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200,
      x: 0, y: 0, toJSON: () => ({}),
    });

    const frameEl = document.createElement("div");
    vi.spyOn(frameEl, "querySelector").mockReturnValue(containerEl);

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

  it("returns indicator:cell-highlight for grid container", () => {
    const containerEl = document.createElement("div");
    containerEl.setAttribute("data-node-id", "grid1");

    vi.spyOn(globalThis.document, "elementsFromPoint").mockReturnValue([containerEl]);
    vi.spyOn(globalThis, "getComputedStyle").mockReturnValue({
      gridTemplateColumns: "100px 100px 100px",
      gridTemplateRows: "100px",
      paddingLeft: "0px",
      paddingTop: "0px",
      paddingBottom: "0px",
      columnGap: "0px",
      rowGap: "0px",
      flexDirection: "column",
    } as unknown as CSSStyleDeclaration);
    vi.spyOn(containerEl, "getBoundingClientRect").mockReturnValue({
      left: 0, top: 0, width: 300, height: 100, right: 300, bottom: 100,
      x: 0, y: 0, toJSON: () => ({}),
    });
    Object.defineProperty(containerEl, "offsetWidth", { value: 300, configurable: true });
    Object.defineProperty(containerEl, "offsetHeight", { value: 100, configurable: true });

    const frameEl = document.createElement("div");
    vi.spyOn(frameEl, "querySelector").mockReturnValue(containerEl);

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
    const containerEl = document.createElement("div");
    containerEl.setAttribute("data-node-id", "container1");

    vi.spyOn(globalThis.document, "elementsFromPoint").mockReturnValue([containerEl]);

    const frameEl = document.createElement("div");
    const nodes: Record<string, BuilderNode> = {
      container1: makeNode({ id: "container1", type: "Row", parentId: "root" }),
    };
    const getCfg: ContainerConfigResolver = () => ({
      layoutType: "flex",
      disallowedChildTypes: ["Section"],
    });

    // draggingNodeType is "Section" — disallowed
    const result = resolveDropTarget(50, 50, "drag1", "Section", null, frameEl, nodes, getCfg);
    expect(result).toBeNull();
  });

  it("returns null when hovered container is ancestor of dragging node", () => {
    const containerEl = document.createElement("div");
    containerEl.setAttribute("data-node-id", "parent1");

    vi.spyOn(globalThis.document, "elementsFromPoint").mockReturnValue([containerEl]);

    const frameEl = document.createElement("div");
    // parent1 → drag1 (drag1 is child of parent1)
    const nodes: Record<string, BuilderNode> = {
      parent1: makeNode({ id: "parent1", type: "Column", parentId: "root" }),
      drag1: makeNode({ id: "drag1", type: "Box", parentId: "parent1" }),
    };
    const getCfg: ContainerConfigResolver = () => ({ layoutType: "flex" });

    // Trying to drop drag1 into parent1, where parent1 IS an ancestor — this is
    // the "already in this parent" guard (id === currentParentId skip)
    const result = resolveDropTarget(50, 50, "drag1", "Box", "parent1", frameEl, nodes, getCfg);
    expect(result).toBeNull();
  });
});

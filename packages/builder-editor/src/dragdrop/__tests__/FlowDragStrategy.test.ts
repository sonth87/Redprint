// Phase 2 tests — FlowDragStrategy
import { describe, it, expect, afterEach } from "vitest";
import { FlowDragStrategy } from "../strategies/FlowDragStrategy";
import type { DragContext, DragVisualState } from "../types";
import { EMPTY_VISUAL_STATE } from "../types";
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

const flexCfg: ContainerConfigResolver = (nodeOrType) => {
  const type = typeof nodeOrType === "string" ? nodeOrType : (nodeOrType as BuilderNode).type;
  return type === "Column" ? { layoutType: "flex" } : undefined;
};

function makeCtx(overrides: Partial<DragContext> & { nodeId: string }): DragContext {
  const dispatched: unknown[] = [];
  return {
    nodeId: overrides.nodeId,
    nodeType: overrides.nodeType ?? "Box",
    startPoint: overrides.startPoint ?? { x: 0, y: 0 },
    gestureGroupId: overrides.gestureGroupId ?? "g1",
    frameEl: overrides.frameEl ?? ({ querySelector: () => null, querySelectorAll: () => [] } as unknown as HTMLElement),
    zoom: overrides.zoom ?? 1,
    nodes: overrides.nodes ?? {},
    getContainerConfig: overrides.getContainerConfig ?? (() => undefined),
    dispatch: overrides.dispatch ?? ((a) => dispatched.push(a)),
    breakpoint: overrides.breakpoint ?? "desktop",
    snapEngine: overrides.snapEngine ?? ({} as DragContext["snapEngine"]),
    rootNodeId: overrides.rootNodeId ?? "root",
    canvasFrameRef: overrides.canvasFrameRef ?? { current: null },
    movingNodeIds: overrides.movingNodeIds ?? [overrides.nodeId],
    movingSnapshots: overrides.movingSnapshots ?? [],
    snapEnabled: overrides.snapEnabled ?? false,
  };
}

// ── canHandle ─────────────────────────────────────────────────────────────

describe("FlowDragStrategy.canHandle", () => {
  it("returns false for multi-select", () => {
    const strategy = new FlowDragStrategy();
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1" }),
      box2: makeNode({ id: "box2", type: "Box", parentId: "col1" }),
    };
    const ctx = makeCtx({
      nodeId: "box1",
      nodes,
      getContainerConfig: flexCfg,
      movingNodeIds: ["box1", "box2"],
    });
    expect(strategy.canHandle(ctx)).toBe(false);
  });

  it("returns false for position:absolute node in a flow parent", () => {
    const strategy = new FlowDragStrategy();
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1", style: { position: "absolute" } }),
    };
    const ctx = makeCtx({
      nodeId: "box1",
      nodes,
      getContainerConfig: flexCfg,
      movingNodeIds: ["box1"],
    });
    expect(strategy.canHandle(ctx)).toBe(false);
  });

  it("returns true for static child in flex parent", () => {
    const strategy = new FlowDragStrategy();
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1" }),
    };
    const ctx = makeCtx({
      nodeId: "box1",
      nodes,
      getContainerConfig: flexCfg,
      movingNodeIds: ["box1"],
    });
    expect(strategy.canHandle(ctx)).toBe(true);
  });
});

// ── onMove ────────────────────────────────────────────────────────────────

describe("FlowDragStrategy.onMove", () => {
  let restoreDoc: (() => void) | undefined;
  let restoreGCS: (() => void) | undefined;
  afterEach(() => { restoreDoc?.(); restoreDoc = undefined; restoreGCS?.(); restoreGCS = undefined; });

  function patchElementsFromPoint(elements: Element[]): () => void {
    const prev = globalThis.document;
    (globalThis as unknown as Record<string, unknown>).document = {
      ...(prev ?? {}),
      elementsFromPoint: () => elements,
      querySelector: () => null,
    };
    return () => { (globalThis as unknown as Record<string, unknown>).document = prev; };
  }

  function patchGetComputedStyle(styles: Partial<CSSStyleDeclaration>): () => void {
    const prev = globalThis.getComputedStyle;
    const merged = {
      gridTemplateColumns: "none", gridTemplateRows: "none",
      paddingLeft: "0px", paddingTop: "0px", paddingBottom: "0px",
      columnGap: "0px", rowGap: "0px", flexDirection: "column",
      ...styles,
    };
    (globalThis as unknown as Record<string, unknown>).getComputedStyle = () => merged;
    return () => { (globalThis as unknown as Record<string, unknown>).getComputedStyle = prev; };
  }

  it("returns flowDropTarget with correct containerId + insertIndex", () => {
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1", order: 0 }),
    };

    const containerEl = {
      getAttribute: (a: string) => a === "data-node-id" ? "col1" : null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) }),
      offsetWidth: 200, offsetHeight: 200,
      querySelector: () => null,
    } as unknown as HTMLElement;

    const frameEl = {
      querySelector: (sel: string) => {
        if (sel === '[data-node-id="col1"]') return containerEl;
        return null;
      },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
    } as unknown as HTMLElement;

    restoreDoc = patchElementsFromPoint([containerEl as unknown as Element]);
    restoreGCS = patchGetComputedStyle({ flexDirection: "column" });

    const strategy = new FlowDragStrategy();
    const ctx = makeCtx({
      nodeId: "box1",
      nodeType: "Box",
      startPoint: { x: 0, y: 0 },
      frameEl,
      zoom: 1,
      nodes,
      getContainerConfig: flexCfg,
      movingNodeIds: ["box1"],
    });

    const e = { clientX: 50, clientY: 50 } as MouseEvent;
    const result = strategy.onMove(ctx, e);

    expect(result.flowDropTarget).not.toBeNull();
    expect(result.flowDropTarget!.containerId).toBe("col1");
    expect(typeof result.flowDropTarget!.insertIndex).toBe("number");
  });

  it("returns flowDragOffset matching (clientX - startX) / zoom", () => {
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1" }),
    };

    // No flow container found → offset still returned
    restoreDoc = patchElementsFromPoint([]);
    restoreGCS = patchGetComputedStyle({});

    const frameEl = {
      querySelector: () => null,
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON: () => ({}) }),
    } as unknown as HTMLElement;

    const strategy = new FlowDragStrategy();
    const ctx = makeCtx({
      nodeId: "box1",
      nodeType: "Box",
      startPoint: { x: 100, y: 200 },
      frameEl,
      zoom: 2,
      nodes,
      getContainerConfig: flexCfg,
      movingNodeIds: ["box1"],
    });

    const e = { clientX: 150, clientY: 260 } as MouseEvent;
    const result = strategy.onMove(ctx, e);

    // offset = (150-100)/2 = 25, (260-200)/2 = 30
    expect(result.flowDragOffset).toEqual({ x: 25, y: 30 });
  });
});

// ── onDrop ────────────────────────────────────────────────────────────────

describe("FlowDragStrategy.onDrop", () => {
  it("dispatches REORDER_NODE only when same container", () => {
    const dispatched: Array<{ type: string; payload: unknown }> = [];
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1" }),
    };
    const ctx = makeCtx({
      nodeId: "box1",
      nodes,
      dispatch: (a) => dispatched.push(a as { type: string; payload: unknown }),
    });
    const strategy = new FlowDragStrategy();
    const lastState: DragVisualState = {
      ...EMPTY_VISUAL_STATE,
      flowDropTarget: { containerId: "col1", insertIndex: 1 },
    };

    strategy.onDrop(ctx, {} as MouseEvent, lastState);

    const types = dispatched.map((d) => d.type);
    expect(types).toContain("UPDATE_STYLE");
    expect(types).toContain("REORDER_NODE");
    expect(types).not.toContain("MOVE_NODE");
  });

  it("dispatches MOVE_NODE then REORDER_NODE when cross-container", () => {
    const dispatched: Array<{ type: string; payload: unknown }> = [];
    const nodes = {
      col1: makeNode({ id: "col1", type: "Column", parentId: "root" }),
      col2: makeNode({ id: "col2", type: "Column", parentId: "root" }),
      box1: makeNode({ id: "box1", type: "Box", parentId: "col1" }),
    };
    const ctx = makeCtx({
      nodeId: "box1",
      nodes,
      dispatch: (a) => dispatched.push(a as { type: string; payload: unknown }),
    });
    const strategy = new FlowDragStrategy();
    const lastState: DragVisualState = {
      ...EMPTY_VISUAL_STATE,
      flowDropTarget: { containerId: "col2", insertIndex: 0 },
    };

    strategy.onDrop(ctx, {} as MouseEvent, lastState);

    const types = dispatched.map((d) => d.type);
    expect(types).toContain("MOVE_NODE");
    expect(types).toContain("REORDER_NODE");
    // MOVE_NODE must come before REORDER_NODE
    expect(types.indexOf("MOVE_NODE")).toBeLessThan(types.indexOf("REORDER_NODE"));
  });
});

// ── onCancel ──────────────────────────────────────────────────────────────

describe("FlowDragStrategy.onCancel", () => {
  it("does not throw when preview was never attached", () => {
    const strategy = new FlowDragStrategy();
    const ctx = makeCtx({ nodeId: "box1" });
    expect(() => strategy.onCancel(ctx)).not.toThrow();
  });
});

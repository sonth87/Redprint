import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";

function makePopup() {
  const builder = createBuilder();
  builder.dispatch({
    type: "CREATE_POPUP",
    payload: { popupId: "p1", rootNodeId: "base-root", name: "Promo", kind: "modal" },
  });
  return builder;
}

describe("Popup V4 — goal commands", () => {
  it("adds, updates, and removes goals with undo/redo", () => {
    const builder = makePopup();

    builder.dispatch({
      type: "ADD_POPUP_GOAL",
      payload: { popupId: "p1", goalId: "g1", goal: { name: "CTA", type: "click" } },
    });
    expect(builder.getState().document.popups!.p1.goals).toHaveLength(1);

    builder.dispatch({
      type: "UPDATE_POPUP_GOAL",
      payload: { popupId: "p1", goalId: "g1", goal: { name: "Signup" } },
    });
    expect(builder.getState().document.popups!.p1.goals![0].name).toBe("Signup");

    builder.undo();
    expect(builder.getState().document.popups!.p1.goals![0].name).toBe("CTA");

    builder.dispatch({ type: "REMOVE_POPUP_GOAL", payload: { popupId: "p1", goalId: "g1" } });
    expect(builder.getState().document.popups!.p1.goals).toHaveLength(0);

    builder.undo();
    expect(builder.getState().document.popups!.p1.goals).toHaveLength(1);
    expect(builder.getState().document.popups!.p1.goals![0].id).toBe("g1");
  });
});

describe("Popup V4 — variant commands", () => {
  it("adds a patch-only variant without creating nodes", () => {
    const builder = makePopup();
    const before = Object.keys(builder.getState().document.nodes).length;

    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", name: "B", popupPatch: { name: "Patched" } },
    });

    const popup = builder.getState().document.popups!.p1;
    expect(popup.variants).toHaveLength(1);
    expect(popup.variants![0].rootNodeId).toBeUndefined();
    expect(Object.keys(builder.getState().document.nodes).length).toBe(before);
  });

  it("adds a clone-from-base variant that owns a content root", () => {
    const builder = makePopup();
    const before = Object.keys(builder.getState().document.nodes).length;

    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", cloneFromBase: true },
    });

    const variant = builder.getState().document.popups!.p1.variants![0];
    expect(variant.rootNodeId).toBeDefined();
    expect(variant.rootNodeId).not.toBe("base-root");
    expect(builder.getState().document.nodes[variant.rootNodeId!]).toBeDefined();
    expect(Object.keys(builder.getState().document.nodes).length).toBeGreaterThan(before);
  });

  it("removing a variant cascades node deletion and undo restores it", () => {
    const builder = makePopup();
    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", rootNodeId: "v1-root", cloneFromBase: true },
    });
    expect(builder.getState().document.nodes["v1-root"]).toBeDefined();

    builder.dispatch({ type: "REMOVE_POPUP_VARIANT", payload: { popupId: "p1", variantId: "v1" } });
    expect(builder.getState().document.popups!.p1.variants).toHaveLength(0);
    expect(builder.getState().document.nodes["v1-root"]).toBeUndefined();

    builder.undo();
    expect(builder.getState().document.popups!.p1.variants).toHaveLength(1);
    expect(builder.getState().document.nodes["v1-root"]).toBeDefined();
  });

  it("updates experiment config with undo", () => {
    const builder = makePopup();
    builder.dispatch({
      type: "UPDATE_POPUP_EXPERIMENT",
      payload: { popupId: "p1", experiment: { enabled: true, assignment: "sticky" } },
    });
    expect(builder.getState().document.popups!.p1.experiment?.enabled).toBe(true);
    expect(builder.getState().document.popups!.p1.experiment?.assignment).toBe("sticky");

    builder.undo();
    expect(builder.getState().document.popups!.p1.experiment?.enabled).toBeFalsy();
  });
});

describe("Popup V4 — ownership: delete + duplicate cascade variant roots", () => {
  it("DELETE_POPUP cascades base and variant content roots; undo restores both", () => {
    const builder = makePopup();
    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", rootNodeId: "v1-root", cloneFromBase: true },
    });

    builder.dispatch({ type: "DELETE_POPUP", payload: { popupId: "p1" } });
    expect(builder.getState().document.popups?.p1).toBeUndefined();
    expect(builder.getState().document.nodes["base-root"]).toBeUndefined();
    expect(builder.getState().document.nodes["v1-root"]).toBeUndefined();

    builder.undo();
    expect(builder.getState().document.popups?.p1).toBeDefined();
    expect(builder.getState().document.nodes["base-root"]).toBeDefined();
    expect(builder.getState().document.nodes["v1-root"]).toBeDefined();
  });

  it("DUPLICATE_POPUP clones variant roots with fresh ids and copies goals/experiment", () => {
    const builder = makePopup();
    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", rootNodeId: "v1-root", cloneFromBase: true },
    });
    builder.dispatch({
      type: "ADD_POPUP_GOAL",
      payload: { popupId: "p1", goalId: "g1", goal: { name: "CTA", type: "click" } },
    });
    builder.dispatch({
      type: "UPDATE_POPUP_EXPERIMENT",
      payload: { popupId: "p1", experiment: { enabled: true, assignment: "random" } },
    });

    builder.dispatch({
      type: "DUPLICATE_POPUP",
      payload: { popupId: "p1", newPopupId: "p2" },
    });

    const dup = builder.getState().document.popups!.p2;
    expect(dup).toBeDefined();
    expect(dup.variants).toHaveLength(1);
    // Variant root is a fresh node owned by the duplicate, not shared with p1.
    const dupVariantRoot = dup.variants![0].rootNodeId!;
    expect(dupVariantRoot).not.toBe("v1-root");
    expect(builder.getState().document.nodes[dupVariantRoot]).toBeDefined();
    // Goals copied with new ids; experiment copied.
    expect(dup.goals).toHaveLength(1);
    expect(dup.goals![0].id).not.toBe("g1");
    expect(dup.experiment?.enabled).toBe(true);
  });
});

describe("Popup V4 — SET_ACTIVE_POPUP_VARIANT is editor-only (no undo)", () => {
  it("sets the active variant without adding a history entry", () => {
    const builder = makePopup();
    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1", rootNodeId: "v1-root", cloneFromBase: true },
    });
    builder.dispatch({
      type: "SET_ACTIVE_POPUP_VARIANT",
      payload: { popupId: "p1", variantId: "v1" },
    });
    expect(builder.getState().editor.activePopupVariantId).toBe("v1");

    // Undo should revert the variant add, not the active-variant selection
    // (the active-variant command is editor-only and adds no history entry).
    builder.undo();
    expect(builder.getState().document.popups!.p1.variants).toHaveLength(0);
  });
});

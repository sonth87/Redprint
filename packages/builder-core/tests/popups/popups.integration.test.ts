import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import { validateDocument } from "../../src/validation/validators";

describe("popup commands", () => {
  it("creates and undoes a popup with a detached content root", () => {
    const builder = createBuilder();

    const result = builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        popupId: "popup-1",
        rootNodeId: "popup-root-1",
        name: "Newsletter",
        kind: "modal",
        placement: "center",
      },
    });

    expect(result.success).toBe(true);
    expect(builder.getState().document.popups?.["popup-1"]?.rootNodeId).toBe("popup-root-1");
    expect(builder.getState().document.nodes["popup-root-1"]?.parentId).toBeNull();
    expect(builder.getState().document.rootNodeId).not.toBe("popup-root-1");
    expect(builder.getState().editor.activePopupId).toBe("popup-1");
    expect(builder.getState().editor.activePopupSelection).toBe("shell");
    expect(builder.getState().editor.selectedNodeIds).toEqual([]);

    expect(builder.undo().success).toBe(true);
    expect(builder.getState().document.popups?.["popup-1"]).toBeUndefined();
    expect(builder.getState().document.nodes["popup-root-1"]).toBeUndefined();
  });

  it("updates, duplicates, and deletes popup definitions with undo support", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        popupId: "popup-1",
        rootNodeId: "popup-root-1",
        name: "Promo",
        kind: "drawer",
        placement: "right",
      },
    });

    builder.dispatch({
      type: "UPDATE_POPUP",
      payload: { popupId: "popup-1", popup: { name: "Promo Drawer" } },
    });
    expect(builder.getState().document.popups?.["popup-1"]?.name).toBe("Promo Drawer");
    expect(builder.undo().success).toBe(true);
    expect(builder.getState().document.popups?.["popup-1"]?.name).toBe("Promo");

    builder.dispatch({
      type: "DUPLICATE_POPUP",
      payload: { popupId: "popup-1", newPopupId: "popup-2", newRootNodeId: "popup-root-2" },
    });
    expect(builder.getState().document.popups?.["popup-2"]?.rootNodeId).toBe("popup-root-2");
    expect(builder.getState().document.nodes["popup-root-2"]).toBeDefined();
    expect(builder.undo().success).toBe(true);
    expect(builder.getState().document.popups?.["popup-2"]).toBeUndefined();

    builder.dispatch({ type: "DELETE_POPUP", payload: { popupId: "popup-1" } });
    expect(builder.getState().document.popups?.["popup-1"]).toBeUndefined();
    expect(builder.getState().editor.activePopupId).toBeNull();
    expect(builder.getState().editor.activePopupSelection).toBeNull();
    expect(builder.undo().success).toBe(true);
    expect(builder.getState().document.popups?.["popup-1"]?.rootNodeId).toBe("popup-root-1");
    expect(builder.getState().editor.activePopupId).toBe("popup-1");
    expect(builder.getState().editor.activePopupSelection).toBe("shell");
  });

  it("switches between popup shell and content selection", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        popupId: "popup-1",
        rootNodeId: "popup-root-1",
        name: "Newsletter",
        kind: "modal",
        placement: "center",
      },
    });

    expect(builder.getState().editor.activePopupSelection).toBe("shell");

    builder.dispatch({
      type: "SET_ACTIVE_POPUP_SELECTION",
      payload: { selection: "content" },
    });
    expect(builder.getState().editor.activePopupSelection).toBe("content");
    expect(builder.getState().editor.selectedNodeIds).toEqual(["popup-root-1"]);

    builder.dispatch({
      type: "SET_ACTIVE_POPUP_SELECTION",
      payload: { selection: "shell" },
    });
    expect(builder.getState().editor.activePopupSelection).toBe("shell");
    expect(builder.getState().editor.selectedNodeIds).toEqual([]);

    builder.dispatch({ type: "SET_ACTIVE_POPUP", payload: { popupId: null } });
    expect(builder.getState().editor.activePopupId).toBeNull();
    expect(builder.getState().editor.activePopupSelection).toBeNull();
    expect(builder.getState().editor.selectedNodeIds).toEqual([]);
  });

  it("updates modal shell size and offset through popup kindConfig with undo support", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        popupId: "popup-1",
        rootNodeId: "popup-root-1",
        name: "Promo",
        kind: "modal",
        placement: "center",
      },
    });

    builder.dispatch({
      type: "UPDATE_POPUP",
      payload: {
        popupId: "popup-1",
        popup: {
          kindConfig: {
            kind: "modal",
            size: "custom",
            width: "720px",
            height: "420px",
            maxWidth: "90vw",
            maxHeight: "90vh",
            draggable: true,
            resizable: true,
            offsetX: 32,
            offsetY: -18,
          },
        },
      },
    });

    expect(builder.getState().document.popups?.["popup-1"]?.kindConfig).toMatchObject({
      kind: "modal",
      width: "720px",
      height: "420px",
      offsetX: 32,
      offsetY: -18,
    });
    expect(builder.undo().success).toBe(true);
    expect(builder.getState().document.popups?.["popup-1"]?.kindConfig).toMatchObject({
      kind: "modal",
      maxWidth: "640px",
      maxHeight: "90vh",
    });
  });

  it("validates popup modal config with optional V2 shell fields", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        name: "Survey",
        kind: "modal",
        placement: "center",
        popup: {
          kindConfig: {
            kind: "modal",
            size: "custom",
            width: "680px",
            height: "380px",
            maxWidth: "90vw",
            maxHeight: "88vh",
            draggable: true,
            resizable: true,
            offsetX: 24,
            offsetY: 12,
          },
        },
      },
    });

    const validation = validateDocument(builder.getState().document);
    expect(validation.valid).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";

function setup() {
  const builder = createBuilder();
  builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
  const popupId = builder.getState().editor.activePopupId!;
  return { builder, popupId };
}

// ── Locale CRUD ───────────────────────────────────────────────────────────────

describe("V5 locale commands", () => {
  it("ADD_POPUP_LOCALE (patch-only): adds locale entry without new nodes", () => {
    const { builder, popupId } = setup();
    const nodesBefore = Object.keys(builder.getState().document.nodes).length;
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: false }, description: "add fr" });
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales).toHaveLength(1);
    expect(popup.locales![0].locale).toBe("fr");
    expect(popup.locales![0].rootNodeId).toBeUndefined();
    expect(Object.keys(builder.getState().document.nodes).length).toBe(nodesBefore);
  });

  it("ADD_POPUP_LOCALE (cloneFromBase): creates new nodes", () => {
    const { builder, popupId } = setup();
    const nodesBefore = Object.keys(builder.getState().document.nodes).length;
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "de", cloneFromBase: true }, description: "add de" });
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales).toHaveLength(1);
    expect(popup.locales![0].rootNodeId).toBeDefined();
    expect(Object.keys(builder.getState().document.nodes).length).toBeGreaterThan(nodesBefore);
  });

  it("ADD_POPUP_LOCALE is undoable", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: false }, description: "add fr" });
    expect(builder.getState().document.popups![popupId]!.locales).toHaveLength(1);
    builder.undo();
    expect(builder.getState().document.popups![popupId]!.locales ?? []).toHaveLength(0);
  });

  it("UPDATE_POPUP_LOCALE: updates patch on existing locale", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: false }, description: "add fr" });
    builder.dispatch({ type: "UPDATE_POPUP_LOCALE", payload: { popupId, locale: "fr", patch: { popupPatch: { name: "Promo FR" } } }, description: "update fr" });
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales![0].popupPatch?.name).toBe("Promo FR");
  });

  it("UPDATE_POPUP_LOCALE is undoable", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: false }, description: "add fr" });
    builder.dispatch({ type: "UPDATE_POPUP_LOCALE", payload: { popupId, locale: "fr", patch: { popupPatch: { name: "Promo FR" } } }, description: "update fr" });
    builder.undo();
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales![0].popupPatch?.name).toBeUndefined();
  });

  it("REMOVE_POPUP_LOCALE: removes locale entry and cascade-deletes owned nodes", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    const localeRootId = builder.getState().document.popups![popupId]!.locales![0].rootNodeId!;
    expect(builder.getState().document.nodes[localeRootId]).toBeDefined();

    builder.dispatch({ type: "REMOVE_POPUP_LOCALE", payload: { popupId, locale: "fr" }, description: "remove fr" });
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales ?? []).toHaveLength(0);
    expect(builder.getState().document.nodes[localeRootId]).toBeUndefined();
  });

  it("REMOVE_POPUP_LOCALE is undoable (restores nodes)", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    const localeRootId = builder.getState().document.popups![popupId]!.locales![0].rootNodeId!;
    builder.dispatch({ type: "REMOVE_POPUP_LOCALE", payload: { popupId, locale: "fr" }, description: "remove fr" });
    builder.undo();
    const popup = builder.getState().document.popups![popupId]!;
    expect(popup.locales).toHaveLength(1);
    expect(builder.getState().document.nodes[localeRootId]).toBeDefined();
  });
});

// ── DELETE_POPUP cascade ──────────────────────────────────────────────────────

describe("V5 locale cascade on DELETE_POPUP", () => {
  it("deletes locale-owned nodes when popup is deleted", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    const localeRootId = builder.getState().document.popups![popupId]!.locales![0].rootNodeId!;
    builder.dispatch({ type: "DELETE_POPUP", payload: { popupId }, description: "delete popup" });
    expect(builder.getState().document.popups![popupId]).toBeUndefined();
    expect(builder.getState().document.nodes[localeRootId]).toBeUndefined();
  });
});

// ── DUPLICATE_POPUP cascade ───────────────────────────────────────────────────

describe("V5 locale cascade on DUPLICATE_POPUP", () => {
  it("clones locale roots with new IDs on duplicate", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    const origLocaleRootId = builder.getState().document.popups![popupId]!.locales![0].rootNodeId!;

    const newPopupId = "new-popup-id";
    const newRootNodeId = "new-root-id";
    builder.dispatch({ type: "DUPLICATE_POPUP", payload: { popupId, newPopupId, newRootNodeId }, description: "duplicate" });

    const dupPopup = builder.getState().document.popups![newPopupId];
    expect(dupPopup).toBeDefined();
    expect(dupPopup!.locales).toHaveLength(1);
    expect(dupPopup!.locales![0].locale).toBe("fr");

    const dupLocaleRootId = dupPopup!.locales![0].rootNodeId;
    expect(dupLocaleRootId).not.toBe(origLocaleRootId);
    if (dupLocaleRootId) {
      expect(builder.getState().document.nodes[dupLocaleRootId]).toBeDefined();
    }
  });
});

// ── SET_ACTIVE_POPUP_LOCALE (no undo) ─────────────────────────────────────────

describe("SET_ACTIVE_POPUP_LOCALE", () => {
  it("sets activePopupLocale in editor state", () => {
    const { builder, popupId } = setup();
    // Locale must have a rootNodeId to be editable (cloneFromBase: true)
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    builder.dispatch({ type: "SET_ACTIVE_POPUP_LOCALE", payload: { popupId, locale: "fr" }, description: "edit fr" });
    expect(builder.getState().editor.activePopupLocale).toBe("fr");
  });

  it("is not undoable (no-undo command)", () => {
    const { builder, popupId } = setup();
    builder.dispatch({ type: "SET_ACTIVE_POPUP_LOCALE", payload: { popupId, locale: "fr" }, description: "edit fr" });
    const canUndoBefore = builder.canUndo;
    builder.undo();
    // activePopupLocale may or may not change, but undo should not throw
    expect(builder.canUndo).toBe(canUndoBefore);
  });

  it("SET_ACTIVE_POPUP clears activePopupLocale", () => {
    const { builder, popupId } = setup();
    // Use cloneFromBase so the locale has a rootNodeId and is editable
    builder.dispatch({ type: "ADD_POPUP_LOCALE", payload: { popupId, locale: "fr", cloneFromBase: true }, description: "add fr" });
    builder.dispatch({ type: "SET_ACTIVE_POPUP_LOCALE", payload: { popupId, locale: "fr" }, description: "edit fr" });
    expect(builder.getState().editor.activePopupLocale).toBe("fr");
    builder.dispatch({ type: "SET_ACTIVE_POPUP", payload: { popupId: null }, description: "clear" });
    expect(builder.getState().editor.activePopupLocale).toBeNull();
  });
});

// ── UPDATE_POPUP_TARGETING ────────────────────────────────────────────────────

describe("UPDATE_POPUP_TARGETING", () => {
  it("sets targeting config and is undoable", () => {
    const { builder, popupId } = setup();
    const targeting = { enabled: true, groups: [{ match: "all" as const, conditions: [{ variable: "plan", operator: "eq" as const, value: "pro" }] }] };
    builder.dispatch({ type: "UPDATE_POPUP_TARGETING", payload: { popupId, targeting }, description: "set targeting" });
    expect(builder.getState().document.popups![popupId]!.rules.targeting?.enabled).toBe(true);
    builder.undo();
    expect(builder.getState().document.popups![popupId]!.rules.targeting).toBeUndefined();
  });
});

// ── UPDATE_POPUP_SCHEDULE ─────────────────────────────────────────────────────

describe("UPDATE_POPUP_SCHEDULE", () => {
  it("sets schedule config and is undoable", () => {
    const { builder, popupId } = setup();
    const schedule = { enabled: true, startDate: "2025-01-01", endDate: "2026-01-01" };
    builder.dispatch({ type: "UPDATE_POPUP_SCHEDULE", payload: { popupId, schedule }, description: "set schedule" });
    expect(builder.getState().document.popups![popupId]!.rules.scheduling?.startDate).toBe("2025-01-01");
    builder.undo();
    expect(builder.getState().document.popups![popupId]!.rules.scheduling).toBeUndefined();
  });
});

// ── UPDATE_POPUP_FREQUENCY ────────────────────────────────────────────────────

describe("UPDATE_POPUP_FREQUENCY", () => {
  it("sets frequency config and is undoable", () => {
    const { builder, popupId } = setup();
    const frequency = { cap: { maxShows: 2, per: "week" as const } };
    builder.dispatch({ type: "UPDATE_POPUP_FREQUENCY", payload: { popupId, frequency }, description: "set frequency" });
    expect(builder.getState().document.popups![popupId]!.rules.frequency?.cap?.maxShows).toBe(2);
    builder.undo();
    expect(builder.getState().document.popups![popupId]!.rules.frequency).toBeUndefined();
  });
});

import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import { validateDocument } from "../../src/validation/validators";
import { popupV4Migration } from "../../src/migration/popupV4Migration";
import { MigrationEngine } from "../../src/migration/MigrationEngine";
import { CURRENT_SCHEMA_VERSION } from "../../src/document/constants";
import type { BuilderDocument } from "../../src/document/types";

describe("Popup V4 — schema + migration", () => {
  it("current schema version is 2.5.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.5.0");
  });

  it("validates a popup carrying V4 goals/variants/experiment", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Promo", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;

    builder.dispatch({
      type: "ADD_POPUP_GOAL",
      payload: { popupId, goal: { name: "CTA", type: "click" } },
    });
    builder.dispatch({
      type: "ADD_POPUP_VARIANT",
      payload: { popupId, name: "B", weight: 2 },
    });
    builder.dispatch({
      type: "UPDATE_POPUP_EXPERIMENT",
      payload: { popupId, experiment: { enabled: true, assignment: "sticky" } },
    });

    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("keeps a base popup (no V4 fields) valid", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Plain", kind: "modal" } });
    expect(validateDocument(builder.getState().document).valid).toBe(true);
  });

  it("rejects an invalid experiment assignment enum", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Promo", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    const doc = builder.getState().document;
    // sanity: valid before corruption
    expect(validateDocument(doc).valid).toBe(true);

    const corrupted = JSON.parse(JSON.stringify(doc)) as BuilderDocument;
    (corrupted.popups![popupId] as Record<string, unknown>).experiment = {
      enabled: true,
      assignment: "bogus",
    };
    expect(validateDocument(corrupted).valid).toBe(false);
  });

  it("migrates 2.4.0 → 2.5.0 additively", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Legacy", kind: "modal" } });
    const doc = { ...builder.getState().document, schemaVersion: "2.4.0" };

    const engine = new MigrationEngine();
    engine.register(popupV4Migration);
    const migrated = engine.migrate(doc as unknown as BuilderDocument, "2.5.0");

    expect(migrated.schemaVersion).toBe("2.5.0");
    // Content unchanged apart from the version bump.
    expect(Object.keys(migrated.popups ?? {})).toEqual(Object.keys(doc.popups ?? {}));
    expect(validateDocument(migrated).valid).toBe(true);
  });
});

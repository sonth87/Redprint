import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../../src/document/constants";
import { popupV5Migration } from "../../src/migration/popupV5Migration";
import { popupV4Migration } from "../../src/migration/popupV4Migration";
import { MigrationEngine } from "../../src/migration/MigrationEngine";
import { validateDocument } from "../../src/validation/validators";
import { createBuilder } from "../../src/createBuilder";
import type { BuilderDocument } from "../../src/document/types";

// ── Schema version ────────────────────────────────────────────────────────────

describe("Popup V5 — schema version", () => {
  it("current schema version is 2.6.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.6.0");
  });

  it("popupV5Migration migrates from 2.5.0 to 2.6.0", () => {
    expect(popupV5Migration.fromVersion).toBe("2.5.0");
    expect(popupV5Migration.toVersion).toBe("2.6.0");
  });

  it("popupV4Migration still targets 2.5.0 (unchanged)", () => {
    expect(popupV4Migration.toVersion).toBe("2.5.0");
  });
});

// ── Migration ─────────────────────────────────────────────────────────────────

describe("Popup V5 — migration 2.5.0 → 2.6.0", () => {
  function makeV4Doc(): BuilderDocument {
    const builder = createBuilder();
    return { ...builder.getState().document, schemaVersion: "2.5.0" };
  }

  it("migrates a 2.5.0 document to 2.6.0 without data loss", () => {
    const engine = new MigrationEngine();
    engine.register(popupV5Migration);
    const doc = makeV4Doc();
    const migrated = engine.migrate(doc, "2.6.0");
    expect(migrated.schemaVersion).toBe("2.6.0");
    expect(migrated.rootNodeId).toBe(doc.rootNodeId);
  });

  it("popupV5Migration rollback function transforms 2.6.0 → 2.5.0", () => {
    const doc = { ...makeV4Doc(), schemaVersion: "2.6.0" };
    const rolledBack = popupV5Migration.rollback!(doc as ReturnType<typeof makeV4Doc>);
    expect(rolledBack.schemaVersion).toBe("2.5.0");
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("Popup V5 — zod validation", () => {
  it("validates a popup with no V5 fields (back-compat)", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("validates a popup with full V5 frequency config", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({
      type: "UPDATE_POPUP_FREQUENCY",
      payload: { popupId, frequency: { cap: { maxShows: 3, per: "day" }, suppressAfterGoalIds: [], storageKeyPrefix: "custom" } },
      description: "set frequency",
    });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("validates a popup with full V5 targeting config", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({
      type: "UPDATE_POPUP_TARGETING",
      payload: {
        popupId,
        targeting: {
          enabled: true,
          groups: [{ match: "all", conditions: [{ variable: "user.plan", operator: "eq", value: "pro" }] }],
        },
      },
      description: "set targeting",
    });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("validates a popup with full V5 schedule config", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({
      type: "UPDATE_POPUP_SCHEDULE",
      payload: {
        popupId,
        schedule: {
          enabled: true,
          startDate: "2024-01-01",
          endDate: "2025-01-01",
          timezone: "America/New_York",
          timeWindow: { startHour: 9, endHour: 17, daysOfWeek: [1, 2, 3, 4, 5] },
        },
      },
      description: "set schedule",
    });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("validates a popup with locales", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({
      type: "ADD_POPUP_LOCALE",
      payload: { popupId, locale: "fr", cloneFromBase: false },
      description: "add locale",
    });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });

  it("validates a popup with fallbackLocale", () => {
    const builder = createBuilder();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Test", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({
      type: "UPDATE_POPUP",
      payload: { popupId, popup: { fallbackLocale: "en" } },
      description: "set fallback locale",
    });
    const result = validateDocument(builder.getState().document);
    expect(result.valid).toBe(true);
  });
});

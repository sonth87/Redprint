import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION } from "../../src/document/constants";
import { popupV6Migration } from "../../src/migration/popupV6Migration";
import { popupV5Migration } from "../../src/migration/popupV5Migration";
import { MigrationEngine } from "../../src/migration/MigrationEngine";
import { validateDocument } from "../../src/validation/validators";
import { createBuilder } from "../../src/createBuilder";
import type { BuilderDocument } from "../../src/document/types";

// ── Schema version ────────────────────────────────────────────────────────────

describe("Popup V6 — schema version", () => {
  it("current schema version is 2.7.0", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe("2.7.0");
  });

  it("popupV6Migration migrates from 2.6.0 to 2.7.0", () => {
    expect(popupV6Migration.fromVersion).toBe("2.6.0");
    expect(popupV6Migration.toVersion).toBe("2.7.0");
  });

  it("popupV5Migration still targets 2.6.0 (unchanged)", () => {
    expect(popupV5Migration.toVersion).toBe("2.6.0");
  });
});

// ── Migration ─────────────────────────────────────────────────────────────────

function makeV5Doc(): BuilderDocument {
  const builder = createBuilder();
  return { ...builder.getState().document, schemaVersion: "2.6.0" };
}

describe("Popup V6 — migration 2.6.0 → 2.7.0", () => {
  it("migrates a 2.6.0 document to 2.7.0 without data loss", () => {
    const engine = new MigrationEngine();
    engine.register(popupV6Migration);
    const doc = makeV5Doc();
    const migrated = engine.migrate(doc, "2.7.0");
    expect(migrated.schemaVersion).toBe("2.7.0");
    expect(migrated.rootNodeId).toBe(doc.rootNodeId);
  });

  it("rollback reverts 2.7.0 doc back to 2.6.0", () => {
    const doc = { ...makeV5Doc(), schemaVersion: "2.7.0" };
    const rolled = popupV6Migration.rollback!(doc);
    expect(rolled.schemaVersion).toBe("2.6.0");
  });

  it("rollback strips popupCampaigns field", () => {
    const now = new Date().toISOString();
    const doc = {
      ...makeV5Doc(),
      schemaVersion: "2.7.0",
      popupCampaigns: {
        c1: { id: "c1", name: "Test", status: "published", metadata: { createdAt: now, updatedAt: now } },
      },
    } as BuilderDocument;
    const rolled = popupV6Migration.rollback!(doc);
    expect((rolled as unknown as { popupCampaigns?: unknown }).popupCampaigns).toBeUndefined();
  });

  it("rollback clears campaignId and priority from popup definitions", () => {
    const base = makeV5Doc();
    const now = new Date().toISOString();
    const doc = {
      ...base,
      schemaVersion: "2.7.0",
      popups: {
        p1: {
          id: "p1", name: "P1", enabled: true, rootNodeId: "r1",
          kind: "modal", placement: "center",
          kindConfig: { kind: "modal", size: "md" },
          autoTrigger: { type: "manual" },
          behavior: { backdrop: { enabled: true, color: "#000", opacity: 0.5 }, closeOnEscape: true, closeOnBackdropClick: true, showCloseButton: true, lockBodyScroll: true, trapFocus: true, restoreFocus: true },
          animation: { enter: "fade", durationMs: 200 },
          rules: {},
          metadata: { createdAt: now, updatedAt: now },
          campaignId: "c1",
          priority: 5,
        },
      },
    } as unknown as BuilderDocument;
    const rolled = popupV6Migration.rollback!(doc);
    const popup = rolled.popups?.["p1"] as unknown as { campaignId?: string; priority?: number };
    expect(popup.campaignId).toBeUndefined();
    expect(popup.priority).toBeUndefined();
  });
});

// ── Validation ────────────────────────────────────────────────────────────────

describe("Popup V6 — schema validation", () => {
  it("V5 doc (no campaigns, no campaignId) validates cleanly", () => {
    const doc = makeV5Doc();
    const result = validateDocument(doc);
    expect(result.valid).toBe(true);
  });

  it("full V6 doc with campaigns + campaignId + priority validates", () => {
    const now = new Date().toISOString();
    const base = makeV5Doc();
    const doc = {
      ...base,
      schemaVersion: "2.7.0",
      popupCampaigns: {
        c1: {
          id: "c1",
          name: "Launch Campaign",
          description: "Q4 launch",
          status: "published",
          priority: 2,
          conflictPolicy: "suppress",
          metadata: { createdAt: now, updatedAt: now, statusHistory: [{ status: "draft", at: now }] },
        },
      },
      popups: {
        p1: {
          id: "p1", name: "Welcome", enabled: true, rootNodeId: "r1",
          kind: "modal", placement: "center",
          kindConfig: { kind: "modal", size: "md" },
          autoTrigger: { type: "manual" },
          behavior: { backdrop: { enabled: true, color: "#000", opacity: 0.5 }, closeOnEscape: true, closeOnBackdropClick: true, showCloseButton: true, lockBodyScroll: true, trapFocus: true, restoreFocus: true },
          animation: { enter: "fade", durationMs: 200 },
          rules: {},
          metadata: { createdAt: now, updatedAt: now },
          campaignId: "c1",
          priority: 3,
        },
      },
    };
    const result = validateDocument(doc);
    expect(result.valid).toBe(true);
  });

  it("invalid campaign status enum is rejected", () => {
    const now = new Date().toISOString();
    const base = makeV5Doc();
    const doc = {
      ...base,
      schemaVersion: "2.7.0",
      popupCampaigns: {
        c1: {
          id: "c1", name: "Bad", status: "flying", // invalid
          metadata: { createdAt: now, updatedAt: now },
        },
      },
    };
    const result = validateDocument(doc);
    expect(result.valid).toBe(false);
  });

  it("invalid conflictPolicy enum is rejected", () => {
    const now = new Date().toISOString();
    const base = makeV5Doc();
    const doc = {
      ...base,
      schemaVersion: "2.7.0",
      popupCampaigns: {
        c1: {
          id: "c1", name: "Bad", status: "published",
          conflictPolicy: "annihilate", // invalid
          metadata: { createdAt: now, updatedAt: now },
        },
      },
    };
    const result = validateDocument(doc);
    expect(result.valid).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import { validateDocument } from "../../src/validation/validators";
import { popupV3Migration } from "../../src/migration/popupV3Migration";
import { MigrationEngine } from "../../src/migration/MigrationEngine";
import type { BuilderDocument } from "../../src/document/types";

describe("Popup V3 — schema + migration", () => {
  it("V3 migration targets schema version 2.4.0", () => {
    expect(popupV3Migration.toVersion).toBe("2.4.0");
  });

  it("validates a popup carrying V3 optional fields", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: {
        name: "Promo",
        kind: "modal",
        placement: "center",
        popup: {
          behavior: {
            backdrop: { enabled: true, color: "#000", opacity: 0.5 },
            closeOnEscape: true,
            closeOnBackdropClick: true,
            showCloseButton: true,
            lockBodyScroll: true,
            trapFocus: true,
            restoreFocus: true,
            inertBackground: true,
            preventBackgroundInteraction: true,
            closeOnRouteChange: true,
            closeOnOutsideInteraction: false,
            reducedMotion: "respect",
          },
          runtimeState: { stackMode: "multiple", zIndexBase: 20000 },
          kindConfig: {
            kind: "modal",
            size: "md",
            runtimeDraggable: true,
            runtimeResizable: true,
            dragBounds: "viewport",
          },
        },
      },
    });
    const validation = validateDocument(builder.getState().document);
    expect(validation.valid).toBe(true);
  });

  it("rejects an invalid reducedMotion enum value", () => {
    const builder = createBuilder();
    builder.dispatch({
      type: "CREATE_POPUP",
      payload: { name: "X", kind: "modal", placement: "center" },
    });
    const doc = structuredClone(builder.getState().document) as BuilderDocument;
    const popupId = Object.keys(doc.popups!)[0]!;
    // Sanity: doc is valid before we corrupt it (isolates the enum failure).
    expect(validateDocument(doc).valid).toBe(true);
    (doc.popups![popupId]!.behavior as Record<string, unknown>).reducedMotion = "nope";
    const validation = validateDocument(doc);
    expect(validation.valid).toBe(false);
  });

  it("migrates a 2.3.0 document to 2.4.0 and fills behavior defaults", () => {
    const engine = new MigrationEngine();
    engine.register(popupV3Migration);

    const v2Doc = {
      id: "doc-1",
      schemaVersion: "2.3.0",
      createdAt: "x",
      updatedAt: "x",
      name: "Doc",
      nodes: {},
      rootNodeId: "root",
      breakpoints: [],
      variables: {},
      assets: { version: "1.0", assets: [] },
      plugins: [],
      canvasConfig: {},
      metadata: {},
      popups: {
        p1: {
          id: "p1",
          name: "Modal",
          enabled: true,
          rootNodeId: "r1",
          kind: "modal",
          placement: "center",
          kindConfig: { kind: "modal", size: "md" },
          autoTrigger: { type: "manual" },
          behavior: {
            backdrop: { enabled: true, color: "#000", opacity: 0.5 },
            closeOnEscape: true,
            closeOnBackdropClick: true,
            showCloseButton: true,
            lockBodyScroll: true,
            trapFocus: true,
            restoreFocus: true,
          },
          animation: { enter: "scale", durationMs: 200 },
          rules: {},
          metadata: { createdAt: "x", updatedAt: "x" },
        },
      },
    } as unknown as BuilderDocument;

    const migrated = engine.migrate(v2Doc, "2.4.0");
    expect(migrated.schemaVersion).toBe("2.4.0");
    const behavior = migrated.popups!["p1"]!.behavior;
    expect(behavior.inertBackground).toBe(true);
    expect(behavior.reducedMotion).toBe("respect");
    expect(behavior.preventBackgroundInteraction).toBe(true);
    // original fields are preserved
    expect(behavior.closeOnEscape).toBe(true);
  });

  it("migration is a no-op-safe identity for docs with no popups", () => {
    const out = popupV3Migration.migrate({
      schemaVersion: "2.3.0",
      popups: {},
    } as unknown as BuilderDocument);
    expect(out.schemaVersion).toBe("2.4.0");
  });
});

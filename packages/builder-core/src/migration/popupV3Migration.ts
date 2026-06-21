/**
 * Popup System V3 migration: 2.3.0 → 2.4.0.
 *
 * Purely additive — all V3 popup fields are optional, so V2 documents are
 * already valid. This migration only:
 *   - bumps `schemaVersion` to 2.4.0
 *   - fills the new optional `behavior` defaults on existing popups so the
 *     runtime gets explicit values instead of relying on render-time fallbacks.
 *
 * It is a pure function (no side effects) and is reversible.
 *
 * Register it on a builder/migration engine:
 *   builder.registerMigration(popupV3Migration);
 */

import type { BuilderDocument } from "../document/types";
import type { SchemaMigration } from "./types";

const FROM = "2.3.0";
const TO = "2.4.0";

export const popupV3Migration: SchemaMigration = {
  fromVersion: FROM,
  toVersion: TO,
  description: "Popup System V3: runtime lifecycle/stacking + a11y behavior defaults",
  migrate(document: BuilderDocument): BuilderDocument {
    const popups = document.popups;
    if (!popups || Object.keys(popups).length === 0) {
      return { ...document, schemaVersion: TO };
    }

    const nextPopups = Object.fromEntries(
      Object.entries(popups).map(([id, popup]) => {
        const usesBackdrop = popup.kind !== "bar";
        const behavior = popup.behavior;
        return [
          id,
          {
            ...popup,
            behavior: {
              ...behavior,
              closeOnRouteChange: behavior.closeOnRouteChange ?? false,
              closeOnOutsideInteraction: behavior.closeOnOutsideInteraction ?? false,
              preventBackgroundInteraction: behavior.preventBackgroundInteraction ?? usesBackdrop,
              inertBackground: behavior.inertBackground ?? usesBackdrop,
              reducedMotion: behavior.reducedMotion ?? "respect",
            },
          },
        ];
      }),
    );

    return { ...document, schemaVersion: TO, popups: nextPopups };
  },
  rollback(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: FROM };
  },
};

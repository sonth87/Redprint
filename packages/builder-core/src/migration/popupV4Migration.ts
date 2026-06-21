/**
 * Popup System V4 migration: 2.4.0 → 2.5.0.
 *
 * Purely additive — all V4 popup fields (`goals`, `variants`, `experiment`)
 * are optional and absence means "base behavior", so V2/V3 documents are
 * already valid. This migration only bumps `schemaVersion` to 2.5.0.
 *
 * Register it on a builder/migration engine:
 *   builder.registerMigration(popupV4Migration);
 */

import type { BuilderDocument } from "../document/types";
import type { SchemaMigration } from "./types";

const FROM = "2.4.0";
const TO = "2.5.0";

export const popupV4Migration: SchemaMigration = {
  fromVersion: FROM,
  toVersion: TO,
  description: "Popup System V4: analytics goals + A/B variants (additive, optional)",
  migrate(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: TO };
  },
  rollback(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: FROM };
  },
};

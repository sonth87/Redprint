/**
 * Popup System V5 migration: 2.5.0 → 2.6.0.
 *
 * Purely additive — all V5 popup fields (`locales`, `fallbackLocale`, and the
 * new `rules.frequency`, `rules.targeting`, `rules.scheduling` sub-objects)
 * are optional and absence means "base behavior", so V2/V3/V4 documents are
 * already valid. This migration only bumps `schemaVersion` to 2.6.0.
 *
 * Register it on a builder/migration engine:
 *   builder.registerMigration(popupV5Migration);
 */

import type { BuilderDocument } from "../document/types";
import type { SchemaMigration } from "./types";

const FROM = "2.5.0";
const TO = "2.6.0";

export const popupV5Migration: SchemaMigration = {
  fromVersion: FROM,
  toVersion: TO,
  description:
    "Popup System V5: localization, targeting, scheduling & frequency (additive, optional)",
  migrate(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: TO };
  },
  rollback(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: FROM };
  },
};

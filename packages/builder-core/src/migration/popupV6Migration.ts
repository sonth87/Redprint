/**
 * Popup System V6 migration: 2.6.0 → 2.7.0.
 *
 * Purely additive — all V6 fields (`popupCampaigns` on BuilderDocument,
 * `campaignId` and `priority` on PopupDefinition) are optional and absence
 * means "ungrouped, base behavior". V2–V5 documents are already valid.
 * This migration only bumps `schemaVersion` to 2.7.0.
 *
 * Rollback strips `popupCampaigns` and clears `campaignId`/`priority` from
 * all popup definitions so the document is clean at 2.6.0.
 *
 * Register it on a builder/migration engine:
 *   builder.registerMigration(popupV6Migration);
 */

import type { BuilderDocument } from "../document/types";
import type { SchemaMigration } from "./types";

const FROM = "2.6.0";
const TO = "2.7.0";

export const popupV6Migration: SchemaMigration = {
  fromVersion: FROM,
  toVersion: TO,
  description:
    "Popup System V6: campaigns, conflict policy, priority (additive, optional)",
  migrate(document: BuilderDocument): BuilderDocument {
    return { ...document, schemaVersion: TO };
  },
  rollback(document: BuilderDocument): BuilderDocument {
    // Strip V6 fields to return a clean 2.6.0 document.
    const { popupCampaigns: _campaigns, ...rest } = document as BuilderDocument & {
      popupCampaigns?: unknown;
    };
    const popups = rest.popups
      ? Object.fromEntries(
          Object.entries(rest.popups).map(([id, popup]) => {
            const { campaignId: _c, priority: _p, ...cleanPopup } = popup as typeof popup & {
              campaignId?: unknown;
              priority?: unknown;
            };
            return [id, cleanPopup];
          }),
        )
      : rest.popups;
    return { ...rest, popups, schemaVersion: FROM } as BuilderDocument;
  },
};

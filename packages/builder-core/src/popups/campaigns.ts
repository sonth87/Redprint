import type {
  PopupDefinition,
  PopupCampaign,
  PopupConflictPolicy,
} from "../document/popups";

/**
 * Returns whether this popup is allowed to render given its campaign status.
 *
 * Rules:
 *  - No campaignId → ungrouped → always allowed.
 *  - campaignId present but campaign missing from map → lenient → allowed (orphaned id).
 *  - campaign.status === "published" → allowed.
 *  - Otherwise (draft/review/paused/archived) → blocked.
 */
export function evaluateCampaignGate(
  popup: PopupDefinition,
  campaigns: Record<string, PopupCampaign> | undefined,
): { allowed: boolean; campaignId?: string } {
  if (!popup.campaignId) return { allowed: true };
  const campaign = campaigns?.[popup.campaignId];
  if (!campaign) return { allowed: true };
  if (campaign.status === "published") {
    return { allowed: true, campaignId: campaign.id };
  }
  return { allowed: false, campaignId: campaign.id };
}

/**
 * Effective arbitration priority for a popup.
 * Formula: (campaign.priority ?? 0) * 1000 + (popup.priority ?? 0)
 * Campaign priority dominates; popup priority breaks ties within a campaign.
 */
export function effectivePriority(
  popup: PopupDefinition,
  campaigns: Record<string, PopupCampaign> | undefined,
): number {
  const campaignPriority = popup.campaignId
    ? (campaigns?.[popup.campaignId]?.priority ?? 0)
    : 0;
  return campaignPriority * 1000 + (popup.priority ?? 0);
}

/**
 * Returns the conflict policy governing a popup.
 * If the popup has no campaign or the campaign has no explicit policy, defaults to "stack".
 */
export function resolveConflictPolicy(
  popup: PopupDefinition,
  campaigns: Record<string, PopupCampaign> | undefined,
): PopupConflictPolicy {
  if (!popup.campaignId) return "stack";
  return campaigns?.[popup.campaignId]?.conflictPolicy ?? "stack";
}

// ── Arbitration ───────────────────────────────────────────────────────────────

export interface ArbitrationInput {
  candidatePopupId: string;
  candidatePolicy: PopupConflictPolicy;
  candidatePriority: number;
  /** Currently mounted campaign popups: id + effective priority. */
  openCampaignPopups: Array<{ popupId: string; priority: number }>;
}

export type ArbitrationDecision =
  | { action: "open" }
  | { action: "suppress" }
  | { action: "queue" }
  | { action: "replace"; closePopupIds: string[] };

/**
 * Pure arbitration over simultaneously-eligible campaign popups.
 *
 * - "stack":    always open (defer to runtimeState.stackMode downstream).
 * - "suppress": open only if candidate priority >= max open priority; otherwise suppress.
 * - "replace":  close lower-priority open popups; open if any were closed OR none are open.
 *               Strict > required (equal priority does NOT replace — avoids thrashing).
 * - "queue":    if any campaign popup is currently open, queue; else open immediately.
 */
export function arbitrate(input: ArbitrationInput): ArbitrationDecision {
  const { candidatePolicy, candidatePriority, openCampaignPopups } = input;

  if (candidatePolicy === "stack" || openCampaignPopups.length === 0) {
    return { action: "open" };
  }

  const maxOpenPriority = Math.max(...openCampaignPopups.map((p) => p.priority));

  switch (candidatePolicy) {
    case "suppress":
      if (candidatePriority >= maxOpenPriority) {
        return { action: "open" };
      }
      return { action: "suppress" };

    case "replace": {
      const toLower = openCampaignPopups
        .filter((p) => candidatePriority > p.priority)
        .map((p) => p.popupId);
      if (toLower.length > 0) {
        return { action: "replace", closePopupIds: toLower };
      }
      // Candidate is not higher than any open popup — stack normally.
      return { action: "open" };
    }

    case "queue":
      return { action: "queue" };

    default:
      return { action: "open" };
  }
}

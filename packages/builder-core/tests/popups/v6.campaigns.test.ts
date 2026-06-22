import { describe, expect, it } from "vitest";
import {
  evaluateCampaignGate,
  effectivePriority,
  resolveConflictPolicy,
  arbitrate,
} from "../../src/popups/campaigns";
import type { PopupCampaign, PopupDefinition } from "../../src/document/popups";

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeCampaign(overrides: Partial<PopupCampaign> = {}): PopupCampaign {
  const now = new Date().toISOString();
  return {
    id: "c1",
    name: "Test Campaign",
    status: "published",
    metadata: { createdAt: now, updatedAt: now },
    ...overrides,
  };
}

function makePopup(overrides: Partial<Pick<PopupDefinition, "campaignId" | "priority">> = {}): PopupDefinition {
  const now = new Date().toISOString();
  return {
    id: "p1",
    name: "Test Popup",
    enabled: true,
    rootNodeId: "root1",
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
    animation: { enter: "fade", durationMs: 200 },
    rules: {},
    metadata: { createdAt: now, updatedAt: now },
    ...overrides,
  } as PopupDefinition;
}

// ── evaluateCampaignGate ───────────────────────────────────────────────────────

describe("evaluateCampaignGate", () => {
  it("allows popup with no campaignId (ungrouped)", () => {
    const result = evaluateCampaignGate(makePopup(), undefined);
    expect(result.allowed).toBe(true);
    expect(result.campaignId).toBeUndefined();
  });

  it("allows popup with campaignId pointing at missing campaign (orphaned — lenient)", () => {
    const popup = makePopup({ campaignId: "missing" });
    const result = evaluateCampaignGate(popup, {});
    expect(result.allowed).toBe(true);
  });

  it("allows popup in a published campaign", () => {
    const campaign = makeCampaign({ status: "published" });
    const popup = makePopup({ campaignId: campaign.id });
    const result = evaluateCampaignGate(popup, { [campaign.id]: campaign });
    expect(result.allowed).toBe(true);
    expect(result.campaignId).toBe(campaign.id);
  });

  it("blocks popup in a draft campaign", () => {
    const campaign = makeCampaign({ status: "draft" });
    const popup = makePopup({ campaignId: campaign.id });
    const result = evaluateCampaignGate(popup, { [campaign.id]: campaign });
    expect(result.allowed).toBe(false);
    expect(result.campaignId).toBe(campaign.id);
  });

  it("blocks popup in a review campaign", () => {
    const campaign = makeCampaign({ status: "review" });
    const popup = makePopup({ campaignId: campaign.id });
    const result = evaluateCampaignGate(popup, { [campaign.id]: campaign });
    expect(result.allowed).toBe(false);
  });

  it("blocks popup in a paused campaign", () => {
    const campaign = makeCampaign({ status: "paused" });
    const popup = makePopup({ campaignId: campaign.id });
    const result = evaluateCampaignGate(popup, { [campaign.id]: campaign });
    expect(result.allowed).toBe(false);
  });

  it("blocks popup in an archived campaign", () => {
    const campaign = makeCampaign({ status: "archived" });
    const popup = makePopup({ campaignId: campaign.id });
    const result = evaluateCampaignGate(popup, { [campaign.id]: campaign });
    expect(result.allowed).toBe(false);
  });
});

// ── effectivePriority ─────────────────────────────────────────────────────────

describe("effectivePriority", () => {
  it("returns 0 for ungrouped popup with no priority", () => {
    expect(effectivePriority(makePopup(), undefined)).toBe(0);
  });

  it("uses popup.priority when no campaign", () => {
    const popup = makePopup({ priority: 5 });
    expect(effectivePriority(popup, undefined)).toBe(5);
  });

  it("campaign priority dominates popup priority", () => {
    const campaign = makeCampaign({ priority: 3 });
    const popup = makePopup({ campaignId: "c1", priority: 2 });
    // 3 * 1000 + 2 = 3002
    expect(effectivePriority(popup, { c1: campaign })).toBe(3002);
  });

  it("popup priority breaks ties within same campaign priority", () => {
    const campaign = makeCampaign({ priority: 1 });
    const popupHigh = makePopup({ campaignId: "c1", priority: 10 });
    const popupLow = makePopup({ campaignId: "c1", priority: 1 });
    const high = effectivePriority(popupHigh, { c1: campaign });
    const low = effectivePriority(popupLow, { c1: campaign });
    expect(high).toBeGreaterThan(low);
  });

  it("defaults campaign priority to 0 when not set", () => {
    const campaign = makeCampaign({ priority: undefined });
    const popup = makePopup({ campaignId: "c1", priority: 7 });
    expect(effectivePriority(popup, { c1: campaign })).toBe(7);
  });
});

// ── resolveConflictPolicy ─────────────────────────────────────────────────────

describe("resolveConflictPolicy", () => {
  it("returns 'stack' for ungrouped popup", () => {
    expect(resolveConflictPolicy(makePopup(), undefined)).toBe("stack");
  });

  it("returns 'stack' when campaign has no explicit policy", () => {
    const campaign = makeCampaign({ conflictPolicy: undefined });
    const popup = makePopup({ campaignId: "c1" });
    expect(resolveConflictPolicy(popup, { c1: campaign })).toBe("stack");
  });

  it("returns campaign conflictPolicy when set", () => {
    const campaign = makeCampaign({ conflictPolicy: "suppress" });
    const popup = makePopup({ campaignId: "c1" });
    expect(resolveConflictPolicy(popup, { c1: campaign })).toBe("suppress");
  });

  it("returns 'queue' policy correctly", () => {
    const campaign = makeCampaign({ conflictPolicy: "queue" });
    const popup = makePopup({ campaignId: "c1" });
    expect(resolveConflictPolicy(popup, { c1: campaign })).toBe("queue");
  });

  it("returns 'replace' policy correctly", () => {
    const campaign = makeCampaign({ conflictPolicy: "replace" });
    const popup = makePopup({ campaignId: "c1" });
    expect(resolveConflictPolicy(popup, { c1: campaign })).toBe("replace");
  });
});

// ── arbitrate ─────────────────────────────────────────────────────────────────

describe("arbitrate", () => {
  it("stack: always opens even when others are open", () => {
    const result = arbitrate({
      candidatePopupId: "p1",
      candidatePolicy: "stack",
      candidatePriority: 0,
      openCampaignPopups: [{ popupId: "p2", priority: 100 }],
    });
    expect(result.action).toBe("open");
  });

  it("any policy: opens immediately when no campaign popups are open", () => {
    for (const policy of ["suppress", "replace", "queue"] as const) {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: policy,
        candidatePriority: 5,
        openCampaignPopups: [],
      });
      expect(result.action).toBe("open");
    }
  });

  describe("suppress", () => {
    it("opens when candidate priority >= max open priority", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "suppress",
        candidatePriority: 10,
        openCampaignPopups: [{ popupId: "p2", priority: 5 }],
      });
      expect(result.action).toBe("open");
    });

    it("suppresses when candidate priority < max open priority", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "suppress",
        candidatePriority: 3,
        openCampaignPopups: [{ popupId: "p2", priority: 10 }],
      });
      expect(result.action).toBe("suppress");
    });

    it("opens when priorities are equal (>= condition)", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "suppress",
        candidatePriority: 5,
        openCampaignPopups: [{ popupId: "p2", priority: 5 }],
      });
      expect(result.action).toBe("open");
    });
  });

  describe("replace", () => {
    it("closes lower-priority open popups and opens candidate", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "replace",
        candidatePriority: 10,
        openCampaignPopups: [
          { popupId: "p2", priority: 3 },
          { popupId: "p3", priority: 7 },
        ],
      });
      expect(result.action).toBe("replace");
      if (result.action === "replace") {
        expect(result.closePopupIds).toContain("p2");
        expect(result.closePopupIds).toContain("p3");
      }
    });

    it("does NOT replace popups with equal priority (strict >)", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "replace",
        candidatePriority: 5,
        openCampaignPopups: [{ popupId: "p2", priority: 5 }],
      });
      // Tie = open/stack, no replacement
      expect(result.action).toBe("open");
    });

    it("only closes lower-priority ones, leaves higher ones", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "replace",
        candidatePriority: 7,
        openCampaignPopups: [
          { popupId: "p2", priority: 3 },  // lower → close
          { popupId: "p3", priority: 10 }, // higher → keep
        ],
      });
      expect(result.action).toBe("replace");
      if (result.action === "replace") {
        expect(result.closePopupIds).toContain("p2");
        expect(result.closePopupIds).not.toContain("p3");
      }
    });
  });

  describe("queue", () => {
    it("queues when a campaign popup is already open", () => {
      const result = arbitrate({
        candidatePopupId: "p1",
        candidatePolicy: "queue",
        candidatePriority: 5,
        openCampaignPopups: [{ popupId: "p2", priority: 3 }],
      });
      expect(result.action).toBe("queue");
    });
  });
});

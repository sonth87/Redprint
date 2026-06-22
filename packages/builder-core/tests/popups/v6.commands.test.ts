import { describe, expect, it } from "vitest";
import { createBuilder } from "../../src/createBuilder";
import { v4 as uuidv4 } from "uuid";

function setup() {
  const builder = createBuilder();
  return { builder };
}

function setupWithCampaign(name = "Spring Sale") {
  const { builder } = setup();
  const campaignId = uuidv4();
  builder.dispatch({ type: "CREATE_CAMPAIGN", payload: { campaignId, name } });
  return { builder, campaignId };
}

function setupWithPopupAndCampaign() {
  const { builder, campaignId } = setupWithCampaign();
  builder.dispatch({ type: "CREATE_POPUP", payload: { name: "Welcome", kind: "modal" } });
  const popupId = builder.getState().editor.activePopupId!;
  return { builder, campaignId, popupId };
}

// ── CREATE_CAMPAIGN ───────────────────────────────────────────────────────────

describe("V6 CREATE_CAMPAIGN", () => {
  it("creates a campaign with given name and default status=draft", () => {
    const { builder, campaignId } = setupWithCampaign("Black Friday");
    const campaign = builder.getState().document.popupCampaigns?.[campaignId];
    expect(campaign).toBeDefined();
    expect(campaign?.name).toBe("Black Friday");
    expect(campaign?.status).toBe("draft");
    expect(campaign?.id).toBe(campaignId);
  });

  it("creates campaign with explicit status and conflictPolicy", () => {
    const { builder } = setup();
    const id = uuidv4();
    builder.dispatch({
      type: "CREATE_CAMPAIGN",
      payload: { campaignId: id, name: "X", status: "published", conflictPolicy: "suppress", priority: 3 },
    });
    const c = builder.getState().document.popupCampaigns?.[id];
    expect(c?.status).toBe("published");
    expect(c?.conflictPolicy).toBe("suppress");
    expect(c?.priority).toBe(3);
  });

  it("CREATE_CAMPAIGN is undoable when campaignId is provided", () => {
    const { builder, campaignId } = setupWithCampaign();
    expect(builder.getState().document.popupCampaigns?.[campaignId]).toBeDefined();
    builder.undo();
    expect(builder.getState().document.popupCampaigns?.[campaignId]).toBeUndefined();
  });
});

// ── UPDATE_CAMPAIGN ───────────────────────────────────────────────────────────

describe("V6 UPDATE_CAMPAIGN", () => {
  it("updates campaign name", () => {
    const { builder, campaignId } = setupWithCampaign("Old Name");
    builder.dispatch({ type: "UPDATE_CAMPAIGN", payload: { campaignId, patch: { name: "New Name" } } });
    expect(builder.getState().document.popupCampaigns?.[campaignId]?.name).toBe("New Name");
  });

  it("UPDATE_CAMPAIGN is undoable", () => {
    const { builder, campaignId } = setupWithCampaign("Original");
    builder.dispatch({ type: "UPDATE_CAMPAIGN", payload: { campaignId, patch: { name: "Changed" } } });
    builder.undo();
    expect(builder.getState().document.popupCampaigns?.[campaignId]?.name).toBe("Original");
  });
});

// ── SET_CAMPAIGN_STATUS ───────────────────────────────────────────────────────

describe("V6 SET_CAMPAIGN_STATUS", () => {
  it("transitions status", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "SET_CAMPAIGN_STATUS", payload: { campaignId, status: "published" } });
    expect(builder.getState().document.popupCampaigns?.[campaignId]?.status).toBe("published");
  });

  it("appends statusHistory entry", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "SET_CAMPAIGN_STATUS", payload: { campaignId, status: "review" } });
    const history = builder.getState().document.popupCampaigns?.[campaignId]?.metadata.statusHistory;
    expect(history).toHaveLength(1);
    expect(history?.[0].status).toBe("review");
  });

  it("SET_CAMPAIGN_STATUS is undoable (restores prior status)", () => {
    const { builder, campaignId } = setupWithCampaign();
    // default status is "draft"
    builder.dispatch({ type: "SET_CAMPAIGN_STATUS", payload: { campaignId, status: "published" } });
    builder.undo();
    expect(builder.getState().document.popupCampaigns?.[campaignId]?.status).toBe("draft");
  });
});

// ── DELETE_CAMPAIGN ───────────────────────────────────────────────────────────

describe("V6 DELETE_CAMPAIGN", () => {
  it("deletes the campaign", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "DELETE_CAMPAIGN", payload: { campaignId } });
    expect(builder.getState().document.popupCampaigns?.[campaignId]).toBeUndefined();
  });

  it("orphans member popups (clears campaignId) on delete", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBe(campaignId);

    builder.dispatch({ type: "DELETE_CAMPAIGN", payload: { campaignId } });
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBeUndefined();
  });

  it("DELETE_CAMPAIGN + undo restores campaign and re-links members", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    builder.dispatch({ type: "DELETE_CAMPAIGN", payload: { campaignId } });
    builder.undo();

    const campaign = builder.getState().document.popupCampaigns?.[campaignId];
    expect(campaign).toBeDefined();
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBe(campaignId);
  });
});

// ── ASSIGN_POPUP_CAMPAIGN ─────────────────────────────────────────────────────

describe("V6 ASSIGN_POPUP_CAMPAIGN", () => {
  it("assigns a popup to a campaign", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBe(campaignId);
  });

  it("removes campaign assignment when campaignId=null", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId: null } });
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBeUndefined();
  });

  it("ASSIGN_POPUP_CAMPAIGN is undoable", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    builder.undo();
    expect(builder.getState().document.popups?.[popupId]?.campaignId).toBeUndefined();
  });
});

// ── SET_POPUP_PRIORITY ────────────────────────────────────────────────────────

describe("V6 SET_POPUP_PRIORITY", () => {
  it("sets popup priority", () => {
    const { builder } = setup();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "P", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({ type: "SET_POPUP_PRIORITY", payload: { popupId, priority: 7 } });
    expect(builder.getState().document.popups?.[popupId]?.priority).toBe(7);
  });

  it("SET_POPUP_PRIORITY is undoable", () => {
    const { builder } = setup();
    builder.dispatch({ type: "CREATE_POPUP", payload: { name: "P", kind: "modal" } });
    const popupId = builder.getState().editor.activePopupId!;
    builder.dispatch({ type: "SET_POPUP_PRIORITY", payload: { popupId, priority: 10 } });
    builder.undo();
    expect(builder.getState().document.popups?.[popupId]?.priority ?? 0).toBe(0);
  });
});

// ── DUPLICATE_POPUP copies campaignId + priority ──────────────────────────────

describe("V6 DUPLICATE_POPUP", () => {
  it("duplicate inherits campaignId and priority from source", () => {
    const { builder, campaignId, popupId } = setupWithPopupAndCampaign();
    builder.dispatch({ type: "ASSIGN_POPUP_CAMPAIGN", payload: { popupId, campaignId } });
    builder.dispatch({ type: "SET_POPUP_PRIORITY", payload: { popupId, priority: 5 } });

    const newPopupId = uuidv4();
    builder.dispatch({
      type: "DUPLICATE_POPUP",
      payload: { popupId, newPopupId, newRootNodeId: uuidv4() },
    });

    const dup = builder.getState().document.popups?.[newPopupId];
    expect(dup).toBeDefined();
    expect(dup?.campaignId).toBe(campaignId);
    expect(dup?.priority).toBe(5);
  });
});

// ── SET_ACTIVE_CAMPAIGN (editor-only, no undo) ────────────────────────────────

describe("V6 SET_ACTIVE_CAMPAIGN", () => {
  it("sets activeCampaignId in editor state", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "SET_ACTIVE_CAMPAIGN", payload: { campaignId } });
    expect(builder.getState().editor.activeCampaignId).toBe(campaignId);
  });

  it("clears activeCampaignId with null", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "SET_ACTIVE_CAMPAIGN", payload: { campaignId } });
    builder.dispatch({ type: "SET_ACTIVE_CAMPAIGN", payload: { campaignId: null } });
    expect(builder.getState().editor.activeCampaignId).toBeNull();
  });

  it("SET_ACTIVE_CAMPAIGN is not undoable (editor-only)", () => {
    const { builder, campaignId } = setupWithCampaign();
    builder.dispatch({ type: "SET_ACTIVE_CAMPAIGN", payload: { campaignId } });
    builder.undo();
    // undo does not revert editor-only commands — activeCampaignId stays
    expect(builder.getState().editor.activeCampaignId).toBe(campaignId);
  });
});

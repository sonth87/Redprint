import React, { useState } from "react";
import {
  Button,
  Input,
  Label,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui-builder/ui";
import type {
  BuilderDocument,
  PopupCampaign,
  PopupCampaignStatus,
  PopupConflictPolicy,
} from "@ui-builder/builder-core";

export interface CampaignPanelHandlers {
  onCreateCampaign: (name: string) => void;
  onUpdateCampaign: (campaignId: string, patch: Partial<Omit<PopupCampaign, "id" | "metadata">>) => void;
  onSetCampaignStatus: (campaignId: string, status: PopupCampaignStatus) => void;
  onDeleteCampaign: (campaignId: string) => void;
  onSetActiveCampaign: (campaignId: string | null) => void;
  activeCampaignId: string | null;
}

export interface CampaignPanelProps {
  document: BuilderDocument;
  handlers: CampaignPanelHandlers;
}

const STATUS_OPTIONS: PopupCampaignStatus[] = ["draft", "review", "published", "paused", "archived"];

const STATUS_LABELS: Record<PopupCampaignStatus, string> = {
  draft: "Draft",
  review: "In Review",
  published: "Published",
  paused: "Paused",
  archived: "Archived",
};

const STATUS_COLORS: Record<PopupCampaignStatus, string> = {
  draft: "bg-muted text-muted-foreground",
  review: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
  published: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200",
  paused: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
  archived: "bg-muted/50 text-muted-foreground line-through",
};

const POLICY_OPTIONS: PopupConflictPolicy[] = ["stack", "queue", "suppress", "replace"];

const POLICY_LABELS: Record<PopupConflictPolicy, string> = {
  stack: "Stack",
  queue: "Queue",
  suppress: "Suppress",
  replace: "Replace",
};

export function CampaignPanel({ document, handlers }: CampaignPanelProps) {
  const [newName, setNewName] = useState("");

  const campaigns = Object.values(document.popupCampaigns ?? {});
  const popups = Object.values(document.popups ?? {});

  const memberCount = (campaignId: string) =>
    popups.filter((p) => p.campaignId === campaignId).length;

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    handlers.onCreateCampaign(name);
    setNewName("");
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2">
        <Input
          className="h-7 flex-1 text-xs"
          placeholder="New campaign name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
        />
        <Button size="sm" className="h-7 text-xs" onClick={handleCreate} disabled={!newName.trim()}>
          Add
        </Button>
      </div>

      {campaigns.length === 0 ? (
        <div className="flex flex-1 items-center justify-center text-[11px] text-muted-foreground p-4 text-center">
          No campaigns yet. Add one above to group and manage popups together.
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="space-y-1 p-2">
            {campaigns.map((campaign) => (
              <CampaignRow
                key={campaign.id}
                campaign={campaign}
                memberCount={memberCount(campaign.id)}
                isActive={handlers.activeCampaignId === campaign.id}
                onSelect={() =>
                  handlers.onSetActiveCampaign(
                    handlers.activeCampaignId === campaign.id ? null : campaign.id,
                  )
                }
                onUpdateStatus={(status) => handlers.onSetCampaignStatus(campaign.id, status)}
                onUpdatePolicy={(conflictPolicy) =>
                  handlers.onUpdateCampaign(campaign.id, { conflictPolicy })
                }
                onUpdateName={(name) => handlers.onUpdateCampaign(campaign.id, { name })}
                onDelete={() => handlers.onDeleteCampaign(campaign.id)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function CampaignRow({
  campaign,
  memberCount,
  isActive,
  onSelect,
  onUpdateStatus,
  onUpdatePolicy,
  onUpdateName,
  onDelete,
}: {
  campaign: PopupCampaign;
  memberCount: number;
  isActive: boolean;
  onSelect: () => void;
  onUpdateStatus: (status: PopupCampaignStatus) => void;
  onUpdatePolicy: (policy: PopupConflictPolicy) => void;
  onUpdateName: (name: string) => void;
  onDelete: () => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(campaign.name);

  const commitName = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== campaign.name) onUpdateName(trimmed);
    else setNameVal(campaign.name);
    setEditingName(false);
  };

  return (
    <div
      className={`rounded-md border p-2 cursor-pointer transition-colors ${isActive ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2">
        {editingName ? (
          <Input
            className="h-6 flex-1 text-xs"
            value={nameVal}
            autoFocus
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setNameVal(campaign.name); setEditingName(false); } }}
          />
        ) : (
          <span
            className="flex-1 truncate text-xs font-medium"
            onDoubleClick={(e) => { e.stopPropagation(); setEditingName(true); }}
          >
            {campaign.name}
          </span>
        )}
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${STATUS_COLORS[campaign.status]}`}>
          {STATUS_LABELS[campaign.status]}
        </span>
        <span className="shrink-0 text-[10px] text-muted-foreground">{memberCount}p</span>
      </div>

      {isActive && (
        <div className="mt-2 space-y-1.5 border-t pt-2" onClick={(e) => e.stopPropagation()}>
          <div className="grid gap-1">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Status</Label>
            <Select value={campaign.status} onValueChange={(v) => onUpdateStatus(v as PopupCampaignStatus)}>
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-[9px] text-muted-foreground uppercase tracking-wide">Conflict policy</Label>
            <Select
              value={campaign.conflictPolicy ?? "stack"}
              onValueChange={(v) => onUpdatePolicy(v as PopupConflictPolicy)}
            >
              <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POLICY_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{POLICY_LABELS[p]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-full text-[11px] text-destructive hover:text-destructive"
            onClick={onDelete}
          >
            Delete campaign (orphans members)
          </Button>
        </div>
      )}
    </div>
  );
}

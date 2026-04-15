import React from "react";
import { ScrollArea } from "@ui-builder/ui";
import { Zap, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InteractionRow } from "../controls/InteractionRow";
import type { BuilderNode, InteractionConfig } from "@ui-builder/builder-core";

interface EventsTabProps {
  node: BuilderNode;
  onInteractionsChange?: (interactions: InteractionConfig[]) => void;
}

export function EventsTab({ node, onInteractionsChange }: EventsTabProps) {
  const { t } = useTranslation();
  const interactions = node.interactions ?? [];

  const handleAdd = () => {
    if (!onInteractionsChange) return;
    const newInteraction: InteractionConfig = {
      id: crypto.randomUUID(),
      trigger: "click",
      actions: [{ type: "navigate", url: "" }],
      conditions: [],
    };
    onInteractionsChange([...interactions, newInteraction]);
  };

  const handleUpdate = (index: number, updated: InteractionConfig) => {
    if (!onInteractionsChange) return;
    const next = [...interactions];
    next[index] = updated;
    onInteractionsChange(next);
  };

  const handleRemove = (index: number) => {
    if (!onInteractionsChange) return;
    onInteractionsChange(interactions.filter((_, i) => i !== index));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {t("propertyPanel.events")} ({interactions.length})
          </p>
          <button
            type="button"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            onClick={handleAdd}
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        </div>

        {interactions.length === 0 && (
          <div className="rounded-md border border-dashed p-6 text-center">
            <Zap className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">{t("events.noInteractions")}</p>
          </div>
        )}

        {interactions.map((interaction, i) => (
          <InteractionRow
            key={i}
            interaction={interaction}
            index={i}
            onChange={(updated) => handleUpdate(i, updated)}
            onRemove={() => handleRemove(i)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

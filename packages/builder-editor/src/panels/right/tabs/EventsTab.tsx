import React from "react";
import { ScrollArea } from "@ui-builder/ui";
import { Plus, Zap } from "lucide-react";
import { InteractionRow } from "../components/InteractionRow";
import type { InteractionConfig } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

export function EventsTab({
  interactions,
  onInteractionsChange,
}: {
  interactions: InteractionConfig[];
  onInteractionsChange?: (interactions: InteractionConfig[]) => void;
}) {
  const { t } = useTranslation();

  const handleAddInteraction = () => {
    if (!onInteractionsChange) return;
    const newInteraction: InteractionConfig = {
      id: crypto.randomUUID(),
      trigger: "click",
      actions: [{ type: "navigate", url: "" }],
      conditions: [],
    };
    onInteractionsChange([...interactions, newInteraction]);
  };

  const handleUpdateInteraction = (index: number, updated: InteractionConfig) => {
    if (!onInteractionsChange) return;
    const next = [...interactions];
    next[index] = updated;
    onInteractionsChange(next);
  };

  const handleRemoveInteraction = (index: number) => {
    if (!onInteractionsChange) return;
    onInteractionsChange(interactions.filter((_, i) => i !== index));
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            Interactions ({interactions.length})
          </p>
          <button
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            onClick={handleAddInteraction}
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>

        {interactions.length === 0 && (
          <div className="rounded-md border border-dashed p-4 text-center">
            <Zap className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">
              {t("events.noInteractions")}
            </p>
          </div>
        )}

        {interactions.map((interaction, i) => (
          <InteractionRow
            key={i}
            interaction={interaction}
            index={i}
            onChange={(updated) => handleUpdateInteraction(i, updated)}
            onRemove={() => handleRemoveInteraction(i)}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

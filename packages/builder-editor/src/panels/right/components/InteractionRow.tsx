import React, { useMemo } from "react";
import { Label, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-builder/ui";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { InteractionConfig, InteractionTrigger, InteractionAction } from "@ui-builder/builder-core";

export function InteractionRow({
  interaction,
  index,
  onChange,
  onRemove,
}: {
  interaction: InteractionConfig;
  index: number;
  onChange: (updated: InteractionConfig) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const triggerOptions: { value: InteractionTrigger; label: string }[] = useMemo(
    () => [
      { value: "click", label: t("events.click") },
      { value: "dblclick", label: t("events.dblclick") },
      { value: "hover", label: t("events.hover") },
      { value: "mouseenter", label: t("events.mouseenter") },
      { value: "mouseleave", label: t("events.mouseleave") },
      { value: "focus", label: t("events.focus") },
      { value: "blur", label: t("events.blur") },
      { value: "submit", label: t("events.submit") },
      { value: "change", label: t("events.change") },
      { value: "mount", label: t("events.mount") },
      { value: "unmount", label: t("events.unmount") },
      { value: "scroll", label: t("events.scroll") },
    ],
    [t],
  );
  const actionTypeOptions = useMemo(
    () => [
      { value: "navigate", label: t("events.navigate") },
      { value: "toggleVisibility", label: t("events.toggleVisibility") },
      { value: "setState", label: t("events.setState") },
      { value: "showModal", label: t("events.showModal") },
      { value: "hideModal", label: t("events.hideModal") },
      { value: "scrollTo", label: t("events.scrollTo") },
      { value: "addClass", label: t("events.addClass") },
      { value: "removeClass", label: t("events.removeClass") },
      { value: "emit", label: t("events.emitEvent") },
      { value: "triggerApi", label: t("events.apiCall") },
      { value: "custom", label: t("events.custom") },
    ],
    [t],
  );
  return (
    <div className="rounded-md border p-2 space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-muted-foreground">
          #{index + 1}
        </span>
        <button
          className="text-muted-foreground hover:text-destructive transition-colors"
          onClick={onRemove}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.trigger")}</Label>
          <Select
            value={interaction.trigger}
            onValueChange={(val) =>
              onChange({ ...interaction, trigger: val as InteractionTrigger })
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {triggerOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.action")}</Label>
          <Select
            value={interaction.actions[0]?.type ?? "navigate"}
            onValueChange={(val) => {
              const action = { type: val } as InteractionAction;
              onChange({ ...interaction, actions: [action] });
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {actionTypeOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-xs">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action-specific fields */}
      {interaction.actions[0]?.type === "navigate" && (
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.url")}</Label>
          <Input
            className="h-7 text-xs"
            placeholder="https://..."
            value={(interaction.actions[0] as { url?: string }).url ?? ""}
            onChange={(e) =>
              onChange({
                ...interaction,
                actions: [{ type: "navigate" as const, url: e.target.value }],
              })
            }
          />
        </div>
      )}

      {(interaction.actions[0]?.type === "toggleVisibility" ||
        interaction.actions[0]?.type === "showModal" ||
        interaction.actions[0]?.type === "hideModal" ||
        interaction.actions[0]?.type === "scrollTo") && (
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">{t("events.targetId")}</Label>
          <Input
            className="h-7 text-xs font-mono"
            placeholder="node-id"
            value={(interaction.actions[0] as { targetId?: string }).targetId ?? ""}
            onChange={(e) => {
              const action = interaction.actions[0];
              const actionType = action?.type as "toggleVisibility" | "showModal" | "hideModal" | "scrollTo";
              onChange({
                ...interaction,
                actions: [{ type: actionType, targetId: e.target.value }],
              });
            }}
          />
        </div>
      )}

      {interaction.actions[0]?.type === "setState" && (
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">{t("events.key")}</Label>
            <Input
              className="h-7 text-xs"
              placeholder="key"
              value={(interaction.actions[0] as { key?: string }).key ?? ""}
              onChange={(e) => {
                const action = interaction.actions[0] as { type: "setState"; key: string; value: unknown };
                onChange({
                  ...interaction,
                  actions: [{ type: "setState" as const, key: e.target.value, value: action?.value ?? "" }],
                });
              }}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">{t("events.value")}</Label>
            <Input
              className="h-7 text-xs"
              placeholder="value"
              value={String((interaction.actions[0] as { value?: unknown }).value ?? "")}
              onChange={(e) => {
                const action = interaction.actions[0] as { type: "setState"; key: string; value: unknown };
                onChange({
                  ...interaction,
                  actions: [{ type: "setState" as const, key: action?.key ?? "", value: e.target.value }],
                });
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

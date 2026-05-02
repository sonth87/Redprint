import React from "react";
import { ScrollArea, Label, Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, Input, Switch } from "@ui-builder/ui";
import { Play } from "lucide-react";
import { CollapsibleSection } from "../components/CollapsibleSection";
import type { BuilderNode } from "@ui-builder/builder-core";
import { ANIMATION_PRESETS_GROUPED } from "@ui-builder/shared";
import { useTranslation } from "react-i18next";

const EASING_OPTIONS = [
  { value: "ease", label: "Ease" },
  { value: "ease-in", label: "Ease In" },
  { value: "ease-out", label: "Ease Out" },
  { value: "ease-in-out", label: "Ease In Out" },
  { value: "linear", label: "Linear" },
  { value: "cubic-bezier(0.4, 0, 0.2, 1)", label: "Smooth" },
];

export function EffectsTab({
  selectedNode,
  style,
  onPropChange,
  onStyleChange,
}: {
  selectedNode: BuilderNode;
  style: Record<string, unknown>;
  onPropChange: (key: string, value: unknown) => void;
  onStyleChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full">
      <CollapsibleSection title={t("effects.displayAnimation")}>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] text-muted-foreground">Animation</Label>
            {!!(selectedNode.props._animation as string) && selectedNode.props._animation !== "none" && (
              <button
                type="button"
                className="flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 transition-colors"
                onClick={() => onPropChange("_animationPreviewKey", Date.now())}
              >
                <Play className="h-2.5 w-2.5" />
                Preview
              </button>
            )}
          </div>
          <Select
            value={String((selectedNode.props._animation as string) ?? "none")}
            onValueChange={(v) => {
              onPropChange("_animation", v === "none" ? undefined : v);
              if (v && v !== "none") onPropChange("_animationPreviewKey", Date.now());
            }}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none" className="text-xs">{t("effects.animationNone")}</SelectItem>
              {ANIMATION_PRESETS_GROUPED.map((group) => (
                <SelectGroup key={group.label}>
                  <SelectLabel className="text-[10px] text-muted-foreground px-2 py-1">{group.label}</SelectLabel>
                  {group.options.map((a) => (
                    <SelectItem key={a.value} value={a.value} className="text-xs pl-4">
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Duration (ms)</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={Number((selectedNode.props._animationDuration as number) ?? 300)}
              min={0}
              max={5000}
              step={50}
              onChange={(e) => onPropChange("_animationDuration", parseFloat(e.target.value))}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Delay (ms)</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={Number((selectedNode.props._animationDelay as number) ?? 0)}
              min={0}
              max={5000}
              step={50}
              onChange={(e) => onPropChange("_animationDelay", parseFloat(e.target.value))}
            />
          </div>
        </div>
        <div className="grid gap-1">
          <Label className="text-[10px] text-muted-foreground">Easing</Label>
          <Select
            value={String((selectedNode.props._animationEasing as string) ?? "ease")}
            onValueChange={(v) => onPropChange("_animationEasing", v)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EASING_OPTIONS.map((e) => (
                <SelectItem key={e.value} value={e.value} className="text-xs">
                  {e.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          <Label className="text-[10px] text-muted-foreground">Play Once</Label>
          <Switch
            checked={selectedNode.props._animationPlayOnce !== false}
            onCheckedChange={(v) => onPropChange("_animationPlayOnce", v)}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("effects.hoverEffect")} defaultOpen={false}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Hover Transform</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={String((selectedNode.props._hoverTransform as string) ?? "")}
              placeholder="scale(1.05)"
              onChange={(e) => onPropChange("_hoverTransform", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Hover Opacity</Label>
            <Input
              className="h-7 text-xs"
              value={String((selectedNode.props._hoverOpacity as string) ?? "")}
              placeholder="1"
              onChange={(e) => onPropChange("_hoverOpacity", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Hover Shadow</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={String((selectedNode.props._hoverShadow as string) ?? "")}
              placeholder="0 4px 12px rgba(0,0,0,0.15)"
              onChange={(e) => onPropChange("_hoverShadow", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Transition</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={String(style.transition ?? "")}
              placeholder="all 0.3s ease"
              onChange={(e) => onStyleChange("transition", e.target.value || undefined)}
            />
          </div>
        </div>
      </CollapsibleSection>
    </ScrollArea>
  );
}

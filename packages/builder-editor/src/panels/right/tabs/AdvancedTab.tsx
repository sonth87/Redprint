import React from "react";
import { ScrollArea, Label, Input, Switch, Badge } from "@ui-builder/ui";
import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import type { BuilderNode } from "@ui-builder/builder-core";

interface AdvancedTabProps {
  node: BuilderNode;
  onPropChange: (key: string, value: unknown) => void;
}

export function AdvancedTab({ node, onPropChange }: AdvancedTabProps) {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-0">
        {/* Identity */}
        <CollapsibleSection title={t("advancedTab.identity")}>
          <div className="space-y-2">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Name</Label>
              <Input
                className="h-7 text-xs"
                value={node.name ?? ""}
                placeholder="Component name"
                onChange={(e) => onPropChange("__name", e.target.value || undefined)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">Node ID</Label>
              <Input
                className="h-7 text-xs font-mono text-muted-foreground"
                value={node.id}
                readOnly
                disabled
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* CSS Class */}
        <CollapsibleSection title={t("advancedTab.cssClassAttributes")} defaultOpen={false}>
          <div className="space-y-2">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">CSS class</Label>
              <Input
                className="h-7 text-xs font-mono"
                value={String(node.props._cssClass ?? "")}
                placeholder="my-class another-class"
                onChange={(e) => onPropChange("_cssClass", e.target.value || undefined)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Accessibility */}
        <CollapsibleSection title={t("advancedTab.seoAccessibility")} defaultOpen={false}>
          <div className="space-y-2">
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">ARIA Role</Label>
              <Input
                className="h-7 text-xs"
                value={String(node.props._ariaRole ?? "")}
                placeholder="button, dialog, ..."
                onChange={(e) => onPropChange("_ariaRole", e.target.value || undefined)}
              />
            </div>
            <div className="grid gap-1">
              <Label className="text-[10px] text-muted-foreground">ARIA Label</Label>
              <Input
                className="h-7 text-xs"
                value={String(node.props._ariaLabel ?? "")}
                placeholder="Accessible label"
                onChange={(e) => onPropChange("_ariaLabel", e.target.value || undefined)}
              />
            </div>
          </div>
        </CollapsibleSection>

        {/* Tooltip */}
        <CollapsibleSection title={t("advancedTab.tooltip")} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Show tooltip</Label>
              <Switch
                checked={Boolean(node.props._tooltipEnabled)}
                onCheckedChange={(v) => onPropChange("_tooltipEnabled", v)}
              />
            </div>
            {Boolean(node.props._tooltipEnabled) && (
              <Input
                className="h-7 text-xs"
                value={String(node.props._tooltipText ?? "")}
                placeholder="Tooltip text..."
                onChange={(e) => onPropChange("_tooltipText", e.target.value)}
              />
            )}
          </div>
        </CollapsibleSection>

        {/* Metadata */}
        <CollapsibleSection title={t("advancedTab.metadata")} defaultOpen={false}>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Created</span>
              <span className="font-mono text-[10px]">
                {node.metadata?.createdAt
                  ? new Date(node.metadata.createdAt).toLocaleString()
                  : "—"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Updated</span>
              <span className="font-mono text-[10px]">
                {node.metadata?.updatedAt
                  ? new Date(node.metadata.updatedAt).toLocaleString()
                  : "—"}
              </span>
            </div>
            {node.metadata?.tags && node.metadata.tags.length > 0 && (
              <div className="flex gap-1 flex-wrap mt-1">
                {node.metadata.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[9px]">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}

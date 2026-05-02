import React from "react";
import { ScrollArea, Label, Input, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Badge } from "@ui-builder/ui";
import { CollapsibleSection } from "../components/CollapsibleSection";
import type { BuilderNode } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

export function AdvancedTab({
  selectedNode,
  onPropChange,
}: {
  selectedNode: BuilderNode;
  onPropChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full">
      <CollapsibleSection title={t("advancedTab.identity")}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Name</Label>
            <Input
              className="h-7 text-xs"
              value={selectedNode.name ?? ""}
              placeholder="Component name"
              onChange={(e) => onPropChange("__name", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Node ID</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={selectedNode.id}
              readOnly
              disabled
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("advancedTab.cssClassAttributes")} defaultOpen={false}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">CSS Class</Label>
            <Input
              className="h-7 text-xs font-mono"
              value={String(selectedNode.props._cssClass ?? "")}
              placeholder="my-class another-class"
              onChange={(e) => onPropChange("_cssClass", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Custom Attributes (JSON)</Label>
            <textarea
              className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              value={String(selectedNode.props._customAttributes ?? "{}")}
              placeholder='{"data-testid": "my-component"}'
              onChange={(e) => onPropChange("_customAttributes", e.target.value)}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("advancedTab.seoAccessibility")} defaultOpen={false}>
        <div className="grid gap-2">
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">ARIA Role</Label>
            <Input
              className="h-7 text-xs"
              value={String(selectedNode.props._ariaRole ?? "")}
              placeholder="button"
              onChange={(e) => onPropChange("_ariaRole", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">ARIA Label</Label>
            <Input
              className="h-7 text-xs"
              value={String(selectedNode.props._ariaLabel ?? "")}
              placeholder="Accessible label"
              onChange={(e) => onPropChange("_ariaLabel", e.target.value || undefined)}
            />
          </div>
          <div className="grid gap-1">
            <Label className="text-[10px] text-muted-foreground">Tab Index</Label>
            <Input
              type="number"
              className="h-7 text-xs"
              value={String(selectedNode.props._tabIndex ?? "")}
              placeholder="0"
              onChange={(e) => onPropChange("_tabIndex", e.target.value ? parseInt(e.target.value) : undefined)}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("advancedTab.tooltip")} defaultOpen={false}>
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Show Tooltip</Label>
            <Switch
              checked={Boolean(selectedNode.props._tooltipEnabled)}
              onCheckedChange={(v) => onPropChange("_tooltipEnabled", v)}
            />
          </div>
          {Boolean(selectedNode.props._tooltipEnabled) && (
            <>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Text</Label>
                <Input
                  className="h-7 text-xs"
                  value={String(selectedNode.props._tooltipText ?? "")}
                  placeholder="Tooltip text..."
                  onChange={(e) => onPropChange("_tooltipText", e.target.value)}
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Position</Label>
                <Select
                  value={String(selectedNode.props._tooltipPosition ?? "top")}
                  onValueChange={(v) => onPropChange("_tooltipPosition", v)}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["top","right","bottom","left"].map((p) => (
                      <SelectItem key={p} value={p} className="text-xs capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t("advancedTab.metadata")} defaultOpen={false}>
        <div className="grid gap-1 text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Created</span>
            <span className="font-mono text-[10px]">
              {selectedNode.metadata?.createdAt
                ? new Date(selectedNode.metadata.createdAt).toLocaleString()
                : "—"}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Updated</span>
            <span className="font-mono text-[10px]">
              {selectedNode.metadata?.updatedAt
                ? new Date(selectedNode.metadata.updatedAt).toLocaleString()
                : "—"}
            </span>
          </div>
          {selectedNode.metadata?.tags && selectedNode.metadata.tags.length > 0 && (
            <div className="flex gap-1 flex-wrap mt-1">
              {selectedNode.metadata.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      </CollapsibleSection>
    </ScrollArea>
  );
}

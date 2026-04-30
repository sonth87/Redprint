import React from "react";
import { ScrollArea, Label, Switch, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-builder/ui";
import { Database } from "lucide-react";
import { CollapsibleSection } from "../components/CollapsibleSection";
import type { BuilderNode } from "@ui-builder/builder-core";
import { useTranslation } from "react-i18next";

export function DataTab({
  selectedNode,
  onPropChange,
}: {
  selectedNode: BuilderNode;
  onPropChange: (key: string, value: unknown) => void;
}) {
  const { t } = useTranslation();
  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="rounded-md border border-dashed p-4 text-center">
          <Database className="h-6 w-6 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground">
            {t("dataTab.description")}
          </p>
        </div>

        <CollapsibleSection title={t("dataTab.repeater")} defaultOpen={false}>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Repeat Data</Label>
              <Switch
                checked={Boolean(selectedNode.props._repeaterEnabled)}
                onCheckedChange={(v) => onPropChange("_repeaterEnabled", v)}
              />
            </div>
            {Boolean(selectedNode.props._repeaterEnabled) && (
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Data Key</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(selectedNode.props._repeaterKey ?? "")}
                  placeholder="items"
                  onChange={(e) => onPropChange("_repeaterKey", e.target.value)}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

        <CollapsibleSection title={t("dataTab.conditionalVisibility")} defaultOpen={false}>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Conditional</Label>
              <Switch
                checked={Boolean(selectedNode.props._conditionalVisibility)}
                onCheckedChange={(v) => onPropChange("_conditionalVisibility", v)}
              />
            </div>
            {Boolean(selectedNode.props._conditionalVisibility) && (
              <>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Variable</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String(selectedNode.props._conditionVariable ?? "")}
                    placeholder="isLoggedIn"
                    onChange={(e) => onPropChange("_conditionVariable", e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Operator</Label>
                  <Select
                    value={String(selectedNode.props._conditionOperator ?? "eq")}
                    onValueChange={(v) => onPropChange("_conditionOperator", v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["eq","neq","gt","lt","gte","lte","truthy","falsy","contains"].map((op) => (
                        <SelectItem key={op} value={op} className="text-xs">{op}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Value</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(selectedNode.props._conditionValue ?? "")}
                    placeholder="true"
                    onChange={(e) => onPropChange("_conditionValue", e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
        </CollapsibleSection>
      </div>
    </ScrollArea>
  );
}

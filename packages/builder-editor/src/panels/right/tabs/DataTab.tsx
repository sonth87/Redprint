import React from "react";
import { ScrollArea, Label, Input, Switch, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui-builder/ui";
import { Database } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CollapsibleSection } from "../controls/CollapsibleSection";
import type { BuilderNode } from "@ui-builder/builder-core";

interface DataTabProps {
  node: BuilderNode;
  onPropChange: (key: string, value: unknown) => void;
}

export function DataTab({ node, onPropChange }: DataTabProps) {
  const { t } = useTranslation();

  return (
    <ScrollArea className="h-full">
      <div className="space-y-0">
        <div className="p-3 pb-1">
          <div className="rounded-md border border-dashed p-4 text-center">
            <Database className="h-5 w-5 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground">{t("dataTab.description")}</p>
          </div>
        </div>

        {/* Repeater */}
        <CollapsibleSection title={t("dataTab.repeater")} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Repeat data</Label>
              <Switch
                checked={Boolean(node.props._repeaterEnabled)}
                onCheckedChange={(v) => onPropChange("_repeaterEnabled", v)}
              />
            </div>
            {Boolean(node.props._repeaterEnabled) && (
              <div className="grid gap-1">
                <Label className="text-[10px] text-muted-foreground">Data key</Label>
                <Input
                  className="h-7 text-xs font-mono"
                  value={String(node.props._repeaterKey ?? "")}
                  placeholder="items"
                  onChange={(e) => onPropChange("_repeaterKey", e.target.value)}
                />
              </div>
            )}
          </div>
        </CollapsibleSection>

        {/* Conditional visibility */}
        <CollapsibleSection title={t("dataTab.conditionalVisibility")} defaultOpen={false}>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Conditional</Label>
              <Switch
                checked={Boolean(node.props._conditionalVisibility)}
                onCheckedChange={(v) => onPropChange("_conditionalVisibility", v)}
              />
            </div>
            {Boolean(node.props._conditionalVisibility) && (
              <>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Variable</Label>
                  <Input
                    className="h-7 text-xs font-mono"
                    value={String(node.props._conditionVariable ?? "")}
                    placeholder="isLoggedIn"
                    onChange={(e) => onPropChange("_conditionVariable", e.target.value)}
                  />
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Operator</Label>
                  <Select
                    value={String(node.props._conditionOperator ?? "eq")}
                    onValueChange={(v) => onPropChange("_conditionOperator", v)}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["eq", "neq", "gt", "lt", "gte", "lte", "truthy", "falsy", "contains"].map(
                        (op) => (
                          <SelectItem key={op} value={op} className="text-xs">
                            {op}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-[10px] text-muted-foreground">Value</Label>
                  <Input
                    className="h-7 text-xs"
                    value={String(node.props._conditionValue ?? "")}
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

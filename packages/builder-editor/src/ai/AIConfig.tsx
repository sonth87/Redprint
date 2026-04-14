/**
 * AIConfig — settings panel for configuring the AI backend connection.
 *
 * In the new backend-first architecture, users only configure the backend URL.
 * Provider selection, API keys, and model are handled via server env vars.
 */
import React from "react";
import {
  Input,
  Label,
  Separator,
  Switch,
} from "@ui-builder/ui";
import type { AIConfig as AIConfigType } from "./types";
import { useTranslation } from "react-i18next";

export interface AIConfigPanelProps {
  config: AIConfigType;
  onChange: (config: AIConfigType) => void;
}

export function AIConfigPanel({ config, onChange }: AIConfigPanelProps) {
  const { t } = useTranslation();
  const update = <K extends keyof AIConfigType>(key: K, value: AIConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="space-y-4 p-4 text-sm">
      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
        {t("ai.configTitle")}
      </h3>

      {/* Backend URL */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.backendUrl")}</Label>
        <Input
          type="url"
          value={config.backendUrl ?? "http://localhost:3002"}
          onChange={(e) => update("backendUrl", e.target.value)}
          placeholder="http://localhost:3002"
          className="h-8 text-xs font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          {t("ai.backendUrlHint")}
        </p>
      </div>

      <Separator />

      {/* Include page context */}
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Include page context</Label>
          <p className="text-[10px] text-muted-foreground">
            Send full node tree to AI for targeted edits. Increases token usage.
          </p>
        </div>
        <Switch
          checked={config.includePageContext === true}
          onCheckedChange={(v) => update("includePageContext", v)}
        />
      </div>
    </div>
  );
}

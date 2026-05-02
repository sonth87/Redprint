/**
 * AIConfig — settings panel for configuring the AI backend connection and design tokens.
 *
 * In the new backend-first architecture, users configure:
 * - Backend URL (server location)
 * - Design tokens (colors, fonts, spacing) for consistent AI-generated content
 * - Page context inclusion (optional, increases tokens)
 * Provider selection, API keys, and model are handled via server env vars.
 */
import React from "react";
import {
  Input,
  Label,
  Separator,
  Switch,
} from "@ui-builder/ui";
import type { AIConfig as AIConfigType, DesignTokens } from "./types";
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

      <Separator />

      {/* Design Tokens */}
      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
        Design Tokens
      </h3>
      <p className="text-[10px] text-muted-foreground">
        Colors and typography values for consistent AI-generated designs.
      </p>

      <div className="space-y-3">
        {/* Colors */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Colors</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Primary</Label>
            <Input
              type="text"
              value={config.designTokens?.primaryColor ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, primaryColor: e.target.value })}
              placeholder="#0066ff"
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Secondary</Label>
            <Input
              type="text"
              value={config.designTokens?.secondaryColor ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, secondaryColor: e.target.value })}
              placeholder="#666666"
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Accent</Label>
            <Input
              type="text"
              value={config.designTokens?.accentColor ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, accentColor: e.target.value })}
              placeholder="#ff6600"
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Background</Label>
            <Input
              type="text"
              value={config.designTokens?.backgroundColor ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, backgroundColor: e.target.value })}
              placeholder="#ffffff"
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Text</Label>
            <Input
              type="text"
              value={config.designTokens?.textColor ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, textColor: e.target.value })}
              placeholder="#000000"
              className="h-7 text-xs flex-1"
            />
          </div>
        </div>

        {/* Typography */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Typography</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Font Family</Label>
            <Input
              type="text"
              value={config.designTokens?.fontFamily ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, fontFamily: e.target.value })}
              placeholder="system-ui, sans-serif"
              className="h-7 text-xs flex-1"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Heading Font</Label>
            <Input
              type="text"
              value={config.designTokens?.headingFontFamily ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, headingFontFamily: e.target.value })}
              placeholder="Georgia, serif"
              className="h-7 text-xs flex-1"
            />
          </div>
        </div>

        {/* Spacing */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Spacing</p>
          <div className="flex items-center gap-2">
            <Label className="text-xs w-24">Border Radius</Label>
            <Input
              type="text"
              value={config.designTokens?.borderRadius ?? ""}
              onChange={(e) => update("designTokens", { ...config.designTokens, borderRadius: e.target.value })}
              placeholder="8px"
              className="h-7 text-xs flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

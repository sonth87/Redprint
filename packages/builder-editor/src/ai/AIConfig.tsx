/**
 * AIConfig — settings panel for configuring the AI assistant provider,
 * API key, model, and generation parameters.
 */
import React from "react";
import {
  Input,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Slider,
  Separator,
} from "@ui-builder/ui";
import type { AIConfig as AIConfigType, AIProvider } from "./types";
import { useTranslation } from "react-i18next";

// ── Props ───────────────────────────────────────────────────────────────

export interface AIConfigPanelProps {
  config: AIConfigType;
  onChange: (config: AIConfigType) => void;
}

// ── Model options per provider ──────────────────────────────────────────

const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-5", label: "GPT-5" },
    { value: "o3", label: "o3" },
    { value: "gpt-4.5-preview", label: "GPT-4.5 Preview" },
    { value: "gpt-4o", label: "GPT-4o" },
  ],
  gemini: [
    { value: "gemini-3-pro-preview", label: "Gemini 3 Pro Preview" },
    { value: "gemini-3-flash-preview", label: "Gemini 3 Flash Preview" },
    { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
    { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  claude: [
    { value: "claude-4-sonnet-20260215", label: "Claude 4 Sonnet" },
    { value: "claude-4-haiku-20260215", label: "Claude 4 Haiku" },
    { value: "claude-3-7-sonnet-20250219", label: "Claude 3.7 Sonnet" },
  ],
};

// ── Component ───────────────────────────────────────────────────────────

export function AIConfigPanel({ config, onChange }: AIConfigPanelProps) {
  const { t } = useTranslation();
  const update = <K extends keyof AIConfigType>(key: K, value: AIConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  const models = PROVIDER_MODELS[config.provider] ?? [];
  const defaultModel = models[0]?.value;

  return (
    <div className="space-y-4 p-4 text-sm">
      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
        {t("ai.configTitle")}
      </h3>

      {/* Provider */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.provider")}</Label>
        <Select
          value={config.provider}
          onValueChange={(v) => {
            const newProvider = v as AIProvider;
            const newDefault = PROVIDER_MODELS[newProvider]?.[0]?.value;
            onChange({ ...config, provider: newProvider, model: newDefault });
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="openai">{t("ai.providers.openai")}</SelectItem>
            <SelectItem value="gemini">{t("ai.providers.gemini")}</SelectItem>
            <SelectItem value="claude">{t("ai.providers.claude")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.apiKey")}</Label>
        <Input
          type="password"
          value={config.apiKey}
          onChange={(e) => update("apiKey", e.target.value)}
          placeholder={`Enter ${config.provider} API key`}
          className="h-8 text-xs font-mono"
        />
        <p className="text-[10px] text-muted-foreground">
          Keys are stored locally and never sent to our servers.
        </p>
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.model")}</Label>
        <Select
          value={config.model || defaultModel}
          onValueChange={(v) => update("model", v)}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* Temperature */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <Label className="text-xs">{t("ai.temperature")}</Label>
          <span className="text-[10px] text-muted-foreground">
            {(config.temperature ?? 0.7).toFixed(1)}
          </span>
        </div>
        <Slider
          value={[config.temperature ?? 0.7]}
          onValueChange={([v]) => update("temperature", v)}
          min={0}
          max={2}
          step={0.1}
          className="w-full"
        />
        <p className="text-[10px] text-muted-foreground">
          Lower = more deterministic. Higher = more creative.
        </p>
      </div>

      {/* Max tokens */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.maxTokens")}</Label>
        <Input
          type="number"
          value={config.maxTokens ?? 2048}
          onChange={(e) => update("maxTokens", parseInt(e.target.value, 10) || 2048)}
          min={256}
          max={16384}
          step={256}
          className="h-8 text-xs"
        />
      </div>

      <Separator />

      {/* System Prompt */}
      <div className="space-y-1.5">
        <Label className="text-xs">{t("ai.systemPrompt")}</Label>
        <textarea
          value={config.systemPrompt ?? ""}
          onChange={(e) => update("systemPrompt", e.target.value)}
          placeholder="Override the default system prompt…"
          rows={3}
          className="w-full rounded-md border bg-transparent px-2 py-1.5 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>
    </div>
  );
}

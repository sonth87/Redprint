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

// ── Props ───────────────────────────────────────────────────────────────

export interface AIConfigPanelProps {
  config: AIConfigType;
  onChange: (config: AIConfigType) => void;
}

// ── Model options per provider ──────────────────────────────────────────

const PROVIDER_MODELS: Record<AIProvider, { value: string; label: string }[]> = {
  openai: [
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },
    { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
  ],
  gemini: [
    { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
    { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
    { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
  ],
  claude: [
    { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
    { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
  ],
};

// ── Component ───────────────────────────────────────────────────────────

export function AIConfigPanel({ config, onChange }: AIConfigPanelProps) {
  const update = <K extends keyof AIConfigType>(key: K, value: AIConfigType[K]) => {
    onChange({ ...config, [key]: value });
  };

  const models = PROVIDER_MODELS[config.provider] ?? [];
  const defaultModel = models[0]?.value;

  return (
    <div className="space-y-4 p-4 text-sm">
      <h3 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">
        AI Configuration
      </h3>

      {/* Provider */}
      <div className="space-y-1.5">
        <Label className="text-xs">Provider</Label>
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
            <SelectItem value="openai">OpenAI</SelectItem>
            <SelectItem value="gemini">Google Gemini</SelectItem>
            <SelectItem value="claude">Anthropic Claude</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <Label className="text-xs">API Key</Label>
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
        <Label className="text-xs">Model</Label>
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
          <Label className="text-xs">Temperature</Label>
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
        <Label className="text-xs">Max Tokens</Label>
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
        <Label className="text-xs">System Prompt (optional)</Label>
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

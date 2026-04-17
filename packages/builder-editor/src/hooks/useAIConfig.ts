import { useState, useCallback } from "react";
import type { AIConfig } from "../ai/types";

const DEFAULT_AI_CONFIG: AIConfig = {
  backendUrl: "http://localhost:3002",
  temperature: 0.7,
  maxTokens: 8192,
  streamingEnabled: false,
  includePageContext: false,
  designTokens: {},
};

const STORAGE_KEY = "ui-builder:ai-config";

export interface UseAIConfigReturn {
  aiOpen: boolean;
  setAiOpen: (open: boolean) => void;
  aiConfig: AIConfig;
  handleAIConfigChange: (config: AIConfig) => void;
}

/** Manages AI assistant open state and config (with localStorage persistence). */
export function useAIConfig(): UseAIConfigReturn {
  const [aiOpen, setAiOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AIConfig;
        // Migration: if stored config has no backendUrl, add default
        if (!parsed.backendUrl) parsed.backendUrl = DEFAULT_AI_CONFIG.backendUrl;
        return { ...DEFAULT_AI_CONFIG, ...parsed };
      }
    } catch {
      // ignore parse errors
    }
    return DEFAULT_AI_CONFIG;
  });

  const handleAIConfigChange = useCallback((config: AIConfig) => {
    setAiConfig(config);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch {
      // ignore storage errors
    }
  }, []);

  return { aiOpen, setAiOpen, aiConfig, handleAIConfigChange };
}

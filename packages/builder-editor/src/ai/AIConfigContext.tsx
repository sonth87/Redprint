/**
 * AIConfigContext — React context that makes the AI configuration
 * available to any component inside BuilderEditor without prop-drilling.
 *
 * Usage:
 *   const aiConfig = useAIConfig();
 */

import React, { createContext, useContext } from "react";
import type { AIConfig } from "./types";

const DEFAULT_CONFIG: AIConfig = {
  provider: "openai",
  apiKey: "",
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxTokens: 8192,
  streamingEnabled: false,
  includePageContext: false,
};

const AIConfigContext = createContext<AIConfig>(DEFAULT_CONFIG);

export interface AIConfigProviderProps {
  config: AIConfig;
  children: React.ReactNode;
}

export function AIConfigProvider({ config, children }: AIConfigProviderProps) {
  return (
    <AIConfigContext.Provider value={config}>{children}</AIConfigContext.Provider>
  );
}

/** Returns the current AI configuration from context */
export function useAIConfig(): AIConfig {
  return useContext(AIConfigContext);
}

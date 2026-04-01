/**
 * AI Assistant types.
 */
import type { BuilderDocument, BuilderNode, ComponentDefinition } from "@ui-builder/builder-core";

export type AIProvider = "openai" | "gemini" | "claude";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface AIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

export interface AIConversation {
  messages: AIMessage[];
  isLoading: boolean;
  error: string | null;
}

/** Context passed to AI to understand current builder state */
export interface AIBuilderContext {
  document: {
    name: string;
    nodeCount: number;
    rootNodeId: string;
  };
  selectedNode: {
    id: string;
    type: string;
    name: string | undefined;
    props: Record<string, unknown>;
    style: Record<string, unknown>;
  } | null;
  availableComponents: { type: string; name: string; category: string }[];
  activeBreakpoint: string;
}

export interface AICommandSuggestion {
  type: string;
  payload: Record<string, unknown>;
  description: string;
}

export interface AIResponse {
  message: string;
  suggestions?: AICommandSuggestion[];
}

/** Provider adapter interface — each AI provider implements this */
export interface AIProviderAdapter {
  name: AIProvider;
  sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse>;
}

/**
 * AI Assistant types.
 */

export type AIProvider = "openai" | "gemini" | "claude";

export interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** Enable SSE streaming responses. Default: true */
  streamingEnabled?: boolean;
  /** Include full page node tree in AI context for more accurate edits. Default: false */
  includePageContext?: boolean;
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

/** Slim node representation sent to AI when includePageContext is enabled */
export interface AIPageNode {
  id: string;
  type: string;
  name?: string;
  parentId: string | null;
  order: number;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
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
    capabilities?: string[];
    propSchema?: Array<{ key: string; label: string; type: string }>;
  } | null;
  availableComponents: {
    type: string;
    name: string;
    category: string;
    propSchema?: Array<{ key: string; label: string; type: string }>;
    capabilities?: string[];
  }[];
  activeBreakpoint: string;
  /** Full page node map. Only present when config.includePageContext is enabled. */
  pageNodes?: Record<string, AIPageNode>;
  /**
   * Palette catalog summary — groups → types → preset items.
   * Only present when paletteCatalog is passed to buildAIContext.
   * Gives the AI concrete, named presets to reference instead of raw component types.
   */
  availablePresets?: AIPresetGroup[];
}

/** Slim representation of a palette group for the AI context */
export interface AIPresetGroup {
  group: string;
  types: AIPresetType[];
}

export interface AIPresetType {
  type: string;
  items: AIPresetItem[];
}

export interface AIPresetItem {
  id: string;
  name: string;
  componentType: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  tags?: string[];
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

/** Callbacks for streaming (SSE) responses */
export interface AIStreamCallbacks {
  /** Called with each text token as it arrives from the stream */
  onToken: (token: string) => void;
  /** Called with the full accumulated text once the stream ends */
  onComplete: (fullText: string) => void;
  /** Called when a network or API error occurs */
  onError: (error: Error) => void;
}

/** Provider adapter interface — each AI provider implements this */
export interface AIProviderAdapter {
  name: AIProvider;
  sendMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
  ): Promise<AIResponse>;
  /** SSE streaming variant — calls callbacks as tokens arrive */
  streamMessage(
    messages: AIMessage[],
    context: AIBuilderContext,
    config: AIConfig,
    callbacks: AIStreamCallbacks,
  ): Promise<void>;
}

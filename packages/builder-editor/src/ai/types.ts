/**
 * AI Assistant types.
 */

export type AIProvider = "openai" | "gemini" | "claude";

export interface AIConfig {
  /**
   * URL of the AI backend server (apps/api).
   * Defaults to http://localhost:3002 in development.
   */
  backendUrl: string;
  /** @deprecated — kept for migration period, ignored by the backend adapter */
  provider?: AIProvider;
  /** @deprecated — kept for migration period, ignored. Keys are set on the backend. */
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  /** Enable SSE streaming responses. Default: true */
  streamingEnabled?: boolean;
  /** Include full page node tree in AI context for more accurate edits. Default: false */
  includePageContext?: boolean;
  /** Design tokens for consistent styling across AI-generated sections. Phase 2A. */
  designTokens?: DesignTokens;
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

/** Ultra-slim node for hierarchical tree — structure only (Phase 3A) */
export interface AIPageNodeSlim {
  id: string;
  type: string;
  name?: string;
  parentId: string | null;
  order: number;
}

/** Hierarchical page context: slim tree for structure + focused nodes for details */
export interface AIPageNodeSummary {
  /** All nodes with structure only (id, type, name, parentId, order) */
  tree: Record<string, AIPageNodeSlim>;
  /** Selected node + parent + siblings with full props/style detail */
  focusedNodes: Record<string, AIPageNode>;
}

/** Design tokens for AI-consistent styling across sections */
export interface DesignTokens {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  fontFamily?: string;
  headingFontFamily?: string;
  borderRadius?: string;
  backgroundColor?: string;
  textColor?: string;
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
  /** Hierarchical page context: slim tree + focused nodes. Phase 3A optimization. */
  pageNodesSummary?: AIPageNodeSummary;
  /**
   * Palette catalog summary — groups → types → preset items.
   * Only present when paletteCatalog is passed to buildAIContext.
   * Gives the AI concrete, named presets to reference instead of raw component types.
   */
  availablePresets?: AIPresetGroup[];
  /** Compact component manifest — serializeComponentsCompact() output. Phase 1B. */
  componentsManifest?: string;
  /** Derived nesting rules — deriveNestingRules() output. Phase 1B. */
  nestingRules?: string;
  /** Compact preset summary — serializePresetsCompact() output. Phase 1C. */
  availablePresetsCompact?: string;
  /** Design tokens for consistent styling across all sections. Phase 2A. */
  designTokens?: DesignTokens;
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
  props?: Record<string, unknown>;
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

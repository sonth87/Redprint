/**
 * AI Backend API — type definitions.
 *
 * Shared between all services and routes.
 */

// ── LLM Provider ────────────────────────────────────────────────────────

export type LLMProvider = "openai" | "gemini" | "claude";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ── Section Outline (Step 1 output) ─────────────────────────────────────

export interface SectionOutline {
  /** 0-based index */
  index: number;
  /** Temporary client-side ID for mapping SSE events */
  sectionId: string;
  /** Section type: hero | header | features | stats | testimonials | pricing | faq | cta | footer | custom */
  sectionType: string;
  /** Human description of this section's purpose */
  purpose: string;
  /** Layout hint: centered | left-aligned | right-aligned | 2-col | 3-col-grid | 4-col-grid */
  layoutHint: string;
  /** Preset ID from client palette catalog, if a matching preset exists */
  presetId?: string;
  /** Key content elements this section must contain */
  keyContent: string[];
  /** Tone hint: professional | playful | minimal | bold */
  tone?: string;
}

export interface PageOutline {
  sections: SectionOutline[];
}

// ── Builder types mirrored from client (no package dep) ─────────────────

export interface AICommandSuggestion {
  type: string;
  payload: Record<string, unknown>;
  description: string;
}

export interface AIPresetItem {
  id: string;
  name: string;
  componentType: string;
  props: Record<string, unknown>;
  style?: Record<string, unknown>;
  tags?: string[];
}

export interface AIPresetType {
  type: string;
  items: AIPresetItem[];
}

export interface AIPresetGroup {
  group: string;
  types: AIPresetType[];
}

export interface AIPageNode {
  id: string;
  type: string;
  name?: string;
  parentId: string | null;
  order: number;
  props: Record<string, unknown>;
  style: Record<string, unknown>;
}

// ── Request / SSE Event types ─────────────────────────────────────────────

export interface GeneratePageRequest {
  prompt: string;
  /** Available components the AI can use */
  availableComponents: Array<{
    type: string;
    name: string;
    category: string;
  }>;
  /** Palette presets for layout suggestions */
  availablePresets?: AIPresetGroup[];
  /** Canvas-level design tokens for consistency across sections */
  designTokens?: DesignTokens;
  /** Current page nodes (used for edit context) */
  pageNodes?: Record<string, AIPageNode>;
}

export interface ChatRequest {
  messages: LLMMessage[];
  /** Slim builder context for targeted edits */
  builderContext: {
    document: { name: string; nodeCount: number; rootNodeId: string };
    selectedNode: AIPageNode | null;
    availableComponents: Array<{ type: string; name: string; category: string }>;
    activeBreakpoint: string;
    pageNodes?: Record<string, AIPageNode>;
    availablePresets?: AIPresetGroup[];
  };
}

export interface ChatResponse {
  message: string;
  commands: AICommandSuggestion[];
}

export interface DesignTokens {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  backgroundColor?: string;
}

// ── SSE Event payloads ──────────────────────────────────────────────────

export type SSEEventType =
  | { event: "outline_ready"; data: { sections: SectionOutline[] } }
  | { event: "section_ready"; data: { index: number; sectionId: string; commands: AICommandSuggestion[] } }
  | { event: "error"; data: { message: string } }
  | { event: "complete"; data: Record<string, never> };

// ── Design context sent to section generator ─────────────────────────────

export interface SectionDesignContext {
  /** Design tokens from canvas config */
  designTokens: DesignTokens;
  /** Summary of styles used in already-generated sections (for consistency) */
  previousSections: Array<{
    type: string;
    dominantColors: string[];
    fontSizes: string[];
  }>;
  /** The full original user prompt */
  originalPrompt: string;
}

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

export interface AIPropSchemaEntry {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: unknown;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  multiple?: boolean;
  children?: AIPropSchemaEntry[];
}

/**
 * Wire shape of `ComponentDefinition.aiHints` (roadmap 03/01) — mirrors the
 * client's `AIComponentHints` (builder-editor/src/ai/types.ts). Plain data,
 * no functions, so it can flow straight from client to server.
 */
export interface AIComponentHints {
  purpose: string;
  bestFor?: string[];
  sectionAffinity?: string[];
  contentSlots?: {
    heading?: string;
    body?: string;
    items?: {
      prop: string;
      shape: "array-of-objects" | "indexed-props";
      itemKeys?: Record<string, string>;
      maxItems?: number;
    };
    mediaSrc?: string;
    mediaAlt?: string;
    ctaLabel?: string;
    href?: string;
  };
  fallbackTo?: string[];
  examples?: string[];
}

/** A component the AI can use, as sent by the client in `availableComponents`. */
export interface AIAvailableComponent {
  type: string;
  name: string;
  category: string;
  propSchema?: AIPropSchemaEntry[];
  capabilities?: string[];
  defaultProps?: Record<string, unknown>;
  /** Self-described AI metadata (roadmap 03/01), when the component declares it. */
  aiHints?: AIComponentHints;
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

// ── Request / SSE Event types ─────────────────────────────────────────────

export interface GeneratePageRequest {
  prompt: string;
  /** If true, client will clear existing nodes before applying new sections */
  fullPageMode?: boolean;
  /** Real root node ID from the current builder document. */
  rootNodeId?: string;
  /** Available components the AI can use */
  availableComponents: AIAvailableComponent[];
  /** Palette presets for layout suggestions */
  availablePresets?: AIPresetGroup[];
  /** Compact preset summary — serializePresetsCompact() output. Phase 1C. */
  availablePresetsCompact?: string;
  /** Canvas-level design tokens for consistency across sections */
  designTokens?: DesignTokens;
  /** First-class generation controls selected in the UI. */
  generationOptions?: PageGenerationOptions;
  /** Derived nesting rules — deriveNestingRules() output. Phase 1B. */
  nestingRules?: string;
  /** Current page nodes (used for edit context) */
  pageNodes?: Record<string, AIPageNode>;
}

export interface ChatRequest {
  messages: LLMMessage[];
  /** Slim builder context for targeted edits */
  builderContext: {
    document: { name: string; nodeCount: number; rootNodeId: string };
    selectedNode: AIPageNode | null;
    availableComponents: AIAvailableComponent[];
    activeBreakpoint: string;
    pageNodes?: Record<string, AIPageNode>;
    pageNodesSummary?: AIPageNodeSummary;
    availablePresets?: AIPresetGroup[];
    /** Compact component manifest — serializeComponentsCompact() output. Phase 1B. */
    componentsManifest?: string;
    /** Derived nesting rules — deriveNestingRules() output. Phase 1B. */
    nestingRules?: string;
    /** Compact preset summary — serializePresetsCompact() output. Phase 1C. */
    availablePresetsCompact?: string;
    /** Design tokens for consistent styling. Phase 2A. */
    designTokens?: DesignTokens;
    /** If true, backend will prepend REMOVE_NODE commands for all children of root node. */
    fullPageMode?: boolean;
    /** Which surface the user is currently editing — page, or a popup's shell/content. */
    activeSurface?:
      | { type: "page" }
      | { type: "popup"; popupId: string; rootNodeId: string; selection: "shell" | "content" | null };
    /** Summary of popups in the document, so the LLM can reference real ids for showModal/hideModal. */
    availablePopups?: Array<{
      id: string;
      name: string;
      enabled: boolean;
      kind: string;
      placement: string;
      rootNodeId: string;
      autoTrigger: string;
    }>;
  };
}

/** A command rejected by the chat validation gate, with the reason. */
export interface DroppedChatCommand {
  type: string;
  componentType?: string;
  reason: string;
}

export interface ChatResponse {
  message: string;
  commands: AICommandSuggestion[];
  /** Present only when the validation gate rejected one or more AI commands. */
  droppedCommands?: DroppedChatCommand[];
}

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

export interface PageGenerationOptions {
  colorPalette?: {
    name?: string;
    primary: string;
    secondary: string;
    accent: string;
  };
  tone?: {
    id: string;
    label: string;
    description?: string;
  };
  complexity?: "simple" | "standard" | "comprehensive";
  locale?: string;
}

export type PageGoal =
  | "sell_service"
  | "sell_product"
  | "collect_leads"
  | "showcase"
  | "inform";

export interface CreativeBrief {
  rawPrompt: string;
  inferredIndustry: string;
  inferredPageType: string;
  primaryGoal: PageGoal;
  targetAudience: string;
  tone: string;
  styleDirection: string;
  assumedBusinessDetails: string[];
  requiredContentAreas: string[];
}

export type PageSectionType =
  | "header"
  | "hero"
  | "services"
  | "features"
  | "trust"
  | "process"
  | "stats"
  | "gallery"
  | "testimonials"
  | "pricing"
  | "faq"
  | "cta"
  | "footer"
  | "custom";

export interface PagePlanSection {
  id: string;
  index: number;
  type: PageSectionType;
  title: string;
  purpose: string;
  priority: "required" | "recommended" | "optional";
  layoutIntent: string;
  contentRequirements: string[];
}

export interface PagePlan {
  jobId: string;
  complexity: "simple" | "standard" | "comprehensive";
  brief: CreativeBrief;
  sections: PagePlanSection[];
}

export interface SectionPlanItem {
  title: string;
  body: string;
  meta?: string;
}

export type SectionInteractionIntent =
  | "static"
  | "carousel"
  | "expandable"
  | "marquee"
  | "gallery";

export type SectionVisualEmphasis =
  | "copy"
  | "media"
  | "balanced"
  | "proof"
  | "conversion";

export interface SectionPlanMediaItem {
  src?: string;
  alt: string;
  caption?: string;
  link?: string;
}

export interface SectionPlanNavItem {
  label: string;
  href: string;
}

export interface SectionComponentIntent {
  role: string;
  componentType: string;
  variant?: string;
  contentSource?: string;
  priority?: "required" | "preferred" | "optional";
  reason?: string;
}

/** LLM-chosen preset reference at section-intent level (roadmap 02/01). */
export interface SectionPresetRef {
  /** Semantic slot this preset fills, e.g. "hero_cta", "heading". */
  role: string;
  /** Preset id from the available catalog; validated against it server-side. */
  presetId: string;
}

export interface SectionPlan {
  sectionId: string;
  type: PageSectionType;
  layoutVariant?: string;
  preferredComponents?: string[];
  componentIntents?: SectionComponentIntent[];
  /** Optional preset references chosen by the LLM at section-intent level (roadmap 02/01). */
  presetRefs?: SectionPresetRef[];
  interactionIntent?: SectionInteractionIntent;
  mediaItems?: SectionPlanMediaItem[];
  navItems?: SectionPlanNavItem[];
  visualEmphasis?: SectionVisualEmphasis;
  eyebrow?: string;
  heading: string;
  body: string;
  ctaLabel?: string;
  secondaryCtaLabel?: string;
  items: SectionPlanItem[];
  faqs?: SectionPlanItem[];
  stats?: SectionPlanItem[];
  testimonials?: SectionPlanItem[];
  mediaPrompt?: string;
}

// ── SSE Event payloads ──────────────────────────────────────────────────

export type SSEEventType =
  | { event: "job_started"; data: { jobId: string } }
  | { event: "plan_ready"; data: { jobId: string; plan: PagePlan; skeletonCommands: AICommandSuggestion[] } }
  | { event: "section_started"; data: { jobId: string; index: number; sectionId: string } }
  | { event: "section_retrying"; data: { jobId: string; index: number; sectionId: string; attempt: number; reason: string } }
  | { event: "section_ready"; data: { index: number; sectionId: string; commands: AICommandSuggestion[] } }
  | { event: "section_error"; data: { index: number; sectionId: string; error: string } }
  | { event: "section_failed"; data: { jobId: string; index: number; sectionId: string; error: string; fallbackCommands?: AICommandSuggestion[] } }
  | { event: "error"; data: { message: string } }
  | {
      event: "complete";
      data: {
        jobId?: string;
        status?: "success" | "partial" | "failed";
        completed?: number;
        failed?: number;
        failedSections?: Array<{ sectionId: string; index: number; error: string }>;
      };
    };

// ── Design context sent to section generator ─────────────────────────────

export interface SectionDesignContext {
  /** Design tokens from canvas config */
  designTokens: DesignTokens;
  /** Summary of styles used in already-generated sections (for consistency) */
  previousSections: Array<{
    type: string;
    dominantColors: string[];
    fontSizes: string[];
    fontFamilies: string[];
    borderRadii: string[];
    buttonStyles: Array<{ backgroundColor?: string; color?: string; borderRadius?: string }>;
  }>;
  /** The full original user prompt */
  originalPrompt: string;
}

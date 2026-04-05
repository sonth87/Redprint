/**
 * AI Tools — type contracts.
 *
 * Separate from the general AIAssistant types to allow independent
 * evolution of the contextual toolbar AI toolset.
 */

// ── Mode ──────────────────────────────────────────────────────────────────

/** Which kind of AI generation the component supports */
export type AIToolsMode = "text" | "image";

// ── Tones (text mode only) ─────────────────────────────────────────────────

export interface AITone {
  id: string;
  /** i18n key under aiTools.tones.* */
  i18nKey: string;
  /** Lucide icon name */
  icon: string;
  /** Instruction appended to the AI prompt when this tone is selected */
  promptInstruction: string;
}

// ── Actions ───────────────────────────────────────────────────────────────

export interface AIToolsAction {
  id: string;
  /** i18n key under aiTools.textActions.* or aiTools.imageActions.* */
  i18nKey: string;
  /** Lucide icon name */
  icon: string;
  /** Base system instruction for this action */
  promptTemplate: string;
  /** Show a sub-description badge next to label (e.g. "9 languages") */
  badgeKey?: string;
  /** If true, clicking opens the custom-prompt transform sub-view instead of calling AI directly */
  isTransform?: boolean;
}

// ── Custom suggestions (chips in transform sub-view) ──────────────────────

export interface AICustomSuggestion {
  id: string;
  /** i18n key for the chip label displayed in the list */
  titleKey: string;
  /** Text filled into the textarea when the chip is clicked */
  descriptionPrompt: string;
}

// ── Request / Response ────────────────────────────────────────────────────

export interface AIToolsRequest {
  mode: AIToolsMode;
  actionId: string;
  /** Current content in the component (text html or image URL) */
  currentContent: string;
  /** Selected tone ids (text mode only) */
  toneIds?: string[];
  /** Free-form custom prompt (transform sub-view) */
  customPrompt?: string;
  /** Component type hint shown to AI (e.g. "headline", "paragraph") */
  componentType?: string;
}

export interface AIToolsResponse {
  /** New text content (text mode) */
  textContent?: string;
  /** New image URL or base64 (image mode) */
  imageUrl?: string;
  /** Raw message from AI for debugging */
  rawMessage: string;
}

// ── Strategy interface (Strategy pattern) ────────────────────────────────

export interface AIToolsStrategy {
  mode: AIToolsMode;
  buildPrompt(request: AIToolsRequest, actions: AIToolsAction[], tones: AITone[]): string;
  parseResponse(rawContent: string): AIToolsResponse;
}

// ── Popover UI state ──────────────────────────────────────────────────────

export type AIToolsView = "main" | "transform" | "preview";

export interface AIToolsState {
  view: AIToolsView;
  selectedToneIds: string[];
  customPrompt: string;
  isLoading: boolean;
  error: string | null;
  previewContent: string | null;
  originalContent: string | null;
  lastRequest: AIToolsRequest | null;
  cooldownRemaining: number; // seconds countdown after regenerate
}

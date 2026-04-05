/**
 * AI Tools — configuration constants.
 *
 * All arrays are exported as plain constants so consumers can import,
 * spread, filter or completely replace them without touching internals.
 *
 * @example
 * import { AI_TONES, AI_CUSTOM_SUGGESTIONS } from '@ui-builder/builder-editor';
 * // Add a custom tone:
 * const myTones = [...AI_TONES, { id: 'poetic', i18nKey: 'aiTools.tones.poetic', ... }];
 */

import type { AITone, AIToolsAction, AICustomSuggestion } from "./types";

// ── Tones ─────────────────────────────────────────────────────────────────

export const AI_TONES: AITone[] = [
  {
    id: "friendly",
    i18nKey: "aiTools.tones.friendly",
    icon: "Smile",
    promptInstruction: "Use a warm, friendly and approachable tone.",
  },
  {
    id: "formal",
    i18nKey: "aiTools.tones.formal",
    icon: "BookOpen",
    promptInstruction: "Use a formal, professional and authoritative tone.",
  },
  {
    id: "humorous",
    i18nKey: "aiTools.tones.humorous",
    icon: "MessageSquare",
    promptInstruction: "Use a light-hearted, witty and humorous tone.",
  },
  {
    id: "urgent",
    i18nKey: "aiTools.tones.urgent",
    icon: "Zap",
    promptInstruction: "Create urgency and a strong sense of FOMO in the tone.",
  },
  {
    id: "expert",
    i18nKey: "aiTools.tones.expert",
    icon: "Target",
    promptInstruction: "Use an authoritative expert tone with precise language.",
  },
];

// ── Text actions ──────────────────────────────────────────────────────────

export const AI_TEXT_ACTIONS: AIToolsAction[] = [
  {
    id: "rewrite",
    i18nKey: "aiTools.textActions.rewrite",
    icon: "PencilLine",
    promptTemplate:
      "Rewrite the following content to make it more engaging and compelling. Return ONLY the new content, no explanations.",
  },
  {
    id: "shorten",
    i18nKey: "aiTools.textActions.shorten",
    icon: "Scissors",
    promptTemplate:
      "Shorten the following content while preserving all key messages. Return ONLY the shortened content, no explanations.",
  },
  {
    id: "expand",
    i18nKey: "aiTools.textActions.expand",
    icon: "Maximize2",
    promptTemplate:
      "Expand the following content with more detail and richer language. Return ONLY the expanded content, no explanations.",
  },
  {
    id: "boost",
    i18nKey: "aiTools.textActions.boost",
    icon: "TrendingUp",
    promptTemplate:
      "Rewrite the following content to increase conversion rate and persuasiveness. Add strong CTA signals. Return ONLY the new content, no explanations.",
  },
  {
    id: "translate",
    i18nKey: "aiTools.textActions.translate",
    icon: "Languages",
    promptTemplate:
      "Translate the following content to English. If it is already in English, translate to Vietnamese. Return ONLY the translated content, no explanations.",
    badgeKey: "aiTools.textActions.translateBadge",
  },
  {
    id: "transform",
    i18nKey: "aiTools.textActions.transform",
    icon: "Sparkles",
    promptTemplate: "", // handled by custom prompt in transform sub-view
    isTransform: true,
  },
];

// ── Image actions ─────────────────────────────────────────────────────────

export const AI_IMAGE_ACTIONS: AIToolsAction[] = [
  {
    id: "generate",
    i18nKey: "aiTools.imageActions.generate",
    icon: "ImagePlus",
    promptTemplate:
      "Generate a high-quality image based on the following description. Return the image URL.",
    isTransform: true, // always opens prompt input for image generation
  },
  {
    id: "removeBackground",
    i18nKey: "aiTools.imageActions.removeBackground",
    icon: "Eraser",
    promptTemplate:
      "Remove the background from this image and return a transparent PNG URL.",
  },
  {
    id: "upscale",
    i18nKey: "aiTools.imageActions.upscale",
    icon: "ZoomIn",
    promptTemplate:
      "Upscale and enhance the quality of this image. Return the upscaled image URL.",
  },
  {
    id: "styleTransfer",
    i18nKey: "aiTools.imageActions.styleTransfer",
    icon: "Palette",
    promptTemplate:
      "Apply an artistic style transfer to this image. Describe the style you want in the prompt.",
    isTransform: true,
  },
  {
    id: "variations",
    i18nKey: "aiTools.imageActions.variations",
    icon: "Copy",
    promptTemplate:
      "Generate creative variations of this image while maintaining the core subject.",
  },
];

// ── Custom suggestions (chips in the transform sub-view) ──────────────────

export const AI_CUSTOM_SUGGESTIONS: AICustomSuggestion[] = [
  {
    id: "addFomo",
    titleKey: "aiTools.suggestions.addFomo",
    descriptionPrompt:
      "Add FOMO (fear of missing out) elements — limited time, scarcity, social proof.",
  },
  {
    id: "genZ",
    titleKey: "aiTools.suggestions.genZ",
    descriptionPrompt:
      "Rewrite in Gen Z style — casual, energetic, with modern slang and emojis.",
  },
  {
    id: "addStats",
    titleKey: "aiTools.suggestions.addStats",
    descriptionPrompt:
      "Strengthen with relevant statistics and data points to boost credibility.",
  },
  {
    id: "shorter",
    titleKey: "aiTools.suggestions.shorter",
    descriptionPrompt:
      "Make it much shorter and punchier — cut everything that is not essential.",
  },
  {
    id: "storytelling",
    titleKey: "aiTools.suggestions.storytelling",
    descriptionPrompt:
      "Rewrite using a storytelling narrative — engage the reader with a mini story.",
  },
  {
    id: "seo",
    titleKey: "aiTools.suggestions.seo",
    descriptionPrompt:
      "Optimise for SEO — weave in primary keywords naturally and improve readability.",
  },
];

// ── Cooldown config ───────────────────────────────────────────────────────

/** Seconds the user must wait between consecutive regenerate requests */
export const AI_REGENERATE_COOLDOWN_SECONDS = 3;

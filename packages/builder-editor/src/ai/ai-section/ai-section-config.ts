/**
 * AI Section Builder — configuration constants.
 *
 * Defines the preset section templates shown in the AISectionPopover.
 * The last action has isCustom: true — it opens the custom-prompt sub-view.
 */

export interface AISectionAction {
  id: string;
  /** i18n key under aiSection.actions.* */
  i18nKey: string;
  /** Lucide icon name */
  icon: string;
  /** Instruction used in the system prompt to generate this section type */
  promptTemplate: string;
  /** If true, clicking opens the custom prompt sub-view instead of calling AI directly */
  isCustom?: boolean;
}

export const AI_SECTION_ACTIONS: AISectionAction[] = [
  {
    id: "hero",
    i18nKey: "aiSection.actions.hero",
    icon: "Layers",
    promptTemplate:
      "Generate a visually impressive Hero section with a compelling headline, a supporting subtitle, a primary CTA button, and optionally a secondary CTA. The section should be full-width, centered, with strong typography and a clean background.",
  },
  {
    id: "header",
    i18nKey: "aiSection.actions.header",
    icon: "LayoutPanelTop",
    promptTemplate:
      "Generate a Header / Navigation section with a logo placeholder on the left, a horizontal navigation menu with 4-5 links in the center, and a CTA button on the right. Keep it minimal and professional.",
  },
  {
    id: "features",
    i18nKey: "aiSection.actions.features",
    icon: "LayoutGrid",
    promptTemplate:
      "Generate a Features section with a section title, a short description, and a 3-column grid of feature cards. Each card should have an icon placeholder, a short feature title, and 1-2 sentences of description.",
  },
  {
    id: "stats",
    i18nKey: "aiSection.actions.stats",
    icon: "BarChart2",
    promptTemplate:
      "Generate a Stats / Numbers section showing 3-4 key metrics in a horizontal row. Each stat should have a large bold number, a short label (e.g. 'Active users', 'Countries', 'Satisfaction rate'), and an optional supporting text.",
  },
  {
    id: "testimonials",
    i18nKey: "aiSection.actions.testimonials",
    icon: "Quote",
    promptTemplate:
      "Generate a Testimonials section with a section title and 3 testimonial cards in a row. Each card should have a quote, the author's name, and their title/company. Use a light card background.",
  },
  {
    id: "cta",
    i18nKey: "aiSection.actions.cta",
    icon: "Megaphone",
    promptTemplate:
      "Generate a Call to Action (CTA) section with a strong headline, a short persuasive subtitle, and one or two CTA buttons. Center-aligned. Use a bold background colour to make it stand out.",
  },
  {
    id: "footer",
    i18nKey: "aiSection.actions.footer",
    icon: "PanelBottom",
    promptTemplate:
      "Generate a Footer section with a logo/brand name on the left, 3 columns of navigational links in the center (labeled Products, Company, Resources with 3-4 items each), and a copyright notice at the bottom.",
  },
  {
    id: "custom",
    i18nKey: "aiSection.actions.custom",
    icon: "Sparkles",
    promptTemplate: "", // handled by the user's free-form prompt in the custom sub-view
    isCustom: true,
  },
];

export const AI_SECTION_REGENERATE_COOLDOWN_SECONDS = 3;

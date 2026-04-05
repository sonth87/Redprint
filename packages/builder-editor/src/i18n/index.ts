/**
 * i18n setup for the builder editor.
 *
 * Uses react-i18next with bundled en/vi translations.
 * Consumer can override or extend with additional languages.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import vi from "./locales/vi.json";

export const defaultResources = {
  en: { translation: en },
  vi: { translation: vi },
} as const;

/**
 * Initialize i18n. Safe to call multiple times.
 * - First call performs full initialization with the given options (or defaults).
 * - Subsequent calls with a `language` option switch the active language without
 *   re-initializing, which avoids i18next double-init warnings.
 *
 * @param options.keySeparator - Separator for nested keys (default: '.'). 
 *   Set to '.' to support both flat ("toolbar.undo") and nested ({ toolbar: { undo: "..." } }) formats.
 *   Set to false to disable key nesting entirely (only flat keys allowed).
 */
export function initI18n(options?: {
  language?: string;
  resources?: Record<string, { translation: Record<string, unknown> }>;
  /** Key separator for nested translation keys. Default: '.' (supports both flat and nested) */
  keySeparator?: string | false;
}) {
  if (i18n.isInitialized) {
    // Add any new resource bundles even after initialization
    if (options?.resources) {
      for (const [lng, { translation }] of Object.entries(options.resources)) {
        i18n.addResourceBundle(lng, "translation", translation, true, true);
      }
    }
    if (options?.language) i18n.changeLanguage(options.language);
    return i18n;
  }

  const resources = options?.resources
    ? { ...defaultResources, ...options.resources }
    : defaultResources;

  i18n.use(initReactI18next).init({
    resources,
    lng: options?.language ?? "en",
    fallbackLng: "en",
    keySeparator: options?.keySeparator ?? '.', // Default '.' supports both flat & nested
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    react: {
      useSuspense: false,
    },
  });

  return i18n;
}

// Auto-initialize with defaults so every component using useTranslation()
// gets translated strings without requiring the consumer to call initI18n().
initI18n();

export { i18n };
export type SupportedLocale = "en" | "vi";

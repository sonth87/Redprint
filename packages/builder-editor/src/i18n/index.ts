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

let initialized = false;

/**
 * Initialize i18n. Safe to call multiple times — only the first call takes effect.
 */
export function initI18n(options?: {
  language?: string;
  resources?: Record<string, { translation: Record<string, unknown> }>;
}) {
  if (initialized) return i18n;

  const resources = options?.resources
    ? { ...defaultResources, ...options.resources }
    : defaultResources;

  i18n.use(initReactI18next).init({
    resources,
    lng: options?.language ?? "en",
    fallbackLng: "en",
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    react: {
      useSuspense: false,
    },
  });

  initialized = true;
  return i18n;
}

export { i18n };
export type SupportedLocale = "en" | "vi";

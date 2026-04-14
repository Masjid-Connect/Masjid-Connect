/**
 * i18n configuration — ENGLISH-ONLY.
 *
 * This is a single-mosque, single-language MVP. Arabic / RTL is explicitly
 * out of scope. See `memory/CONSTRAINTS.md` and `projects/mosque-connect/
 * DECISIONS.md` for the rationale.
 *
 * What this file does:
 *   - Loads English translations from `constants/locales/en.json`
 *   - Locks the active language to `'en'`
 *   - Ignores device locale and any stored preference
 *
 * What this file does NOT do (and must not, without council re-deliberation):
 *   - Detect device language
 *   - Accept or persist a runtime language change
 *   - Load additional locale files
 *
 * `useTranslation()` + `t()` usage stays mandatory for every user-facing
 * string so that a future bilingual release only requires adding locales
 * and re-enabling the switching layer — not rewriting every screen.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/constants/locales/en.json';

/** The set of languages this app ships. Do not expand without updating
 *  DOCTRINE and council-deliberating the bilingual rollout. */
export const SUPPORTED_LANGUAGES = ['en'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export { i18n };

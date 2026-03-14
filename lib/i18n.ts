import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from '@/constants/locales/en.json';
import ar from '@/constants/locales/ar.json';
import { getLanguage } from '@/lib/storage';

/** Detect initial language: saved preference > device locale > English */
function getInitialLanguage(): string {
  try {
    const locales = getLocales();
    const deviceLang = locales[0]?.languageCode || 'en';
    return deviceLang === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Hydrate saved language preference asynchronously (overrides device detection)
getLanguage().then((savedLang) => {
  if (savedLang && savedLang !== i18n.language) {
    i18n.changeLanguage(savedLang);
  }
});

export default i18n;

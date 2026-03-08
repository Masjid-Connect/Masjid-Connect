import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/constants/locales/en.json';
import ar from '@/constants/locales/ar.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

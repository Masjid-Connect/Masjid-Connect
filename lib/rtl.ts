import { I18nManager } from 'react-native';
import i18n from '@/lib/i18n';

const RTL_LANGUAGES = ['ar', 'fa', 'ur', 'he'];

/**
 * Configure RTL layout direction based on the current language.
 * Call this when the app language changes.
 *
 * Note: Changing RTL requires an app restart on React Native,
 * so this is primarily used at app startup.
 */
export function configureRTL(language: string = i18n.language) {
  const shouldBeRTL = RTL_LANGUAGES.includes(language);
  const isCurrentlyRTL = I18nManager.isRTL;

  I18nManager.allowRTL(true);

  if (shouldBeRTL !== isCurrentlyRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
}

/** Whether the current layout direction is RTL */
export function isRTL(): boolean {
  return I18nManager.isRTL;
}

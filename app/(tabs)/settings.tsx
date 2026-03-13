import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Alert,
  Platform,
  Share,
  Linking,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { spacing, typography } from '@/constants/Theme';
import {
  getReminderMinutes,
  setReminderMinutes,
  getUse24h,
  setUse24h,
  getCalculationMethod,
  setCalculationMethod,
  getNotifyAnnouncements,
  setNotifyAnnouncements,
  getNotifyEvents,
  setNotifyEvents,
} from '@/lib/storage';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';
import {
  ProfileCard,
  SettingsSection,
  SettingsRow,
  SettingsPickerSheet,
  ThemePreviewSheet,
} from '@/components/settings';

const REMINDER_VALUES = [0, 5, 10, 15, 30];

const CALCULATION_METHODS = [
  { code: 4, key: '4' },
  { code: 2, key: '2' },
  { code: 3, key: '3' },
  { code: 1, key: '1' },
  { code: 5, key: '5' },
  { code: 7, key: '7' },
  { code: 8, key: '8' },
  { code: 9, key: '9' },
  { code: 10, key: '10' },
  { code: 11, key: '11' },
  { code: 12, key: '12' },
  { code: 13, key: '13' },
  { code: 14, key: '14' },
  { code: 15, key: '15' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { effectiveScheme, themePreference, setThemePreference } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();

  // State
  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);
  const [calcMethod, setCalcMethod] = useState({ code: 4, name: 'UmmAlQura' });
  const [notifyAnnouncements, setNotifyAnnouncementsState] = useState(true);
  const [notifyEvents, setNotifyEventsState] = useState(true);

  // Sheet visibility
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showCalcMethodPicker, setShowCalcMethodPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [mins, h24, method, announceEnabled, eventsEnabled] = await Promise.all([
      getReminderMinutes(),
      getUse24h(),
      getCalculationMethod(),
      getNotifyAnnouncements(),
      getNotifyEvents(),
    ]);
    setReminderMin(mins);
    setUse24hState(h24);
    setCalcMethod(method);
    setNotifyAnnouncementsState(announceEnabled);
    setNotifyEventsState(eventsEnabled);
  };

  const handleReminderChange = useCallback(async (minutes: number) => {
    setReminderMin(minutes);
    await setReminderMinutes(minutes);
    await reschedulePrayerRemindersForToday();
  }, []);

  const handleToggle24h = useCallback(async (value: boolean) => {
    setUse24hState(value);
    await setUse24h(value);
  }, []);

  const handleCalcMethodChange = useCallback(async (code: number) => {
    const name = t(`settings.calculationMethods.${code}`);
    setCalcMethod({ code, name });
    await setCalculationMethod(code, name);
    await reschedulePrayerRemindersForToday();
  }, [t]);

  const handleNotifyAnnouncementsChange = useCallback(async (value: boolean) => {
    setNotifyAnnouncementsState(value);
    await setNotifyAnnouncements(value);
  }, []);

  const handleNotifyEventsChange = useCallback(async (value: boolean) => {
    setNotifyEventsState(value);
    await setNotifyEvents(value);
  }, []);

  const handleThemeChange = useCallback(async (theme: 'light' | 'dark' | 'system') => {
    await setThemePreference(theme);
  }, [setThemePreference]);

  const handleSignOut = useCallback(async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('settings.signOutConfirm'));
      if (confirmed) await logout();
    } else {
      Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: () => logout(),
        },
      ]);
    }
  }, [t, logout]);

  const handleDeleteAccount = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      t('settings.deleteAccountTitle'),
      t('settings.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.deleteAccount'),
          style: 'destructive',
          onPress: () => {
            // TODO: Implement account deletion API call
          },
        },
      ]
    );
  }, [t]);

  const handleShareApp = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Share.share({ message: t('settings.shareMessage') });
  }, [t]);

  const handleContactSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:support@mosqueconnect.app');
  }, []);

  // Derived display values
  const reminderLabel = reminderMin === 0
    ? t('settings.atAthanTime')
    : t('settings.minutesBefore', { minutes: reminderMin });

  const themeLabel = t(`settings.theme${themePreference.charAt(0).toUpperCase() + themePreference.slice(1)}`);

  const calcMethodLabel = t(`settings.calculationMethods.${calcMethod.code}`);

  // Build picker options
  const reminderOptions = REMINDER_VALUES.map((v) => ({
    label: v === 0 ? t('settings.atAthanTime') : t('settings.minutesBefore', { minutes: v }),
    value: v,
  }));

  const calcMethodOptions = CALCULATION_METHODS.map((m) => ({
    label: t(`settings.calculationMethods.${m.key}`),
    value: m.code,
  }));

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Card (Hero) ── */}
      {isAuthenticated && user ? (
        <ProfileCard
          variant="authenticated"
          name={user.name || user.email}
          email={user.email}
          onPress={() => {/* TODO: Account details screen */}}
        />
      ) : (
        <ProfileCard
          variant="guest"
          onSignIn={() => router.push('/(auth)/welcome')}
        />
      )}

      {/* ── My Mosque ── */}
      <SettingsSection
        header={t('settings.myMosque')}
        footer={t('settings.calculationMethodFooter')}
      >
        <SettingsRow
          icon={{ name: 'location', backgroundColor: palette.sacredBlue }}
          label={t('settings.subscribedMosque')}
          value={t('prayer.mosqueName')}
          accessory="disclosure"
          onPress={() => {/* TODO: Mosque picker */}}
          position="first"
        />
        <SettingsRow
          icon={{ name: 'compass', backgroundColor: palette.divineGold }}
          label={t('settings.calculationMethod')}
          value={calcMethodLabel}
          accessory="disclosure"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCalcMethodPicker(true);
          }}
          position="last"
        />
      </SettingsSection>

      {/* ── Notifications & Reminders ── */}
      <SettingsSection
        header={t('settings.notifications')}
        footer={t('settings.notificationsFooter')}
      >
        <SettingsRow
          icon={{ name: 'notifications', backgroundColor: palette.paradiseGreen }}
          label={t('settings.prayerReminder')}
          value={reminderLabel}
          accessory="disclosure"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowReminderPicker(true);
          }}
          position="first"
        />
        <SettingsRow
          icon={{ name: 'megaphone', backgroundColor: palette.sacredBlue }}
          label={t('settings.announcementAlerts')}
          accessory="toggle"
          toggleValue={notifyAnnouncements}
          onToggleChange={handleNotifyAnnouncementsChange}
          position="middle"
        />
        <SettingsRow
          icon={{ name: 'calendar', backgroundColor: palette.divineGold }}
          label={t('settings.eventReminders')}
          accessory="toggle"
          toggleValue={notifyEvents}
          onToggleChange={handleNotifyEventsChange}
          position="last"
        />
      </SettingsSection>

      {/* ── Appearance ── */}
      <SettingsSection
        header={t('settings.appearance')}
        footer={t('settings.appearanceFooter')}
      >
        <SettingsRow
          icon={{ name: 'moon', backgroundColor: colors.text }}
          label={t('settings.theme')}
          value={themeLabel}
          accessory="disclosure"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowThemePicker(true);
          }}
          position="first"
        />
        <SettingsRow
          icon={{ name: 'time', backgroundColor: palette.paradiseGreen }}
          label={t('settings.use24h')}
          accessory="toggle"
          toggleValue={use24h}
          onToggleChange={handleToggle24h}
          position="last"
        />
      </SettingsSection>

      {/* ── About & Support ── */}
      <SettingsSection header={t('settings.aboutAndSupport')}>
        <SettingsRow
          icon={{ name: 'information-circle', backgroundColor: colors.textSecondary }}
          label={t('settings.aboutApp')}
          accessory="disclosure"
          onPress={() => {/* TODO: About screen */}}
          position="first"
        />
        <SettingsRow
          icon={{ name: 'share-social', backgroundColor: palette.sacredBlue }}
          label={t('settings.shareApp')}
          onPress={handleShareApp}
          position="middle"
        />
        <SettingsRow
          icon={{ name: 'star', backgroundColor: palette.divineGold }}
          label={t('settings.rateApp')}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // TODO: StoreReview.requestReview()
          }}
          position="middle"
        />
        <SettingsRow
          icon={{ name: 'mail', backgroundColor: palette.paradiseGreen }}
          label={t('settings.contactSupport')}
          onPress={handleContactSupport}
          position="middle"
        />
        <SettingsRow
          icon={{ name: 'shield-checkmark', backgroundColor: colors.textSecondary }}
          label={t('settings.privacyPolicy')}
          accessory="disclosure"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            // TODO: Open privacy policy URL
          }}
          position="last"
        />
      </SettingsSection>

      {/* ── Danger Zone (authenticated only) ── */}
      {isAuthenticated && (
        <SettingsSection header={t('settings.dangerZone')}>
          <SettingsRow
            icon={{ name: 'log-out-outline', backgroundColor: palette.moorishTerracotta }}
            label={t('settings.signOut')}
            onPress={handleSignOut}
            destructive
            position="first"
          />
          <SettingsRow
            icon={{ name: 'trash-outline', backgroundColor: palette.moorishTerracotta }}
            label={t('settings.deleteAccount')}
            onPress={handleDeleteAccount}
            destructive
            position="last"
          />
        </SettingsSection>
      )}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center' }]}>
          {t('settings.version', { version: '1.0.0' })}
        </Text>
        <Text style={[typography.caption1, { color: colors.textTertiary, textAlign: 'center', marginTop: spacing.xs }]}>
          {t('settings.prayerSource')}
        </Text>
      </View>

      {/* ── Bottom Sheets ── */}
      <SettingsPickerSheet
        visible={showReminderPicker}
        onDismiss={() => setShowReminderPicker(false)}
        title={t('settings.prayerReminder')}
        options={reminderOptions}
        selectedValue={reminderMin}
        onSelect={handleReminderChange}
      />

      <SettingsPickerSheet
        visible={showCalcMethodPicker}
        onDismiss={() => setShowCalcMethodPicker(false)}
        title={t('settings.calculationMethod')}
        options={calcMethodOptions}
        selectedValue={calcMethod.code}
        onSelect={handleCalcMethodChange}
      />

      <ThemePreviewSheet
        visible={showThemePicker}
        onDismiss={() => setShowThemePicker(false)}
        selectedTheme={themePreference}
        onSelect={handleThemeChange}
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing['5xl'],
  },
  footer: {
    marginTop: spacing['4xl'],
    paddingHorizontal: spacing['3xl'],
    marginBottom: spacing.lg,
  },
});

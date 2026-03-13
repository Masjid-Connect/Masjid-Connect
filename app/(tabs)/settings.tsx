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
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

const HEADER_HEIGHT = 44;
const LARGE_TITLE_HEIGHT = 52;

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

export default function SettingsScreen() {
  const router = useRouter();
  const { effectiveScheme, themePreference, setThemePreference } = useTheme();
  const colors = getColors(effectiveScheme);
  const { t } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // ─── Large title collapse animation ────────────────────────────
  const scrollY = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const largeTitleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, LARGE_TITLE_HEIGHT], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, LARGE_TITLE_HEIGHT],
          [0, -LARGE_TITLE_HEIGHT / 2],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const inlineHeaderOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [LARGE_TITLE_HEIGHT - 10, LARGE_TITLE_HEIGHT], [0, 1], Extrapolation.CLAMP),
  }));

  // State
  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);
  const [notifyAnnouncements, setNotifyAnnouncementsState] = useState(true);
  const [notifyEvents, setNotifyEventsState] = useState(true);

  // Sheet visibility
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const [mins, h24, announceEnabled, eventsEnabled] = await Promise.all([
      getReminderMinutes(),
      getUse24h(),
      getNotifyAnnouncements(),
      getNotifyEvents(),
    ]);
    setReminderMin(mins);
    setUse24hState(h24);
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
    try {
      await Share.share({ message: t('settings.shareMessage') });
    } catch {
      // Share can throw on web if a previous share is still pending
    }
  }, [t]);

  const handleContactSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL('mailto:info@salafimasjid.app');
  }, []);

  // Derived display values
  const reminderLabel = reminderMin === 0
    ? t('settings.atAthanTime')
    : t('settings.minutesBefore', { minutes: reminderMin });

  const themeLabel = t(`settings.theme${themePreference.charAt(0).toUpperCase() + themePreference.slice(1)}`);

  // Build picker options
  const reminderOptions = REMINDER_VALUES.map((v) => ({
    label: v === 0 ? t('settings.atAthanTime') : t('settings.minutesBefore', { minutes: v }),
    value: v,
  }));

  return (
    <View style={[styles.root, { backgroundColor: colors.backgroundSecondary }]}>
      {/* Inline header — appears when large title scrolls away */}
      <View style={[styles.inlineHeader, { paddingTop: insets.top, height: insets.top + HEADER_HEIGHT, backgroundColor: colors.backgroundSecondary }]}>
        <Animated.Text
          style={[
            typography.headline,
            { color: colors.text, textAlign: 'center' },
            inlineHeaderOpacity,
          ]}>
          {t('settings.title')}
        </Animated.Text>
        <Animated.View
          style={[
            styles.headerSeparator,
            { backgroundColor: colors.separator },
            inlineHeaderOpacity,
          ]}
        />
      </View>

      <AnimatedScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + HEADER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {/* Large title */}
        <Animated.View style={[styles.largeTitleContainer, largeTitleStyle]}>
          <Text style={[typography.largeTitle, { color: colors.text }]}>
            {t('settings.title')}
          </Text>
        </Animated.View>

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

      {/* ── Notifications & Reminders ── */}
      <SettingsSection
        header={t('settings.notifications')}
        footer={t('settings.notificationsFooter')}
      >
        <SettingsRow
          icon={{ name: 'notifications', backgroundColor: palette.emerald600 }}
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
          icon={{ name: 'megaphone', backgroundColor: palette.emerald700 }}
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
          icon={{ name: 'time', backgroundColor: palette.emerald600 }}
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
          onPress={() => router.push('/about')}
          position="first"
        />
        <SettingsRow
          icon={{ name: 'share-social', backgroundColor: palette.emerald700 }}
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
          icon={{ name: 'mail', backgroundColor: palette.emerald600 }}
          label={t('settings.contactSupport')}
          onPress={handleContactSupport}
          position="middle"
        />
        <SettingsRow
          icon={{ name: 'shield-checkmark', backgroundColor: colors.textSecondary }}
          label={t('settings.privacyPolicy')}
          accessory="disclosure"
          onPress={() => router.push('/privacy')}
          position="last"
        />
      </SettingsSection>

      {/* ── Danger Zone (authenticated only) ── */}
      {isAuthenticated && (
        <SettingsSection header={t('settings.dangerZone')}>
          <SettingsRow
            icon={{ name: 'log-out-outline', backgroundColor: palette.crimson600 }}
            label={t('settings.signOut')}
            onPress={handleSignOut}
            destructive
            position="first"
          />
          <SettingsRow
            icon={{ name: 'trash-outline', backgroundColor: palette.crimson600 }}
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

      <ThemePreviewSheet
        visible={showThemePicker}
        onDismiss={() => setShowThemePicker(false)}
        selectedTheme={themePreference}
        onSelect={handleThemeChange}
      />

    </AnimatedScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  // ─── Large title header ────────────────────────────────────────
  inlineHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSeparator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  largeTitleContainer: {
    paddingHorizontal: spacing['3xl'],
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
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

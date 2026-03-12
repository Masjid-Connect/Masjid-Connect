import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { spacing, getElevation, borderRadius, typography } from '@/constants/Theme';
import {
  getReminderMinutes,
  setReminderMinutes,
  getUse24h,
  setUse24h,
} from '@/lib/storage';
import type { ThemePreference } from '@/contexts/ThemeContext';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';

const REMINDER_VALUES = [0, 5, 10, 15, 30];
const THEME_VALUES: ThemePreference[] = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const router = useRouter();
  const { effectiveScheme, themePreference, setThemePreference } = useTheme();
  const colors = getColors(effectiveScheme);
  const isDark = effectiveScheme === 'dark';
  const { t } = useTranslation();
  const { user, isAuthenticated, isGuest, logout } = useAuth();

  const REMINDER_OPTIONS = REMINDER_VALUES.map((v) => ({
    label: v === 0 ? t('settings.atAthanTime') : t('settings.minutesBefore', { minutes: v }),
    value: v,
  }));

  const THEME_OPTIONS = THEME_VALUES.map((v) => ({
    value: v,
    label: t(`settings.theme${v.charAt(0).toUpperCase() + v.slice(1)}`),
  }));

  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const mins = await getReminderMinutes();
    setReminderMin(mins);

    const h24 = await getUse24h();
    setUse24hState(h24);
  };

  const handleReminderChange = async (minutes: number) => {
    setReminderMin(minutes);
    await setReminderMinutes(minutes);
    await reschedulePrayerRemindersForToday();
  };

  const handleToggle24h = async (value: boolean) => {
    setUse24hState(value);
    await setUse24h(value);
  };

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(t('settings.signOutConfirm'));
      if (confirmed) {
        await logout();
      }
    } else {
      Alert.alert(t('settings.signOut'), t('settings.signOutConfirm'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.signOut'),
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]);
    }
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[typography.sectionHeader, { color: colors.textSecondary, marginTop: spacing['2xl'], marginBottom: spacing.sm, paddingHorizontal: spacing['3xl'] }]}>
      {title}
    </Text>
  );

  const CheckRow = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.row, { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}
    >
      <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{label}</Text>
      {selected && <Ionicons name="checkmark" size={20} color={colors.tint} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* Account */}
      <SectionHeader title={t('settings.account')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
        {isAuthenticated && user ? (
          <View style={styles.row}>
            <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
              <Text style={[typography.title2, { color: colors.onPrimary }]}>
                {(user.name || user.email)[0].toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={[typography.body, { color: colors.text }]}>{user.name || user.email}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>
            <TouchableOpacity onPress={handleSignOut}>
              <Text style={[typography.subhead, { color: colors.urgent }]}>{t('settings.signOut')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            {isGuest && (
              <Text style={[typography.footnote, { color: colors.textSecondary, textAlign: 'center', paddingTop: spacing.lg, paddingHorizontal: spacing.lg }]}>
                {t('settings.guestHint')}
              </Text>
            )}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/welcome')}
              style={[styles.actionBtn, { backgroundColor: colors.tint }]}
            >
              <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: '600' }]}>{t('settings.signIn')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Prayer Reminders */}
      <SectionHeader title={t('settings.prayerReminder')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
        {REMINDER_OPTIONS.map((opt) => (
          <CheckRow
            key={opt.value}
            label={opt.label}
            selected={opt.value === reminderMin}
            onPress={() => handleReminderChange(opt.value)}
          />
        ))}
      </View>

      {/* Appearance */}
      <SectionHeader title={t('settings.appearance')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...getElevation('sm', isDark) }]}>
        {THEME_OPTIONS.map((opt) => (
          <CheckRow
            key={opt.value}
            label={opt.label}
            selected={themePreference === opt.value}
            onPress={() => setThemePreference(opt.value)}
          />
        ))}
        <View style={[styles.row, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{t('settings.use24h')}</Text>
          <Switch
            value={use24h}
            onValueChange={handleToggle24h}
            trackColor={{ false: colors.separator, true: colors.tint }}
            thumbColor={palette.white}
          />
        </View>
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
          {t('settings.version', { version: '1.0.0' })}
        </Text>
        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          {t('settings.prayerSource')}
        </Text>
      </View>
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
  card: {
    marginHorizontal: spacing['3xl'],
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  actionBtn: {
    margin: spacing.lg,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    marginTop: spacing['4xl'],
    paddingHorizontal: spacing['3xl'],
  },
});

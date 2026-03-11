import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  Platform,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';

import { getColors, palette } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import {
  getUserLocation,
  setUserLocation,
  getReminderMinutes,
  setReminderMinutes,
  getUse24h,
  setUse24h,
  getSubscribedMosqueIds,
  setSubscribedMosqueIds,
} from '@/lib/storage';
import type { ThemePreference } from '@/contexts/ThemeContext';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';
import { mosques as mosquesApi, subscriptions as subscriptionsApi } from '@/lib/api';
import type { Mosque, UserSubscription } from '@/types';

const REMINDER_VALUES = [0, 5, 10, 15, 30];
const THEME_VALUES: ThemePreference[] = ['light', 'dark', 'system'];

export default function SettingsScreen() {
  const router = useRouter();
  const { effectiveScheme, themePreference, setThemePreference } = useTheme();
  const colors = getColors(effectiveScheme);
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

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [subscribedMosques, setSubscribedMosques] = useState<Mosque[]>([]);
  const [backendSubscriptions, setBackendSubscriptions] = useState<UserSubscription[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState<Mosque[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const loadSubscribedMosques = useCallback(async () => {
    let ids: string[] = [];

    // If authenticated, sync from backend subscriptions
    if (isAuthenticated) {
      try {
        const subs = await subscriptionsApi.list();
        setBackendSubscriptions(subs);
        ids = subs.map((s) => s.mosque);
        // Sync backend subscriptions to local storage
        await setSubscribedMosqueIds(ids);
      } catch {
        // Fall back to local storage
        ids = await getSubscribedMosqueIds();
      }
    } else {
      ids = await getSubscribedMosqueIds();
    }

    const list: Mosque[] = [];
    for (const id of ids) {
      try {
        const m = await mosquesApi.getById(id);
        list.push(m);
      } catch {
        list.push({ id, name: id.slice(0, 8) + '…', address: '', city: '', state: '', country: '', latitude: 0, longitude: 0, calculation_method: '', jumua_time: null, contact_phone: '', contact_email: '', website: '', photo: '', created: '', updated: '' });
      }
    }
    setSubscribedMosques(list);
  }, [isAuthenticated]);

  useEffect(() => {
    loadSettings();
    loadSubscribedMosques();
  }, [loadSubscribedMosques]);

  const loadSettings = async () => {
    const loc = await getUserLocation();
    if (loc) setLocation(loc);

    const mins = await getReminderMinutes();
    setReminderMin(mins);

    const h24 = await getUse24h();
    setUse24hState(h24);
  };

  const handleDetectLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permissionNeeded'), t('common.locationPermission'));
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      await setUserLocation(latitude, longitude);
      setLocation({ latitude, longitude });
    } catch {
      Alert.alert(t('common.error'), t('common.locationError'));
    } finally {
      setLocationLoading(false);
    }
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
      // Alert.alert is not supported on web — use window.confirm
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

  const handleSubscribe = async (mosqueId: string) => {
    const ids = await getSubscribedMosqueIds();
    if (ids.includes(mosqueId)) return;
    await setSubscribedMosqueIds([...ids, mosqueId]);

    // Also subscribe on backend if authenticated
    if (isAuthenticated) {
      try {
        await subscriptionsApi.subscribe(mosqueId);
      } catch {
        // Local subscription saved; backend sync will retry on next load
      }
    }

    await loadSubscribedMosques();
    setSearchResults((prev) => prev.filter((m) => m.id !== mosqueId));
  };

  const handleUnsubscribe = async (mosqueId: string) => {
    const ids = await getSubscribedMosqueIds();
    await setSubscribedMosqueIds(ids.filter((id) => id !== mosqueId));

    // Also unsubscribe on backend if authenticated
    if (isAuthenticated) {
      const sub = backendSubscriptions.find((s) => s.mosque === mosqueId);
      if (sub) {
        try {
          await subscriptionsApi.unsubscribe(sub.id);
        } catch {
          // Local unsubscription saved; backend sync will retry on next load
        }
      }
    }

    await loadSubscribedMosques();
  };

  const handleSearchByCity = async () => {
    if (!searchCity.trim()) return;
    setSearchLoading(true);
    try {
      const { items } = await mosquesApi.list(searchCity.trim());
      setSearchResults(items);
    } catch {
      Alert.alert(t('common.error'), t('common.searchFailed'));
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNearby = async () => {
    setNearbyLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('common.permissionNeeded'), t('common.locationPermission'));
        setNearbyLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const list = await mosquesApi.nearby(loc.coords.latitude, loc.coords.longitude);
      setSearchResults(list);
    } catch {
      Alert.alert(t('common.error'), t('common.nearbyFailed'));
    } finally {
      setNearbyLoading(false);
    }
  };

  const subscribedIds = subscribedMosques.map((m) => m.id);

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
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
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

      {/* My Mosques */}
      <SectionHeader title={t('settings.myMosques')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {subscribedMosques.length === 0 ? (
          <View style={styles.emptyMosque}>
            <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center' }]}>
              {t('settings.noMosques')}
            </Text>
          </View>
        ) : (
          subscribedMosques.map((m, i) => (
            <View key={m.id} style={[styles.row, i < subscribedMosques.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
              <TouchableOpacity onPress={() => handleUnsubscribe(m.id)}>
                <Text style={[typography.subhead, { color: colors.urgent }]}>{t('settings.remove')}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Search section */}
        <View style={[styles.searchSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
          <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{t('settings.addMosque')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundGrouped, borderColor: colors.separator, color: colors.text }]}
            placeholder={t('settings.cityName')}
            placeholderTextColor={colors.textSecondary}
            value={searchCity}
            onChangeText={setSearchCity}
            returnKeyType="search"
            onSubmitEditing={handleSearchByCity}
          />
          <View style={styles.searchButtons}>
            <TouchableOpacity
              onPress={handleSearchByCity}
              disabled={searchLoading}
              style={[styles.searchBtn, { backgroundColor: colors.tint }]}
            >
              {searchLoading ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: '600' }]}>{t('settings.search')}</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNearby}
              disabled={nearbyLoading}
              style={[styles.searchBtn, { backgroundColor: colors.accent }]}
            >
              {nearbyLoading ? <ActivityIndicator size="small" color={colors.onPrimary} /> : <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: '600' }]}>{t('settings.nearby')}</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {searchResults.length > 0 && (
          <View style={[styles.searchSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>{t('settings.results')}</Text>
            {searchResults.map((m, i) => {
              const isSubscribed = subscribedIds.includes(m.id);
              return (
                <View key={m.id} style={[styles.row, i < searchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
                  <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
                  {isSubscribed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <TouchableOpacity onPress={() => handleSubscribe(m.id)}>
                      <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>{t('settings.add')}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Location */}
      <SectionHeader title={t('settings.location')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {location ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{t('settings.locationDetected')}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDetectLocation}>
              <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>{t('settings.update')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handleDetectLocation} style={[styles.actionBtn, { backgroundColor: colors.tint }]}>
            <Text style={[typography.subhead, { color: colors.onPrimary, fontWeight: '600' }]}>
              {locationLoading ? t('settings.detecting') : t('settings.detectLocation')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calculation Method */}
      <SectionHeader title={t('settings.calculationMethod')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        <View style={styles.row}>
          <Ionicons name="information-circle-outline" size={20} color={colors.tint} style={{ marginRight: spacing.sm }} />
          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>Umm Al-Qura (Makkah)</Text>
        </View>
      </View>

      {/* Prayer Reminders */}
      <SectionHeader title={t('settings.prayerReminder')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {REMINDER_OPTIONS.map((opt) => (
          <CheckRow
            key={opt.value}
            label={opt.label}
            selected={opt.value === reminderMin}
            onPress={() => handleReminderChange(opt.value)}
          />
        ))}
      </View>

      {/* Preferences */}
      <SectionHeader title={t('settings.appearance')} />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
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
  emptyMosque: {
    padding: spacing.lg,
  },
  searchSection: {
    padding: spacing.lg,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 17,
  },
  searchButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  searchBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
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

import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import Ionicons from '@expo/vector-icons/Ionicons';

import { getColors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { spacing, elevation, borderRadius, typography } from '@/constants/Theme';
import {
  getUserLocation,
  setUserLocation,
  getCalculationMethod,
  setCalculationMethod,
  getReminderMinutes,
  setReminderMinutes,
  getUse24h,
  setUse24h,
  getSubscribedMosqueIds,
  setSubscribedMosqueIds,
} from '@/lib/storage';
import type { ThemePreference } from '@/contexts/ThemeContext';
import { reschedulePrayerRemindersForToday } from '@/lib/notifications';
import { auth, mosques as mosquesApi } from '@/lib/api';
import { CALCULATION_METHODS } from '@/types';
import type { Mosque } from '@/types';
import { useRouter } from 'expo-router';

const REMINDER_OPTIONS = [
  { label: 'At athan time', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
];

const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { effectiveScheme, themePreference, setThemePreference } = useTheme();
  const colors = getColors(effectiveScheme);
  const isLoggedIn = auth.isLoggedIn;
  const user = auth.user;

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [methodName, setMethodName] = useState('ISNA');
  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [subscribedMosques, setSubscribedMosques] = useState<Mosque[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [searchResults, setSearchResults] = useState<Mosque[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const loadSubscribedMosques = useCallback(async () => {
    const ids = await getSubscribedMosqueIds();
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
  }, []);

  useEffect(() => {
    loadSettings();
    loadSubscribedMosques();
  }, [loadSubscribedMosques]);

  const loadSettings = async () => {
    const loc = await getUserLocation();
    if (loc) setLocation(loc);

    const method = await getCalculationMethod();
    const entry = Object.entries(CALCULATION_METHODS).find(([, v]) => v.code === method.code);
    if (entry) setMethodName(entry[0]);

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
        Alert.alert('Permission needed', 'Location permission is required to detect nearby mosques and calculate prayer times.');
        return;
      }

      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      await setUserLocation(latitude, longitude);
      setLocation({ latitude, longitude });
    } catch {
      Alert.alert('Error', 'Could not detect your location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMethodChange = async (name: string) => {
    const method = CALCULATION_METHODS[name];
    if (!method) return;
    setMethodName(name);
    await setCalculationMethod(method.code, name);
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

  const handleSubscribe = async (mosqueId: string) => {
    const ids = await getSubscribedMosqueIds();
    if (ids.includes(mosqueId)) return;
    await setSubscribedMosqueIds([...ids, mosqueId]);
    await loadSubscribedMosques();
    setSearchResults((prev) => prev.filter((m) => m.id !== mosqueId));
  };

  const handleUnsubscribe = async (mosqueId: string) => {
    const ids = await getSubscribedMosqueIds();
    await setSubscribedMosqueIds(ids.filter((id) => id !== mosqueId));
    await loadSubscribedMosques();
  };

  const handleSearchByCity = async () => {
    if (!searchCity.trim()) return;
    setSearchLoading(true);
    try {
      const { items } = await mosquesApi.list(searchCity.trim());
      setSearchResults(items);
    } catch {
      Alert.alert('Search failed', 'Could not search mosques. Check your connection.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handleNearby = async () => {
    setNearbyLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Location is required to find nearby mosques.');
        setNearbyLoading(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const list = await mosquesApi.nearby(loc.coords.latitude, loc.coords.longitude);
      setSearchResults(list);
    } catch {
      Alert.alert('Error', 'Could not find nearby mosques. Check your connection.');
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
      {/* My Mosques */}
      <SectionHeader title="My mosques" />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {subscribedMosques.length === 0 ? (
          <View style={styles.emptyMosque}>
            <Text style={[typography.subhead, { color: colors.textSecondary, textAlign: 'center' }]}>
              No mosques yet. Add one below to see announcements and events.
            </Text>
          </View>
        ) : (
          subscribedMosques.map((m, i) => (
            <View key={m.id} style={[styles.row, i < subscribedMosques.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
              <TouchableOpacity onPress={() => handleUnsubscribe(m.id)}>
                <Text style={[typography.subhead, { color: colors.urgent }]}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        {/* Search section */}
        <View style={[styles.searchSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
          <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Add mosque</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.backgroundGrouped, borderColor: colors.separator, color: colors.text }]}
            placeholder="City name"
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
              {searchLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>Search</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNearby}
              disabled={nearbyLoading}
              style={[styles.searchBtn, { backgroundColor: colors.accent }]}
            >
              {nearbyLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>Nearby</Text>}
            </TouchableOpacity>
          </View>
        </View>

        {searchResults.length > 0 && (
          <View style={[styles.searchSection, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}>
            <Text style={[typography.footnote, { color: colors.textSecondary, marginBottom: spacing.sm }]}>Results</Text>
            {searchResults.map((m, i) => {
              const isSubscribed = subscribedIds.includes(m.id);
              return (
                <View key={m.id} style={[styles.row, i < searchResults.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.separator }]}>
                  <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
                  {isSubscribed ? (
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  ) : (
                    <TouchableOpacity onPress={() => handleSubscribe(m.id)}>
                      <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Location */}
      <SectionHeader title="Location" />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {location ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>Location detected</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDetectLocation}>
              <Text style={[typography.subhead, { color: colors.tint, fontWeight: '600' }]}>Update</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handleDetectLocation} style={[styles.actionBtn, { backgroundColor: colors.tint }]}>
            <Text style={[typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>
              {locationLoading ? 'Detecting...' : 'Detect My Location'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calculation Method */}
      <SectionHeader title="Calculation Method" />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {Object.entries(CALCULATION_METHODS).map(([key, value], i, arr) => (
          <CheckRow
            key={key}
            label={value.label}
            selected={key === methodName}
            onPress={() => handleMethodChange(key)}
          />
        ))}
      </View>

      {/* Prayer Reminders */}
      <SectionHeader title="Prayer Reminder" />
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
      <SectionHeader title="Appearance" />
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
          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>24-hour time</Text>
          <Switch
            value={use24h}
            onValueChange={handleToggle24h}
            trackColor={{ false: colors.separator, true: colors.tint }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={[styles.card, { backgroundColor: colors.card, ...elevation.sm }]}>
        {isLoggedIn && user ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{user.name || user.email}</Text>
              <Text style={[typography.caption1, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>
            <TouchableOpacity onPress={async () => { await auth.logout(); }}>
              <Text style={[typography.subhead, { color: colors.urgent }]}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={[styles.actionBtn, { backgroundColor: colors.tint }]}
          >
            <Text style={[typography.subhead, { color: '#FFFFFF', fontWeight: '600' }]}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center' }]}>
          Mosque Connect v1.0.0
        </Text>
        <Text style={[typography.caption1, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
          Prayer times via Aladhan API
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
  footer: {
    marginTop: spacing['4xl'],
    paddingHorizontal: spacing['3xl'],
  },
});

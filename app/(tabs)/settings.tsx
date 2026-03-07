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
    } catch (error) {
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

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.xl, textTransform: 'uppercase', letterSpacing: 1 }]}>
      {title}
    </Text>
  );

  const subscribedIds = subscribedMosques.map((m) => m.id);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* My Mosques */}
      <SectionHeader title="My mosques" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        {subscribedMosques.length === 0 ? (
          <View style={styles.mosqueEmpty}>
            <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>
              No mosques yet. Add one below to see announcements and events.
            </Text>
          </View>
        ) : (
          subscribedMosques.map((m) => (
            <View key={m.id} style={[styles.optionRow, { borderBottomColor: colors.divider }]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
              <TouchableOpacity onPress={() => handleUnsubscribe(m.id)}>
                <Text style={[typography.callout, { color: colors.urgent }]}>Unsubscribe</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
        <View style={[styles.mosqueSearchRow, { borderTopWidth: 0.5, borderTopColor: colors.divider }]}>
          <Text style={[typography.callout, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Add mosque</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.background, borderColor: colors.cardBorder, color: colors.text }]}
            placeholder="City name"
            placeholderTextColor={colors.textSecondary}
            value={searchCity}
            onChangeText={setSearchCity}
          />
          <View style={styles.mosqueButtons}>
            <TouchableOpacity
              onPress={handleSearchByCity}
              disabled={searchLoading}
              style={[styles.mosqueButton, { backgroundColor: colors.tint }]}>
              {searchLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[typography.callout, { color: '#FFFFFF' }]}>Search</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleNearby}
              disabled={nearbyLoading}
              style={[styles.mosqueButton, { backgroundColor: colors.accent }]}>
              {nearbyLoading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={[typography.callout, { color: '#FFFFFF' }]}>Nearby</Text>}
            </TouchableOpacity>
          </View>
        </View>
        {searchResults.length > 0 && (
          <View style={[styles.searchResults, { borderTopColor: colors.divider }]}>
            <Text style={[typography.caption, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Results</Text>
            {searchResults.map((m) => {
              const isSubscribed = subscribedIds.includes(m.id);
              return (
                <View key={m.id} style={[styles.optionRow, { borderBottomColor: colors.divider }]}>
                  <Text style={[typography.body, { color: colors.text, flex: 1 }]} numberOfLines={1}>{m.name}</Text>
                  {isSubscribed ? (
                    <Text style={[typography.caption, { color: colors.textSecondary }]}>Subscribed</Text>
                  ) : (
                    <TouchableOpacity onPress={() => handleSubscribe(m.id)}>
                      <Text style={[typography.callout, { color: colors.accent }]}>Subscribe</Text>
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
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        {location ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>Location detected</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>
                {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
              </Text>
            </View>
            <TouchableOpacity onPress={handleDetectLocation} style={[styles.button, { borderColor: colors.accent }]}>
              <Text style={[typography.callout, { color: colors.accent }]}>Update</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={handleDetectLocation} style={[styles.detectButton, { backgroundColor: colors.tint }]}>
            <Text style={[typography.callout, { color: '#FFFFFF' }]}>
              {locationLoading ? 'Detecting...' : 'Detect My Location'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Calculation Method */}
      <SectionHeader title="Calculation Method" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        {Object.entries(CALCULATION_METHODS).map(([key, value]) => {
          const isSelected = key === methodName;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => handleMethodChange(key)}
              style={[
                styles.optionRow,
                { borderBottomColor: colors.divider },
              ]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {value.label}
              </Text>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                    backgroundColor: isSelected ? colors.accent : 'transparent',
                  },
                ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Prayer Reminders */}
      <SectionHeader title="Prayer Reminder" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        {REMINDER_OPTIONS.map((opt) => {
          const isSelected = opt.value === reminderMin;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => handleReminderChange(opt.value)}
              style={[styles.optionRow, { borderBottomColor: colors.divider }]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>
                {opt.label}
              </Text>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                    backgroundColor: isSelected ? colors.accent : 'transparent',
                  },
                ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        <View style={[styles.row, { borderBottomWidth: 0.5, borderBottomColor: colors.divider }]}>
          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>Appearance</Text>
        </View>
        {THEME_OPTIONS.map((opt) => {
          const isSelected = themePreference === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => setThemePreference(opt.value)}
              style={[styles.optionRow, { borderBottomColor: colors.divider }]}>
              <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{opt.label}</Text>
              <View
                style={[
                  styles.radio,
                  {
                    borderColor: isSelected ? colors.accent : colors.cardBorder,
                    backgroundColor: isSelected ? colors.accent : 'transparent',
                  },
                ]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>
            </TouchableOpacity>
          );
        })}
        <View style={styles.row}>
          <Text style={[typography.body, { color: colors.text, flex: 1 }]}>24-hour time</Text>
          <Switch
            value={use24h}
            onValueChange={handleToggle24h}
            trackColor={{ false: colors.divider, true: colors.accent }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      {/* Account */}
      <SectionHeader title="Account" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        {isLoggedIn && user ? (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[typography.body, { color: colors.text }]}>{user.name || user.email}</Text>
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{user.email}</Text>
            </View>
            <TouchableOpacity
              onPress={async () => {
                await auth.logout();
              }}
            >
              <Text style={[typography.callout, { color: colors.urgent }]}>Sign out</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.push('/(auth)/login')}
            style={[styles.detectButton, { backgroundColor: colors.tint }]}
          >
            <Text style={[typography.callout, { color: '#FFFFFF' }]}>Sign in</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* App info */}
      <View style={styles.footer}>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}>
          Mosque Connect v1.0.0
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: 'center', marginTop: 4 }]}>
          Prayer times via Aladhan API + adhan-js
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
    paddingBottom: spacing['3xl'],
  },
  card: {
    marginHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 0.5,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  button: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  detectButton: {
    margin: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  footer: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
  mosqueEmpty: {
    padding: spacing.lg,
  },
  mosqueSearchRow: {
    padding: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  mosqueButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mosqueButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  searchResults: {
    padding: spacing.lg,
    borderTopWidth: 0.5,
  },
});

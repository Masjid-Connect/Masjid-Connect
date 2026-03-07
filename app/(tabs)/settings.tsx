import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  useColorScheme,
} from 'react-native';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';

import { getColors } from '@/constants/Colors';
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
} from '@/lib/storage';
import { CALCULATION_METHODS } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const REMINDER_OPTIONS = [
  { label: 'At athan time', value: 0 },
  { label: '5 min before', value: 5 },
  { label: '10 min before', value: 10 },
  { label: '15 min before', value: 15 },
  { label: '30 min before', value: 30 },
];

export default function SettingsScreen() {
  const colorScheme = useColorScheme();
  const colors = getColors(colorScheme);
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [methodName, setMethodName] = useState('ISNA');
  const [reminderMin, setReminderMin] = useState(15);
  const [use24h, setUse24hState] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mosqueCount, setMosqueCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

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

    const ids = await getSubscribedMosqueIds();
    setMosqueCount(ids.length);
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
  };

  const handleToggle24h = async (value: boolean) => {
    setUse24hState(value);
    await setUse24h(value);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <Text style={[typography.callout, { color: colors.textSecondary, marginTop: spacing.lg, marginBottom: spacing.sm, paddingHorizontal: spacing.xl, textTransform: 'uppercase', letterSpacing: 1 }]}>
      {title}
    </Text>
  );

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Account */}
      {isAuthenticated && user && (
        <>
          <SectionHeader title="Account" />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
            <View style={styles.row}>
              <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
                <Text style={[typography.title2, { color: '#FFFFFF' }]}>
                  {(user.name || user.email)[0].toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1, marginLeft: spacing.md }}>
                <Text style={[typography.title3, { color: colors.text }]}>{user.name}</Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>{user.email}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* My Mosques */}
      <SectionHeader title="My Mosques" />
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder, ...elevation.elevated }]}>
        <TouchableOpacity
          style={styles.row}
          onPress={() => router.push('/mosque-search')}>
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.text }]}>
              {mosqueCount > 0 ? `${mosqueCount} mosque${mosqueCount > 1 ? 's' : ''}` : 'No mosques yet'}
            </Text>
            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Tap to find and join mosques
            </Text>
          </View>
          <Text style={[typography.title3, { color: colors.accent }]}>+</Text>
        </TouchableOpacity>
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

      {/* Sign Out */}
      {isAuthenticated && (
        <View style={{ marginTop: spacing['2xl'], marginHorizontal: spacing.xl }}>
          <TouchableOpacity
            onPress={handleSignOut}
            style={[styles.signOutButton, { borderColor: colors.urgent }]}>
            <Text style={[typography.callout, { color: colors.urgent }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      )}

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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
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
  signOutButton: {
    paddingVertical: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  footer: {
    marginTop: spacing['2xl'],
    paddingHorizontal: spacing.xl,
  },
});

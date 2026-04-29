import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { PrayerTimesData, PrayerName } from '@/types';
import { PRAYER_LABELS } from '@/types';
import { getStaticPrayerTimes } from '@/lib/staticTimetable';
import { getReminderMinutes, getPlayAdhan } from '@/lib/storage';
import { Sentry } from '@/lib/sentry';

/** Configure notification handler (native only) */
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Request notification permissions and get push token */
export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('prayer-reminders', {
      name: 'Prayer Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });

    // Channel sound is locked at first creation on Android — once a
    // channel exists with a given sound, you can't change it. Devices
    // that installed earlier builds carry an orphan 'prayer-athan'
    // channel bound to the 1-second placeholder. Version-suffix the
    // channel so the real adhan binds to a fresh channel on next launch;
    // bump again whenever the asset changes. Old channel is left orphaned
    // (Android prunes unused channels eventually; user can delete in
    // settings if they want).
    await Notifications.setNotificationChannelAsync('prayer-athan-v2', {
      name: 'Adhan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'adhan.wav',
    });
    // Best-effort: remove the orphaned v1 channel so the user doesn't
    // see two "Adhan" entries in system notification settings.
    try {
      await Notifications.deleteNotificationChannelAsync('prayer-athan');
    } catch {}

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });

    await Notifications.setNotificationChannelAsync('live-lessons', {
      name: 'Live Lessons',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/** Schedule prayer reminder notifications for today.
 *  `times` contains the masjid timetable (jama'ah) times — reminders fire relative to these.
 */
export async function schedulePrayerReminders(
  times: PrayerTimesData,
  reminderMinutes: number = 15,
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel all existing prayer reminders
  await cancelPrayerReminders();

  // Whether to schedule the 'at-prayer-time' adhan notification.
  // User-controlled toggle (Settings → Notifications → Adhan at prayer time).
  // Default true; when false the at-prayer-time push is skipped entirely
  // (the 15-minute reminder still fires regardless).
  const playAdhan = await getPlayAdhan();

  const now = new Date();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    const targetTime = times[prayer]; // jama'ah time

    // Maghrib exception: fire AT jama'ah time, no lead. Maghrib's
    // window is short (sunset to Isha) so a 15-min-before cue would
    // suggest a window that doesn't exist. Every other prayer uses
    // reminderMinutes as the lead so the adhan plays as a prepare-
    // for-prayer cue. User 2026-04-16: 'adhan should be 15 mins
    // before the prayer, except for maghrib'.
    const leadMinutes = prayer === 'maghrib' ? 0 : reminderMinutes;
    const fireAt = new Date(targetTime.getTime() - leadMinutes * 60 * 1000);

    // Skip if fire time has already passed
    if (fireAt <= now) continue;

    try {
      const body = leadMinutes === 0
        ? `${PRAYER_LABELS[prayer].ar} — Prayer time has entered`
        : `Jama'ah in ${leadMinutes} minutes`;

      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${PRAYER_LABELS[prayer].en} — ${PRAYER_LABELS[prayer].ar}`,
          body,
          // Only set `sound` when adhan is enabled — else rely on
          // channel default (silent-or-default system sound).
          ...(playAdhan && { sound: 'adhan.wav' }),
          data: { type: playAdhan ? 'prayer_athan' : 'prayer_reminder', prayer },
          // Android requires the right channel to play adhan.wav as
          // the ringtone. prayer-athan channel has sound: 'adhan.wav';
          // prayer-reminders uses system default.
          ...(Platform.OS === 'android' && {
            channelId: playAdhan ? 'prayer-athan-v2' : 'prayer-reminders',
          }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireAt,
        },
        identifier: `prayer-${prayer}`,
      });
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'schedule prayer notification', prayer } });
    }
  }
}

/** Reschedule prayer reminders from the static masjid timetable for today.
 *  If the static lookup returns nothing (should never happen given timetable
 *  coverage through 2027), skip scheduling rather than fabricate times from
 *  a calculation method the masjid does not use. */
export async function reschedulePrayerRemindersForToday(): Promise<void> {
  if (Platform.OS === 'web') return;

  const staticResult = getStaticPrayerTimes(new Date());
  if (!staticResult) {
    Sentry.captureMessage('reschedulePrayerRemindersForToday: static timetable returned no data', {
      level: 'warning',
    });
    return;
  }

  const reminderMinutes = await getReminderMinutes();
  await schedulePrayerReminders(staticResult.times, reminderMinutes);
}

/** Cancel all prayer notifications, including legacy identifier patterns
 *  left over from the previous two-notification scheme (reminder + athan).
 *  Users upgrading from older builds have those still sitting in the
 *  system queue; sweep them here so they don't fire stale copies alongside
 *  the new unified 'prayer-{name}' notification. */
export async function cancelPrayerReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (
      notification.identifier.startsWith('prayer-reminder-') ||
      notification.identifier.startsWith('prayer-athan-') ||
      /^prayer-(fajr|dhuhr|asr|maghrib|isha)$/.test(notification.identifier)
    ) {
      await Notifications.cancelScheduledNotificationAsync(notification.identifier);
    }
  }
}

/** Listen for notifications received while app is foregrounded */
export function addNotificationReceivedListener(
  callback: (notification: Notifications.Notification) => void
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/** Listen for notification interactions (user tapped a notification) */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

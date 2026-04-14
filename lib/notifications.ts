import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { PrayerTimesData, PrayerName } from '@/types';
import { PRAYER_LABELS } from '@/types';
import { getStaticPrayerTimes } from '@/lib/staticTimetable';
import { getReminderMinutes } from '@/lib/storage';
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

    await Notifications.setNotificationChannelAsync('prayer-athan', {
      name: 'Adhan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'adhan.wav',
    });

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

  const now = new Date();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    const targetTime = times[prayer];
    const reminderTime = new Date(targetTime.getTime() - reminderMinutes * 60 * 1000);

    // Skip if reminder time has already passed
    if (reminderTime <= now) continue;

    // Schedule "X minutes before" reminder
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${PRAYER_LABELS[prayer].en} in ${reminderMinutes} minutes`,
          body: `${PRAYER_LABELS[prayer].ar} — Jama'ah starts soon`,
          data: { type: 'prayer_reminder', prayer },
          ...(Platform.OS === 'android' && { channelId: 'prayer-reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: reminderTime,
        },
        identifier: `prayer-reminder-${prayer}`,
      });
    } catch (err) {
      Sentry.captureException(err, { extra: { context: 'schedule prayer reminder', prayer } });
    }

    // Schedule "at prayer time" notification with adhan sound
    if (targetTime > now) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_LABELS[prayer].en} — ${PRAYER_LABELS[prayer].ar}`,
            body: 'Prayer time has entered',
            sound: 'adhan.wav',
            data: { type: 'prayer_athan', prayer },
            ...(Platform.OS === 'android' && { channelId: 'prayer-athan' }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: targetTime,
          },
          identifier: `prayer-athan-${prayer}`,
        });
      } catch (err) {
        Sentry.captureException(err, { extra: { context: 'schedule prayer athan', prayer } });
      }
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

/** Cancel all prayer reminder notifications */
export async function cancelPrayerReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const notification of scheduled) {
    if (
      notification.identifier.startsWith('prayer-reminder-') ||
      notification.identifier.startsWith('prayer-athan-')
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

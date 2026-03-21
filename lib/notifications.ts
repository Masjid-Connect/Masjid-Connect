import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { PrayerTimesData, PrayerName, JamaahTimesData } from '@/types';
import { PRAYER_LABELS } from '@/types';
import { getPrayerTimes } from '@/lib/prayer';
import { getStaticPrayerTimes } from '@/lib/staticTimetable';
import { getReminderMinutes } from '@/lib/storage';
import { SALAFI_MASJID } from '@/constants/mosque';

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
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/** Schedule prayer reminder notifications for today.
 *  When jamaahTimes are provided, reminders are relative to jama'ah time
 *  (more useful — "15 min before jama'ah" tells you when to leave home).
 */
export async function schedulePrayerReminders(
  times: PrayerTimesData,
  reminderMinutes: number = 15,
  jamaahTimes?: JamaahTimesData | null
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Cancel all existing prayer reminders
  await cancelPrayerReminders();

  const now = new Date();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    // Use jama'ah time as the target if available, otherwise start time
    const targetTime = (jamaahTimes && prayer in jamaahTimes)
      ? jamaahTimes[prayer as keyof JamaahTimesData]
      : times[prayer];
    const prayerStartTime = times[prayer];

    const reminderTime = new Date(targetTime.getTime() - reminderMinutes * 60 * 1000);

    // Skip if reminder time has already passed
    if (reminderTime <= now) continue;

    // Schedule "X minutes before" reminder
    const reminderBody = jamaahTimes
      ? `${PRAYER_LABELS[prayer].ar} — Jama'ah starts soon`
      : `${PRAYER_LABELS[prayer].ar} — Time to prepare for prayer`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PRAYER_LABELS[prayer].en} in ${reminderMinutes} minutes`,
        body: reminderBody,
        data: { type: 'prayer_reminder', prayer },
        ...(Platform.OS === 'android' && { channelId: 'prayer-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
      identifier: `prayer-reminder-${prayer}`,
    });

    // Schedule "at athan time" notification with adhan sound
    if (prayerStartTime > now) {
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
          date: prayerStartTime,
        },
        identifier: `prayer-athan-${prayer}`,
      });
    }
  }
}

/** Reschedule prayer reminders using static timetable or Aladhan for today. */
export async function reschedulePrayerRemindersForToday(): Promise<void> {
  if (Platform.OS === 'web') return;

  const today = new Date();
  let times: PrayerTimesData;
  let jamaahTimes: JamaahTimesData | null = null;

  // Static timetable is primary
  const staticResult = getStaticPrayerTimes(today);
  if (staticResult) {
    times = staticResult.times;
    jamaahTimes = staticResult.jamaahTimes;
  } else {
    // Fallback to Aladhan calculated times
    const { latitude: lat, longitude: lng } = SALAFI_MASJID;
    const result = await getPrayerTimes(lat, lng, 4, 'UmmAlQura');
    times = result.times;
  }

  const reminderMinutes = await getReminderMinutes();
  await schedulePrayerReminders(times, reminderMinutes, jamaahTimes);
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

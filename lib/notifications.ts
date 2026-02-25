import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import type { PrayerTimesData, PrayerName } from '@/types';
import { PRAYER_LABELS } from '@/types';

/** Configure notification handler */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/** Request notification permissions and get push token */
export async function registerForPushNotifications(): Promise<string | null> {
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

    await Notifications.setNotificationChannelAsync('announcements', {
      name: 'Announcements',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

/** Schedule prayer reminder notifications for today */
export async function schedulePrayerReminders(
  times: PrayerTimesData,
  reminderMinutes: number = 15
): Promise<void> {
  // Cancel all existing prayer reminders
  await cancelPrayerReminders();

  const now = new Date();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    const prayerTime = times[prayer];
    const reminderTime = new Date(prayerTime.getTime() - reminderMinutes * 60 * 1000);

    // Skip if reminder time has already passed
    if (reminderTime <= now) continue;

    // Schedule "X minutes before" reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${PRAYER_LABELS[prayer].en} in ${reminderMinutes} minutes`,
        body: `${PRAYER_LABELS[prayer].ar} — Time to prepare for prayer`,
        data: { type: 'prayer_reminder', prayer },
        ...(Platform.OS === 'android' && { channelId: 'prayer-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminderTime,
      },
      identifier: `prayer-reminder-${prayer}`,
    });

    // Schedule "at athan time" notification
    if (prayerTime > now) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: `${PRAYER_LABELS[prayer].en} — ${PRAYER_LABELS[prayer].ar}`,
          body: 'Prayer time has entered',
          data: { type: 'prayer_athan', prayer },
          ...(Platform.OS === 'android' && { channelId: 'prayer-reminders' }),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: prayerTime,
        },
        identifier: `prayer-athan-${prayer}`,
      });
    }
  }
}

/** Cancel all prayer reminder notifications */
export async function cancelPrayerReminders(): Promise<void> {
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

/** Listen for notification interactions */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

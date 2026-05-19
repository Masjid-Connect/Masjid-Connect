import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
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
    // Channel sound + lights are locked at first creation on Android — once
    // a channel exists with given settings, you can't change them. Version-
    // suffix when settings change so the new behaviour binds to a fresh
    // channel on next launch. Legacy 'prayer-reminders' (no lights) is
    // deleted below so users don't see two "Prayer Reminders" entries.
    await Notifications.setNotificationChannelAsync('prayer-reminders-v2', {
      name: 'Prayer Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      enableLights: true,
      lightColor: '#D4AF5A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: false,
    });
    try {
      await Notifications.deleteNotificationChannelAsync('prayer-reminders');
    } catch {}

    await Notifications.setNotificationChannelAsync('prayer-athan-v2', {
      name: 'Adhan',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'adhan.wav',
      enableLights: true,
      lightColor: '#D4AF5A',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
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

  // SDK 49+ removed the implicit projectId fallback — standalone builds
  // throw "No 'projectId' specified" without it, and the token never
  // reaches the backend. Reads from app.json's extra.eas.projectId.
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) {
    Sentry.captureMessage('Expo projectId missing — push token cannot be registered', {
      level: 'error',
    });
    return null;
  }
  const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
  return tokenData.data;
}

/** Schedule prayer notifications for today.
 *
 *  Two-notification model per prayer (Apr 2026 → May 2026 redesign):
 *
 *    - **Silent reminder** fires `reminderMinutes` before jama'ah, default
 *      sound, body "Jama'ah in N minutes". Identifier `prayer-reminder-{name}`.
 *      Skipped if `reminderMinutes === 0`. Maghrib never gets a reminder
 *      (its window is too short for a heads-up to be meaningful).
 *    - **Adhan** fires AT jama'ah, sound `adhan.wav`, body "Prayer time has
 *      entered". Identifier `prayer-athan-{name}`. Skipped entirely if the
 *      `playAdhan` user toggle is off. All five prayers including Maghrib.
 *
 *  Replaces the Apr-16 single-notification scheme where the adhan fired
 *  `reminderMinutes` early — adhan announces prayer ENTRY, not preparation,
 *  so the cue and the sound are now separate.
 *
 *  `times` contains the masjid timetable (jama'ah) times — schedules relative
 *  to these. Pass `reminderMinutes = 0` to suppress reminders entirely.
 */
export async function schedulePrayerReminders(
  times: PrayerTimesData,
  reminderMinutes: number = 15,
): Promise<void> {
  if (Platform.OS === 'web') return;

  // Sweep any prior schedule (includes legacy `prayer-{name}` identifiers
  // from the single-notification scheme — see cancelPrayerReminders).
  await cancelPrayerReminders();

  const playAdhan = await getPlayAdhan();

  const now = new Date();
  const prayers: PrayerName[] = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

  for (const prayer of prayers) {
    const jamaah = times[prayer];
    const isMaghrib = prayer === 'maghrib';

    // ── Silent reminder (non-Maghrib only, opt-in via reminderMinutes > 0) ──
    if (!isMaghrib && reminderMinutes > 0) {
      const reminderAt = new Date(jamaah.getTime() - reminderMinutes * 60 * 1000);
      if (reminderAt > now) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `${PRAYER_LABELS[prayer].en} — ${PRAYER_LABELS[prayer].ar}`,
              body: `Jamāʿah in ${reminderMinutes} minutes`,
              sound: 'default',
              // timeSensitive lets the reminder break through Focus (incl.
              // Sleep Focus at Fajr). The user opted in by setting a non-
              // zero reminder lead; that's intent. 'critical' would require
              // an Apple entitlement we don't have.
              interruptionLevel: 'timeSensitive',
              data: { type: 'prayer_reminder', prayer },
              ...(Platform.OS === 'android' && {
                channelId: 'prayer-reminders-v2',
              }),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: reminderAt,
            },
            identifier: `prayer-reminder-${prayer}`,
          });
        } catch (err) {
          Sentry.captureException(err, { extra: { context: 'schedule prayer reminder', prayer } });
        }
      }
    }

    // ── Adhan at jama'ah (all five prayers, opt-out via playAdhan toggle) ──
    if (playAdhan && jamaah > now) {
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `${PRAYER_LABELS[prayer].en} — ${PRAYER_LABELS[prayer].ar}`,
            body: `${PRAYER_LABELS[prayer].ar} — Prayer time has entered`,
            sound: 'adhan.wav',
            interruptionLevel: 'timeSensitive',
            data: { type: 'prayer_athan', prayer },
            ...(Platform.OS === 'android' && {
              channelId: 'prayer-athan-v2',
            }),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: jamaah,
          },
          identifier: `prayer-athan-${prayer}`,
        });
      } catch (err) {
        Sentry.captureException(err, { extra: { context: 'schedule prayer adhan', prayer } });
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
  callback: (notification: Notifications.Notification) => void,
) {
  return Notifications.addNotificationReceivedListener(callback);
}

/** Listen for notification interactions (user tapped a notification) */
export function addNotificationResponseListener(
  callback: (response: Notifications.NotificationResponse) => void,
) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

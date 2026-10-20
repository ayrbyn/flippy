import AsyncStorage from '@react-native-async-storage/async-storage';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

const STORAGE_KEY = 'flippy_reminder_settings';
const NOTIFICATION_ID = 'flippy-daily-reminder';
const CHANNEL_ID = 'reminders';

export type ReminderSettings = {
  enabled: boolean;
  hour: number;
  minute: number;
};

export type ScheduleResult = 'ok' | 'denied' | 'unavailable' | 'error';

export const DEFAULT_SETTINGS: ReminderSettings = {
  enabled: false,
  hour: 19,
  minute: 0,
};

// expo-notifications dimuat secara lazy dan dibungkus try/catch.
// Kalau modul native-nya tidak ada di Expo Go, aplikasi tidak crash:
// fitur pengingat saja yang dinonaktifkan.
let cached: NotificationsModule | null | undefined;

function getNotifications(): NotificationsModule | null {
  if (cached !== undefined) {
    return cached;
  }

  // The SDK 57 Android Expo Go runtime may not include the topic subscription
  // native module imported by expo-notifications. Do not load the package in
  // that runtime; local reminders remain available in a development build.
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    cached = null;
    return cached;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-notifications') as NotificationsModule;
    mod.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    cached = mod;
  } catch (_e) {
    cached = null;
  }
  return cached;
}

export function isRemindersAvailable(): boolean {
  return getNotifications() !== null;
}

export async function loadSettings(): Promise<ReminderSettings> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      enabled: parsed.enabled === true,
      hour: typeof parsed.hour === 'number' ? parsed.hour : DEFAULT_SETTINGS.hour,
      minute: typeof parsed.minute === 'number' ? parsed.minute : DEFAULT_SETTINGS.minute,
    };
  } catch (_e) {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: ReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (_e) {
    // abaikan: pengaturan gagal disimpan tidak boleh merusak aplikasi
  }
}

async function prepareChannel(Notifications: NotificationsModule): Promise<void> {
  // Android 8 ke atas wajib punya channel sebelum meminta izin atau menjadwalkan
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Pengingat belajar',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
}

async function ensurePermission(Notifications: NotificationsModule): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function scheduleReminder(
  hour: number,
  minute: number
): Promise<ScheduleResult> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    await prepareChannel(Notifications);

    const allowed = await ensurePermission(Notifications);
    if (!allowed) return 'denied';

    try {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch (_e) {
      // belum ada jadwal sebelumnya, tidak masalah
    }

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_ID,
      content: {
        title: 'Waktunya belajar di Flippy',
        body: 'Ada kata yang menunggu diulang. Yuk latihan sebentar.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: CHANNEL_ID,
      },
    });

    await saveSettings({ enabled: true, hour, minute });
    return 'ok';
  } catch (_e) {
    return 'error';
  }
}

export async function cancelReminder(hour: number, minute: number): Promise<void> {
  const Notifications = getNotifications();
  if (Notifications) {
    try {
      await Notifications.cancelScheduledNotificationAsync(NOTIFICATION_ID);
    } catch (_e) {
      // abaikan
    }
  }
  await saveSettings({ enabled: false, hour, minute });
}

// Untuk uji coba: notifikasi muncul 5 detik lagi
export async function sendTestNotification(): Promise<ScheduleResult> {
  const Notifications = getNotifications();
  if (!Notifications) return 'unavailable';

  try {
    await prepareChannel(Notifications);

    const allowed = await ensurePermission(Notifications);
    if (!allowed) return 'denied';

    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Tes pengingat Flippy',
        body: 'Kalau Anda melihat ini, notifikasi berjalan dengan baik.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 5,
        channelId: CHANNEL_ID,
      },
    });
    return 'ok';
  } catch (_e) {
    return 'error';
  }
}

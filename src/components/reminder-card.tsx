import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import {
  cancelReminder,
  DEFAULT_SETTINGS,
  isRemindersAvailable,
  loadSettings,
  ReminderSettings,
  saveSettings,
  scheduleReminder,
  ScheduleResult,
  sendTestNotification,
} from '../lib/reminders';
import { Palette } from '../constants/theme';

const HOUR_OPTIONS = [7, 12, 19, 21];

function formatTime(hour: number, minute: number): string {
  return String(hour).padStart(2, '0') + '.' + String(minute).padStart(2, '0');
}

function messageFor(result: ScheduleResult): string | null {
  if (result === 'denied') {
    return 'Izin notifikasi ditolak. Aktifkan lewat pengaturan HP lalu coba lagi.';
  }
  if (result === 'unavailable') {
    return 'Notifikasi belum tersedia di Expo Go ini.';
  }
  if (result === 'error') {
    return 'Gagal mengatur pengingat. Coba lagi.';
  }
  return null;
}

export default function ReminderCard() {
  const [available] = useState(() => isRemindersAvailable());
  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_SETTINGS);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  if (!available) {
    return (
      <View style={styles.card}>
        <Text style={styles.label}>Pengingat harian</Text>
        <Text style={styles.status}>Belum tersedia</Text>
        <Text style={styles.message}>
          Modul notifikasi tidak ditemukan di Expo Go ini. Pengingat akan aktif
          di aplikasi hasil build.
        </Text>
      </View>
    );
  }

  async function handleToggle(value: boolean) {
    setBusy(true);
    setMessage(null);

    if (value) {
      const result = await scheduleReminder(settings.hour, settings.minute);
      if (result === 'ok') {
        setSettings({ ...settings, enabled: true });
      } else {
        setMessage(messageFor(result));
      }
    } else {
      await cancelReminder(settings.hour, settings.minute);
      setSettings({ ...settings, enabled: false });
    }

    setBusy(false);
  }

  async function handlePickHour(hour: number) {
    if (hour === settings.hour || busy) return;
    setMessage(null);

    if (settings.enabled) {
      setBusy(true);
      const result = await scheduleReminder(hour, 0);
      if (result === 'ok') {
        setSettings({ enabled: true, hour, minute: 0 });
      } else {
        setMessage(messageFor(result));
      }
      setBusy(false);
    } else {
      const next = { enabled: false, hour, minute: 0 };
      setSettings(next);
      await saveSettings(next);
    }
  }

  async function handleTest() {
    setBusy(true);
    setMessage(null);
    const result = await sendTestNotification();
    if (result === 'ok') {
      setMessage('Tes dikirim. Notifikasi akan muncul sekitar 5 detik lagi. Boleh tutup aplikasi dulu.');
    } else {
      setMessage(messageFor(result));
    }
    setBusy(false);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.label}>Pengingat harian</Text>
          <Text style={styles.status}>
            {settings.enabled
              ? 'Aktif setiap hari pukul ' + formatTime(settings.hour, settings.minute)
              : 'Nonaktif'}
          </Text>
        </View>
        <Switch value={settings.enabled} onValueChange={handleToggle} disabled={busy} />
      </View>

      <Text style={styles.subLabel}>Jam pengingat</Text>
      <View style={styles.row}>
        {HOUR_OPTIONS.map((hour) => {
          const selected = settings.hour === hour;
          return (
            <Pressable
              key={hour}
              onPress={() => handlePickHour(hour)}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {formatTime(hour, 0)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {message ? <Text style={styles.message}>{message}</Text> : null}

      <Pressable onPress={handleTest} disabled={busy}>
        <Text style={styles.testLink}>Kirim notifikasi tes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 0,
    borderRadius: 22,
    padding: 16,
    backgroundColor: Palette.white,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    paddingRight: 12,
  },
  label: {
    fontSize: 13,
    color: Palette.royalBlue,
    marginBottom: 4,
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
    color: Palette.charcoalBlack,
  },
  subLabel: {
    fontSize: 13,
    color: Palette.charcoalBlack,
    marginTop: 14,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 0,
    borderRadius: 15,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: Palette.white,
  },
  chipSelected: {
    backgroundColor: Palette.limeGreen,
  },
  chipText: {
    fontSize: 14,
    color: Palette.charcoalBlack,
  },
  chipTextSelected: {
    color: Palette.charcoalBlack,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: Palette.royalBlue,
    marginTop: 12,
  },
  testLink: {
    fontSize: 14,
    color: Palette.royalBlue,
    marginTop: 14,
  },
});

import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  DimensionValue,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateCourseForm from '../../components/create-course-form';
import PracticeSession from '../../components/practice-session';
import ReminderCard from '../../components/reminder-card';
import { useAuth } from '../../lib/auth';
import { useCourses } from '../../lib/courses';
import { getLanguageName, getLevelName } from '../../lib/languages';
import { countDueWords, countWordsAddedToday } from '../../lib/practice';
import { useProfile } from '../../lib/profile';
import { supabase } from '../../lib/supabase';
import { Fonts, Palette } from '../../constants/theme';

export default function HomeScreen() {
  const { session } = useAuth();
  const { courses, activeCourse, loading, error, refresh } = useCourses();
  const { profile, streak, refresh: refreshProfile } = useProfile();

  const [practicing, setPracticing] = useState(false);
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [todayCount, setTodayCount] = useState(0);

  const courseId = activeCourse?.id ?? null;

  const loadStats = useCallback(async () => {
    if (!courseId) return;
    try {
      const [due, today] = await Promise.all([
        countDueWords(courseId),
        countWordsAddedToday(courseId),
      ]);
      setDueCount(due);
      setTodayCount(today);
    } catch (_e) {
      setDueCount(null);
    }
  }, [courseId]);

  // Muat ulang angka setiap tab Home dibuka kembali
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Gagal memuat data: {error}</Text>
        <Pressable style={styles.button} onPress={refresh}>
          <Text style={styles.buttonText}>Coba lagi</Text>
        </Pressable>
      </View>
    );
  }

  // Pengguna baru belum punya kursus: tampilkan form pembuatan kursus
  if (courses.length === 0 || !activeCourse) {
    return <CreateCourseForm />;
  }

  if (practicing) {
    return (
      <PracticeSession
        onExit={() => {
          setPracticing(false);
          loadStats();
          refreshProfile();
        }}
      />
    );
  }

  const goal = activeCourse.daily_word_goal;
  const percent = Math.min(100, Math.round((todayCount / goal) * 100));
  const canPractice = dueCount !== null && dueCount > 0;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.headingRow}>
        <View>
          <Text style={styles.kicker}>JURNAL BELAJAR  *</Text>
          <Text style={styles.title}>Halo, learner!</Text>
          <Text style={styles.email}>{session?.user.email}</Text>
        </View>
        <Text style={styles.doodle}>~</Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{profile ? profile.total_xp : 0}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Hari beruntun</Text>
        </View>
      </View>

      <View style={[styles.card, styles.courseCard]}>
        <Text style={styles.cardLabel}>Kursus aktif</Text>
        <Text style={styles.cardTitle}>
          {getLanguageName(activeCourse.target_language)}
        </Text>
        <Text style={styles.cardText}>
          Dijelaskan dalam bahasa {getLanguageName(activeCourse.explanation_language)}
        </Text>
        <Text style={styles.cardText}>
          Level: {getLevelName(activeCourse.level)}
        </Text>
      </View>

      <View style={[styles.card, styles.goalCard]}>
        <Text style={styles.cardLabel}>Target kata baru hari ini</Text>
        <Text style={styles.goalText}>
          {todayCount} / {goal} kata
        </Text>
        <View style={styles.barBackground}>
          <View
            style={[styles.barFill, { width: (percent + '%') as DimensionValue }]}
          />
        </View>
      </View>

      <View style={[styles.card, styles.practiceCard]}>
        <Text style={styles.cardLabel}>Latihan harian</Text>
        <Text style={styles.cardText}>
          {dueCount === null
            ? 'Memuat...'
            : dueCount > 0
              ? dueCount + ' kata siap diulang'
              : 'Belum ada kata yang perlu diulang'}
        </Text>
        <Pressable
          style={[styles.button, styles.practiceButton, !canPractice && styles.buttonDisabled]}
          onPress={() => setPracticing(true)}
          disabled={!canPractice}
        >
          <Text style={styles.buttonText}>Mulai latihan</Text>
        </Pressable>
      </View>

      <ReminderCard />

      <Pressable
        style={[styles.button, styles.logout]}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>Keluar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  container: {
    padding: 22,
    paddingTop: 62,
    paddingBottom: 112,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Palette.paper,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    transform: [{ rotate: '-2deg' }],
  },
  headingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  kicker: {
    color: Palette.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  doodle: {
    fontSize: 38,
    color: '#8A70C8',
    transform: [{ rotate: '12deg' }],
  },
  email: {
    fontSize: 14,
    color: Palette.muted,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 18,
    padding: 14,
    backgroundColor: Palette.blue,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
  },
  statLabel: {
    fontSize: 13,
    color: Palette.ink,
    marginTop: 2,
  },
  card: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 16,
    padding: 16,
    backgroundColor: Palette.paperAlt,
    marginBottom: 16,
    transform: [{ rotate: '-0.4deg' }],
  },
  courseCard: { backgroundColor: Palette.lavender },
  goalCard: { backgroundColor: Palette.yellow, transform: [{ rotate: '0.4deg' }] },
  practiceCard: { backgroundColor: Palette.sage, transform: [{ rotate: '-0.2deg' }] },
  cardLabel: {
    fontSize: 13,
    color: Palette.muted,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: Palette.ink,
    marginTop: 2,
  },
  goalText: {
    fontSize: 20,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    marginBottom: 10,
  },
  barBackground: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E9DFD0',
    borderWidth: 1,
    borderColor: Palette.ink,
    overflow: 'hidden',
  },
  barFill: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8CA97D',
  },
  errorText: {
    fontSize: 15,
    color: Palette.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: Palette.yellow,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  practiceButton: {
    marginTop: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  logout: {
    backgroundColor: Palette.coral,
    marginTop: 8,
  },
  buttonText: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
  },
});

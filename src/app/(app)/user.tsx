import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateCourseForm from '../../components/create-course-form';
import { Palette } from '../../constants/theme';
import { useAuth } from '../../lib/auth';
import { Course, useCourses } from '../../lib/courses';
import { getLanguageName, getLevelName } from '../../lib/languages';
import { useProfile } from '../../lib/profile';
import { supabase } from '../../lib/supabase';

type AccountProgress = { totalWords: number; memorizedWords: number; todayWords: number };

function localDayStart() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString();
}

function CourseNote({ course, active, onPress }: { course: Course; active: boolean; onPress?: () => void }) {
  const contents = (
    <>
      <Text style={styles.courseName}>{getLanguageName(course.target_language)}</Text>
      <Text style={styles.courseDetail}>Arti dalam {getLanguageName(course.explanation_language)}</Text>
      <View style={styles.courseFooter}>
        <Text style={styles.courseLevel}>{getLevelName(course.level)}</Text>
        {active ? <Text style={styles.activeLabel}>AKTIF</Text> : <Text style={styles.tapHint}>Ketuk untuk pindah</Text>}
      </View>
    </>
  );
  const cardStyle = [styles.courseNote, active ? styles.activeCourse : styles.otherCourse];

  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={`Pilih bahasa ${getLanguageName(course.target_language)}`} onPress={onPress} style={cardStyle}>
      {contents}
    </Pressable>
  ) : (
    <View style={cardStyle}>{contents}</View>
  );
}

export default function UserScreen() {
  const { session } = useAuth();
  const { courses, activeCourse, setActiveCourse } = useCourses();
  const { profile, streak, refresh: refreshProfile } = useProfile();
  const [progress, setProgress] = useState<AccountProgress>({ totalWords: 0, memorizedWords: 0, todayWords: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [courseToSwitch, setCourseToSwitch] = useState<Course | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const loadProgress = useCallback(async () => {
    const words = supabase.from('user_words');
    const [all, memorized, today] = await Promise.all([
      words.select('id', { count: 'exact', head: true }),
      words.select('id', { count: 'exact', head: true }).eq('stage', 'memorized'),
      words.select('id', { count: 'exact', head: true }).gte('created_at', localDayStart()),
    ]);
    const queryError = all.error ?? memorized.error ?? today.error;
    if (queryError) throw new Error(queryError.message);
    setProgress({
      totalWords: all.count ?? 0,
      memorizedWords: memorized.count ?? 0,
      todayWords: today.count ?? 0,
    });
    setProgressError(null);
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([loadProgress(), refreshProfile()]);
    } catch (error) {
      setProgressError(error instanceof Error ? error.message : 'Progres akun gagal dimuat.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadProgress, refreshProfile]);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  async function handleLogout() {
    setLoggingOut(true);
    setLogoutError(null);
    const { error } = await supabase.auth.signOut();
    if (error) {
      setLogoutError(error.message);
      setLoggingOut(false);
    }
    // AuthProvider akan mengalihkan sesi yang sudah keluar ke halaman login.
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Palette.ink} /></View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.ink} />}
      >
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={styles.kicker}>HALAMAN PEMILIK JURNAL</Text>
            <Text style={styles.title}>Tentang saya</Text>
          </View>
        </View>

        <View style={styles.accountCard}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{(session?.user.email?.[0] ?? 'U').toUpperCase()}</Text></View>
          <View style={styles.accountCopy}>
            <Text style={styles.accountLabel}>AKUN FLIPPY</Text>
            <Text selectable style={styles.email}>{session?.user.email ?? 'Email tidak tersedia'}</Text>
            <Text style={styles.joined}>Bergabung {session?.user.created_at ? new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(session.user.created_at)) : 'di Flippy'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Progres akun</Text>
        </View>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.xpCard]}>
            <Text style={styles.statValue}>{profile?.total_xp ?? 0}</Text>
            <Text style={styles.statLabel}>XP terkumpul</Text>
          </View>
          <View style={[styles.statCard, styles.streakCard]}>
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>hari beruntun</Text>
          </View>
        </View>
        <View style={styles.progressCard}>
          <Text style={styles.cardLabel}>Perjalanan kosakata</Text>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{progress.totalWords}</Text>
              <Text style={styles.progressLabel}>semua kata</Text>
            </View>
            <View style={styles.verticalRule} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{progress.memorizedWords}</Text>
              <Text style={styles.progressLabel}>sudah hafal</Text>
            </View>
            <View style={styles.verticalRule} />
            <View style={styles.progressItem}>
              <Text style={styles.progressNumber}>{progress.todayWords}</Text>
              <Text style={styles.progressLabel}>ditambah hari ini</Text>
            </View>
          </View>
          {progressError ? <Text style={styles.errorText}>{progressError}</Text> : null}
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Bahasa yang kupelajari</Text>
        </View>
        {courses.length ? (
          <View style={styles.courseList}>
            {courses.map((course) => (
              <CourseNote
                key={course.id}
                course={course}
                active={course.id === activeCourse?.id}
                onPress={courses.length > 1 && course.id !== activeCourse?.id ? () => setCourseToSwitch(course) : undefined}
              />
            ))}
          </View>
        ) : <Text style={styles.emptyCourses}>Belum ada kursus. Tambahkan bahasa pertamamu di sini.</Text>}
        <Pressable accessibilityRole="button" onPress={() => setShowCourseForm(true)} style={styles.addButton}>
          <Text style={styles.addButtonText}>+ Tambah kursus / bahasa</Text>
        </Pressable>

        <View style={styles.logoutSection}>
          <Text style={styles.logoutHint}>Sesi belajar selesai untuk hari ini?</Text>
          {logoutError ? <Text style={styles.errorText}>{logoutError}</Text> : null}
          <Pressable accessibilityRole="button" onPress={handleLogout} disabled={loggingOut} style={[styles.logoutButton, loggingOut && styles.disabled]}>
            {loggingOut ? <ActivityIndicator color={Palette.ink} /> : <Text style={styles.logoutText}>Keluar dari akun</Text>}
          </Pressable>
        </View>
      </ScrollView>

      <Modal visible={!!courseToSwitch} transparent animationType="fade" onRequestClose={() => setCourseToSwitch(null)}>
        <View style={styles.confirmRoot}>
          <Pressable accessibilityLabel="Tutup konfirmasi" style={styles.confirmBackdrop} onPress={() => setCourseToSwitch(null)} />
          <View style={styles.confirmCard}>
            <Text style={styles.confirmTitle}>Ganti halaman belajar?</Text>
            <Text style={styles.confirmCopy}>
              Apakah kamu ingin pindah ke bahasa {courseToSwitch ? getLanguageName(courseToSwitch.target_language) : ''}?
            </Text>
            <View style={styles.confirmActions}>
              <Pressable accessibilityRole="button" onPress={() => setCourseToSwitch(null)} style={styles.noButton}>
                <Text style={styles.noText}>Tidak</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (courseToSwitch) setActiveCourse(courseToSwitch.id);
                  setCourseToSwitch(null);
                }}
                style={styles.yesButton}
              >
                <Text style={styles.yesText}>Ya, pindah</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCourseForm} animationType="slide" onRequestClose={() => setShowCourseForm(false)}>
        <View style={styles.modalRoot}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Kursus baru</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Tutup formulir" onPress={() => setShowCourseForm(false)} style={styles.closeButton}>
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>
          <CreateCourseForm additional onCreated={() => setShowCourseForm(false)} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.background },
  content: { paddingHorizontal: 20, paddingTop: 76, paddingBottom: 124 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headingCopy: { flexShrink: 1 },
  kicker: { color: Palette.ink, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  title: { color: Palette.ink, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 17, borderRadius: 22, backgroundColor: Palette.white },
  avatar: { width: 58, height: 58, borderRadius: 19, backgroundColor: Palette.mainGreen, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: '900', color: Palette.charcoalBlack },
  accountCopy: { flex: 1, minWidth: 0, marginLeft: 14 },
  accountLabel: { color: Palette.ink, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  email: { color: Palette.ink, fontSize: 15, fontWeight: '700', marginTop: 4 },
  joined: { color: Palette.ink, fontSize: 12, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  sectionTitle: { color: Palette.ink, fontSize: 24, lineHeight: 30, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 11 },
  statCard: { flex: 1, minHeight: 94, borderRadius: 20, alignItems: 'center', justifyContent: 'center', padding: 12 },
  xpCard: { backgroundColor: Palette.yellow },
  streakCard: { backgroundColor: Palette.primarySoft },
  statValue: { color: Palette.ink, fontSize: 31, fontWeight: '800' },
  statLabel: { color: Palette.ink, fontSize: 12, fontWeight: '600', marginTop: 1, textAlign: 'center' },
  progressCard: { marginTop: 12, padding: 17, borderRadius: 20, backgroundColor: Palette.white },
  cardLabel: { color: Palette.ink, fontSize: 12, fontWeight: '700', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressItem: { flex: 1, alignItems: 'center' },
  progressNumber: { color: Palette.ink, fontSize: 27, fontWeight: '800' },
  progressLabel: { color: Palette.ink, fontSize: 10, fontWeight: '600', textAlign: 'center', marginTop: 2 },
  verticalRule: { width: 1, height: 35, backgroundColor: Palette.lightGreen },
  courseList: { gap: 10 },
  courseNote: { borderRadius: 20, padding: 15, paddingTop: 19, overflow: 'hidden' },
  activeCourse: { backgroundColor: Palette.green },
  otherCourse: { backgroundColor: Palette.white },
  courseName: { color: Palette.ink, fontSize: 22, fontWeight: '800' },
  courseDetail: { color: Palette.ink, fontSize: 13, marginTop: 4 },
  courseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  courseLevel: { color: Palette.ink, fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  activeLabel: { color: Palette.ink, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  tapHint: { color: Palette.ink, fontSize: 10, fontWeight: '600' },
  emptyCourses: { color: Palette.ink, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  addButton: { minHeight: 52, marginTop: 12, borderRadius: 18, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  addButtonText: { color: Palette.primary, fontSize: 15, fontWeight: '800' },
  logoutSection: { marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderTopColor: Palette.lightGreen },
  logoutHint: { color: Palette.ink, fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 10 },
  logoutButton: { minHeight: 52, borderRadius: 18, backgroundColor: Palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: Palette.ink, fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.6 },
  errorText: { color: Palette.berryPink, fontSize: 12, lineHeight: 17, marginTop: 8 },
  modalRoot: { flex: 1, backgroundColor: Palette.background, paddingTop: 55 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { color: Palette.ink, fontSize: 26, fontWeight: '800' },
  closeButton: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 15, backgroundColor: Palette.lightGreen },
  closeText: { color: Palette.berryPink, fontSize: 13, fontWeight: '800' },
  confirmRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  confirmBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(20,25,40,0.48)' },
  confirmCard: { width: '100%', maxWidth: 380, padding: 23, borderRadius: 24, backgroundColor: Palette.white, alignItems: 'center' },
  confirmTitle: { color: Palette.ink, fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 5 },
  confirmCopy: { color: Palette.ink, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 6 },
  confirmActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 21 },
  noButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: Palette.lightGreen, alignItems: 'center', justifyContent: 'center' },
  noText: { color: Palette.charcoalBlack, fontSize: 14, fontWeight: '900' },
  yesButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center' },
  yesText: { color: Palette.white, fontSize: 14, fontWeight: '800' },
});

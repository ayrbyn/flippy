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
import { Fonts, Journal, Palette } from '../../constants/theme';
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
      <View style={styles.noteTape} />
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
          <Text accessibilityElementsHidden style={styles.doodle}>~ ✳</Text>
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
          <Text style={styles.sectionDoodle}>* catatanmu</Text>
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
          <Text style={styles.countNote}>{courses.length} kursus</Text>
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
            <Text style={styles.confirmDoodle}>✳</Text>
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
  root: { flex: 1, backgroundColor: Palette.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Palette.paper },
  content: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 124 },
  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  headingCopy: { flexShrink: 1 },
  kicker: { color: Palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5, marginBottom: 3 },
  title: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 36, fontWeight: '700' },
  doodle: { color: Journal.doodle, fontSize: 26, transform: [{ rotate: '12deg' }] },
  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 17, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 18, backgroundColor: Palette.paperAlt, transform: [{ rotate: '-0.3deg' }] },
  avatar: { width: 55, height: 55, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 18, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-4deg' }] },
  avatarText: { fontFamily: Fonts.handwritten, fontSize: 29, fontWeight: '700', color: Palette.ink },
  accountCopy: { flex: 1, minWidth: 0, marginLeft: 14 },
  accountLabel: { color: Palette.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  email: { color: Palette.ink, fontSize: 15, fontWeight: '600', marginTop: 4 },
  joined: { color: Palette.muted, fontSize: 12, marginTop: 4 },
  sectionHeading: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 25, marginBottom: 10 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 25, fontWeight: '700' },
  sectionDoodle: { color: Palette.muted, fontFamily: Fonts.handwritten, fontSize: 15, transform: [{ rotate: '-4deg' }] },
  countNote: { color: Palette.muted, fontSize: 12 },
  statsRow: { flexDirection: 'row', gap: 11 },
  statCard: { flex: 1, minHeight: 94, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 17, alignItems: 'center', justifyContent: 'center', padding: 12 },
  xpCard: { backgroundColor: Palette.yellow, transform: [{ rotate: '-0.5deg' }] },
  streakCard: { backgroundColor: Palette.coral, transform: [{ rotate: '0.5deg' }] },
  statValue: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 31, fontWeight: '700' },
  statLabel: { color: Palette.ink, fontSize: 12, marginTop: 1, textAlign: 'center' },
  progressCard: { marginTop: 12, padding: 15, borderWidth: 1.3, borderColor: Palette.ink, borderRadius: 17, backgroundColor: Palette.blue },
  cardLabel: { color: Palette.muted, fontSize: 12, fontWeight: '700', marginBottom: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressItem: { flex: 1, alignItems: 'center' },
  progressNumber: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 27, fontWeight: '700' },
  progressLabel: { color: Palette.ink, fontSize: 10, textAlign: 'center', marginTop: 2 },
  verticalRule: { width: 1, height: 35, backgroundColor: 'rgba(37,37,37,0.25)' },
  courseList: { gap: 10 },
  courseNote: { borderWidth: 1.3, borderColor: Palette.ink, borderRadius: 15, padding: 14, paddingTop: 18, overflow: 'hidden' },
  activeCourse: { backgroundColor: Palette.sage, transform: [{ rotate: '-0.3deg' }] },
  otherCourse: { backgroundColor: Palette.paperAlt, transform: [{ rotate: '0.3deg' }] },
  noteTape: { position: 'absolute', top: -2, left: '39%', width: 76, height: 14, backgroundColor: 'rgba(255,255,255,0.54)', transform: [{ rotate: '-3deg' }] },
  courseName: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 23, fontWeight: '700' },
  courseDetail: { color: Palette.muted, fontSize: 13, marginTop: 2 },
  courseFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  courseLevel: { color: Palette.ink, fontSize: 11, textTransform: 'capitalize' },
  activeLabel: { color: Palette.success, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  tapHint: { color: Palette.muted, fontSize: 10, fontWeight: '600' },
  emptyCourses: { color: Palette.muted, fontSize: 14, lineHeight: 21, marginBottom: 10 },
  addButton: { minHeight: 52, marginTop: 12, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 15, backgroundColor: Palette.lavender, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '0.4deg' }] },
  addButtonText: { color: Palette.ink, fontSize: 15, fontWeight: '700' },
  logoutSection: { marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderTopColor: Palette.line },
  logoutHint: { color: Palette.muted, fontFamily: Fonts.handwritten, fontSize: 17, textAlign: 'center', marginBottom: 10 },
  logoutButton: { minHeight: 52, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 15, backgroundColor: Palette.coral, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: Palette.ink, fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.6 },
  errorText: { color: Palette.error, fontSize: 12, lineHeight: 17, marginTop: 8 },
  modalRoot: { flex: 1, backgroundColor: Palette.paper, paddingTop: 55 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  modalTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 27, fontWeight: '700' },
  closeButton: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: Palette.ink, borderRadius: 12, backgroundColor: Palette.paperAlt },
  closeText: { color: Palette.ink, fontSize: 13, fontWeight: '600' },
  confirmRoot: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 22 },
  confirmBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,37,37,0.48)' },
  confirmCard: { width: '100%', maxWidth: 380, padding: 23, borderWidth: 1.6, borderColor: Palette.ink, borderRadius: 21, backgroundColor: Palette.paper, alignItems: 'center', transform: [{ rotate: '-0.4deg' }] },
  confirmDoodle: { color: Journal.doodle, fontSize: 27, transform: [{ rotate: '12deg' }] },
  confirmTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 26, fontWeight: '700', textAlign: 'center', marginTop: 5 },
  confirmCopy: { color: Palette.muted, fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 6 },
  confirmActions: { flexDirection: 'row', width: '100%', gap: 10, marginTop: 21 },
  noButton: { flex: 1, minHeight: 48, borderWidth: 1.3, borderColor: Palette.ink, borderRadius: 14, backgroundColor: Palette.paperAlt, alignItems: 'center', justifyContent: 'center' },
  noText: { color: Palette.ink, fontSize: 14, fontWeight: '700' },
  yesButton: { flex: 1, minHeight: 48, borderWidth: 1.3, borderColor: Palette.ink, borderRadius: 14, backgroundColor: Palette.yellow, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '0.7deg' }] },
  yesText: { color: Palette.ink, fontSize: 14, fontWeight: '700' },
});

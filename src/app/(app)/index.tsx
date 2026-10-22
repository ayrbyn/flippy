import { useFocusEffect } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  DimensionValue,
  Modal,
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import CreateCourseForm from '../../components/create-course-form';
import PracticeSession from '../../components/practice-session';
import PracticeScopePicker from '../../components/practice-scope-picker';
import ReminderCard from '../../components/reminder-card';
import FlippyMascot from '../../components/flippy-mascot';
import { useAuth } from '../../lib/auth';
import { useCourses } from '../../lib/courses';
import { getLanguageName, getLevelName } from '../../lib/languages';
import { countPracticePool, countWordsAddedToday, PracticePoolCounts, PracticeScope } from '../../lib/practice';
import { useProfile } from '../../lib/profile';
import { Palette } from '../../constants/theme';

export default function HomeScreen() {
  const { session } = useAuth();
  const { courses, activeCourse, loading, error, refresh } = useCourses();
  const { profile, streak, refresh: refreshProfile } = useProfile();

  const [practicing, setPracticing] = useState(false);
  const [showScopePicker, setShowScopePicker] = useState(false);
  const [practiceScope, setPracticeScope] = useState<PracticeScope>('all_words');
  const [practiceCounts, setPracticeCounts] = useState<PracticePoolCounts | null>(null);
  const [todayCount, setTodayCount] = useState(0);
  const [shareVisible, setShareVisible] = useState(false);
  const [shareFormat, setShareFormat] = useState<'story' | 'square'>('story');
  const [sharingProgress, setSharingProgress] = useState(false);
  const shareCardRef = useRef<View>(null);

  const courseId = activeCourse?.id ?? null;

  const loadStats = useCallback(async () => {
    if (!courseId) return;
    try {
      const [pool, today] = await Promise.all([
        countPracticePool(courseId),
        countWordsAddedToday(courseId),
      ]);
      setPracticeCounts(pool);
      setTodayCount(today);
    } catch {
      setPracticeCounts(null);
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
        scope={practiceScope}
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
  const canPractice = practiceCounts !== null && practiceCounts.allWords > 0;

  async function handleShareProgress() {
    if (!shareCardRef.current || sharingProgress) return;
    if (Platform.OS === 'web') {
      Alert.alert('Bagikan progres', 'Berbagi gambar progres tersedia di aplikasi Android dan iOS.');
      return;
    }
    setSharingProgress(true);
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', result: 'tmpfile', quality: 1 });
      const available = await Sharing.isAvailableAsync();
      if (!available) throw new Error('Fitur berbagi tidak tersedia di perangkat ini.');
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Bagikan progres Flippy' });
    } catch (shareError) {
      Alert.alert('Belum bisa membagikan', shareError instanceof Error ? shareError.message : 'Kartu progres gagal dibagikan. Coba lagi.');
    } finally {
      setSharingProgress(false);
    }
  }

  return (
    <View style={styles.root}>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}><Text style={styles.brandMark}>∿</Text> FLIPPY</Text>
        <View style={styles.avatar}><Text style={styles.avatarText}>{(session?.user.email?.[0] ?? 'L').toUpperCase()}</Text></View>
      </View>
      <View style={styles.greeting}>
        <Text style={styles.kicker}>JURNAL BELAJAR</Text>
        <Text style={styles.title}>Halo, {session?.user.email?.split('@')[0] || 'learner'}!</Text>
        <Text style={styles.subtitle}>Lanjutkan perjalanan bahasa {getLanguageName(activeCourse.target_language)}mu.</Text>
      </View>

      <View style={styles.progressOverview}>
        <View style={styles.overviewStat}>
          <Text style={styles.statIcon}>✦</Text>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>hari beruntun</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.overviewStat}>
          <Text style={styles.statIcon}>◆</Text>
          <Text style={styles.statValue}>{profile ? profile.total_xp : 0}</Text>
          <Text style={styles.statLabel}>XP terkumpul</Text>
        </View>
      </View>

      <View style={[styles.card, styles.goalCard]}>
        <View style={styles.sectionHeading}>
          <View><Text style={styles.cardLabel}>TARGET KATA BARU HARI INI</Text><Text style={styles.cardTitle}>{todayCount} / {goal} kata</Text></View>
          <Text style={styles.goalIcon}>◎</Text>
        </View>
        <View style={styles.barBackground}>
          <View style={[styles.barFill, { width: (percent + '%') as DimensionValue }]} />
        </View>
        <Text style={styles.cardText}>{percent === 100 ? 'Target hari ini tercapai!' : 'Sedikit lagi, lanjutkan dengan satu kata baru.'}</Text>
      </View>

      <View style={[styles.card, styles.courseCard]}>
        <Text style={styles.cardLabel}>KURSUS AKTIF</Text>
        <Text style={styles.cardTitle}>{getLanguageName(activeCourse.target_language)}</Text>
        <Text style={styles.cardText}>
          Dijelaskan dalam {getLanguageName(activeCourse.explanation_language)} / {getLevelName(activeCourse.level)}
        </Text>
      </View>

      <View style={[styles.card, styles.practiceCard]}>
        <View style={styles.practiceHeader}>
          <View style={styles.practiceCopy}>
            <Text style={[styles.cardLabel, styles.practiceLabel]}>SIAP BELAJAR?</Text>
            <Text style={styles.practiceTitle}>Mulai latihan hari ini</Text>
          </View>
          <FlippyMascot size={76} style={styles.practiceMascot} />
        </View>
        <Text style={[styles.cardText, styles.practiceText]}>
          {practiceCounts === null
            ? 'Memuat koleksi katamu...'
            : practiceCounts.allWords > 0
              ? `${practiceCounts.newWords} kata baru / ${practiceCounts.allWords} kartu tersedia`
              : 'Tambahkan flashcard pertamamu untuk mulai'}
        </Text>
        <Pressable
          style={[styles.button, styles.practiceButton, !canPractice && styles.buttonDisabled]}
          onPress={() => setShowScopePicker(true)}
          disabled={!canPractice}
        >
          <Text style={styles.buttonText}>Mulai latihan  →</Text>
        </Pressable>
      </View>

      <Pressable accessibilityRole="button" onPress={() => setShareVisible(true)} style={styles.shareButton}>
        <Text style={styles.shareButtonText}>Bagikan progres</Text>
        <Text style={styles.shareArrow}>↗</Text>
      </Pressable>

      <ReminderCard />
    </ScrollView>
    <PracticeScopePicker
      visible={showScopePicker}
      counts={practiceCounts ?? { newWords: 0, allWords: 0 }}
      onCancel={() => setShowScopePicker(false)}
      onStart={(scope) => {
        setPracticeScope(scope);
        setShowScopePicker(false);
        setPracticing(true);
      }}
    />
    <Modal visible={shareVisible} transparent animationType="fade" onRequestClose={() => setShareVisible(false)}>
      <View style={styles.shareModalRoot}>
        <Pressable accessibilityLabel="Tutup preview progres" onPress={() => setShareVisible(false)} style={styles.shareBackdrop} />
        <View style={styles.shareSheet}>
          <View style={styles.shareModalHeader}>
            <View><Text style={styles.shareKicker}>KARTU PENCAPAIAN</Text><Text style={styles.shareTitle}>Progres belajarmu</Text></View>
            <Pressable accessibilityRole="button" onPress={() => setShareVisible(false)} style={styles.shareClose}><Text style={styles.shareCloseText}>×</Text></Pressable>
          </View>
          <View style={styles.formatRow}>
            <Pressable onPress={() => setShareFormat('story')} style={[styles.formatChip, shareFormat === 'story' && styles.formatChipActive]}><Text style={[styles.formatText, shareFormat === 'story' && styles.formatTextActive]}>Story 9:16</Text></Pressable>
            <Pressable onPress={() => setShareFormat('square')} style={[styles.formatChip, shareFormat === 'square' && styles.formatChipActive]}><Text style={[styles.formatText, shareFormat === 'square' && styles.formatTextActive]}>Feed 1:1</Text></Pressable>
          </View>
          <View style={styles.sharePreviewShell}>
            <View ref={shareCardRef} collapsable={false} style={[styles.shareCard, shareFormat === 'square' ? styles.shareSquare : styles.shareStory]}>
              <Text style={styles.shareBrand}><Text style={styles.shareBrandMark}>∿</Text> FLIPPY</Text>
              <View style={styles.shareCardCopy}>
                <Text style={styles.shareHeadline}>Small steps,{ '\n' }real progress.</Text>
                <Text style={styles.shareLanguage}>{getLanguageName(activeCourse.target_language)} JOURNEY</Text>
              </View>
              <View style={styles.shareStats}>
                <View style={styles.shareStat}><Text style={styles.shareValue}>{profile?.total_xp ?? 0}</Text><Text style={styles.shareLabel}>XP terkumpul</Text></View>
                <View style={styles.shareStat}><Text style={styles.shareValue}>{practiceCounts?.allWords ?? 0}</Text><Text style={styles.shareLabel}>kata dipelajari</Text></View>
                <View style={styles.shareStat}><Text style={styles.shareValue}>{streak}</Text><Text style={styles.shareLabel}>hari streak</Text></View>
              </View>
              <Text style={styles.shareDate}>{new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" disabled={sharingProgress} onPress={handleShareProgress} style={[styles.shareAction, sharingProgress && styles.buttonDisabled]}>
            {sharingProgress ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.shareActionText}>Bagikan kartu</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  scroll: { flex: 1, backgroundColor: Palette.background },
  container: { padding: 20, paddingTop: 24, paddingBottom: 112, maxWidth: 800, width: '100%', alignSelf: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Palette.background },
  errorText: { fontSize: 15, color: Palette.ink, textAlign: 'center', marginBottom: 16 },
  brandRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 },
  brand: { color: Palette.ink, fontSize: 17, fontWeight: '800', letterSpacing: 2 },
  brandMark: { color: Palette.primary, fontSize: 25, fontWeight: '900' },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: Palette.primary, fontSize: 16, fontWeight: '800' },
  greeting: { marginBottom: 22 },
  kicker: { color: Palette.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 7 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: Palette.ink },
  subtitle: { fontSize: 14, lineHeight: 20, color: Palette.secondary, marginTop: 5 },
  progressOverview: { flexDirection: 'row', alignItems: 'center', backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.primaryBorder, borderRadius: 22, paddingVertical: 16, marginBottom: 18 },
  overviewStat: { flex: 1, alignItems: 'center' },
  statIcon: { color: Palette.primary, fontSize: 16 },
  statValue: { fontSize: 27, lineHeight: 32, fontWeight: '800', color: Palette.ink, marginTop: 3 },
  statLabel: { fontSize: 12, fontWeight: '500', color: Palette.secondary, marginTop: 2 },
  statDivider: { width: 1, height: 48, backgroundColor: Palette.primaryBorder },
  card: { borderRadius: 22, padding: 18, marginBottom: 14 },
  goalCard: { backgroundColor: Palette.yellow },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardLabel: { fontSize: 10, color: Palette.secondary, fontWeight: '700', letterSpacing: 1.2, marginBottom: 7 },
  cardTitle: { fontSize: 22, lineHeight: 27, fontWeight: '800', color: Palette.ink },
  goalIcon: { fontSize: 25, color: Palette.primary },
  percent: { fontSize: 24, fontWeight: '900', color: Palette.charcoalBlack },
  barBackground: { height: 9, borderRadius: 8, backgroundColor: Palette.progressTrack, overflow: 'hidden', marginBottom: 10 },
  barFill: { height: 9, borderRadius: 8, backgroundColor: Palette.primary },
  cardText: { fontSize: 14, lineHeight: 20, color: Palette.charcoalBlack, marginTop: 8 },
  courseCard: { backgroundColor: Palette.primarySoft, borderWidth: 1, borderColor: Palette.primaryBorder },
  practiceCard: { backgroundColor: Palette.primary, borderRadius: 22 },
  practiceHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  practiceMascot: { marginLeft: 8, marginRight: -4, marginTop: -8 },
  practiceCopy: { flex: 1, minWidth: 0 },
  practiceTitle: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: Palette.white },
  practiceLabel: { color: Palette.white },
  practiceText: { color: Palette.white },
  button: { backgroundColor: Palette.white, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' },
  practiceButton: { marginTop: 16, alignSelf: 'flex-start', minWidth: 180 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Palette.primary, fontSize: 15, fontWeight: '800' },
  shareButton: { minHeight: 50, marginTop: -4, marginBottom: 14, borderRadius: 16, paddingHorizontal: 16, backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.primaryBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareButtonText: { color: Palette.primary, fontSize: 14, fontWeight: '700' },
  shareArrow: { color: Palette.primary, fontSize: 20, fontWeight: '700' },
  shareModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  shareBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(36,35,43,0.52)' },
  shareSheet: { width: '100%', maxWidth: 440, maxHeight: '94%', padding: 18, borderRadius: 26, backgroundColor: Palette.background },
  shareModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  shareKicker: { color: Palette.secondary, fontSize: 10, fontWeight: '800', letterSpacing: 1.3 },
  shareTitle: { color: Palette.ink, fontSize: 22, fontWeight: '800', marginTop: 3 },
  shareClose: { width: 38, height: 38, borderRadius: 19, backgroundColor: Palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  shareCloseText: { color: Palette.primary, fontSize: 25, lineHeight: 29 },
  formatRow: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 12 },
  formatChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14, backgroundColor: Palette.surface },
  formatChipActive: { backgroundColor: Palette.primarySoft },
  formatText: { color: Palette.secondary, fontSize: 12, fontWeight: '600' },
  formatTextActive: { color: Palette.primary, fontWeight: '800' },
  sharePreviewShell: { alignItems: 'center', justifyContent: 'center', maxHeight: 530, overflow: 'hidden' },
  shareCard: { overflow: 'hidden', borderRadius: 24, padding: 22, backgroundColor: Palette.primarySoft, justifyContent: 'space-between' },
  shareStory: { width: 270, height: 480 },
  shareSquare: { width: 300, height: 300 },
  shareBrand: { color: Palette.ink, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  shareBrandMark: { color: Palette.primary, fontSize: 18 },
  shareCardCopy: { flex: 1, justifyContent: 'center' },
  shareHeadline: { color: Palette.ink, fontSize: 30, lineHeight: 36, fontWeight: '800' },
  shareLanguage: { color: Palette.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.4, marginTop: 14 },
  shareStats: { gap: 8 },
  shareStat: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, backgroundColor: Palette.surface, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  shareValue: { color: Palette.primary, fontSize: 22, fontWeight: '800' },
  shareLabel: { color: Palette.secondary, fontSize: 12 },
  shareDate: { color: Palette.secondary, fontSize: 10, marginTop: 10 },
  shareAction: { minHeight: 50, borderRadius: 16, backgroundColor: Palette.primary, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  shareActionText: { color: Palette.white, fontSize: 15, fontWeight: '800' },
});

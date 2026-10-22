import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useCourses } from '../../lib/courses';
import { fetchWords, UserWord } from '../../lib/flashcards';
import { FlashcardPastels, Palette } from '../../constants/theme';
import FlippyMascot from '../../components/flippy-mascot';

type MonthAlbum = { key: string; title: string; words: UserWord[] };

function monthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthTitle(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

const albumArt = [Palette.albumLavender, Palette.albumYellow, Palette.albumMint, Palette.albumBlue, Palette.albumPeach];
const albumEmoji = ['📚', '🌱', '📷', '☁️', '🌸'];
function colorIndex(value: string, count: number) {
  return [...value].reduce((total, character) => total + character.charCodeAt(0), 0) % count;
}

function dayKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dayTitle(key: string): string {
  const [year, month, day] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day));
}

function WordGrid({ words, onSelect }: { words: UserWord[]; onSelect: (word: UserWord) => void }) {
  const { width } = useWindowDimensions();
  const tileWidth = (width - 56) / 2;

  return (
    <View style={styles.grid}>
      {words.map((word) => (
        <Pressable
          key={word.id}
          accessibilityRole="button"
          accessibilityLabel={`Buka flashcard ${word.word}`}
          onPress={() => onSelect(word)}
          style={[styles.wordTile, { width: tileWidth, backgroundColor: FlashcardPastels[colorIndex(word.id, FlashcardPastels.length)] }]}
        >
          <Text numberOfLines={2} style={styles.tileWord}>{word.word}</Text>
          <Text numberOfLines={1} style={styles.tileDefinition}>{word.definition}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FullFlashcard({ word, onClose }: { word: UserWord; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));

  const flip = () => {
    const next = !flipped;
    setFlipped(next);
    Animated.spring(rotation, { toValue: next ? 180 : 0, useNativeDriver: true, friction: 9, tension: 70 }).start();
  };

  const frontRotation = rotation.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotation = rotation.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable accessibilityLabel="Tutup kartu" style={styles.modalBackdrop} onPress={onClose} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalCaption}>FLASHCARD</Text>
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Tutup</Text>
            </Pressable>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={flipped ? `Balik ${word.word} ke depan` : `Lihat arti ${word.word}`} onPress={flip} style={styles.fullCardTouch}>
            <View style={styles.fullCardFrame}>
              <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[styles.fullCardFace, styles.fullCardFront, { backgroundColor: FlashcardPastels[colorIndex(word.id, FlashcardPastels.length)], transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}>
                <View style={styles.cardMascot}><FlippyMascot size={76} /></View>
                <Text style={[styles.modalLabel, styles.modalLabelFront]}>KATA</Text>
                <Text style={styles.fullWord}>{word.word}</Text>
                {word.reading ? <Text style={styles.fullReading}>{word.reading}</Text> : null}
                {word.part_of_speech ? <Text style={styles.fullBadge}>{word.part_of_speech}</Text> : null}
                <View style={[styles.fullRule, styles.fullRuleFront]} />
                <Text style={[styles.flipHint, styles.flipHintFront]}>Ketuk kartu untuk membalik</Text>
              </Animated.View>
              <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[styles.fullCardFace, styles.fullCardBack, { backgroundColor: FlashcardPastels[(colorIndex(word.id, FlashcardPastels.length) + 1) % FlashcardPastels.length], transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}>
                <Text style={styles.modalLabel}>ARTI & CONTOH</Text>
                <Text style={styles.fullDefinition}>{word.definition}</Text>
                <View style={styles.fullRule} />
                <Text style={styles.fullExample}>{word.example_sentence}</Text>
                {word.example_translation ? <Text style={styles.fullTranslation}>{word.example_translation}</Text> : null}
                {word.example_sentence_2 ? <Text style={styles.fullExampleSecondary}>{word.example_sentence_2}</Text> : null}
                {word.example_translation_2 ? <Text style={styles.fullTranslation}>{word.example_translation_2}</Text> : null}
                <Text style={styles.flipHint}>Ketuk kartu untuk kembali</Text>
              </Animated.View>
            </View>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

export default function AlbumsScreen() {
  const { activeCourse } = useCourses();
  const courseId = activeCourse?.id ?? null;
  const [words, setWords] = useState<UserWord[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [selectedWord, setSelectedWord] = useState<UserWord | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWords = useCallback(async () => {
    if (!courseId) {
      setWords([]);
      setLoading(false);
      return;
    }
    try {
      const result = await fetchWords(courseId);
      setWords(result);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kartu gagal dimuat.');
    }
    setLoading(false);
  }, [courseId]);

  useFocusEffect(useCallback(() => { loadWords(); }, [loadWords]));

  const albums = useMemo<MonthAlbum[]>(() => {
    const grouped = new Map<string, UserWord[]>();
    words.forEach((word) => {
      const key = monthKey(word.created_at);
      grouped.set(key, [...(grouped.get(key) ?? []), word]);
    });
    return Array.from(grouped.entries())
      .sort(([first], [second]) => second.localeCompare(first))
      .map(([key, data]) => ({ key, title: monthTitle(key), words: data }));
  }, [words]);

  const activeAlbum = albums.find((album) => album.key === selectedMonth) ?? null;
  const dateGroups = useMemo(() => {
    if (!activeAlbum) return [];
    const grouped = new Map<string, UserWord[]>();
    activeAlbum.words.forEach((word) => {
      const key = dayKey(word.created_at);
      grouped.set(key, [...(grouped.get(key) ?? []), word]);
    });
    return Array.from(grouped.entries())
      .sort(([first], [second]) => second.localeCompare(first))
      .map(([key, data]) => ({ key, title: dayTitle(key), words: data }));
  }, [activeAlbum]);

  async function refresh() {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  }

  if (!activeCourse) {
    return <View style={styles.center}><Text style={styles.emptyText}>Buat kursus dulu di tab Home.</Text></View>;
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={Palette.ink} /></View>;
  }

  return (
    <View style={styles.container}>
      {activeAlbum ? (
        <ScrollView
          contentContainerStyle={styles.detailContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={Palette.ink} />}
        >
          <Pressable accessibilityRole="button" onPress={() => setSelectedMonth(null)} style={styles.backButton}>
            <Text style={styles.backButtonText}>{'<'} Semua album</Text>
          </Pressable>
          <Text style={styles.title}>{activeAlbum.title}</Text>
          <Text style={styles.subtitle}>{activeAlbum.words.length} flashcard</Text>
          {dateGroups.map((group) => (
            <View key={group.key} style={styles.dateGroup}>
              <Text style={styles.dateHeading}>{group.title}</Text>
              <WordGrid words={group.words} onSelect={setSelectedWord} />
            </View>
          ))}
          {activeAlbum.words.length === 0 ? <Text style={styles.emptyText}>Belum ada flashcard di album ini.</Text> : null}
        </ScrollView>
      ) : (
        <FlatList
          data={albums}
          keyExtractor={(album) => album.key}
          numColumns={2}
          columnWrapperStyle={styles.albumRow}
          contentContainerStyle={styles.listContent}
          refreshing={refreshing}
          onRefresh={refresh}
          ListHeaderComponent={(
            <View style={styles.listHeader}>
              <Text style={styles.kicker}>KOLEKSI KOSAKATA</Text>
              <Text style={styles.title}>Album saya</Text>
              <Text style={styles.subtitle}>Kartu tersusun otomatis menurut bulan dibuat.</Text>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
          renderItem={({ item, index }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Buka album ${item.title}, ${item.words.length} kartu`} onPress={() => setSelectedMonth(item.key)} style={[styles.monthTile, { backgroundColor: index % 2 === 0 ? Palette.white : Palette.lightGreen }]}>
              <View style={[styles.albumArt, { backgroundColor: albumArt[index % albumArt.length] }]}>
                <View style={styles.albumSun} />
                <Text style={styles.albumEmoji}>{albumEmoji[index % albumEmoji.length]}</Text>
                <View style={styles.albumBookOne} />
                <View style={styles.albumBookTwo} />
                <Text style={styles.albumSparkle}>✦</Text>
                <View style={styles.albumMascot}><FlippyMascot size={58} /></View>
              </View>
              <Text numberOfLines={2} style={styles.monthTitle}>{item.title}</Text>
              <Text style={styles.monthCount}>{item.words.length} kartu</Text>
            </Pressable>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>{error ? 'Tarik untuk mencoba lagi.' : 'Belum ada kartu. Tambahkan kata lewat tab Kata; album bulan akan muncul otomatis.'}</Text>}
        />
      )}
      {selectedWord ? <FullFlashcard word={selectedWord} onClose={() => setSelectedWord(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Palette.background },
  listContent: { paddingHorizontal: 17, paddingTop: 60, paddingBottom: 120, flexGrow: 1 },
  listHeader: { marginHorizontal: 5, marginBottom: 18 },
  kicker: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
  title: { color: Palette.ink, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  subtitle: { color: Palette.charcoalBlack, fontSize: 15, lineHeight: 21, marginTop: 4 },
  albumRow: { justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  monthTile: { flex: 1, maxWidth: '49%', minHeight: 172, borderRadius: 20, padding: 11, justifyContent: 'space-between', backgroundColor: Palette.white, borderWidth: 1, borderColor: Palette.border },
  albumArt: { height: 104, width: '100%', borderRadius: 16, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  albumSun: { position: 'absolute', width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.55)', top: 12, right: 14 },
  albumEmoji: { fontSize: 42, zIndex: 2, marginTop: -10 },
  albumBookOne: { position: 'absolute', width: 74, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF', bottom: 17, left: 15, transform: [{ rotate: '-7deg' }] },
  albumBookTwo: { position: 'absolute', width: 58, height: 11, borderRadius: 6, backgroundColor: Palette.primaryBorder, bottom: 8, left: 23, transform: [{ rotate: '5deg' }] },
  albumSparkle: { position: 'absolute', color: Palette.primary, fontSize: 19, top: 10, left: 16 },
  albumMascot: { position: 'absolute', right: -3, bottom: -8 },
  monthTitle: { color: Palette.ink, fontSize: 16, fontWeight: '800', lineHeight: 20, marginTop: 8 },
  monthCount: { color: Palette.ink, fontSize: 12, fontWeight: '600', marginTop: 3 },
  emptyText: { color: Palette.ink, textAlign: 'center', lineHeight: 22, marginTop: 20, marginHorizontal: 12 },
  errorText: { color: Palette.ink, fontSize: 13, lineHeight: 19, marginTop: 10 },
  detailContent: { padding: 20, paddingTop: 58, paddingBottom: 120 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 12 },
  backButtonText: { color: Palette.ink, fontSize: 14, fontWeight: '700' },
  dateGroup: { marginTop: 20 },
  dateHeading: { color: Palette.ink, fontSize: 20, lineHeight: 26, fontWeight: '700', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 },
  wordTile: { minHeight: 142, borderRadius: 18, padding: 14, justifyContent: 'center', overflow: 'hidden', backgroundColor: Palette.white, borderWidth: 1, borderColor: Palette.border },
  tileWord: { color: Palette.ink, fontSize: 17, fontWeight: '800', lineHeight: 21 },
  tileDefinition: { color: Palette.ink, fontSize: 11, lineHeight: 14, marginTop: 6 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,37,37,0.58)' },
  modalContent: { width: '100%', maxWidth: 520, borderRadius: 28, padding: 16, backgroundColor: Palette.white },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalCaption: { color: Palette.ink, fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 15, backgroundColor: Palette.lightGreen },
  closeText: { color: Palette.ink, fontSize: 14, fontWeight: '700' },
  fullCardTouch: { width: '100%' },
  fullCardFrame: { height: 420, borderRadius: 19 },
  fullCardFace: { ...StyleSheet.absoluteFill, borderRadius: 22, padding: 22, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  cardMascot: { position: 'absolute', top: 9, right: 9, opacity: 0.95 },
  fullCardFront: { backgroundColor: Palette.primarySoft },
  fullCardBack: { backgroundColor: Palette.white },
  modalLabel: { color: Palette.ink, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 18 },
  modalLabelFront: { color: Palette.ink },
  fullWord: { color: Palette.ink, fontSize: 42, lineHeight: 50, fontWeight: '800', textAlign: 'center' },
  fullReading: { color: Palette.ink, fontSize: 15, marginTop: 5 },
  fullBadge: { color: Palette.charcoalBlack, fontSize: 12, fontWeight: '800', backgroundColor: Palette.white, overflow: 'hidden', borderRadius: 14, paddingVertical: 5, paddingHorizontal: 11, marginTop: 12 },
  fullRule: { width: '100%', height: 1, backgroundColor: Palette.mainGreen, marginVertical: 18, opacity: 0.5 },
  fullRuleFront: { backgroundColor: Palette.softWhite, opacity: 0.7 },
  flipHint: { color: Palette.ink, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 18 },
  flipHintFront: { color: Palette.softWhite },
  fullDefinition: { color: Palette.charcoalBlack, fontSize: 22, lineHeight: 30, fontWeight: '800', textAlign: 'center' },
  fullExample: { color: Palette.charcoalBlack, fontSize: 16, fontStyle: 'italic', lineHeight: 24, textAlign: 'center' },
  fullExampleSecondary: { color: Palette.charcoalBlack, fontSize: 14, fontStyle: 'italic', lineHeight: 21, textAlign: 'center', marginTop: 12 },
  fullTranslation: { color: Palette.ink, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});

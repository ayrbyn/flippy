import { useFocusEffect } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
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
import { Fonts, Palette } from '../../constants/theme';

type MonthAlbum = { key: string; title: string; words: UserWord[] };

function monthKey(dateString: string): string {
  const date = new Date(dateString);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthTitle(key: string): string {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
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
  const tileWidth = (width - 44) / 3 - 8;
  const colors = [Palette.yellow, Palette.lavender, Palette.blue, Palette.sage, Palette.coral];

  return (
    <View style={styles.grid}>
      {words.map((word, index) => (
        <Pressable
          key={word.id}
          accessibilityRole="button"
          accessibilityLabel={`Buka flashcard ${word.word}`}
          onPress={() => onSelect(word)}
          style={[styles.wordTile, { width: tileWidth, backgroundColor: colors[index % colors.length] }]}
        >
          <View style={styles.tileTape} />
          <Text numberOfLines={2} style={styles.tileWord}>{word.word}</Text>
          <Text numberOfLines={1} style={styles.tileDefinition}>{word.definition}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FullFlashcard({ word, onClose }: { word: UserWord; onClose: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

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
              <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[styles.fullCardFace, styles.fullCardFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}>
                <View style={styles.fullTape} />
                <Text style={styles.modalLabel}>KATA</Text>
                <Text style={styles.fullWord}>{word.word}</Text>
                {word.reading ? <Text style={styles.fullReading}>{word.reading}</Text> : null}
                {word.part_of_speech ? <Text style={styles.fullBadge}>{word.part_of_speech}</Text> : null}
                <View style={styles.fullRule} />
                <Text style={styles.flipHint}>Ketuk kartu untuk membalik</Text>
              </Animated.View>
              <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[styles.fullCardFace, styles.fullCardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}>
                <View style={styles.fullTape} />
                <Text style={styles.modalLabel}>ARTI & CONTOH</Text>
                <Text style={styles.fullDefinition}>{word.definition}</Text>
                <View style={styles.fullRule} />
                <Text style={styles.fullExample}>{word.example_sentence}</Text>
                {word.example_translation ? <Text style={styles.fullTranslation}>{word.example_translation}</Text> : null}
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
          numColumns={3}
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
            <Pressable accessibilityRole="button" accessibilityLabel={`Buka album ${item.title}, ${item.words.length} kartu`} onPress={() => setSelectedMonth(item.key)} style={[styles.monthTile, { backgroundColor: [Palette.lavender, Palette.yellow, Palette.sage, Palette.blue, Palette.coral][index % 5] }]}>
              <View style={styles.albumIcon}><View style={styles.albumIconPage} /></View>
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
  container: { flex: 1, backgroundColor: Palette.paper },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Palette.paper },
  listContent: { paddingHorizontal: 17, paddingTop: 60, paddingBottom: 120, flexGrow: 1 },
  listHeader: { marginHorizontal: 5, marginBottom: 18 },
  kicker: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
  title: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 34, fontWeight: '700' },
  subtitle: { color: Palette.muted, fontSize: 14, lineHeight: 21, marginTop: 4 },
  albumRow: { justifyContent: 'flex-start', gap: 8, marginBottom: 10 },
  monthTile: { flex: 1, maxWidth: '33.33%', minHeight: 140, borderWidth: 1.3, borderColor: Palette.ink, borderRadius: 15, padding: 11, justifyContent: 'space-between', transform: [{ rotate: '-0.5deg' }] },
  albumIcon: { height: 48, width: 58, borderWidth: 1.5, borderColor: Palette.ink, borderTopLeftRadius: 4, borderTopRightRadius: 8, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, backgroundColor: Palette.paperAlt, padding: 6, alignItems: 'center', justifyContent: 'center' },
  albumIconPage: { width: '100%', height: '100%', borderWidth: 1, borderColor: Palette.line, backgroundColor: Palette.paper, transform: [{ rotate: '-4deg' }] },
  monthTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 18, fontWeight: '700', lineHeight: 21, marginTop: 8 },
  monthCount: { color: Palette.muted, fontSize: 11, marginTop: 3 },
  emptyText: { color: Palette.muted, textAlign: 'center', lineHeight: 22, marginTop: 20, marginHorizontal: 12 },
  errorText: { color: Palette.error, fontSize: 13, lineHeight: 19, marginTop: 10 },
  detailContent: { padding: 20, paddingTop: 58, paddingBottom: 120 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 12, marginBottom: 12 },
  backButtonText: { color: Palette.ink, fontSize: 14, fontWeight: '600' },
  dateGroup: { marginTop: 20 },
  dateHeading: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 21, fontWeight: '700', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start', gap: 8 },
  wordTile: { minHeight: 112, borderWidth: 1.2, borderColor: Palette.ink, borderRadius: 12, padding: 9, justifyContent: 'center', overflow: 'hidden' },
  tileTape: { position: 'absolute', top: 0, left: '30%', width: '40%', height: 10, backgroundColor: 'rgba(255,255,255,0.6)' },
  tileWord: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 20, fontWeight: '700', lineHeight: 23 },
  tileDefinition: { color: Palette.muted, fontSize: 10, lineHeight: 13, marginTop: 6 },
  modalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 18 },
  modalBackdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(37,37,37,0.58)' },
  modalContent: { width: '100%', maxWidth: 520, borderRadius: 22, padding: 14, backgroundColor: Palette.paper },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalCaption: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.7 },
  closeButton: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: Palette.ink, borderRadius: 12, backgroundColor: Palette.paperAlt },
  closeText: { color: Palette.ink, fontSize: 13, fontWeight: '600' },
  fullCardTouch: { width: '100%' },
  fullCardFrame: { height: 420, borderRadius: 19 },
  fullCardFace: { ...StyleSheet.absoluteFill, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 19, padding: 22, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  fullCardFront: { backgroundColor: Palette.yellow },
  fullCardBack: { backgroundColor: Palette.lavender },
  fullTape: { position: 'absolute', top: -1, alignSelf: 'center', width: 82, height: 18, backgroundColor: 'rgba(255,255,255,0.58)', transform: [{ rotate: '-3deg' }] },
  modalLabel: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 18 },
  fullWord: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 48, fontWeight: '700', textAlign: 'center' },
  fullReading: { color: Palette.muted, fontSize: 15, marginTop: 5 },
  fullBadge: { color: Palette.ink, fontSize: 12, backgroundColor: Palette.paperAlt, overflow: 'hidden', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10, marginTop: 12 },
  fullRule: { width: '100%', height: 1, backgroundColor: 'rgba(37,37,37,0.24)', marginVertical: 18 },
  flipHint: { color: Palette.muted, fontSize: 13, textAlign: 'center', marginTop: 18 },
  fullDefinition: { color: Palette.ink, fontSize: 22, lineHeight: 30, fontWeight: '600', textAlign: 'center' },
  fullExample: { color: Palette.ink, fontSize: 16, fontStyle: 'italic', lineHeight: 24, textAlign: 'center' },
  fullTranslation: { color: Palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 10 },
});

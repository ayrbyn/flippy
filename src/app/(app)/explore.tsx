import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Fonts, Palette } from '../../constants/theme';
import { useCourses } from '../../lib/courses';
import { generateFlashcard, GenerateResult, saveWordToAlbum, UserWord } from '../../lib/flashcards';

export default function ExploreScreen() {
  const { activeCourse } = useCourses();
  const [input, setInput] = useState('');
  const [card, setCard] = useState<UserWord | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(0.92));
  const cardId = card?.id;

  useEffect(() => {
    if (!cardId) return;
    rotation.setValue(0);
    entrance.setValue(0.92);
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 6, tension: 75 }).start();
  }, [cardId, entrance, rotation]);

  async function handleCreate() {
    if (!activeCourse || !input.trim() || creating || (card && !card.saved_to_album_at)) return;
    setCreating(true);
    setMessage(null);
    let result: GenerateResult;
    try {
      result = await generateFlashcard(activeCourse.id, input.trim());
    } catch (error) {
      setCreating(false);
      setMessage(error instanceof Error ? error.message : 'Kartu gagal dibuat. Coba lagi.');
      setMessageIsError(true);
      return;
    }
    setCreating(false);
    if (!result.ok) {
      setMessage(result.message);
      setMessageIsError(true);
      return;
    }
    setFlipped(false);
    setCard(result.flashcard);
    setInput('');
    setMessage(
      result.status === 'exists'
        ? result.flashcard.saved_to_album_at
          ? 'Kata ini sudah ada dan tersimpan di Album.'
          : 'Kata ini sudah ada. Kamu bisa simpan ke album.'
        : 'Kata berhasil dibuat! Simpan ke album agar tersimpan di koleksimu.'
    );
    setMessageIsError(false);
  }

  async function handleSave() {
    if (!card || card.saved_to_album_at || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveWordToAlbum(card.id);
      setCard(saved);
      setMessage('Yay! Flashcard tersimpan di album bulan ini.');
      setMessageIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Flashcard gagal disimpan. Coba lagi.');
      setMessageIsError(true);
    } finally {
      setSaving(false);
    }
  }

  function flipCard() {
    const next = !flipped;
    setFlipped(next);
    Animated.spring(rotation, { toValue: next ? 180 : 0, useNativeDriver: true, friction: 9, tension: 70 }).start();
  }

  const frontRotation = rotation.interpolate({ inputRange: [0, 180], outputRange: ['0deg', '180deg'] });
  const backRotation = rotation.interpolate({ inputRange: [0, 180], outputRange: ['180deg', '360deg'] });

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.kicker}>JURNAL KOSAKATA</Text>
        <Text style={styles.title}>Kartu kata saya</Text>
        <Text style={styles.subtitle}>
          {activeCourse ? `${activeCourse.target_language.toUpperCase()} · arti dalam ${activeCourse.explanation_language.toUpperCase()}` : 'Buat kursus dulu di tab Home.'}
        </Text>

        <View style={styles.entryRow}>
          <TextInput
            accessibilityLabel="Ketik kata baru"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={handleCreate}
            placeholder="Ketik kata baru"
            placeholderTextColor={Palette.muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            editable={!!activeCourse && !creating && !(card && !card.saved_to_album_at)}
          />
          <Pressable accessibilityRole="button" onPress={handleCreate} disabled={!activeCourse || !input.trim() || creating || !!(card && !card.saved_to_album_at)} style={[styles.createButton, (!input.trim() || creating || (card && !card.saved_to_album_at)) && styles.disabledButton]}>
            {creating ? <ActivityIndicator color={Palette.ink} /> : <Text style={styles.createText}>Buat kartu</Text>}
          </Pressable>
        </View>
        {card && !card.saved_to_album_at ? <Text style={styles.helper}>Simpan kartu ini ke album sebelum membuat kartu berikutnya.</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, messageIsError && styles.errorMessage]}>{message}</Text> : null}

        {card ? (
          <Animated.View style={[styles.cardArea, { opacity: entrance, transform: [{ scale: entrance }] }]}>
            <View style={styles.cardHeading}>
              <Text style={styles.sectionTitle}>Kartu barumu</Text>
              <Text style={styles.sparkle}>✳</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={flipped ? `Balik kartu ${card.word}` : `Lihat arti ${card.word}`} onPress={flipCard} style={styles.cardTouch}>
              <View style={styles.cardFrame}>
                <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[styles.cardFace, styles.cardFront, { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}>
                  <View style={styles.tape} />
                  <Text style={styles.cardLabel}>KATA BARU</Text>
                  <Text style={styles.word}>{card.word}</Text>
                  {card.reading ? <Text style={styles.reading}>{card.reading}</Text> : null}
                  {card.part_of_speech ? <Text style={styles.badge}>{card.part_of_speech}</Text> : null}
                  <View style={styles.rule} />
                  <Text style={styles.flipHint}>Ketuk untuk membalik</Text>
                  <Text style={styles.doodleStar}>✳</Text>
                </Animated.View>
                <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[styles.cardFace, styles.cardBack, { transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}>
                  <View style={styles.tape} />
                  <Text style={styles.cardLabel}>ARTI & CONTOH</Text>
                  <Text style={styles.definition}>{card.definition}</Text>
                  <View style={styles.rule} />
                  <Text style={styles.example}>{card.example_sentence}</Text>
                  {card.example_translation ? <Text style={styles.translation}>{card.example_translation}</Text> : null}
                  {card.example_sentence_2 ? <Text style={styles.exampleSecondary}>{card.example_sentence_2}</Text> : null}
                  {card.example_translation_2 ? <Text style={styles.translation}>{card.example_translation_2}</Text> : null}
                  <Text style={styles.flipHint}>Ketuk untuk kembali</Text>
                </Animated.View>
              </View>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={handleSave} disabled={!!card.saved_to_album_at || saving} style={[styles.saveButton, card.saved_to_album_at && styles.savedButton]}>
              {saving ? <ActivityIndicator color={Palette.ink} /> : <Text style={styles.saveText}>{card.saved_to_album_at ? 'Tersimpan di Album' : 'Simpan flashcard ke Album'}</Text>}
            </Pressable>
            {card.saved_to_album_at ? <Text style={styles.savedNote}>Disimpan dalam album berdasarkan bulan dibuat.</Text> : null}
          </Animated.View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyDoodle}>✎</Text>
            <Text style={styles.emptyTitle}>Satu kata baru, satu kartu kecil.</Text>
            <Text style={styles.emptySubtitle}>Ketik kata di atas. Kartu besarnya akan muncul di sini.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.paper },
  content: { paddingHorizontal: 20, paddingTop: 58, paddingBottom: 124, flexGrow: 1 },
  kicker: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.8, marginBottom: 4 },
  title: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 37, fontWeight: '700' },
  subtitle: { color: Palette.muted, fontSize: 14, lineHeight: 20, marginTop: 3, marginBottom: 22 },
  entryRow: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 14, borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 15, color: Palette.ink, backgroundColor: Palette.paperAlt, fontSize: 16 },
  createButton: { minWidth: 112, minHeight: 54, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 15, backgroundColor: Palette.yellow, transform: [{ rotate: '1deg' }] },
  disabledButton: { opacity: 0.62 },
  createText: { color: Palette.ink, fontSize: 14, fontWeight: '700' },
  helper: { color: Palette.muted, fontSize: 12, lineHeight: 18, marginTop: 8 },
  message: { color: Palette.success, fontSize: 13, lineHeight: 19, marginTop: 12 },
  errorMessage: { color: Palette.error },
  cardArea: { marginTop: 26 },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 3, marginBottom: 10 },
  sectionTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 25, fontWeight: '700' },
  sparkle: { color: Palette.ink, fontSize: 22, transform: [{ rotate: '12deg' }] },
  cardTouch: { width: '100%' },
  cardFrame: { minHeight: 500, borderRadius: 22 },
  cardFace: { ...StyleSheet.absoluteFill, borderWidth: 1.6, borderColor: Palette.ink, borderRadius: 22, padding: 23, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  cardFront: { backgroundColor: Palette.yellow },
  cardBack: { backgroundColor: Palette.lavender },
  tape: { position: 'absolute', top: -1, alignSelf: 'center', width: 86, height: 19, backgroundColor: 'rgba(255,255,255,0.58)', transform: [{ rotate: '-3deg' }] },
  cardLabel: { color: Palette.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 21 },
  word: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 52, fontWeight: '700', textAlign: 'center' },
  reading: { color: Palette.muted, fontSize: 15, marginTop: 6 },
  badge: { overflow: 'hidden', borderRadius: 15, paddingVertical: 5, paddingHorizontal: 12, marginTop: 13, color: Palette.ink, backgroundColor: Palette.paperAlt, fontSize: 12 },
  rule: { width: '100%', height: 1, backgroundColor: 'rgba(37,37,37,0.24)', marginVertical: 20 },
  flipHint: { color: Palette.muted, fontSize: 13, textAlign: 'center', marginTop: 8 },
  doodleStar: { position: 'absolute', right: 22, top: 42, color: Palette.ink, fontSize: 25, transform: [{ rotate: '16deg' }] },
  definition: { color: Palette.ink, fontSize: 23, fontWeight: '600', lineHeight: 31, textAlign: 'center' },
  example: { color: Palette.ink, fontSize: 16, fontStyle: 'italic', lineHeight: 24, textAlign: 'center' },
  exampleSecondary: { color: Palette.ink, fontSize: 14, fontStyle: 'italic', lineHeight: 21, textAlign: 'center', marginTop: 12 },
  translation: { color: Palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  saveButton: { minHeight: 54, marginTop: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Palette.ink, borderRadius: 15, backgroundColor: Palette.sage, transform: [{ rotate: '-0.5deg' }] },
  savedButton: { backgroundColor: Palette.blue },
  saveText: { color: Palette.ink, fontSize: 15, fontWeight: '700' },
  savedNote: { color: Palette.muted, textAlign: 'center', fontSize: 12, marginTop: 8 },
  emptyCard: { minHeight: 220, marginTop: 28, borderWidth: 1.3, borderColor: Palette.line, borderRadius: 19, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', padding: 24, transform: [{ rotate: '-0.5deg' }] },
  emptyDoodle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 34, transform: [{ rotate: '-15deg' }] },
  emptyTitle: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 23, fontWeight: '700', textAlign: 'center', marginTop: 8 },
  emptySubtitle: { color: Palette.muted, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 5 },
});

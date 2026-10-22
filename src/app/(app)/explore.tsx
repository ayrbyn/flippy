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
import { FlashcardPastels, Palette } from '../../constants/theme';
import FlippyMascot from '../../components/flippy-mascot';
import { useCourses } from '../../lib/courses';
import {
  FlashcardPreview,
  generateFlashcard,
  GenerateResult,
  saveFlashcardToAlbum,
} from '../../lib/flashcards';

export default function ExploreScreen() {
  const { activeCourse } = useCourses();
  const [input, setInput] = useState('');
  const [card, setCard] = useState<FlashcardPreview | null>(null);
  const [cardCourseId, setCardCourseId] = useState<string | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageIsError, setMessageIsError] = useState(false);
  const [rotation] = useState(() => new Animated.Value(0));
  const [entrance] = useState(() => new Animated.Value(0.92));
  const cardId = card?.id;
  const cardColorIndex = card ? [...card.word].reduce((sum, character) => sum + character.charCodeAt(0), 0) % FlashcardPastels.length : 0;

  useEffect(() => {
    if (!cardId) return;
    rotation.setValue(0);
    entrance.setValue(0.92);
    Animated.spring(entrance, { toValue: 1, useNativeDriver: true, friction: 6, tension: 75 }).start();
  }, [cardId, entrance, rotation]);

  async function handleCreate() {
    if (!activeCourse || !input.trim() || creating) return;
    const courseId = activeCourse.id;
    setCreating(true);
    setMessage(null);
    let result: GenerateResult;
    try {
      result = await generateFlashcard(courseId, input.trim());
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
    const preview = result.flashcard.saved_to_album_at
      ? result.flashcard
      : { ...result.flashcard, id: `draft-${Date.now()}`, saved_to_album_at: null };
    setCard(preview);
    setCardCourseId(courseId);
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
    if (!card || !cardCourseId || card.saved_to_album_at || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const saved = await saveFlashcardToAlbum(cardCourseId, card);
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
            editable={!!activeCourse && !creating}
          />
          <Pressable accessibilityRole="button" onPress={handleCreate} disabled={!activeCourse || !input.trim() || creating} style={[styles.createButton, (!input.trim() || creating) && styles.disabledButton]}>
            {creating ? <ActivityIndicator color={Palette.white} /> : <Text style={styles.createText}>+</Text>}
          </Pressable>
        </View>
        {card && !card.saved_to_album_at ? <Text style={styles.helper}>Kartu ini masih draft. Membuat kartu baru akan menggantikannya; hanya kartu yang disimpan masuk ke koleksi.</Text> : null}
        {message ? <Text accessibilityLiveRegion="polite" style={[styles.message, messageIsError && styles.errorMessage]}>{message}</Text> : null}

        {card ? (
          <Animated.View style={[styles.cardArea, { opacity: entrance, transform: [{ scale: entrance }] }]}>
            <View style={styles.cardHeading}>
              <Text style={styles.sectionTitle}>Kartu barumu</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={flipped ? `Balik kartu ${card.word}` : `Lihat arti ${card.word}`} onPress={flipCard} style={styles.cardTouch}>
              <View style={styles.cardFrame}>
                <Animated.View pointerEvents={flipped ? 'none' : 'auto'} style={[styles.cardFace, styles.cardFront, { backgroundColor: FlashcardPastels[cardColorIndex], transform: [{ perspective: 1000 }, { rotateY: frontRotation }] }]}>
                  <View style={styles.mascotCorner}><FlippyMascot size={96} /></View>
                  <Text style={[styles.cardLabel, styles.cardLabelFront]}>KATA BARU</Text>
                  <Text style={styles.word}>{card.word}</Text>
                  {card.reading ? <Text style={styles.reading}>{card.reading}</Text> : null}
                  {card.part_of_speech ? <Text style={styles.badge}>{card.part_of_speech}</Text> : null}
                  <View style={[styles.rule, styles.ruleFront]} />
                  <Text style={[styles.flipHint, styles.flipHintFront]}>Ketuk untuk membalik</Text>
                </Animated.View>
                <Animated.View pointerEvents={flipped ? 'auto' : 'none'} style={[styles.cardFace, styles.cardBack, { backgroundColor: FlashcardPastels[(cardColorIndex + 1) % FlashcardPastels.length], transform: [{ perspective: 1000 }, { rotateY: backRotation }] }]}>
                  <View style={styles.backMascot}><FlippyMascot size={55} /></View>
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
              {saving ? <ActivityIndicator color={Palette.ink} /> : <Text style={[styles.saveText, card.saved_to_album_at && styles.savedText]}>{card.saved_to_album_at ? 'Tersimpan di Album' : 'Simpan flashcard ke Album'}</Text>}
            </Pressable>
            {card.saved_to_album_at ? <Text style={styles.savedNote}>Disimpan dalam album berdasarkan bulan dibuat.</Text> : null}
          </Animated.View>
        ) : (
          <View style={styles.emptyCard}>
            <FlippyMascot size={118} />
            <Text style={styles.emptyTitle}>Satu kata baru, satu kartu kecil.</Text>
            <Text style={styles.emptySubtitle}>Ketik kata di atas. Kartu besarnya akan muncul di sini.</Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  content: { paddingHorizontal: 20, paddingTop: 32, paddingBottom: 124, flexGrow: 1 },
  kicker: { color: Palette.secondary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 5 },
  title: { color: Palette.ink, fontSize: 32, lineHeight: 38, fontWeight: '800' },
  subtitle: { color: Palette.charcoalBlack, fontSize: 14, lineHeight: 20, marginTop: 4, marginBottom: 22 },
  entryRow: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
  input: { flex: 1, minWidth: 0, minHeight: 54, paddingHorizontal: 14, borderWidth: 1, borderColor: Palette.primaryBorder, borderRadius: 17, color: Palette.ink, backgroundColor: Palette.white, fontSize: 16 },
  createButton: { minWidth: 56, minHeight: 54, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Palette.primary },
  disabledButton: { opacity: 0.62 },
  createText: { color: Palette.white, fontSize: 20, fontWeight: '700' },
  helper: { color: Palette.ink, fontSize: 12, lineHeight: 18, marginTop: 8 },
  message: { color: Palette.ink, fontSize: 13, lineHeight: 19, marginTop: 12 },
  errorMessage: { color: Palette.ink },
  cardArea: { marginTop: 26 },
  cardHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 3, marginBottom: 10 },
  sectionTitle: { color: Palette.ink, fontSize: 22, fontWeight: '800' },
  cardTouch: { width: '100%' },
  cardFrame: { minHeight: 500, borderRadius: 25 },
  cardFace: { ...StyleSheet.absoluteFill, borderRadius: 25, padding: 23, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden', overflow: 'hidden' },
  cardFront: { backgroundColor: Palette.primarySoft },
  cardBack: { backgroundColor: Palette.white },
  cardLabel: { color: Palette.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1.5, marginBottom: 21 },
  cardLabelFront: { color: Palette.ink },
  word: { color: Palette.ink, fontSize: 42, lineHeight: 50, fontWeight: '800', textAlign: 'center' },
  reading: { color: Palette.ink, fontSize: 15, marginTop: 6 },
  badge: { overflow: 'hidden', borderRadius: 15, paddingVertical: 5, paddingHorizontal: 12, marginTop: 13, color: Palette.ink, backgroundColor: Palette.background, fontSize: 12, fontWeight: '700' },
  rule: { width: '100%', height: 1, backgroundColor: Palette.primaryBorder, marginVertical: 20 },
  ruleFront: { backgroundColor: Palette.ink, opacity: 0.25 },
  flipHint: { color: Palette.ink, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  flipHintFront: { color: Palette.ink },
  definition: { color: Palette.charcoalBlack, fontSize: 23, fontWeight: '800', lineHeight: 31, textAlign: 'center' },
  example: { color: Palette.charcoalBlack, fontSize: 16, fontStyle: 'italic', lineHeight: 24, textAlign: 'center' },
  exampleSecondary: { color: Palette.charcoalBlack, fontSize: 14, fontStyle: 'italic', lineHeight: 21, textAlign: 'center', marginTop: 12 },
  translation: { color: Palette.royalBlue, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 9 },
  saveButton: { minHeight: 54, marginTop: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 17, backgroundColor: Palette.primary },
  savedButton: { backgroundColor: Palette.green },
  saveText: { color: Palette.white, fontSize: 15, fontWeight: '800' },
  savedText: { color: Palette.ink },
  savedNote: { color: Palette.ink, textAlign: 'center', fontSize: 12, marginTop: 8 },
  emptyCard: { minHeight: 220, marginTop: 28, borderRadius: 22, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Palette.white },
  mascotCorner: { position: 'absolute', top: 8, right: 8, opacity: 0.96 },
  backMascot: { position: 'absolute', bottom: 0, right: 0, opacity: 0.42 },
  emptyTitle: { color: Palette.ink, fontSize: 22, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  emptySubtitle: { color: Palette.ink, fontSize: 14, lineHeight: 21, textAlign: 'center', marginTop: 5 },
});

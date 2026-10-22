import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../lib/auth';
import { useCourses } from '../lib/courses';
import {
  buildBlank,
  fetchPracticeWords,
  localPracticeDate,
  PracticeMode,
  PracticeScope,
  PracticeWord,
  saveAnswer,
} from '../lib/practice';
import { useProfile } from '../lib/profile';
import { Palette } from '../constants/theme';
import { getLanguageName } from '../lib/languages';

type Phase = 'loading' | 'error' | 'empty' | 'question' | 'feedback' | 'done';
type PracticeQuestion = PracticeWord & { method: PracticeMode; exampleIndex: 1 | 2 };

function randomMethod(): PracticeMode {
  const methods: PracticeMode[] = ['fill_blank', 'recall_word'];
  return methods[Math.floor(Math.random() * methods.length)];
}

export default function PracticeSession({ onExit, scope }: { onExit: () => void; scope: PracticeScope }) {
  const { session } = useAuth();
  const { activeCourse } = useCourses();
  const { syncPracticeResult } = useProfile();

  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, xp: 0 });
  const [lastXp, setLastXp] = useState(0);

  const courseId = activeCourse?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!courseId) return;
      try {
        const list = await fetchPracticeWords(courseId, scope);
        if (cancelled) return;
        setQueue(list.map((word) => ({
          ...word,
          method: randomMethod(),
          exampleIndex: word.example_sentence_2 && Math.random() < 0.5 ? 2 : 1,
        })));
        setPhase(list.length === 0 ? 'empty' : 'question');
      } catch (e) {
        if (cancelled) return;
        setMessage(e instanceof Error ? e.message : 'Gagal memuat soal.');
        setPhase('error');
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [courseId, scope]);

  const current = queue[index];

  async function handleCheck() {
    if (!current || !session || saving || !answer.trim()) return;

    setSaving(true);
    setMessage(null);

    try {
      const result = await saveAnswer(current.id, answer, mode, hint, current.exampleIndex, localPracticeDate());
      const { is_correct: isCorrect, xp_earned: xp } = result;
      syncPracticeResult(result.profile);

      setStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
        xp: prev.xp + xp,
      }));
      setLastCorrect(isCorrect);
      setLastXp(xp);
      setPhase('feedback');
    } catch {
      setMessage('Gagal menyimpan jawaban. Periksa koneksi lalu coba lagi.');
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (index + 1 >= queue.length) {
      setPhase('done');
      return;
    }
    setIndex(index + 1);
    setAnswer('');
    setHint(false);
    setMessage(null);
    setPhase('question');
  }

  if (phase === 'loading') {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (phase === 'error') {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{message}</Text>
        <Pressable style={styles.button} onPress={onExit}>
          <Text style={styles.buttonText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'empty') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Belum ada soal</Text>
        <Text style={styles.doneText}>
        Tidak ada kata dalam kumpulan ini. Tambah kata baru atau
          kembali lagi nanti.
        </Text>
        <Pressable style={styles.button} onPress={onExit}>
          <Text style={styles.buttonText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.center}>
        <Text style={styles.doneTitle}>Latihan selesai</Text>
        <Text style={styles.doneText}>Benar: {stats.correct}</Text>
        <Text style={styles.doneText}>Salah: {stats.wrong}</Text>
        <Text style={styles.doneXp}>+{stats.xp} XP</Text>
        <Pressable style={styles.button} onPress={onExit}>
          <Text style={styles.buttonText}>Selesai</Text>
        </Pressable>
      </View>
    );
  }

  if (!current) {
    return null;
  }

  const mode = current.method;
  const currentSentence = current.exampleIndex === 2 && current.example_sentence_2
    ? current.example_sentence_2
    : current.example_sentence;
  const currentWordForm = current.exampleIndex === 2 && current.word_form_in_sentence_2
    ? current.word_form_in_sentence_2
    : current.word_form_in_sentence;
  const currentTranslation = current.exampleIndex === 2 && current.example_translation_2
    ? current.example_translation_2
    : current.example_translation;
  const parts = buildBlank(currentSentence, currentWordForm);
  const inFeedback = phase === 'feedback';
  const answerToShow = mode === 'fill_blank' ? currentWordForm : current.word;
  const answerLetters = Array.from(answerToShow);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.topBar}>
          <Pressable onPress={onExit}>
            <Text style={styles.exit}>Keluar</Text>
          </Pressable>
          <Text style={styles.progress}>
            {index + 1} / {queue.length}
          </Text>
        </View>

        <Text style={styles.instruction}>
          {mode === 'fill_blank' ? 'Isi bagian yang kosong' : 'Ingat kata dari artinya'}
        </Text>

        {mode === 'fill_blank' ? (
          <>
            <Text style={styles.sentence}>
              {parts.before}
              <Text style={[styles.blank, inFeedback && (lastCorrect ? styles.blankCorrect : styles.blankWrong)]}>
                {inFeedback ? currentWordForm : '_____'}
              </Text>
              {parts.after}
            </Text>
            {currentTranslation ? <Text style={styles.translation}>{currentTranslation}</Text> : null}
          </>
        ) : (
          <View style={styles.meaningCard}>
            <Text style={styles.promptLabel}>ARTI KATA</Text>
            <Text style={styles.meaningText}>{current.definition}</Text>
            <Text style={styles.promptHint}>Tulis kosakata yang cocok dalam bahasa {activeCourse ? getLanguageName(activeCourse.target_language) : 'yang dipelajari'}.</Text>
          </View>
        )}

        {!inFeedback ? (
          <View>
            <Pressable onPress={() => setHint(true)} disabled={hint}>
              <Text style={styles.hintLink}>
                {hint ? 'Petunjuk aktif / XP benar berkurang' : 'Lihat petunjuk'}
              </Text>
            </Pressable>
            {hint ? (
              <Text style={styles.hintText}>
                {mode === 'fill_blank' ? `${current.definition}. ` : ''}Huruf pertama: {answerLetters[0]}, jumlah huruf: {answerLetters.length}.
              </Text>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder={mode === 'fill_blank' ? 'Ketik kata yang hilang' : 'Tulis kata yang cocok'}
              placeholderTextColor={Palette.muted}
              autoCapitalize="none"
              autoCorrect={false}
              value={answer}
              onChangeText={setAnswer}
              onSubmitEditing={() => handleCheck()}
              editable={!saving}
              returnKeyType="done"
            />

            {message ? <Text style={styles.errorText}>{message}</Text> : null}

            <Pressable
              style={[styles.button, (saving || !answer.trim()) && styles.buttonDisabled]}
              onPress={() => handleCheck()}
              disabled={saving || !answer.trim()}
            >
              {saving ? (
                <ActivityIndicator color={Palette.white} />
              ) : (
                <Text style={styles.buttonText}>Periksa</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={[styles.feedback, lastCorrect ? styles.feedbackOk : styles.feedbackBad]}>
              <Text style={styles.feedbackTitle}>
                {lastCorrect ? `Benar! +${lastXp} XP` : 'Belum tepat'}
              </Text>
              {!lastCorrect ? (
                <Text style={styles.feedbackText}>
                  Jawaban yang benar: {answerToShow}
                </Text>
              ) : null}
              <Text style={styles.feedbackText}>
                {current.word}: {current.definition}
              </Text>
              {lastCorrect && current.correct_count + (hint ? 0 : 1) >= 10 ? (
                <Text style={styles.feedbackText}>Kata ini sudah masuk kategori hafal.</Text>
              ) : null}
            </View>

            <Pressable style={styles.button} onPress={handleNext}>
              <Text style={styles.buttonText}>Lanjut</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Palette.background },
  content: { padding: 24, paddingTop: 72, paddingBottom: 48 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: Palette.background },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  exit: { fontSize: 16, color: Palette.berryPink, fontWeight: '700' },
  progress: { fontSize: 16, color: Palette.aquaTeal, fontWeight: '800' },
  instruction: { fontSize: 14, color: Palette.aquaTeal, fontWeight: '700', marginBottom: 12 },
  sentence: { fontSize: 25, lineHeight: 36, color: Palette.charcoalBlack, fontWeight: '700' },
  blank: { color: Palette.aquaTeal, fontWeight: '900' },
  blankCorrect: { color: Palette.aquaTeal },
  blankWrong: { color: Palette.berryPink },
  translation: { fontSize: 16, color: Palette.muted, fontStyle: 'italic', marginTop: 12, marginBottom: 24 },
  hintLink: { fontSize: 15, color: Palette.berryPink, fontWeight: '800', marginBottom: 6 },
  hintText: { fontSize: 14, color: Palette.aquaTeal, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: Palette.primaryBorder, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontSize: 18, color: Palette.ink, backgroundColor: Palette.white, marginTop: 8, marginBottom: 12 },
  button: { backgroundColor: Palette.primary, borderRadius: 17, paddingVertical: 14, paddingHorizontal: 32, alignItems: 'center', marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: Palette.white, fontSize: 16, fontWeight: '800' },
  errorText: { color: Palette.berryPink, fontSize: 14, marginBottom: 8, textAlign: 'center' },
  feedback: { borderRadius: 18, padding: 16, marginBottom: 8, backgroundColor: Palette.white },
  feedbackOk: { backgroundColor: Palette.lightGreen },
  feedbackBad: { backgroundColor: Palette.lightGreen },
  feedbackTitle: { fontSize: 18, fontWeight: '900', color: Palette.charcoalBlack, marginBottom: 6 },
  feedbackText: { fontSize: 15, color: Palette.charcoalBlack, marginTop: 3 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: Palette.ink, marginBottom: 12 },
  doneText: { fontSize: 17, color: Palette.charcoalBlack, textAlign: 'center', marginBottom: 4 },
  doneXp: { fontSize: 24, fontWeight: '900', color: Palette.royalBlue, marginTop: 12, marginBottom: 24 },
  meaningCard: { minHeight: 210, justifyContent: 'center', alignItems: 'center', padding: 24, borderRadius: 24, backgroundColor: Palette.primarySoft, marginBottom: 14 },
  promptLabel: { color: Palette.primary, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 13 },
  meaningText: { color: Palette.ink, fontSize: 25, fontWeight: '800', textAlign: 'center', lineHeight: 34 },
  promptHint: { color: Palette.secondary, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 15 },
});

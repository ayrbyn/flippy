import React, { useEffect, useRef, useState } from 'react';
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
  normalizeAnswer,
  PracticeMode,
  PracticeScope,
  PracticeWord,
  saveAnswer,
  XP_PER_CORRECT,
} from '../lib/practice';
import { useProfile } from '../lib/profile';
import { Fonts, Palette } from '../constants/theme';
import { getLanguageName } from '../lib/languages';

type Phase = 'loading' | 'error' | 'empty' | 'question' | 'feedback' | 'done';
type PracticeQuestion = PracticeWord & { method: PracticeMode };

function randomMethod(): PracticeMode {
  const methods: PracticeMode[] = ['fill_blank', 'recall_word'];
  return methods[Math.floor(Math.random() * methods.length)];
}

export default function PracticeSession({ onExit, scope }: { onExit: () => void; scope: PracticeScope }) {
  const { session } = useAuth();
  const { activeCourse } = useCourses();
  const { recordPractice } = useProfile();

  const [queue, setQueue] = useState<PracticeQuestion[]>([]);
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('loading');
  const [answer, setAnswer] = useState('');
  const [hint, setHint] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastCorrect, setLastCorrect] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [stats, setStats] = useState({ correct: 0, wrong: 0, xp: 0 });
  const requeued = useRef<Set<string>>(new Set());

  const courseId = activeCourse?.id ?? null;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!courseId) return;
      try {
        const list = await fetchPracticeWords(courseId, scope);
        if (cancelled) return;
        setQueue(list.map((word) => ({ ...word, method: randomMethod() })));
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

    const expectedAnswer = mode === 'fill_blank' ? current.word_form_in_sentence : current.word;
    const isCorrect = normalizeAnswer(answer) === normalizeAnswer(expectedAnswer);
    const xp = isCorrect ? XP_PER_CORRECT : 0;

    try {
      const updated = await saveAnswer(session.user.id, current, isCorrect, xp, mode);
      await recordPractice(xp);

      // Jawaban salah: kata muncul sekali lagi di akhir sesi
      if (!isCorrect && !requeued.current.has(current.id)) {
        requeued.current.add(current.id);
        setQueue((prev) => [...prev, { ...updated, method: randomMethod() }]);
      }

      setStats((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        wrong: prev.wrong + (isCorrect ? 0 : 1),
        xp: prev.xp + xp,
      }));
      setLastCorrect(isCorrect);
      setPhase('feedback');
    } catch (_e) {
      setMessage('Gagal menyimpan jawaban. Periksa koneksi lalu coba lagi.');
    }

    setSaving(false);
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
          Tidak ada kata yang perlu diulang sekarang. Tambah kata baru atau
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
  const parts = buildBlank(current.example_sentence, current.word_form_in_sentence);
  const inFeedback = phase === 'feedback';
  const answerToShow = mode === 'fill_blank' ? current.word_form_in_sentence : current.word;
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
                {inFeedback ? current.word_form_in_sentence : '_____'}
              </Text>
              {parts.after}
            </Text>
            {current.example_translation ? <Text style={styles.translation}>{current.example_translation}</Text> : null}
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
                {hint ? 'Petunjuk:' : 'Lihat petunjuk'}
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
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Periksa</Text>
              )}
            </Pressable>
          </View>
        ) : (
          <View>
            <View style={[styles.feedback, lastCorrect ? styles.feedbackOk : styles.feedbackBad]}>
              <Text style={styles.feedbackTitle}>
                {lastCorrect ? 'Benar! +' + XP_PER_CORRECT + ' XP' : 'Belum tepat'}
              </Text>
              {!lastCorrect ? (
                <Text style={styles.feedbackText}>
                  Jawaban yang benar: {answerToShow}
                </Text>
              ) : null}
              <Text style={styles.feedbackText}>
                {current.word}: {current.definition}
              </Text>
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
  container: {
    flex: 1,
    backgroundColor: Palette.paper,
  },
  content: {
    padding: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Palette.paper,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
  },
  exit: {
    fontSize: 16,
    color: Palette.error,
  },
  progress: {
    fontSize: 16,
    color: '#555555',
    fontWeight: '600',
  },
  instruction: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 12,
  },
  sentence: {
    fontSize: 26,
    lineHeight: 38,
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    fontWeight: '600',
  },
  blank: {
    color: '#2563EB',
  },
  blankCorrect: {
    color: '#15803D',
  },
  blankWrong: {
    color: '#B91C1C',
  },
  translation: {
    fontSize: 16,
    color: '#555555',
    fontStyle: 'italic',
    marginTop: 12,
    marginBottom: 24,
  },
  hintLink: {
    fontSize: 15,
    color: '#2563EB',
    marginBottom: 6,
  },
  hintText: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: Palette.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    color: Palette.ink,
    backgroundColor: Palette.paperAlt,
    marginTop: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: Palette.yellow,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  feedback: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
  },
  feedbackOk: {
    backgroundColor: Palette.sage,
    borderColor: Palette.ink,
  },
  feedbackBad: {
    backgroundColor: Palette.coral,
    borderColor: Palette.ink,
  },
  feedbackTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 6,
  },
  feedbackText: {
    fontSize: 15,
    color: '#333333',
    marginTop: 2,
  },
  doneTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    marginBottom: 12,
  },
  doneText: {
    fontSize: 17,
    color: '#333333',
    textAlign: 'center',
    marginBottom: 4,
  },
  doneXp: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2563EB',
    marginTop: 12,
    marginBottom: 24,
  },
  meaningCard: { minHeight: 210, justifyContent: 'center', alignItems: 'center', padding: 24, borderWidth: 1.4, borderColor: Palette.ink, borderRadius: 20, backgroundColor: Palette.lavender, marginBottom: 14, transform: [{ rotate: '-0.4deg' }] },
  promptLabel: { color: Palette.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.8, marginBottom: 13 },
  meaningText: { color: Palette.ink, fontFamily: Fonts.handwritten, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 },
  promptHint: { color: Palette.muted, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 15 },
});

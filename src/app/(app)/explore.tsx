import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useCourses } from '../../lib/courses';
import {
  fetchWords,
  generateFlashcard,
  UserWord,
} from '../../lib/flashcards';
import { getLanguageName } from '../../lib/languages';

type Notice = { text: string; isError: boolean };

function WordCard({ item }: { item: UserWord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.word}>{item.word}</Text>
        {item.part_of_speech ? (
          <Text style={styles.badge}>{item.part_of_speech}</Text>
        ) : null}
      </View>
      {item.reading ? <Text style={styles.reading}>{item.reading}</Text> : null}
      <Text style={styles.definition}>{item.definition}</Text>
      <View style={styles.exampleBox}>
        <Text style={styles.example}>{item.example_sentence}</Text>
        {item.example_translation ? (
          <Text style={styles.translation}>{item.example_translation}</Text>
        ) : null}
      </View>
    </View>
  );
}

export default function WordsScreen() {
  const { activeCourse } = useCourses();
  const courseId = activeCourse?.id ?? null;

  const [words, setWords] = useState<UserWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [input, setInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const loadWords = useCallback(async () => {
    if (!courseId) {
      setWords([]);
      setLoading(false);
      return;
    }
    try {
      const list = await fetchWords(courseId);
      setWords(list);
    } catch (e) {
      const text = e instanceof Error ? e.message : 'Gagal memuat kata.';
      setNotice({ text, isError: true });
    }
    setLoading(false);
  }, [courseId]);

  useEffect(() => {
    setLoading(true);
    loadWords();
  }, [loadWords]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadWords();
    setRefreshing(false);
  }

  async function handleSubmit() {
    const word = input.trim();
    if (!courseId || !word || submitting) return;

    setNotice(null);
    setSubmitting(true);
    const result = await generateFlashcard(courseId, word);
    setSubmitting(false);

    if (!result.ok) {
      setNotice({ text: result.message, isError: true });
      return;
    }

    if (result.status === 'exists') {
      setNotice({ text: 'Kata ini sudah ada di daftar Anda.', isError: false });
    } else {
      setWords((prev) => [result.flashcard, ...prev]);
      setNotice({
        text:
          result.status === 'cached'
            ? 'Flashcard dibuat (dari cache, tanpa memanggil AI).'
            : 'Flashcard dibuat oleh AI.',
        isError: false,
      });
    }
    setInput('');
  }

  if (!activeCourse) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyText}>
          Buat kursus dulu di tab Home sebelum menambah kata.
        </Text>
      </View>
    );
  }

  const header = (
    <View>
      <Text style={styles.title}>Kata saya</Text>
      <Text style={styles.subtitle}>
        {getLanguageName(activeCourse.target_language)} - dijelaskan dalam{' '}
        {getLanguageName(activeCourse.explanation_language)}
      </Text>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Ketik kata baru"
          placeholderTextColor="#888888"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={64}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSubmit}
          editable={!submitting}
          returnKeyType="done"
        />
        <Pressable
          style={[
            styles.addButton,
            (submitting || !input.trim()) && styles.addButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={submitting || !input.trim()}
        >
          <Text style={styles.addButtonText}>Buat</Text>
        </Pressable>
      </View>

      {submitting ? (
        <View style={styles.progress}>
          <ActivityIndicator />
          <Text style={styles.progressText}>
            AI sedang membuat flashcard. Ini bisa memakan waktu sampai satu menit.
          </Text>
        </View>
      ) : null}

      {notice ? (
        <Text style={[styles.notice, notice.isError ? styles.error : styles.success]}>
          {notice.text}
        </Text>
      ) : null}

      <Text style={styles.listTitle}>Daftar kata ({words.length})</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <FlatList
          data={words}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <WordCard item={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Belum ada kata. Ketik kata pertama Anda di atas.
            </Text>
          }
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 24,
    paddingTop: 72,
    paddingBottom: 48,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111111',
  },
  subtitle: {
    fontSize: 14,
    color: '#555555',
    marginTop: 4,
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#111111',
    backgroundColor: '#FFFFFF',
  },
  addButton: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDisabled: {
    opacity: 0.5,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  progress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 14,
  },
  progressText: {
    flex: 1,
    fontSize: 13,
    color: '#555555',
  },
  notice: {
    fontSize: 14,
    marginTop: 14,
  },
  error: {
    color: '#B91C1C',
  },
  success: {
    color: '#15803D',
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 15,
    color: '#555555',
    textAlign: 'center',
    marginTop: 8,
  },
  card: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  word: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111111',
  },
  badge: {
    fontSize: 12,
    color: '#1D4ED8',
    backgroundColor: '#DBEAFE',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  reading: {
    fontSize: 14,
    color: '#555555',
    marginTop: 2,
  },
  definition: {
    fontSize: 16,
    color: '#222222',
    marginTop: 8,
  },
  exampleBox: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  example: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#111111',
  },
  translation: {
    fontSize: 14,
    color: '#555555',
    marginTop: 4,
  },
});

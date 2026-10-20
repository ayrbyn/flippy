import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useCourses } from '../lib/courses';
import {
  EXPLANATION_LANGUAGES,
  LEVELS,
  TARGET_LANGUAGES,
} from '../lib/languages';

const GOALS = [3, 5, 10];

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function CreateCourseForm() {
  const { createCourse } = useCourses();
  const [target, setTarget] = useState('en');
  const [explanation, setExplanation] = useState('id');
  const [level, setLevel] = useState('beginner');
  const [goal, setGoal] = useState(5);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setMessage(null);

    if (target === explanation) {
      setMessage('Bahasa yang dipelajari dan bahasa penjelasan harus berbeda.');
      return;
    }

    setSaving(true);
    const errorMessage = await createCourse({
      target_language: target,
      explanation_language: explanation,
      level,
      daily_word_goal: goal,
    });
    setSaving(false);

    if (errorMessage) {
      setMessage(errorMessage);
    }
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Buat kursus pertama</Text>
      <Text style={styles.subtitle}>
        Pilih bahasa yang ingin Anda pelajari. Anda bisa menambah kursus lain
        nanti.
      </Text>

      <Text style={styles.label}>Saya ingin belajar</Text>
      <View style={styles.row}>
        {TARGET_LANGUAGES.map((item) => (
          <Chip
            key={item.code}
            label={item.name}
            selected={target === item.code}
            onPress={() => setTarget(item.code)}
          />
        ))}
      </View>

      <Text style={styles.label}>Dijelaskan dalam bahasa</Text>
      <View style={styles.row}>
        {EXPLANATION_LANGUAGES.map((item) => (
          <Chip
            key={item.code}
            label={item.name}
            selected={explanation === item.code}
            onPress={() => setExplanation(item.code)}
          />
        ))}
      </View>

      <Text style={styles.label}>Level saya</Text>
      <View style={styles.row}>
        {LEVELS.map((item) => (
          <Chip
            key={item.code}
            label={item.name}
            selected={level === item.code}
            onPress={() => setLevel(item.code)}
          />
        ))}
      </View>

      <Text style={styles.label}>Target kata baru per hari</Text>
      <View style={styles.row}>
        {GOALS.map((item) => (
          <Chip
            key={item}
            label={String(item) + ' kata'}
            selected={goal === item}
            onPress={() => setGoal(item)}
          />
        ))}
      </View>

      {message ? <Text style={styles.error}>{message}</Text> : null}

      <Pressable
        style={[styles.button, saving && styles.buttonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Mulai belajar</Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
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
    fontSize: 15,
    color: '#555555',
    marginTop: 6,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111111',
    marginTop: 12,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  chipSelected: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  chipText: {
    fontSize: 15,
    color: '#111111',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  error: {
    color: '#B91C1C',
    fontSize: 14,
    marginTop: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

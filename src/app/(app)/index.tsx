import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CreateCourseForm from '../../components/create-course-form';
import { useAuth } from '../../lib/auth';
import { useCourses } from '../../lib/courses';
import { getLanguageName, getLevelName } from '../../lib/languages';
import { supabase } from '../../lib/supabase';

export default function HomeScreen() {
  const { session } = useAuth();
  const { courses, activeCourse, loading, error, refresh } = useCourses();

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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Flippy</Text>
      <Text style={styles.email}>{session?.user.email}</Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Kursus aktif</Text>
        <Text style={styles.cardTitle}>
          {getLanguageName(activeCourse.target_language)}
        </Text>
        <Text style={styles.cardText}>
          Dijelaskan dalam bahasa {getLanguageName(activeCourse.explanation_language)}
        </Text>
        <Text style={styles.cardText}>
          Level: {getLevelName(activeCourse.level)}
        </Text>
        <Text style={styles.cardText}>
          Target harian: {activeCourse.daily_word_goal} kata baru
        </Text>
      </View>

      <Pressable
        style={[styles.button, styles.logout]}
        onPress={() => supabase.auth.signOut()}
      >
        <Text style={styles.buttonText}>Keluar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 72,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111111',
  },
  email: {
    fontSize: 14,
    color: '#555555',
    marginBottom: 24,
  },
  card: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 12,
    padding: 16,
    backgroundColor: '#F9FAFB',
  },
  cardLabel: {
    fontSize: 13,
    color: '#555555',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111111',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 15,
    color: '#333333',
    marginTop: 2,
  },
  errorText: {
    fontSize: 15,
    color: '#B91C1C',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logout: {
    backgroundColor: '#DC2626',
    marginTop: 32,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

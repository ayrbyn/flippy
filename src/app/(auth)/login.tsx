import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Fonts, Palette } from '../../constants/theme';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  function showMessage(text: string, error: boolean) {
    setMessage(text);
    setIsError(error);
  }

  async function handleSubmit() {
    setMessage(null);

    if (!email.trim() || password.length < 6) {
      showMessage('Isi email dan password minimal 6 karakter.', true);
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        showMessage(error.message, true);
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (error) {
        showMessage(error.message, true);
      } else if (!data.session) {
        showMessage(
          'Akun dibuat. Cek email Anda untuk konfirmasi, lalu login.',
          false
        );
        setMode('login');
      }
    }

    setLoading(false);
  }

  const isLogin = mode === 'login';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>Flippy</Text>
      <Text style={styles.subtitle}>
        {isLogin ? 'Masuk untuk lanjut belajar' : 'Buat akun baru'}
      </Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#888888"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password (minimal 6 karakter)"
        placeholderTextColor="#888888"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      {message ? (
        <Text style={[styles.message, isError ? styles.error : styles.success]}>
          {message}
        </Text>
      ) : null}

      <Pressable
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>{isLogin ? 'Masuk' : 'Daftar'}</Text>
        )}
      </Pressable>

      <Pressable
        onPress={() => {
          setMessage(null);
          setMode(isLogin ? 'register' : 'login');
        }}
      >
        <Text style={styles.switchText}>
          {isLogin ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: Palette.paper,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: Palette.ink,
    fontFamily: Fonts.handwritten,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Palette.muted,
    textAlign: 'center',
    marginBottom: 32,
    marginTop: 4,
  },
  input: {
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Palette.ink,
    backgroundColor: Palette.paperAlt,
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    marginBottom: 12,
  },
  error: {
    color: Palette.error,
  },
  success: {
    color: Palette.success,
  },
  button: {
    backgroundColor: Palette.yellow,
    borderWidth: 1.5,
    borderColor: Palette.ink,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: Palette.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  switchText: {
    color: Palette.ink,
    textAlign: 'center',
    marginTop: 20,
    fontSize: 15,
  },
});

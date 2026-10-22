import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { Palette } from '../../constants/theme';

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
        placeholderTextColor={Palette.muted}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TextInput
        style={styles.input}
        placeholder="Password (minimal 6 karakter)"
        placeholderTextColor={Palette.muted}
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
          <ActivityIndicator color={Palette.white} />
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
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: Palette.background },
  title: { fontSize: 34, lineHeight: 40, fontWeight: '800', color: Palette.ink, textAlign: 'center' },
  subtitle: { fontSize: 16, lineHeight: 23, color: Palette.charcoalBlack, textAlign: 'center', marginBottom: 32, marginTop: 4 },
  input: { borderWidth: 1, borderColor: Palette.lightGreen, borderRadius: 17, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: Palette.ink, backgroundColor: Palette.white, marginBottom: 12 },
  message: { fontSize: 14, marginBottom: 12 },
  error: { color: Palette.ink },
  success: { color: Palette.ink },
  button: { backgroundColor: Palette.primary, borderRadius: 17, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: Palette.white, fontSize: 16, fontWeight: '800' },
  switchText: { color: Palette.royalBlue, textAlign: 'center', marginTop: 20, fontSize: 15, fontWeight: '800' },
});

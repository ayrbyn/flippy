import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type UserWord = {
  id: string;
  word: string;
  definition: string;
  part_of_speech: string | null;
  reading: string | null;
  example_sentence: string;
  example_translation: string | null;
  word_form_in_sentence: string;
  stage: string;
  created_at: string;
  saved_to_album_at: string | null;
};

export type GenerateResult =
  | { ok: true; status: 'created' | 'cached' | 'exists'; flashcard: UserWord }
  | { ok: false; code: string; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  daily_limit: 'Batas pembuatan flashcard hari ini sudah tercapai. Coba lagi besok.',
  ai_busy: 'Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.',
  ai_failed: 'AI gagal membuat flashcard. Coba lagi.',
  invalid_word: 'Kata tidak dikenali di bahasa ini. Periksa ejaannya.',
  unauthorized: 'Sesi login habis. Silakan keluar lalu masuk lagi.',
};

export async function fetchWords(courseId: string): Promise<UserWord[]> {
  const { data, error } = await supabase
    .from('user_words')
    .select('*')
    .eq('course_id', courseId)
    .not('saved_to_album_at', 'is', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as UserWord[];
}

export async function saveWordToAlbum(wordId: string): Promise<UserWord> {
  const { data, error } = await supabase
    .from('user_words')
    .update({ saved_to_album_at: new Date().toISOString() })
    .eq('id', wordId)
    .select('*')
    .single();

  if (error) throw new Error(error.message);
  return data as UserWord;
}

export async function generateFlashcard(
  courseId: string,
  word: string
): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('buat-flashcard', {
    body: { course_id: courseId, word },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const body = await error.context.json();
        const code = typeof body?.code === 'string' ? body.code : 'unknown';
        const message =
          ERROR_MESSAGES[code] ??
          (typeof body?.error === 'string' ? body.error : 'Terjadi kesalahan.');
        return { ok: false, code, message };
      } catch (_e) {
        // isi error tidak bisa dibaca, lanjut ke pesan umum
      }
    }
    return {
      ok: false,
      code: 'network',
      message: 'Tidak bisa menghubungi server. Periksa koneksi internet Anda.',
    };
  }

  return {
    ok: true,
    status: data.status,
    flashcard: data.flashcard as UserWord,
  };
}

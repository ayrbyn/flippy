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
  practice_count?: number;
  accepted_answers?: string[];
  accepted_blank_answers?: string[];
  example_sentence_2?: string | null;
  example_translation_2?: string | null;
  word_form_in_sentence_2?: string | null;
};

export type FlashcardPreview = Omit<
  UserWord,
  'id' | 'stage' | 'created_at' | 'saved_to_album_at'
> & Partial<Pick<UserWord, 'id' | 'stage' | 'created_at' | 'saved_to_album_at'>>;

const SINGLE_WORD_PATTERN = /^\p{L}[\p{L}\p{M}\p{N}]*(?:['-]\p{L}[\p{L}\p{M}\p{N}]*)*$/u;

export function isSingleWord(value: string): boolean {
  return SINGLE_WORD_PATTERN.test(value.normalize('NFC').trim());
}

export type GenerateResult =
  | { ok: true; status: 'created' | 'cached' | 'exists'; flashcard: FlashcardPreview }
  | { ok: false; code: string; message: string };

const ERROR_MESSAGES: Record<string, string> = {
  ai_busy: 'Layanan AI sedang sibuk. Coba lagi beberapa saat lagi.',
  ai_failed: 'AI gagal membuat flashcard. Coba lagi.',
  invalid_input: 'Masukkan satu kata saja, tanpa spasi atau kalimat.',
  invalid_flashcard: 'Isi kartu belum lengkap. Buat ulang kartu ini lalu simpan kembali.',
  invalid_word: 'Kata tidak dikenali di bahasa ini. Periksa ejaannya.',
  bad_request: 'Data flashcard tidak valid. Coba buat ulang.',
  save_failed: 'Flashcard gagal disimpan. Coba lagi.',
  server_error: 'Terjadi kesalahan di server. Coba lagi.',
  unauthorized: 'Sesi login habis. Silakan keluar lalu masuk lagi.',
};

export async function fetchWords(courseId: string): Promise<UserWord[]> {
  const pageSize = 500;
  const words: UserWord[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await supabase
      .from('user_words')
      .select('*')
      .eq('course_id', courseId)
      .not('saved_to_album_at', 'is', null)
      .order('created_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) throw new Error(error.message);
    const page = (data ?? []) as UserWord[];
    words.push(...page);
    if (page.length < pageSize) break;
  }

  return words;
}

export async function generateFlashcard(
  courseId: string,
  word: string
): Promise<GenerateResult> {
  if (!isSingleWord(word)) {
    return {
      ok: false,
      code: 'invalid_input',
      message: ERROR_MESSAGES.invalid_input,
    };
  }

  const { data, error } = await supabase.functions.invoke('buat-flashcard', {
    body: { action: 'generate', course_id: courseId, word: word.trim() },
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
      } catch {
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
    flashcard: data.flashcard as FlashcardPreview,
  };
}

export async function saveFlashcardToAlbum(
  courseId: string,
  flashcard: FlashcardPreview
): Promise<UserWord> {
  const { data, error } = await supabase.functions.invoke('buat-flashcard', {
    body: { action: 'save', course_id: courseId, flashcard },
  });

  if (error) {
    if (error instanceof FunctionsHttpError) {
      let responseMessage: string | null = null;
      try {
        const body = await error.context.json();
        const code = typeof body?.code === 'string' ? body.code : 'unknown';
        responseMessage = code === 'bad_request'
          ? 'Fungsi Supabase belum diperbarui. Deploy ulang buat-flashcard, lalu coba lagi.'
          : ERROR_MESSAGES[code] ??
            (typeof body?.error === 'string' ? body.error : 'Flashcard gagal disimpan.');
      } catch {
        // Fall through to the connection error below.
      }
      if (responseMessage) throw new Error(responseMessage);
    }
    throw new Error('Tidak bisa menyimpan flashcard. Periksa koneksi internet Anda.');
  }

  return data.flashcard as UserWord;
}

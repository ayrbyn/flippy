import { UserWord } from './flashcards';
import { supabase } from './supabase';

export type PracticeWord = UserWord & {
  correct_streak: number;
  wrong_count: number;
  next_review_at: string;
};

export const XP_PER_CORRECT = 10;
export const SESSION_SIZE = 10;

// Jeda ulang (hari) setelah jawaban benar berturut-turut ke-1, ke-2, dan seterusnya
const INTERVAL_DAYS = [1, 2, 4, 7, 14, 30];
const WRONG_RETRY_MINUTES = 10;

export async function fetchDueWords(
  courseId: string,
  limit: number = SESSION_SIZE
): Promise<PracticeWord[]> {
  const { data, error } = await supabase
    .from('user_words')
    .select('*')
    .eq('course_id', courseId)
    .lte('next_review_at', new Date().toISOString())
    .order('next_review_at', { ascending: true })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }
  return (data ?? []) as PracticeWord[];
}

export async function countDueWords(courseId: string): Promise<number> {
  const { count, error } = await supabase
    .from('user_words')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .lte('next_review_at', new Date().toISOString());

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function countWordsAddedToday(courseId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const { count, error } = await supabase
    .from('user_words')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId)
    .gte('created_at', start.toISOString());

  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

// Memecah kalimat menjadi bagian sebelum dan sesudah kata yang dikosongkan
export function buildBlank(
  sentence: string,
  form: string
): { before: string; after: string } {
  const index = sentence.toLowerCase().indexOf(form.toLowerCase());
  if (index === -1) {
    return { before: sentence + ' ', after: '' };
  }
  return {
    before: sentence.slice(0, index),
    after: sentence.slice(index + form.length),
  };
}

export function normalizeAnswer(text: string): string {
  return text
    .normalize('NFC')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:"']/g, '')
    .replace(/\s+/g, ' ');
}

export function computeSchedule(word: PracticeWord, isCorrect: boolean) {
  const now = new Date();

  if (isCorrect) {
    const streak = word.correct_streak + 1;
    const days = INTERVAL_DAYS[Math.min(streak - 1, INTERVAL_DAYS.length - 1)];
    const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return {
      correct_streak: streak,
      wrong_count: word.wrong_count,
      stage: streak >= 4 ? 'memorized' : 'learning',
      next_review_at: next.toISOString(),
      last_reviewed_at: now.toISOString(),
    };
  }

  const next = new Date(now.getTime() + WRONG_RETRY_MINUTES * 60 * 1000);
  return {
    correct_streak: 0,
    wrong_count: word.wrong_count + 1,
    stage: 'learning',
    next_review_at: next.toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

// Menyimpan hasil satu jawaban: jadwal ulang kata dan catatan riwayat latihan
export async function saveAnswer(
  userId: string,
  word: PracticeWord,
  isCorrect: boolean,
  xpEarned: number
): Promise<PracticeWord> {
  const update = computeSchedule(word, isCorrect);

  const { error: updateError } = await supabase
    .from('user_words')
    .update(update)
    .eq('id', word.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  const { error: logError } = await supabase.from('practice_logs').insert({
    user_id: userId,
    user_word_id: word.id,
    exercise_type: 'fill_blank',
    is_correct: isCorrect,
    xp_earned: xpEarned,
  });

  if (logError) {
    throw new Error(logError.message);
  }

  return { ...word, ...update };
}

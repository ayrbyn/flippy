import { UserWord } from './flashcards';
import { supabase } from './supabase';

export type PracticeWord = UserWord & {
  correct_streak: number;
  wrong_count: number;
  next_review_at: string;
  practice_count: number;
};

export type PracticeMode = 'fill_blank' | 'recall_word';
export type PracticeScope = 'new_words' | 'all_words';

export type PracticePoolCounts = { newWords: number; allWords: number };

export const XP_PER_CORRECT = 10;
export const SESSION_SIZE = 10;
export const MASTERY_PRACTICE_COUNT = 10;

// Jeda ulang (hari) setelah jawaban benar berturut-turut ke-1, ke-2, dan seterusnya
const INTERVAL_DAYS = [1, 2, 4, 7, 14, 30];
const WRONG_RETRY_MINUTES = 10;

export async function countPracticePool(courseId: string): Promise<PracticePoolCounts> {
  const [allResult, newResult] = await Promise.all([
    supabase
      .from('user_words')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId),
    supabase
      .from('user_words')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId)
      .eq('stage', 'new'),
  ]);

  if (allResult.error) throw new Error(allResult.error.message);
  if (newResult.error) throw new Error(newResult.error.message);

  return { allWords: allResult.count ?? 0, newWords: newResult.count ?? 0 };
}

export async function fetchPracticeWords(
  courseId: string,
  scope: PracticeScope
): Promise<PracticeWord[]> {
  let query = supabase
    .from('user_words')
    .select('*')
    .eq('course_id', courseId)
    .order('created_at', { ascending: false });

  if (scope === 'new_words') query = query.eq('stage', 'new');

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const words = (data ?? []) as PracticeWord[];
  if (scope === 'new_words' || words.length < SESSION_SIZE) return words;

  // Fisher-Yates ensures every flashcard has an equal chance of entering the session.
  for (let index = words.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [words[index], words[swapIndex]] = [words[swapIndex], words[index]];
  }
  return words.slice(0, SESSION_SIZE);
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
  const practiceCount = word.practice_count + 1;
  const stage = practiceCount >= MASTERY_PRACTICE_COUNT ? 'memorized' : 'learning';

  if (isCorrect) {
    const streak = word.correct_streak + 1;
    const days = INTERVAL_DAYS[Math.min(streak - 1, INTERVAL_DAYS.length - 1)];
    const next = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return {
      correct_streak: streak,
      wrong_count: word.wrong_count,
      practice_count: practiceCount,
      stage,
      next_review_at: next.toISOString(),
      last_reviewed_at: now.toISOString(),
    };
  }

  const next = new Date(now.getTime() + WRONG_RETRY_MINUTES * 60 * 1000);
  return {
    correct_streak: 0,
    wrong_count: word.wrong_count + 1,
    practice_count: practiceCount,
    stage,
    next_review_at: next.toISOString(),
    last_reviewed_at: now.toISOString(),
  };
}

// Menyimpan hasil satu jawaban: jadwal ulang kata dan catatan riwayat latihan
export async function saveAnswer(
  userId: string,
  word: PracticeWord,
  isCorrect: boolean,
  xpEarned: number,
  exerciseType: PracticeMode = 'fill_blank'
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
    exercise_type: exerciseType,
    is_correct: isCorrect,
    xp_earned: xpEarned,
  });

  if (logError) {
    throw new Error(logError.message);
  }

  return { ...word, ...update };
}

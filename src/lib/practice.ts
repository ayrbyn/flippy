import { UserWord } from './flashcards';
import { supabase } from './supabase';

export type PracticeWord = UserWord & {
  correct_streak: number;
  correct_count: number;
  wrong_count: number;
  next_review_at: string;
  practice_count: number;
};

export type PracticeMode = 'fill_blank' | 'recall_word';
export type PracticeScope = 'new_words' | 'all_words';
export type PracticePoolCounts = { newWords: number; allWords: number };

export const SESSION_SIZE = 10;

export async function countPracticePool(courseId: string): Promise<PracticePoolCounts> {
  const [allResult, newResult] = await Promise.all([
    supabase.from('user_words').select('id', { count: 'exact', head: true }).eq('course_id', courseId),
    supabase.from('user_words').select('id', { count: 'exact', head: true }).eq('course_id', courseId).eq('practice_count', 0),
  ]);

  if (allResult.error) throw new Error(allResult.error.message);
  if (newResult.error) throw new Error(newResult.error.message);
  return { allWords: allResult.count ?? 0, newWords: newResult.count ?? 0 };
}

export async function fetchPracticeWords(courseId: string, scope: PracticeScope): Promise<PracticeWord[]> {
  const pageSize = 500;
  const selected: PracticeWord[] = [];
  let seen = 0;

  // Walk the full pool; reservoir sampling gives a uniform sample from every page.
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase
      .from('user_words').select('*').eq('course_id', courseId)
      .order('created_at', { ascending: true }).order('id', { ascending: true })
      .range(offset, offset + pageSize - 1);
    if (scope === 'new_words') query = query.eq('practice_count', 0);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    const page = (data ?? []) as PracticeWord[];

    for (const word of page) {
      seen += 1;
      if (scope === 'new_words' || selected.length < SESSION_SIZE) {
        selected.push(word);
      } else {
        const slot = Math.floor(Math.random() * seen);
        if (slot < SESSION_SIZE) selected[slot] = word;
      }
    }
    if (page.length < pageSize) break;
  }

  return selected;
}

export async function countWordsAddedToday(courseId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { count, error } = await supabase.from('user_words')
    .select('id', { count: 'exact', head: true })
    .eq('course_id', courseId).gte('created_at', start.toISOString());
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export function buildBlank(sentence: string, form: string): { before: string; after: string } {
  const index = sentence.toLowerCase().indexOf(form.toLowerCase());
  if (index === -1) return { before: sentence + ' ', after: '' };
  return { before: sentence.slice(0, index), after: sentence.slice(index + form.length) };
}

export type PracticeAnswerResult = {
  is_correct: boolean;
  xp_earned: number;
  word: PracticeWord;
  profile: {
    total_xp: number;
    current_streak: number;
    longest_streak: number;
    last_practice_date: string;
  };
};

export function localPracticeDate(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// The backend validates and saves answer, card, history, XP, and streak atomically.
export async function saveAnswer(
  wordId: string,
  answer: string,
  exerciseType: PracticeMode,
  hintUsed: boolean,
  exampleIndex: 1 | 2,
  localDate: string
): Promise<PracticeAnswerResult> {
  const { data, error } = await supabase.rpc('record_practice_answer', {
    p_word_id: wordId,
    p_answer: answer,
    p_exercise_type: exerciseType,
    p_hint_used: hintUsed,
    p_example_index: exampleIndex,
    p_local_date: localDate,
  });
  if (error) throw new Error(error.message);
  return data as PracticeAnswerResult;
}

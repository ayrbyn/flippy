-- Flippy: skema database awal
-- Berisi: profil, kursus, cache flashcard umum, kata milik pengguna,
-- riwayat latihan, laporan flashcard, dan pembatas penggunaan AI.

-- ============================================================
-- 1. PROFIL PENGGUNA (data gamifikasi gabungan semua kursus)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  total_xp integer not null default 0,
  current_streak integer not null default 0,
  longest_streak integer not null default 0,
  last_practice_date date,
  created_at timestamptz not null default now()
);

-- Otomatis membuat profil saat ada pengguna baru mendaftar
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. KURSUS (satu pengguna bisa punya banyak kursus)
-- ============================================================
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_language text not null,        -- bahasa yang dipelajari, contoh: en, ja, ko
  explanation_language text not null,   -- bahasa penjelasan, contoh: id
  level text not null default 'beginner'
    check (level in ('beginner', 'intermediate', 'advanced')),
  daily_word_goal integer not null default 5 check (daily_word_goal > 0),
  created_at timestamptz not null default now(),
  unique (user_id, target_language, explanation_language)
);

create index courses_user_id_idx on public.courses (user_id);

-- ============================================================
-- 3. CACHE FLASHCARD UMUM (dipakai bersama oleh semua pengguna)
-- Hanya Edge Function (service role) yang boleh menulis ke tabel ini.
-- ============================================================
create table public.shared_flashcards (
  id uuid primary key default gen_random_uuid(),
  word_normalized text not null,        -- kata dalam huruf kecil dan tanpa spasi berlebih
  target_language text not null,
  explanation_language text not null,
  word text not null,
  definition text not null,
  part_of_speech text,
  reading text,                         -- cara baca: romaji, pinyin, dan sejenisnya
  example_sentence text not null,
  example_translation text,
  word_form_in_sentence text not null,  -- bentuk kata persis yang dipakai di kalimat
  created_at timestamptz not null default now(),
  unique (word_normalized, target_language, explanation_language)
);

-- ============================================================
-- 4. KATA MILIK PENGGUNA (salinan pribadi, boleh diedit pengguna)
-- ============================================================
create table public.user_words (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  course_id uuid not null references public.courses (id) on delete cascade,
  shared_flashcard_id uuid references public.shared_flashcards (id) on delete set null,

  word text not null,
  definition text not null,
  part_of_speech text,
  reading text,
  example_sentence text not null,
  example_translation text,
  word_form_in_sentence text not null,

  -- data penjadwalan ulang sederhana
  stage text not null default 'new'
    check (stage in ('new', 'learning', 'memorized')),
  correct_streak integer not null default 0,
  wrong_count integer not null default 0,
  next_review_at timestamptz not null default now(),
  last_reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  unique (course_id, word)
);

create index user_words_review_idx
  on public.user_words (user_id, course_id, next_review_at);

-- ============================================================
-- 5. RIWAYAT LATIHAN
-- ============================================================
create table public.practice_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_word_id uuid not null references public.user_words (id) on delete cascade,
  exercise_type text not null default 'fill_blank',
  is_correct boolean not null,
  xp_earned integer not null default 0,
  answered_at timestamptz not null default now()
);

create index practice_logs_user_idx
  on public.practice_logs (user_id, answered_at desc);

-- ============================================================
-- 6. LAPORAN FLASHCARD YANG KELIRU
-- ============================================================
create table public.flashcard_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_word_id uuid references public.user_words (id) on delete set null,
  shared_flashcard_id uuid references public.shared_flashcards (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

-- ============================================================
-- 7. PEMBATAS PENGGUNAAN AI PER HARI
-- ============================================================
create table public.ai_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  usage_date date not null default current_date,
  generation_count integer not null default 0,
  primary key (user_id, usage_date)
);

-- ============================================================
-- 8. ROW LEVEL SECURITY (data tiap pengguna terpisah)
-- ============================================================
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.shared_flashcards enable row level security;
alter table public.user_words enable row level security;
alter table public.practice_logs enable row level security;
alter table public.flashcard_reports enable row level security;
alter table public.ai_usage enable row level security;

-- profiles
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- courses
create policy "courses_select_own" on public.courses
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "courses_insert_own" on public.courses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "courses_update_own" on public.courses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "courses_delete_own" on public.courses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- shared_flashcards: semua pengguna login boleh membaca, tidak ada yang boleh menulis
-- (Edge Function memakai service role, yang melewati aturan ini)
create policy "shared_flashcards_select_all" on public.shared_flashcards
  for select to authenticated
  using (true);

-- user_words
create policy "user_words_select_own" on public.user_words
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_words_insert_own" on public.user_words
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_words_update_own" on public.user_words
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_words_delete_own" on public.user_words
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- practice_logs
create policy "practice_logs_select_own" on public.practice_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "practice_logs_insert_own" on public.practice_logs
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- flashcard_reports
create policy "flashcard_reports_select_own" on public.flashcard_reports
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "flashcard_reports_insert_own" on public.flashcard_reports
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ai_usage: pengguna hanya boleh melihat, penulisan lewat Edge Function
create policy "ai_usage_select_own" on public.ai_usage
  for select to authenticated
  using (user_id = (select auth.uid()));

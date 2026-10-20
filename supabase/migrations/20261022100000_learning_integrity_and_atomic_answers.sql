alter table public.user_words
  add column if not exists correct_count integer not null default 0,
  add column if not exists accepted_answers text[] not null default '{}',
  add column if not exists accepted_blank_answers text[] not null default '{}',
  add column if not exists example_sentence_2 text,
  add column if not exists example_translation_2 text,
  add column if not exists word_form_in_sentence_2 text;

alter table public.shared_flashcards
  add column if not exists accepted_answers text[] not null default '{}',
  add column if not exists accepted_blank_answers text[] not null default '{}',
  add column if not exists example_sentence_2 text,
  add column if not exists example_translation_2 text,
  add column if not exists word_form_in_sentence_2 text;

alter table public.practice_logs
  add column if not exists hint_used boolean not null default false,
  add column if not exists example_index integer not null default 1 check (example_index in (1, 2));

create table public.flashcard_generation_locks (
  word_normalized text not null,
  target_language text not null,
  explanation_language text not null,
  lock_token uuid not null,
  locked_until timestamptz not null,
  primary key (word_normalized, target_language, explanation_language)
);
alter table public.flashcard_generation_locks enable row level security;

create or replace function public.claim_flashcard_generation(
  p_word_normalized text,
  p_target_language text,
  p_explanation_language text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token uuid := pg_catalog.gen_random_uuid();
  v_claimed uuid;
begin
  insert into public.flashcard_generation_locks as current_lock (
    word_normalized, target_language, explanation_language, lock_token, locked_until
  ) values (
    p_word_normalized, p_target_language, p_explanation_language, v_token, now() + interval '3 minutes'
  )
  on conflict (word_normalized, target_language, explanation_language)
  do update set lock_token = excluded.lock_token, locked_until = excluded.locked_until
  where current_lock.locked_until < now()
  returning lock_token into v_claimed;

  return v_claimed;
end;
$$;

create or replace function public.release_flashcard_generation(
  p_word_normalized text,
  p_target_language text,
  p_explanation_language text,
  p_lock_token uuid
)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.flashcard_generation_locks
  where word_normalized = p_word_normalized
    and target_language = p_target_language
    and explanation_language = p_explanation_language
    and lock_token = p_lock_token;
$$;

revoke all on function public.claim_flashcard_generation(text, text, text) from public;
revoke all on function public.release_flashcard_generation(text, text, text, uuid) from public;
grant execute on function public.claim_flashcard_generation(text, text, text) to service_role;
grant execute on function public.release_flashcard_generation(text, text, text, uuid) to service_role;

-- Preserve historical practice and rebuild the mastery benchmark using correct answers.
update public.user_words as words
set practice_count = history.attempts,
    correct_count = history.unassisted_correct,
    stage = case
      when history.attempts = 0 then 'new'
      when history.unassisted_correct >= 10 then 'memorized'
      else 'learning'
    end,
    accepted_answers = case
      when cardinality(words.accepted_answers) = 0
        then array[words.word, words.word_form_in_sentence]
      else words.accepted_answers
    end,
    accepted_blank_answers = case
      when cardinality(words.accepted_blank_answers) = 0
        then array[words.word_form_in_sentence]
      else words.accepted_blank_answers
    end
from (
  select words.id,
         count(logs.id)::integer as attempts,
         count(logs.id) filter (where logs.is_correct and logs.xp_earned >= 10)::integer as unassisted_correct
  from public.user_words as words
  left join public.practice_logs as logs on logs.user_word_id = words.id
  group by words.id
) as history
where words.id = history.id;

create or replace function public.normalize_practice_answer(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    regexp_replace(lower(btrim(coalesce(p_text, ''))), '[[:punct:]]', '', 'g'),
    '[[:space:]]+', ' ', 'g'
  );
$$;

create or replace function public.record_practice_answer(
  p_word_id uuid,
  p_answer text,
  p_exercise_type text,
  p_hint_used boolean,
  p_example_index integer,
  p_local_date date
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_word public.user_words%rowtype;
  v_profile public.profiles%rowtype;
  v_expected text;
  v_answer text;
  v_is_correct boolean;
  v_practice_count integer;
  v_correct_count integer;
  v_correct_streak integer;
  v_wrong_count integer;
  v_stage text;
  v_xp integer;
  v_next_review_at timestamptz;
  v_today_streak integer;
  v_answers text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_exercise_type is null or p_exercise_type not in ('fill_blank', 'recall_word') then
    raise exception 'Unsupported exercise type';
  end if;
  if p_example_index is null or p_example_index not in (1, 2) then
    raise exception 'Unsupported example index';
  end if;
  if p_hint_used is null or p_local_date is null or length(btrim(coalesce(p_answer, ''))) = 0 then
    raise exception 'Answer, hint state, and local date are required';
  end if;
  if p_local_date < current_date - 1 or p_local_date > current_date + 1 then
    raise exception 'Invalid local practice date';
  end if;

  select * into v_word
  from public.user_words
  where id = p_word_id and user_id = v_user_id
  for update;
  if not found then
    raise exception 'Flashcard not found';
  end if;

  v_expected := case
    when p_exercise_type = 'fill_blank' and p_example_index = 2
      then coalesce(v_word.word_form_in_sentence_2, v_word.word_form_in_sentence)
    when p_exercise_type = 'fill_blank' then v_word.word_form_in_sentence
    else v_word.word
  end;
  v_answer := public.normalize_practice_answer(p_answer);
  if p_exercise_type = 'fill_blank' then
    v_answers := array_append(coalesce(v_word.accepted_blank_answers, '{}'::text[]), v_expected);
  else
    v_answers := array_append(coalesce(v_word.accepted_answers, '{}'::text[]), v_expected);
  end if;
  v_is_correct := exists (
    select 1 from unnest(v_answers) as candidate(value)
    where public.normalize_practice_answer(candidate.value) = v_answer
  );

  v_practice_count := v_word.practice_count + 1;
  v_correct_count := v_word.correct_count + case when v_is_correct and not p_hint_used then 1 else 0 end;
  v_correct_streak := case when v_is_correct and not p_hint_used then v_word.correct_streak + 1 else 0 end;
  v_wrong_count := v_word.wrong_count + case when v_is_correct then 0 else 1 end;
  v_stage := case
    when v_word.stage = 'memorized' or v_correct_count >= 10 then 'memorized'
    else 'learning'
  end;
  v_xp := case when v_is_correct then case when p_hint_used then 5 else 10 end else 0 end;

  if v_is_correct and not p_hint_used then
    v_next_review_at := now() + case least(v_correct_streak, 6)
      when 1 then interval '1 day'
      when 2 then interval '2 days'
      when 3 then interval '4 days'
      when 4 then interval '7 days'
      when 5 then interval '14 days'
      else interval '30 days'
    end;
  elsif v_is_correct then
    v_next_review_at := now() + interval '1 day';
  else
    v_next_review_at := now() + interval '10 minutes';
  end if;

  update public.user_words
  set practice_count = v_practice_count,
      correct_count = v_correct_count,
      correct_streak = v_correct_streak,
      wrong_count = v_wrong_count,
      stage = v_stage,
      next_review_at = v_next_review_at,
      last_reviewed_at = now()
  where id = v_word.id;

  insert into public.practice_logs (user_id, user_word_id, exercise_type, is_correct, xp_earned, hint_used, example_index)
  values (v_user_id, v_word.id, p_exercise_type, v_is_correct, v_xp, p_hint_used, p_example_index);

  select * into v_profile
  from public.profiles
  where id = v_user_id
  for update;
  if not found then
    insert into public.profiles (id) values (v_user_id)
    on conflict (id) do nothing;
    select * into v_profile
    from public.profiles
    where id = v_user_id
    for update;
  end if;

  v_today_streak := case
    when v_profile.last_practice_date = p_local_date then v_profile.current_streak
    when v_profile.last_practice_date = p_local_date - 1 then v_profile.current_streak + 1
    else 1
  end;

  update public.profiles
  set total_xp = total_xp + v_xp,
      current_streak = v_today_streak,
      longest_streak = greatest(longest_streak, v_today_streak),
      last_practice_date = p_local_date
  where id = v_user_id
  returning * into v_profile;

  select * into v_word from public.user_words where id = v_word.id;

  return jsonb_build_object(
    'is_correct', v_is_correct,
    'xp_earned', v_xp,
    'word', to_jsonb(v_word),
    'profile', to_jsonb(v_profile)
  );
end;
$$;

revoke all on function public.record_practice_answer(uuid, text, text, boolean, integer, date) from public;
grant execute on function public.record_practice_answer(uuid, text, text, boolean, integer, date) to authenticated;

comment on column public.user_words.correct_count is
  'Lifetime unassisted correct answers; ten correct answers mark the word memorized.';

notify pgrst, 'reload schema';

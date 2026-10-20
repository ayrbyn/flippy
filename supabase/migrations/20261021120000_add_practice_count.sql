alter table public.user_words
  add column if not exists practice_count integer not null default 0;

-- Seed the lifetime attempt counter from existing history so users keep their progress.
update public.user_words as words
set practice_count = attempts.total,
    stage = case
      when attempts.total >= 10 then 'memorized'
      when attempts.total = 0 and words.stage = 'new' then 'new'
      else 'learning'
    end
from (
  select words.id, count(logs.id)::integer as total
  from public.user_words as words
  left join public.practice_logs as logs on logs.user_word_id = words.id
  group by words.id
) as attempts
where words.id = attempts.id;

comment on column public.user_words.practice_count is
  'Lifetime number of practice answers for the word; 10 marks it memorized.';

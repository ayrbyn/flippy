-- Draft cards from the previous client were written before the user saved them.
-- Preserve any card that already has practice history, then remove untouched drafts.
update public.user_words as words
set saved_to_album_at = words.created_at
where words.saved_to_album_at is null
  and exists (
    select 1
    from public.practice_logs as logs
    where logs.user_word_id = words.id
  );

delete from public.user_words
where saved_to_album_at is null;

-- Keep personal cards out of the table until the explicit save action is used.
drop policy if exists user_words_insert_own on public.user_words;
create policy user_words_insert_own on public.user_words
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and saved_to_album_at is not null
  );

comment on column public.user_words.saved_to_album_at is
  'Set only when the user explicitly saves the flashcard to their album.';

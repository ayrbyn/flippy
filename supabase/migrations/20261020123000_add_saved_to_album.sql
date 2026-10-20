-- Kartu lama tetap menjadi bagian dari album bulanan.
-- Kartu baru masuk ke album setelah pengguna menekan tombol Simpan.
alter table public.user_words
  add column saved_to_album_at timestamptz;

update public.user_words
set saved_to_album_at = created_at
where saved_to_album_at is null;

create index user_words_saved_album_idx
  on public.user_words (user_id, course_id, created_at desc)
  where saved_to_album_at is not null;

# Flippy

Flippy is a mobile-first vocabulary journal built with Expo and React Native. Learners create AI-assisted flashcards with two example contexts, keep them in monthly albums, and practice words through active recall and sentence completion.

## Stack

- Expo SDK 57, React Native 0.86, TypeScript, Expo Router
- Supabase Auth and Postgres for accounts, courses, flashcards, and practice history
- Supabase Edge Function `buat-flashcard` for OpenRouter-backed card generation and shared card caching
- Caveat for handwritten headings; system sans-serif for reading and controls

## Run locally

1. Install the locked dependencies with `npm ci`.
2. Create `.env.local` with the Supabase project URL and anon key:

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=<public-anon-key>
   ```

3. Start Expo with `npx expo start`.

Never put a Supabase service-role key or OpenRouter key in the app's `EXPO_PUBLIC_*` variables. They belong in Supabase Edge Function secrets.

## Backend setup

- Apply the SQL files in `supabase/migrations` to the linked Supabase project with the Supabase CLI.
- Deploy `supabase/functions/buat-flashcard`.
- Configure `OPENROUTER_API_KEY` as an Edge Function secret. `OPENROUTER_MODEL` is optional; the default is a free model. The app has no daily creation cap by design. OpenRouter can still enforce its provider quotas; set account-level spend controls in OpenRouter if needed.
- Generation uses a shared cache and an expiring per-word lock to avoid duplicate OpenRouter calls when concurrent requests ask for the same uncached word.

## Main flows

- **Home:** active course, daily learning target, XP/streak, reminders, and practice entry point.
- **Kata:** add a word, preview and flip its flashcard, then save it to the monthly album.
- **Album:** browse saved cards by creation month and day; open a card to view it full size.
- **User:** account progress, learned languages/courses, course switching, and logout.
- **Practice:** choose unpracticed words or a random sample of up to ten cards. The exercise method is randomized per question. Ten unassisted correct answers mark a word as memorized.

## Project structure

```text
src/app/                 Expo Router screens
src/components/          Shared UI components
src/constants/theme.ts   Palette, typography, and journal style tokens
src/lib/                 Supabase clients and application services
supabase/functions/      Edge Functions
supabase/migrations/     Database schema and migrations
assets/images/           App, tab, and splash artwork
assets/fonts/            Bundled Caveat font
```

## Useful commands

- `npx expo start` — start Metro and open the app
- `npx tsc --noEmit` — typecheck application code
- `npx expo lint` — lint when an ESLint configuration is present

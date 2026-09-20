# Sealed (codename)

Write a letter, seal it, choose when it opens. See `BUILD_BRIEF_SEALED.md` for the full
product brief, `CLAUDE.md` / `AGENTS.md` for the standing engineering rules, and
`DECISIONS.md` for choices made along the way.

"Sealed" is a codename only, kept in `app.config.ts` and `constants/brand.json`; the owner will
pick and trade-mark-check the final name before launch.

## Status

Phase 1 (locked letter backend) is complete. See `PHASE_0_NOTES.md` and `PHASE_1_NOTES.md`
for what shipped each phase, what was deferred, and what needs an owner decision.

## Stack

- Expo (managed workflow, development builds via `expo-dev-client`), TypeScript strict.
- `expo-router` for navigation, Zustand for client state, TanStack Query for server state.
- Supabase (Postgres, RLS, Storage, Edge Functions) as the backend; EU region, not yet
  provisioned (see `supabase/README.md`).
- RevenueCat for the one-time unlock (added in Phase 4).

## Prerequisites

- Node.js 20 or later and npm.
- An iOS Simulator (macOS + Xcode) or Android Emulator (Android Studio) for native builds, or
  the Expo Go / dev client app on a physical device. Not required for `npm run web`.

## Getting started

```sh
npm install
npm run web       # runs in the browser, fastest way to see it working
npm run ios       # requires macOS + Xcode
npm run android   # requires Android Studio / an emulator
```

## Checks

```sh
npm run typecheck    # tsc --noEmit
npm run lint          # eslint .
npm test              # jest, via the jest-expo preset (app + portable backend unit tests)
npm run test:backend  # RLS/RPC tests against a local Postgres; see supabase/tests/README.md
```

All four must pass before a phase is considered done.

## Project layout

```
app/                    expo-router routes (app/index.tsx is the home screen, app/debug.tsx
                         exercises the seal/claim/open/burn Edge Functions directly)
lib/supabase.ts          Supabase client, reads EXPO_PUBLIC_SUPABASE_URL/ANON_KEY
constants/brand.json     the BRAND constants (codename, display name, slug, scheme)
store/                   Zustand stores
supabase/migrations/     SQL schema, RLS policies, and the seal/claim/open/burn functions
supabase/functions/      Deno Edge Functions (thin wrappers around the SQL functions)
supabase/tests/          RLS/RPC test harness; see supabase/tests/README.md
assets/                  app icons and, later, stationery, seals, sounds
assets/licenses/          licence files for every non-original asset
```

## Environment variables

Copy `.env.example` to `.env` (gitignored, never commit it) once a Supabase project exists
(`supabase/README.md`):

```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

The debug screen (`/debug`) works without these set; it just shows a "not configured" message
instead of calling out to a project. EAS secrets cover anything needed for CI or store builds.

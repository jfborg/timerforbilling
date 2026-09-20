# Sealed (codename)

Write a letter, seal it, choose when it opens. See `BUILD_BRIEF_SEALED.md` for the full
product brief, `CLAUDE.md` / `AGENTS.md` for the standing engineering rules, and
`DECISIONS.md` for choices made along the way.

"Sealed" is a codename only, kept in `app.config.ts` and `constants/brand.json`; the owner will
pick and trade-mark-check the final name before launch.

## Status

Phase 0 (scaffold) is complete. See `PHASE_0_NOTES.md` for what shipped, what was deferred,
and what needs an owner decision before Phase 1.

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
npm run typecheck   # tsc --noEmit
npm run lint         # eslint .
npm test             # jest, via the jest-expo preset
```

All three must pass before a phase is considered done.

## Project layout

```
app/                 expo-router routes (app/index.tsx is the home screen)
constants/brand.json  the BRAND constants (codename, display name, slug, scheme)
store/                Zustand stores
supabase/             Supabase CLI config, SQL migrations, Edge Functions
assets/               app icons and, later, stationery, seals, sounds
assets/licenses/       licence files for every non-original asset
```

## Environment variables

None yet. Phase 1 adds a Supabase project URL and anon key via `.env` (see `.gitignore`;
never commit `.env`) and EAS secrets for anything used in CI or store builds.

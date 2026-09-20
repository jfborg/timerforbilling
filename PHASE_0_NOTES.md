# Phase 0 notes: Scaffold

## What was built

- `CLAUDE.md` and `AGENTS.md` at the repo root, carrying the brief's Standing rules, IP and
  content guardrails, and Security rules verbatim, plus a note on the phase-by-phase process
  and definition of done. `BUILD_BRIEF_SEALED.md` is committed alongside them so the rules
  files can reference it.
- An Expo managed-workflow app (SDK 57, RN 0.86, React 19.2) at the repo root: TypeScript
  strict, `expo-router` for navigation, Zustand for client state, TanStack Query wired up in
  the root layout, `expo-dev-client` installed for development builds.
- `app.config.ts` reading brand values from `constants/brand.json`, the single BRAND constants
  file (codename `SEALED`).
- A home screen (`app/index.tsx`) that renders the brand name and a Zustand-backed counter, to
  prove the router, state and query wiring all work together. No product UI yet; that starts
  Phase 2.
- Lint (`eslint` flat config via `eslint-config-expo`), type checking (`tsc --noEmit`), and
  tests (`jest` via `jest-expo`) all wired up as npm scripts and passing, plus a smoke test for
  the Zustand store.
- `supabase/` with the CLI config and empty `migrations/` and `functions/` folders, ready for
  Phase 1's schema and Edge Functions. No live Supabase project is linked (see Decisions
  needing the owner below).
- `assets/licenses/` with a README explaining the licence-tracking requirement, and a licence
  note for the placeholder template icons currently in `assets/`.
- `DECISIONS.md` logging the choices made this phase.
- `README.md` rewritten so the app builds and runs from a clean clone.

## Verified

- `npm run typecheck`, `npm run lint`, and `npm test` all pass clean.
- `npx expo export --platform web` bundles and exports successfully (826 modules), confirming
  the app actually builds, not just typechecks.
- iOS and Android builds were not run in this environment (no simulator or emulator available
  here); the Expo/React Native/expo-router/expo-dev-client versions installed are the versions
  SDK 57 itself pins, so there is no reason to expect a platform-specific break, but the owner
  should do a first real device or simulator run before trusting this claim fully.
- Guardrail text search: no em dashes anywhere in the repo; the only occurrences of "time
  capsule" are in `BUILD_BRIEF_SEALED.md`, `CLAUDE.md` and `AGENTS.md`, all referring to the
  guardrail itself, none in app copy.

## What was deferred

- Everything product-facing: compose, seal, claim, open flows, the three visual direction
  mocks, the letter schema and RLS, push, payments, safety tooling. All start in later phases
  per the brief's phase plan.
- A real Supabase project (needs the owner's account and an EU region choice).
- Final app name, bundle identifier and Android package (currently placeholders).
- EAS project setup and EAS secrets (needs the owner's Apple/Google developer accounts, brief
  section 12, question 3).

## Decisions needing the owner

These duplicate the brief's own section 12 questions, now that Phase 0 is the natural point to
raise them, plus one scaffold-specific item:

1. Final name, domain for letter links, and bundle identifiers (`app.config.ts` currently uses
   placeholders `app.sealedcodename.ios` / `app.sealedcodename.android`).
2. Visual direction A, B or C (needed before Phase 2's chosen-direction build).
3. Apple Developer and Google Play accounts, for EAS and RevenueCat.
4. Should opening require the app (the brief's default), or may text-only letters open on the
   web landing page?
5. Who reviews reports, and in what time frame?
6. Scaffold-specific: the dependency licence scan turned up a handful of transitive build-time
   packages outside the MIT/Apache-2.0/BSD/ISC list (BlueOak-1.0.0, MPL-2.0, Unlicense,
   Python-2.0, CC-BY-4.0). None ship in the app bundle; all are used only by the Node-based
   build toolchain. Full detail and reasoning in `DECISIONS.md`. Flagging per the guardrail;
   confirm this reading is acceptable.

## Next phase

Phase 1: locked letter backend (schema, RLS, Edge Functions for seal/claim/open/burn, and the
automated early-read security tests). Needs a live Supabase project to actually run against,
so getting that set up is the first blocking step once this phase is approved.

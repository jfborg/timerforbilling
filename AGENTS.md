# Project rules (SEALED)

This file is copied verbatim from the sections of the same name in `BUILD_BRIEF_SEALED.md`
(the project's build brief, kept by the owner). It exists so these rules persist across
sessions. If the brief and this file ever disagree, the brief is source of truth; update
this file to match.

Codename: SEALED. This is a codename only, not the final product name. Keep it confined to
`app.config.ts` and one `BRAND` constants file. The owner will run trade mark checks before
choosing a final name.

## IP and content guardrails (hard rules)

1. Do not copy the name, copy, screens, icons or flows of any existing app. Do not mention
   competitors anywhere in code, copy or store listings.
2. All stationery designs, seals, illustrations, sounds and animations must be original or
   under a permissive licence with the licence file committed under `assets/licenses/`.
3. Fonts: open licence only (OFL or Apache), licence committed.
4. Dependencies: MIT, Apache-2.0, BSD or ISC only. Flag anything else before installing.
5. No real brand marks, postal service logos, or stamp designs from any real postal operator.
6. All user-facing copy is written fresh. Never use em dashes in any copy or docs; use commas,
   colons, semicolons or restructure.

## Standing rules

- TypeScript strict. Expo managed workflow, latest stable SDK, development builds
  (expo-dev-client).
- expo-router, Zustand, TanStack Query.
- Backend: Supabase in an EU region. Postgres with row level security on every table, Storage
  for media, Edge Functions for anything privileged, anonymous auth first with optional
  upgrade to Sign in with Apple and Google.
- Payments: RevenueCat, one non-consumable product.
- Push: expo-notifications with Expo push service.
- All schema changes as SQL migrations in the repo. All RLS policies covered by automated
  tests that try to read a locked letter as the recipient, as a stranger, and as the sender
  after sealing.
- Commit after each working step. No secrets in the repo; use `.env` and EAS secrets.
- When unsure between two approaches, pick the simpler one and note the alternative in
  `DECISIONS.md`.

## Security rules (the product promise depends on these)

1. A sealed letter's body and media must be unreadable by the recipient before `unlock_at`,
   enforced on the server, never on the device. Only server time counts.
2. Letter content lives in a separate table and a private storage bucket. No client can select
   from them directly. An Edge Function returns the body and short-lived signed media URLs
   only if `now() >= unlock_at` and the caller is the claimed recipient or the sender.
3. After sealing, the sender can no longer edit. The sender may delete ("burn") an unopened
   letter.
4. Letter links use unguessable tokens (at least 128 bits). A letter can be claimed by one
   recipient account only; the first claim wins, and the sender is notified of the claim.
5. Encrypt at rest. Do not build end to end encryption in version 1, because reported content
   must be reviewable. State this honestly in the privacy copy; never claim "end to end" or
   "military grade".
6. Never upload the user's contacts. Sending happens only by sharing a link through the system
   share sheet, so the app holds no third-party phone numbers or emails.

## Process rules from the brief

- Work phase by phase (see `BUILD_BRIEF_SEALED.md` section 10). Stop at the end of each phase,
  summarise what was built, and wait for owner approval before starting the next one.
- Every phase ends with a `PHASE_N_NOTES.md` listing what was built, what was deferred, and
  decisions needing the owner.
- Definition of done for every phase: builds and runs on both platforms from a clean clone
  using only the README; tests pass, including the early-read security tests from Phase 1
  onward; no guardrail above is breached (search user-facing strings for em dashes and for
  "time capsule"); `PHASE_N_NOTES.md` written.

# Phase 1 notes: Locked letter backend

## What was built

- Schema (`supabase/migrations/20260920060918_letters_schema.sql`): `public.letters`
  (metadata: sender, recipient, status, stationery, unlock_at, timestamps) and
  `public.letter_contents` (body, media; zero RLS policies for anon/authenticated, ever). RLS
  on `letters` restricts direct select to the sender or the claimed recipient. The one public,
  unauthenticated read path is `get_letter_preview(token)`, a narrow security-definer function
  for the claim/landing page, returning envelope fields only.
- The four privileged operations (`supabase/migrations/20260920060919_letters_functions.sql`):
  `seal_letter`, `claim_letter`, `open_letter`, `burn_letter`, each a security-definer SQL
  function granted execute only to `service_role`. `seal_letter` validates input and generates
  a 128-bit base64url token; `claim_letter` is atomic first-claim-wins (row-locked);
  `open_letter` enforces `now() >= unlock_at` and sender-or-recipient identity before
  returning the body; `burn_letter` lets the sender delete an unopened letter's content.
- A private `letter-media` storage bucket (`...letter_media_storage.sql`), locked down, ready
  for Phase 4's upload flow.
- Deno Edge Functions (`supabase/functions/{seal,claim,open,burn}`): thin wrappers that verify
  the caller's JWT, validate the request shape, call the matching SQL function via a
  service-role client, and map its error to an HTTP status
  (`supabase/functions/_shared/errors.ts`, unit tested).
- `app/debug.tsx`: sign in anonymously, then exercise seal/claim/open/burn against a
  configured Supabase project, showing raw JSON responses. Shows a clear "not configured"
  message when no project is set up, per the debug-screen-only scope of this phase.
- `supabase/tests/`: a from-scratch RLS/RPC test harness running against a local Postgres 16
  (no Docker, no Deno; see "What was deferred"). 26 assertions across 6 files, run via
  `npm run test:backend`.

## Verified

- `npm run typecheck`, `npm run lint`, `npm test` (app tests + the portable
  `errors.ts` unit tests) all pass.
- `npm run test:backend` passes all 26 assertions, including the specific cases the brief
  calls out: a locked letter cannot be read early by the recipient, by a stranger, or by the
  sender after sealing, both by attempting `open_letter()` and by attempting a direct table
  read of `letter_contents`. Also covered: RLS on `letters` itself (sender/recipient/stranger/
  anon), `get_letter_preview()`, `seal_letter` input validation, first-claim-wins and its race
  case, a sender claiming their own letter, reading the exact sealed body once unlocked, and
  every burn guard (non-sender, already-opened).
- `npx expo export --platform web` still bundles cleanly (871 modules) with the debug screen
  and `@supabase/supabase-js` added.
- Guardrail text search: no em dashes anywhere in the repo; "time capsule" appears only in
  `BUILD_BRIEF_SEALED.md`/`CLAUDE.md`/`AGENTS.md` referring to the guardrail itself, never in
  app copy.
- `@supabase/supabase-js` is MIT licensed.

## What was deferred

- Running the actual Deno Edge Functions end to end (`supabase functions serve`) and
  `supabase start`'s local stack: both need Docker image pulls, which this sandbox's network
  policy blocks, and the Deno install script is blocked the same way. The Edge Function
  handlers are written and are thin enough that the SQL test suite covers the real risk
  surface (see DECISIONS.md), but the owner should still do one real `supabase functions
  serve` run, and a debug-screen pass against a real linked project, before trusting the HTTP
  layer fully.
- Media upload and signed-URL delivery (Phase 4 scope; the schema and `open_letter()` already
  support it).
- Push notification on claim ("the sender is notified of the claim," Phase 3 scope).
- Actually linking a Supabase project: still needs the owner's account and an EU region
  choice (unchanged from Phase 0).

## Decisions needing the owner

Carried over from Phase 0 (still open): final name/bundle identifiers, visual direction,
Apple/Google developer accounts, whether text-only letters can open on the web, who reviews
reports, and the build-tool dependency licence flag.

New this phase (full reasoning in `DECISIONS.md`):

1. A sender cannot claim their own letter. Assumed, not stated in the brief; flag if
   sending-to-self should actually work through the claim flow.
2. The dependency licence check is clean this phase (`@supabase/supabase-js` is MIT); no new
   flags.
3. Before Phase 2 builds real UI on top of this: confirm the `open_letter()` response shape
   (`bodyText`, `media`, `status`, `openedAt`) and the `seal`/`claim` request shapes in
   `supabase/functions/*/index.ts` are what the mobile app should actually send/expect, since
   nothing has exercised them against a live server yet.

## Next phase

Phase 2: send and receive, text only. Needs a live Supabase project linked (`supabase link` +
`supabase db push`) to actually run against, and the three visual direction mocks (brief
section 9) built and chosen before the real compose/receive screens.

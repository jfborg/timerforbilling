# Phase 2 notes: send and receive, text only

## Visual direction

Built three static mocks behind `/dev/visual-directions` (brief section 9), sent screenshots
for review, and the owner picked **A: classic stationery** (cream paper, red wax, serif). All
real screens below use it, via `constants/stationery.ts`.

## What was built

- **Compose → seal → share** (`app/compose.tsx`, `app/seal.tsx`, `app/share.tsx`): body text,
  sender display name, quick-pick unlock times (tonight, tomorrow morning, this weekend, in a
  month) plus a custom days/hours/minutes entry; a press-and-hold seal ritual with haptics;
  then the native share sheet with the claim link, or copy-to-clipboard.
- **Reply is a first-class backend feature, not just a second fresh letter.** New
  `reply_to_letter()` SQL function (Phase 1's functions migration, edited in place): only the
  original's opened recipient may call it, it auto-addresses and auto-claims the new letter to
  the original sender (no link/claim step needed, since the recipient is already known), and
  it is capped at one reply per original both in the function and by a unique index. New
  `reply` Edge Function, 9 new SQL test assertions (`supabase/tests/database/60_reply.test.sql`).
  `app/sent.tsx` is the reply confirmation screen (no share step).
- **Web landing page** (`web/`): plain HTML/CSS/JS, no build step. Reads
  `get_letter_preview` directly via PostgREST's RPC endpoint; shows the sealed envelope, a
  live countdown, and the claim code.
- **Claim, shelf, open** (`app/claim.tsx`, `app/shelf.tsx`, `app/open/[id].tsx`): "Have a
  letter? Enter your code," a shelf of claimed letters with live countdowns (reads `letters`
  directly, which RLS already permits for the sender/recipient), and the open ritual
  (tap-to-break-seal once unlocked, text fades in), with Write back / Keep / Report actions.
  Report is a stub alert until Phase 5.
- `store/useAuthStore.ts` (anonymous sign-in, shared across screens) and
  `store/useComposeStore.ts` (the in-progress draft, fresh or reply). Replaced the Phase 0
  scaffold Zustand store, now proven for real.

## Verified

- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run test:backend` all pass
  (backend suite: 35 assertions across 7 files, 9 of them new this phase for
  `reply_to_letter`).
- `npx expo export --platform web` bundles cleanly (893 modules).
- Live click-through with a real headless browser against `expo start --web` (not just the
  static export): home → compose (quick-picks and the custom picker both work, verified by
  screenshot) → seal screen renders. Claim, shelf, and open screens were also exercised; since
  no live Supabase project exists, their network calls fail against the placeholder URL as
  expected, which surfaced a real bug (see below) rather than just confirming the obvious.
- **Bug found and fixed during that walkthrough**: the shelf and open screens got stuck on
  "Signing in..." / "Loading..." forever if the anonymous sign-in call failed, with no
  indication anything was wrong. Both now surface the auth error with a Retry action. This
  was not a network-configuration artifact of this sandbox; it would happen to a real user
  with a real project too, anytime they open the app offline.
- Web landing page checked against a local mock PostgREST endpoint standing in for a real
  project (screenshot: countdown ticking, claim code shown, matches direction A styling).
- Dependency licence scan: no new flags beyond the Phase 0 build-tool transitives already
  documented.
- Guardrail text search: no em dashes anywhere in the repo; "time capsule" only in the rules
  docs referring to the guardrail itself, never in app or web copy.

## What was deferred

- The other two free stationery designs (asset-creation work, not code; see DECISIONS.md).
- A real native date/time picker for the compose screen's custom entry (see DECISIONS.md).
- A short, human-typeable claim code distinct from the full token (needs its own rate
  limiting to be safe; see DECISIONS.md).
- Open Graph preview image generation on the web landing page (explicit Phase 3 scope).
- Universal links / app links (explicit Phase 3 scope); "Have a letter? Enter your code" is
  the only claim path for now.
- Burn has no UI entry point yet (a "sent letters" list to burn from is natural Phase 3/6
  territory; the backend and its tests have been ready since Phase 1).
- Still no live Supabase project, so nothing in this phase has been exercised against a real
  backend end to end. Everything that could be verified without one was (see "Verified"
  above); the rest needs the owner's project linked.

## Decisions needing the owner

Carried over and still open: final name/bundle identifiers, Apple/Google developer accounts,
whether text-only letters can open on the web (built assuming the brief's stated default: no,
opening requires the app; the web page only shows the countdown and claim code), who reviews
reports, and the two new Phase 2 flags in `DECISIONS.md` (the claim-code simplification and
the one-stationery-design gap).

## Next phase

Phase 3: push and links. Needs a live Supabase project (for `expo-notifications` registration
and testing) and, ideally, Docker/Deno access to actually run `supabase functions serve` end
to end for the first time, per Phase 1's deferred item.

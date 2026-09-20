# Phase 3 notes: push and links

## What was built

- **Unlock and claim notifications.** New `push_tokens` (the one table clients write to
  directly; registering your own device is ordinary self-service, not privileged) and
  `notification_events` (an internal outbox, zero client access, same as `letter_contents`).
  `claim_letter()` enqueues a `letter_claimed` event for the sender the moment a claim
  actually happens; `collect_unlock_notifications()` sweeps for letters past `unlock_at` and
  enqueues `unlock_ready` events, both deduplicated by a unique index so repeat calls never
  double-send. `dispatch-notifications` (Edge Function) sweeps, sends via Expo's push API,
  marks sent. A pg_cron + pg_net migration schedules it every minute (real, deployable SQL;
  see "What could not be verified" below).
- **Client push registration** (`lib/pushNotifications.ts`): requests permission, gets an
  Expo push token, upserts it, and wires notification taps to open the relevant letter.
  Degrades to a no-op on web, on a simulator, or without a real EAS project id, rather than
  throwing.
- **Universal links / app links**: `app.config.ts` now declares `associatedDomains`
  (iOS) / `intentFilters` (Android) for the link domain, and `app/l/[token].tsx` is the
  in-app landing spot a verified link opens straight to (auto-claims, then goes to the
  shelf). `web/well-known/` holds the placeholder `apple-app-site-association` and
  `assetlinks.json` the OS actually checks to verify the domain, with a README on what needs
  replacing and why neither works yet.
- **Open Graph preview images, and a fix to make them actually work.** Phase 2's web landing
  page was a static SPA that fetched letter data client-side; link-unfurling crawlers
  (iMessage, WhatsApp, Slack, ...) never run that JavaScript, so every letter would have
  unfurled identically regardless of sender or unlock date, undercutting the core growth
  loop. The page is now server-rendered (`supabase/functions/link-page`), with the preview
  data already fetched and embedded before the HTML is returned, paired with an `og-image`
  function that draws the actual preview image (SVG). Both are thin glue around portable,
  Jest-tested builders (`_shared/linkPageHtml.ts`, `_shared/ogImage.ts`). `web/index.html`
  was deleted rather than kept alongside as a second, now-wrong implementation.

## Verified

- `npm run typecheck`, `npm run lint`, `npm test` (24 unit tests now, 9 new this phase across
  the two portable HTML/SVG builders) all pass.
- `npm run test:backend`: 53 SQL assertions (18 new this phase) covering `push_tokens` RLS
  and the full notification pipeline: claim enqueues exactly one event, addressed correctly,
  idempotent on re-claim; the unlock sweep only fires once `unlock_at` has passed and never
  duplicates; dequeue correctly joins only users who have a registered token; mark-sent
  removes an event from the pending queue; `notification_events` has no client access in any
  role; `collect_unlock_notifications` is service_role only.
- `npx expo export --platform web` bundles cleanly (961 modules).
- Live click-through against `expo start --web` with a real headless browser (not just the
  static export): the new `/l/[token]` deep-link screen renders and, with no live backend
  configured, surfaces a clear error with a manual-code fallback rather than hanging silently
  (following the same fix pattern Phase 2 established for `/shelf` and `/open/[id]`).
- The two new Edge Functions can't run live (no Deno; see DECISIONS.md), so their actual
  HTML/image output was checked a different way: transpiled the portable builders with the
  `typescript` package already in `node_modules`, fed them representative data, and rendered
  the results with the same headless browser. Confirmed `og:title`/`og:description`/
  `og:image` are correctly populated per letter (screenshot: the rendered landing page shows
  "From Alex" and a live countdown; the OG image is a clean 1200x630 SVG).
- Dependency licence scan: no new flags (`expo-notifications`, `expo-device` are both
  Apache-2.0/MIT, matching every other Expo-published package so far).
- Guardrail text search: no em dashes anywhere in the repo (including in generated HTML,
  which now has its own test asserting that); "time capsule" only in the rules docs and one
  test name referring to the guardrail itself, never in app, web, or generated copy.
- Both `.well-known` placeholder files are valid JSON.

## What could not be verified (needs a real device / project / domain)

- Actually receiving a push notification: needs a physical device, a real EAS project id, and
  the dispatch pipeline actually running against a live project.
- The pg_cron scheduling migration itself: needs pg_cron, pg_net, and Vault, which are
  Supabase platform features a local Postgres install cannot stand in for (unlike
  `auth`/`storage`, which the test harness already shims). Explicitly skipped by
  `supabase/tests/run.mjs`, with the reasoning in the file and in DECISIONS.md. The SQL
  functions it schedules are fully covered on their own.
- Universal links / app links actually opening the app: needs a real, DNS-owned domain
  serving the `.well-known` files (still placeholders) plus real Apple/Google developer
  accounts, none of which exist yet.
- `supabase functions serve` for `link-page`/`og-image`/`dispatch-notifications`: same Deno
  limitation as every Edge Function since Phase 1. Their logic was exercised as directly as
  this sandbox allows (SQL functions via the local harness, HTML/SVG builders via Jest and a
  rendered-output check); the HTTP glue itself is unexercised.

## Decisions needing the owner

Carried over and still open: final name/domain/bundle identifiers, Apple/Google developer
accounts (now blocking more than before: push tokens and universal link verification both
need them), who reviews reports, the one-stationery-design gap, and the short-claim-code
simplification. New this phase (full reasoning in `DECISIONS.md`): the SVG-not-PNG choice for
the Open Graph image, and the fetch-and-forget (not receipt-tracked) notification delivery.

## Next phase

Phase 4: media and payments. Needs real Apple/Google developer accounts and a RevenueCat
project even more than Phase 3 did (push tokens and link verification could at least be
built and reasoned about without them; in-app purchases cannot be tested at all without a
sandbox App Store / Play Console setup). Worth raising with the owner before starting.

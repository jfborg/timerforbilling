# Decisions

Log of choices made when two reasonable approaches existed, per the standing rule to pick the
simpler one and note the alternative here.

## Phase 2

**A reply is a first-class backend concept (reply_to_letter), not a fresh seal + share.**
Monetisation (brief section 7) treats "replying to a letter you received" as always free and
capped at one per received letter, which only makes sense if a reply is addressed
automatically to the original sender rather than sealed with its own shareable link that
someone has to claim. `reply_to_letter()` (new in the Phase 1 functions migration, edited in
place since nothing has been deployed to a real project yet) auto-addresses and auto-claims
the new letter, requires the original to already be opened by the caller, and is enforced to
happen at most once per original both in the function and by a unique partial index
(`letters_one_reply_per_original`), so the limit holds even if another write path onto
`letters` is ever added.

**The "short claim code" from brief section 6 is, for now, the same 128-bit token used in the
link, just typed instead of tapped.** A genuinely short, human-typeable code would need its
own rate limiting (it has far less entropy than the token, so an unthrottled claim endpoint
would make it brute-forceable) and a way to map it back to the real token, which is a security
design task in its own right, not just "make the string shorter." Shipping a weak code without
that would undercut the same rule 4 that requires the link's token to be unguessable.
Documented here rather than silently narrowing the brief's wording; revisit once rate limiting
exists (naturally fits alongside Phase 5's safety work).

**Only one stationery design (classic-cream, matching chosen direction A) ships this phase.**
The brief asks for 3 free designs, but the other two are original-artwork or licensed-asset
work (guardrail 2), not something to fabricate placeholder-quality just to hit a count.
Flagged for the owner; `constants/stationery.ts` is structured so adding more is just adding
entries.

**The compose screen's "date and time picker" is quick-picks plus a days/hours/minutes-from-now
custom entry, not a native calendar picker.** `@react-native-community/datetimepicker` has a
patchy cross-platform (especially web) story and this sandbox cannot device-test it across iOS/
Android/web to be confident in it. The current control still lets someone dial in an exact
time; treat it as a placeholder for a real date/time picker in a later polish pass.

**Web landing page is plain HTML/CSS/JS with no build step**, reading `get_letter_preview` via
a direct PostgREST RPC call rather than through an Edge Function. The brief's "static site plus
one Edge Function" Edge Function is the Open Graph preview image generator, which is explicit
Phase 3 scope; nothing in Phase 2's landing page needs privileged access, so there is no Edge
Function to write yet.

**Store badges on the web landing page are plain text buttons, not the real Apple/Google
badge graphics.** Embedding those trademarked assets without rights would breach guardrail 1
the same way a fabricated postal-service stamp would breach guardrail 5; swap them once the
page actually links somewhere.

## Phase 1

**Privileged logic lives in security-definer SQL functions, not in the Edge Functions
themselves.** seal_letter/claim_letter/open_letter/burn_letter (supabase/migrations) are
Postgres functions granted execute only to `service_role`; anon and authenticated get no grant
at all, so a client still can never call them directly, only through the matching Edge
Function. The Edge Functions (supabase/functions/{seal,claim,open,burn}) are thin: verify the
caller's JWT, validate the request shape, call the RPC, map its error to an HTTP status. This
keeps "Edge Functions for anything privileged" true as the client-facing contract while making
the actual security-critical logic (the atomic first-claim-wins update, the unlock_at/identity
check before returning content) fully testable with plain SQL, which matters because of the
next decision.

**Docker and Deno are both unavailable in this sandbox** (outbound network policy blocks
Docker Hub image pulls and the Deno install script), so `supabase start` and
`supabase functions serve` cannot run here, and pgTAP-in-Docker (the standard way Supabase
recommends testing RLS) isn't an option either. PostgreSQL 16 server binaries are already
installed locally, though (a `postgres` OS user and cluster, started with
`service postgresql start`), so `npm run test:backend` (supabase/tests/) applies the real
migrations to a local database with a hand-built stand-in for the `auth`/`storage` schemas
Supabase normally provides, then runs SQL assertions against it directly. See
supabase/tests/README.md for the full design and its two psql gotchas (temp tables across a
`SET ROLE`, and `:variable` substitution not reaching inside `DO $$ ... $$` bodies). The Deno
Edge Function handlers themselves are written but not executable in this sandbox; they're thin
enough (see above) that the real risk surface is covered by the SQL tests, but the owner
should still run `supabase functions serve` once locally before trusting the HTTP layer fully.

**unlock_at bounds are enforced by a BEFORE INSERT trigger, not a table CHECK constraint.** A
CHECK constraint re-validates on every UPDATE too, which would block the test suite's only way
to simulate "time has passed" (moving a row's unlock_at into the past). The 1-minute/12-month
bounds are genuinely an insert-time-only concern: nothing in the product ever legitimately
updates unlock_at after sealing.

**Burn soft-deletes.** burn_letter deletes the letter_contents row (the actual thing that
needs to stop existing) but leaves the letters row behind with status='burned', rather than
deleting it outright. This keeps the token and id resolving to "gone" instead of a dangling
reference, and get_letter_preview()/open_letter() both already filter burned letters out.

**A sender cannot claim their own letter.** Not stated explicitly in the brief; added as a
product-integrity assumption (claim_letter rejects it) since a self-claimed letter doesn't fit
the "person to person" positioning. Flagging for the owner in case sending-to-self should
actually be allowed to flow through claim rather than being a separate mode later.

**Media upload and signed-URL delivery are not built yet**, on purpose: brief section 10 puts
media in Phase 4, and Phase 2's own send/receive flow is text-only. open_letter() already
returns signed URLs for whatever is in letter_contents.media, and the seal_letter()/Edge
Function signature already accepts a media array, so Phase 4 should only need to add the
upload path, not another schema migration. The letter-media storage bucket exists (migration
20260920060920) but has no anon/authenticated storage policies yet; nothing needs them until
there's an upload flow to authorize.

**supabase/functions is excluded from the root tsconfig and ESLint config.** Its handlers use
Deno-only globals and `npm:` import specifiers that a Node-flavored TypeScript/ESLint setup
can't resolve; Deno has its own type checker and linter for them, usable once Docker/Deno are
available. The one portable, Deno-free file, `_shared/errors.ts` (HTTP status mapping), is
explicitly re-included in both configs and covered by a normal Jest test, since duplicating it
into a separate Node-only copy just to keep it typechecked wasn't worth carrying two sources of
truth for ~30 lines of mapping logic.

## Phase 0

**Repo repurposed from "timer for billing" to the Sealed Letters app.** The repository was
created under the name `timerforbilling` with an unrelated one-line README. The owner
confirmed this repo is the new home for the Sealed Letters app described in
`BUILD_BRIEF_SEALED.md`. The old README content was replaced; the repo name itself was left
unchanged since renaming a GitHub repository is a separate, owner-level action.

**App lives at the repo root, not in a subfolder.** Simpler for a single-app repo and matches
the "builds and runs from a clean clone using only the README" requirement. Alternative
considered: a `apps/mobile` layout for a future monorepo (e.g. if the admin web view or the
letter-link landing page later need their own packages). Revisit in Phase 3 (Open Graph
preview function) or Phase 5 (admin view) if a second deployable shows up.

**Bundle identifier and Android package are placeholders** (`app.sealedcodename.ios` /
`app.sealedcodename.android`) since the final name, and Apple/Google developer accounts, are
still open questions for the owner (brief section 12). Update these in `app.config.ts` and
`constants/brand.json` once the owner decides.

**BRAND constants file is JSON, not TypeScript.** `app.config.ts`'s loader
(`@expo/require-utils`) only transpiles the entry file itself; a relative `import` of another
local `.ts` file from it fails with `Cannot find module`, since Node's own `require` doesn't
know to resolve a bare specifier to a `.ts` file. JSON imports work natively in both the config
loader and Metro (via `resolveJsonModule`, already on in `expo/tsconfig.base`), so
`constants/brand.json` stays the single source both `app.config.ts` and app code read from,
without a custom require hook or duplicating the values.

**ESLint pinned to `^9` instead of the newly released `10.x`.** `eslint-config-expo`'s
dependency, `eslint-plugin-react`, only supports ESLint up to `^9.7` today; ESLint 10 broke it
with a `contextOrFilename.getFilename is not a function` error. Revisit once
`eslint-plugin-react` publishes ESLint 10 support.

**`@react-native/jest-preset` pinned to `0.86.3` to match `react-native`.** npm resolved the
newer `0.87.1` by default, which assumes a `react-native` layout (`setup-env.js` location) that
doesn't exist in `0.86.3`. Keep this pin in step with the `react-native` version on every Expo
SDK bump.

**Dependency licence check flagged, not blocked.** The standing rule restricts dependencies to
MIT, Apache-2.0, BSD or ISC, and asks that anything else be flagged before installing. A
`license-checker --production` scan turned up a handful of transitive build-time packages
outside that list: `BlueOak-1.0.0` (glob, lru-cache, minimatch, minipass, path-scurry, sax,
all from Isaac Z. Schlueter's tooling, a permissive OSI-approved licence), `MPL-2.0`
(lightningcss, used by Metro/web tooling, weak copyleft that only affects modifications to its
own files), `Unlicense` (big-integer, stream-buffers, public domain equivalent), `Python-2.0`
(argparse, permissive), and `CC-BY-4.0` (caniuse-lite, a data file, not code, consumed by
browserslist at build time). None of these ship in the app bundle; they run only inside the
Node-based build toolchain (Metro, Babel, the Supabase CLI). Flagging here per the rule rather
than trying to strip them out, since doing so would mean forking or replacing core parts of the
Expo/Metro toolchain itself. Owner: confirm this reading of the guardrail is acceptable, or say
if it should apply strictly even to build-only transitive dependencies.

**No live Supabase project yet.** Creating one needs the owner's Supabase account and a choice
of EU region. `supabase/` has the CLI config and empty `migrations/` and `functions/` folders
so Phase 1 can start as soon as a project exists; see `supabase/README.md`.

**`react-test-renderer` pinned to `19.2.3` to match `react`.** npm resolved `19.3.0` by
default under `--legacy-peer-deps`, which conflicts with the `react@19.2.3` version Expo SDK 57
expects; pin both together on future upgrades.

**Testing stack: Jest via `jest-expo`, not Vitest or another runner.** `jest-expo` is Expo's
supported preset and handles React Native's module transforms out of the box; a from-scratch
Vitest setup would need its own React Native mocking work for no real benefit at this stage.

# Decisions

Log of choices made when two reasonable approaches existed, per the standing rule to pick the
simpler one and note the alternative here.

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

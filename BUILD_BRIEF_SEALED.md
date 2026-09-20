# BUILD BRIEF: Sealed Letters App (codename "SEALED")

You are the lead engineer on a new iOS and Android app. Read this whole file before writing code. Work phase by phase, stop at the end of each phase, summarise what you built, and wait for approval before starting the next one.

First action: copy the "Standing rules", "IP and content guardrails" and "Security rules" sections into both `CLAUDE.md` and `AGENTS.md` at the repo root so they persist across sessions.

---

## 1. Product in one paragraph

Write a letter to someone, seal it, and choose when it opens. The recipient gets a link showing a sealed envelope and a countdown. When the moment arrives they open it in the app with a small ritual (break the seal, unfold the paper), and are invited to write back. Receiving is always free. The sender gets a few free letters, then pays a one-time EUR 5.99 unlock. Every letter sent is an invitation to a new user, which is the whole growth model.

SEALED is a codename only. Keep it in `app.config.ts` and one `BRAND` constants file. The owner will run trade mark checks before choosing a final name.

## 2. Positioning (why this is not another time capsule app)

The stores already hold many small "time capsule" apps. None is dominant, and most aim at long horizons (open in 10 years) and at writing to your future self. Both choices kill growth: no second person, and no feedback for years. This app does the opposite:

- Person to person first. Writing to yourself exists but is secondary.
- Short horizons. Default choices are tonight, tomorrow morning, this weekend, a birthday. Maximum lock time in version 1 is 12 months.
- A letter, not a vault. One envelope, one piece of paper, optional photo, voice note or short video. No folders, no feeds.
- The opening is the product. Invest most design effort in the 10 seconds of opening.

Do not use the phrase "time capsule" in the app name or primary copy.

## 3. IP and content guardrails (hard rules)

1. Do not copy the name, copy, screens, icons or flows of any existing app. Do not mention competitors anywhere in code, copy or store listings.
2. All stationery designs, seals, illustrations, sounds and animations must be original or under a permissive licence with the licence file committed under `assets/licenses/`.
3. Fonts: open licence only (OFL or Apache), licence committed.
4. Dependencies: MIT, Apache-2.0, BSD or ISC only. Flag anything else before installing.
5. No real brand marks, postal service logos, or stamp designs from any real postal operator.
6. All user-facing copy is written fresh. Never use em dashes in any copy or docs; use commas, colons, semicolons or restructure.

## 4. Standing rules

- TypeScript strict. Expo managed workflow, latest stable SDK, development builds (expo-dev-client).
- expo-router, Zustand, TanStack Query.
- Backend: Supabase in an EU region. Postgres with row level security on every table, Storage for media, Edge Functions for anything privileged, anonymous auth first with optional upgrade to Sign in with Apple and Google.
- Payments: RevenueCat, one non-consumable product.
- Push: expo-notifications with Expo push service.
- All schema changes as SQL migrations in the repo. All RLS policies covered by automated tests that try to read a locked letter as the recipient, as a stranger, and as the sender after sealing.
- Commit after each working step. No secrets in the repo; use `.env` and EAS secrets.
- When unsure between two approaches, pick the simpler one and note the alternative in `DECISIONS.md`.

## 5. Security rules (the product promise depends on these)

1. A sealed letter's body and media must be unreadable by the recipient before `unlock_at`, enforced on the server, never on the device. Only server time counts.
2. Letter content lives in a separate table and a private storage bucket. No client can select from them directly. An Edge Function returns the body and short-lived signed media URLs only if `now() >= unlock_at` and the caller is the claimed recipient or the sender.
3. After sealing, the sender can no longer edit. The sender may delete ("burn") an unopened letter.
4. Letter links use unguessable tokens (at least 128 bits). A letter can be claimed by one recipient account only; the first claim wins, and the sender is notified of the claim.
5. Encrypt at rest. Do not build end to end encryption in version 1, because reported content must be reviewable. State this honestly in the privacy copy; never claim "end to end" or "military grade".
6. Never upload the user's contacts. Sending happens only by sharing a link through the system share sheet, so the app holds no third-party phone numbers or emails.

## 6. Core flows

### Send
1. Choose stationery (3 free designs).
2. Write. Optional: one photo (free), voice note or video up to 60 seconds (paid). Compress media on device before upload.
3. Choose when it opens: quick picks plus a date and time picker. Minimum 1 minute, maximum 12 months.
4. Seal: press and hold to stamp a wax seal, with haptics and sound. This is a signature moment; make it feel good.
5. Share sheet opens with a link. The link preview (Open Graph image, generated by an Edge Function) shows the sealed envelope, the sender's chosen display name and the opening date. Never any content.

### Receive
1. Link opens a small web page (static site plus one Edge Function): sealed envelope, live countdown, store buttons, and a short claim code.
2. With the app installed, the universal link or app link opens the letter directly. If not installed, the user installs and the app offers "Have a letter? Enter your code" on first launch. Do not add a third-party deferred deep link SDK in version 1.
3. Claimed letters sit on a shelf with countdowns. A push notification fires at unlock time.
4. Opening ritual: tap and drag to break the seal, paper unfolds, text fades in, media plays after the text.
5. After reading: "Write back" is the primary button. Secondary: keep, or report.

### Reaction (Phase 5, opt in)
Before opening, the recipient can choose to record their reaction with the front camera. After opening they review it and decide whether to send it to the sender. Nothing is recorded or sent without both explicit choices. This is the strongest sharing mechanic in the product, so it must be beyond reproach on consent.

## 7. Monetisation

- Always free: receiving, opening, replying to a letter you received (one reply per received letter), 3 stationery designs.
- Free sender allowance: 3 letters per calendar month, text plus one photo.
- One-time unlock, EUR 5.99: unlimited letters, voice and video, all stationery, custom seal initials, "open when" location unlock (Phase 6), group letters (Phase 6).
- Paywall appears only when a free limit is hit, never on first launch and never on the receive path.
- Cost control, because revenue is one-time while storage is ongoing: 60 second video cap, on-device compression, media deleted 90 days after opening unless the recipient saves it to their device (tell them clearly), hard 12 month maximum lock.

## 8. Safety, moderation and compliance

The owner is a lawyer and will finalise legal texts. Build the mechanisms:

- Age gate: 16 plus. Store age rating set accordingly.
- Every opened letter has Report and Block. Block prevents further letters from that sender account and device.
- Reports go to a simple admin view (Supabase table plus a protected web page) showing the reported letter, with actions: dismiss, remove, ban sender. Target review within 24 hours. This is required by App Store guideline 1.2 for user generated content.
- Basic automated screening on upload for illegal imagery using a reputable provider; flag the options and costs before choosing.
- Terms, privacy policy, and a notice and action contact point, drafted as markdown for the owner to finalise. Draft with GDPR and the EU Digital Services Act hosting provider duties in mind.
- Account deletion in-app, which also burns unopened letters the user sent.
- Analytics: PostHog EU, anonymous, consent first. Events: letter_sealed, link_shared, link_viewed_web, letter_claimed, letter_opened, reply_started, reply_sealed, reaction_sent, paywall_viewed, purchase, report_filed.

The key growth metric is the loop rate: replies sealed divided by letters opened. Put it on a simple dashboard.

## 9. Visual identity

Warm, tactile, quiet. Paper textures, real shadows, one serif and one handwriting-style font. Before building screens, produce three distinct static directions behind a dev menu so the owner can choose:
- A: Classic stationery (cream paper, red wax, serif)
- B: Modern post (bold colour envelopes, geometric seal, sans serif)
- C: Night mail (dark theme, gold ink, constellation motif)

## 10. Phases

**Phase 0: Scaffold.** Expo app, lint, tests, EAS dev builds, Supabase project with migrations folder, `CLAUDE.md`, `AGENTS.md`, `DECISIONS.md`, README.

**Phase 1: Locked letter backend.** Schema, RLS, Edge Functions for seal, claim, open and burn. Automated tests proving a locked letter cannot be read early by anyone. No UI beyond a debug screen.

**Phase 2: Send and receive, text only.** Three visual direction mocks, then the chosen one. Compose, schedule, seal, share link, web landing page with countdown and claim code, claim, shelf, open, write back.

**Phase 3: Push and links.** Unlock notifications, universal links and app links, Open Graph preview image function.

**Phase 4: Media and payments.** Photo, voice, video with compression and limits, RevenueCat unlock, monthly allowance logic with tests, restore purchases.

**Phase 5: Safety and reactions.** Report, block, admin view, upload screening, account deletion, then the opt-in reaction feature.

**Phase 6: Extras.** Home screen countdown widget, location "open when", group letters, seasonal stationery packs.

**Phase 7: Launch preparation.** Consent and analytics, loop rate dashboard, legal drafts, store listings, screenshots plan, app privacy label answers, a launch checklist.

## 11. Definition of done for every phase

- Builds and runs on both platforms from a clean clone using only the README.
- Tests pass, including the early-read security tests from Phase 1 onward.
- No guardrail in sections 3 or 5 is breached; report a text search for em dashes and for the phrase "time capsule" in user-facing strings.
- `PHASE_N_NOTES.md` lists what was built, what was deferred, and decisions needing the owner.

## 12. Questions for the owner before Phase 2

1. Final name, domain for letter links, bundle identifiers.
2. Visual direction A, B or C.
3. Apple Developer and Google Play accounts for EAS and RevenueCat.
4. Should opening require the app (default, best for growth), or may text-only letters open on the web page?
5. Who reviews reports, and in what time frame?

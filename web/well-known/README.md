# Universal links / app links verification files

Both files here are placeholders. They must be served, unmodified apart from the
placeholder values, from the domain's `/.well-known/` path (`https://<domain>/.well-known/
apple-app-site-association` and `.../assetlinks.json`), over HTTPS, with no redirect, for
`app.config.ts`'s `associatedDomains` (iOS) / `intentFilters` (Android) to actually verify.
Neither works at all until the domain is chosen and these are live there; until then,
`https://.../l/<token>` links only open the web landing page (`supabase/functions/link-page`),
never the app directly, which is still a completely working fallback.

## `apple-app-site-association`

No file extension, on purpose: that is Apple's required filename.

Replace `TEAMID1234` with the real Apple Developer Team ID once that account exists (brief
section 12, question 3), and keep `app.sealedcodename.ios` in sync with
`app.config.ts`'s `ios.bundleIdentifier` if that ever changes before the final name is chosen.

## `assetlinks.json`

Replace `app.sealedcodename.android` in sync with `app.config.ts`'s `android.package`, and
`REPLACE_WITH_REAL_SIGNING_CERT_SHA256_FINGERPRINT` with the release signing certificate's
SHA-256 fingerprint (`keytool -list -v -keystore <path>`, or from EAS's credential manager
once an EAS project exists).

# Web landing page

The small static page the sealed link opens to (brief section 6, Receive step 1): sealed
envelope, live countdown, and a claim code to type into the app if it is not yet installed.
Plain HTML/CSS/JS, no build step, no framework: `index.html` is the whole site.

It reads the letter's public preview straight from PostgREST's RPC endpoint
(`get_letter_preview`, granted to `anon`; see `supabase/migrations`), never anything private.

No Open Graph preview image yet: that is Phase 3's Edge Function
(`BUILD_BRIEF_SEALED.md` section 10). Store buttons are plain placeholder links for the same
reason section 3's guardrails forbid fabricating real Apple/Google trademarked badge assets
without rights; swap them for the real badges once there is somewhere for them to link to.

## Configure

Copy `config.example.js` to `config.js` (gitignored) and fill in a real project's URL and anon
key:

```sh
cp config.example.js config.js
```

The anon key is meant to be public in client code; row level security is what actually
protects the data, not keeping this secret.

## Routing

The page reads the token from the last path segment of the URL (`/l/<token>`), so the
hosting config needs a catch-all rewrite of `/l/*` to `index.html`, the same pattern a
single-page app uses (for example, a Netlify `_redirects` file with `/l/* /index.html 200`, or
the equivalent on whichever static host is chosen). No specific host is picked yet; add that
rewrite config once one is.

## Try it locally

```sh
cd web
python3 -m http.server 8080
# then open http://localhost:8080/index.html?  -- note: without the rewrite above, pass the
# token by visiting /l/<token> once a real static host with the rewrite is serving this.
```

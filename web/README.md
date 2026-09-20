# The letter link page

There is no static site here anymore. Phase 2 built the letter landing page (brief section 6,
Receive step 1) as a plain static `index.html`, reading the preview client-side after the page
loaded. That breaks link previews: when the link is pasted into iMessage, WhatsApp, Slack, or
any other crawler-based unfurler, the crawler fetches the URL and reads whatever is in the
initial HTML, without ever running JavaScript, so a purely static page can never show the
right sender name, unlock date, or preview image for a specific letter, only generic
placeholder text. That would blunt the app's actual growth loop ("every letter sent is an
invitation"), so Phase 3 moved the page's rendering into an Edge Function that already knows
the letter's preview data by the time it responds.

The page itself now lives at `supabase/functions/link-page` (server-renders the HTML,
including correct `og:title` / `og:description` / `og:image`), paired with
`supabase/functions/og-image` (the preview image `og:image` points to). Both are thin HTTP
glue around portable, Jest-tested builders in `supabase/functions/_shared/linkPageHtml.ts` and
`ogImage.ts`.

## Routing

Once a domain is chosen (brief section 12, question 1), point `/l/*` at
`link-page`'s function URL (a reverse proxy / rewrite at the hosting/DNS layer, since Supabase
Edge Functions are served from `*.functions.supabase.co`, not the app's own domain, unless a
custom domain is configured for them). `og-image` only needs to be reachable at
`/functions/v1/og-image/<token>`, which `link-page` already references by its full Supabase
function URL, so it does not need a custom-domain rewrite of its own.

## Try it locally

Cannot be run in this sandbox: Deno is unavailable (see DECISIONS.md). Once the owner has
Docker/Deno and a linked project, `supabase functions serve` plus a `curl` against
`/link-page/<a real token>` is the way to check it renders.

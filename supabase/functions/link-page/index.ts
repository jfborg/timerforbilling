// GET /functions/v1/link-page/<token>
// Server-renders the letter landing page (brief section 6, Receive step 1), so a crawler
// unfurling the shared link sees correct per-letter Open Graph tags: crawlers do not run the
// client-side JavaScript a purely static page would need to fetch that data, so the preview
// (sender name, unlock date, the image URL) has to already be in the HTML this function
// returns, not fetched after the page loads. See DECISIONS.md for why this replaced the
// static web/ page from Phase 2.
//
// The actual rendering logic (escaping, markup, embedded countdown script) lives in the
// portable, Jest-tested _shared/linkPageHtml.ts; this file is just the HTTP/data-fetch glue.

import { buildFoundLinkPageHtml, buildNotFoundLinkPageHtml } from '../_shared/linkPageHtml.ts';
import { createAnonClient } from '../_shared/supabaseClients.ts';

function html(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=15',
    },
  });
}

function tokenFromPath(req: Request): string {
  const segments = new URL(req.url).pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] ?? '';
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return new Response('method_not_allowed', { status: 405 });

  const token = tokenFromPath(req);
  if (!token) return html(buildNotFoundLinkPageHtml(), 404);

  const anon = createAnonClient();
  const { data, error } = await anon.rpc('get_letter_preview', { p_token: token }).maybeSingle();

  if (error || !data) return html(buildNotFoundLinkPageHtml(), 404);

  const unlockAt = new Date(data.unlock_at as string);
  const unlockAtLabel = unlockAt.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  const origin = new URL(req.url).origin;
  const ogImageUrl = `${origin}/functions/v1/og-image/${encodeURIComponent(token)}`;

  const pageHtml = buildFoundLinkPageHtml({
    token,
    senderDisplayName: data.sender_display_name as string,
    unlockAtIso: unlockAt.toISOString(),
    unlockAtLabel,
    ogImageUrl,
  });

  return html(pageHtml, 200);
});

// GET /functions/v1/og-image/<token>
// The Open Graph preview image (brief section 10, Phase 3), referenced by link-page's
// og:image tag. SVG, not PNG: valid for og:image on the platforms that matter most for a
// link shared peer-to-peer (iMessage, WhatsApp, Slack, Discord all render it), and generating
// PNG would mean a native rasterizer this Deno runtime cannot easily carry. Revisit if real
// link-preview testing on a live project turns up a platform that needs raster.
//
// The actual drawing logic lives in the portable, Jest-tested _shared/ogImage.ts.

import { buildFallbackOgImageSvg, buildLetterOgImageSvg } from '../_shared/ogImage.ts';
import { createAnonClient } from '../_shared/supabaseClients.ts';

function svg(body: string, status: number): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=60',
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
  if (!token) return svg(buildFallbackOgImageSvg(), 200);

  const anon = createAnonClient();
  const { data, error } = await anon.rpc('get_letter_preview', { p_token: token }).maybeSingle();

  if (error || !data) return svg(buildFallbackOgImageSvg(), 200);

  const unlockAtLabel = new Date(data.unlock_at as string).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return svg(
    buildLetterOgImageSvg({
      senderDisplayName: data.sender_display_name as string,
      unlockAtLabel,
    }),
    200
  );
});

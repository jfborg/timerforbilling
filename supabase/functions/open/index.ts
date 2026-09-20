// POST /open
// Body: { id: string (letter id) }
// Returns the body and, once Phase 4 adds media, short-lived signed URLs for it. The
// unlock_at/identity check happens inside open_letter() against the database's own now(),
// never against anything the client sends.

import { handleCorsPreflight, json } from '../_shared/http.ts';
import { createAdminClient, getCallerId } from '../_shared/supabaseClients.ts';
import { mapDbErrorMessage } from '../_shared/errors.ts';

const SIGNED_URL_TTL_SECONDS = 5 * 60;

interface StoredMediaItem {
  path: string;
  type: string;
  durationSeconds?: number;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const callerId = await getCallerId(req);
  if (!callerId) return json({ error: 'unauthorized' }, 401);

  let body: { id?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (typeof body.id !== 'string' || body.id.length === 0) {
    return json({ error: 'invalid_request_shape' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc('open_letter', { p_caller_id: callerId, p_letter_id: body.id })
    .single();

  if (error) {
    const mapped = mapDbErrorMessage(error.message);
    return json(mapped.body, mapped.status);
  }

  const media: StoredMediaItem[] = Array.isArray(data.media) ? data.media : [];
  const signedMedia = await Promise.all(
    media.map(async (item) => {
      const { data: signed } = await admin.storage
        .from('letter-media')
        .createSignedUrl(item.path, SIGNED_URL_TTL_SECONDS);
      return { type: item.type, durationSeconds: item.durationSeconds, url: signed?.signedUrl ?? null };
    })
  );

  return json({
    bodyText: data.body_text,
    media: signedMedia,
    status: data.status,
    openedAt: data.opened_at,
  });
});

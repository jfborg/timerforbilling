// POST /reply
// Body: { originalLetterId: string, bodyText: string, stationeryId: string,
//         senderDisplayName: string, unlockAt: string (ISO 8601), media?: unknown[] }
// Unlike /seal, a reply has no share step: it auto-addresses and auto-claims to the
// original letter's sender, which reply_to_letter() (supabase/migrations) enforces.

import { handleCorsPreflight, json } from '../_shared/http.ts';
import { createAdminClient, getCallerId } from '../_shared/supabaseClients.ts';
import { mapDbErrorMessage } from '../_shared/errors.ts';

interface ReplyRequestBody {
  originalLetterId?: unknown;
  bodyText?: unknown;
  stationeryId?: unknown;
  senderDisplayName?: unknown;
  unlockAt?: unknown;
  media?: unknown;
}

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const callerId = await getCallerId(req);
  if (!callerId) return json({ error: 'unauthorized' }, 401);

  let body: ReplyRequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (
    typeof body.originalLetterId !== 'string' ||
    typeof body.bodyText !== 'string' ||
    typeof body.stationeryId !== 'string' ||
    typeof body.senderDisplayName !== 'string' ||
    typeof body.unlockAt !== 'string'
  ) {
    return json({ error: 'invalid_request_shape' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc('reply_to_letter', {
      p_caller_id: callerId,
      p_original_letter_id: body.originalLetterId,
      p_body_text: body.bodyText,
      p_stationery_id: body.stationeryId,
      p_sender_display_name: body.senderDisplayName,
      p_unlock_at: body.unlockAt,
      p_media: Array.isArray(body.media) ? body.media : [],
    })
    .single();

  if (error) {
    const mapped = mapDbErrorMessage(error.message);
    return json(mapped.body, mapped.status);
  }

  return json({ id: data.id, token: data.token, unlockAt: data.unlock_at }, 201);
});

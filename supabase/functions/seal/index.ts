// POST /seal
// Body: { bodyText: string, stationeryId: string, senderDisplayName: string, unlockAt: string
//         (ISO 8601), media?: unknown[] }
// The actual validation (body length, unlock_at bounds against the server's own clock) lives
// in seal_letter() (supabase/migrations), not here, so there is exactly one place that logic
// can drift from the rules it enforces.

import { handleCorsPreflight, json } from '../_shared/http.ts';
import { createAdminClient, getCallerId } from '../_shared/supabaseClients.ts';
import { mapDbErrorMessage } from '../_shared/errors.ts';

interface SealRequestBody {
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

  let body: SealRequestBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (
    typeof body.bodyText !== 'string' ||
    typeof body.stationeryId !== 'string' ||
    typeof body.senderDisplayName !== 'string' ||
    typeof body.unlockAt !== 'string'
  ) {
    return json({ error: 'invalid_request_shape' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc('seal_letter', {
      p_sender_id: callerId,
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

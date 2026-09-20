// POST /claim
// Body: { token: string }

import { handleCorsPreflight, json } from '../_shared/http.ts';
import { createAdminClient, getCallerId } from '../_shared/supabaseClients.ts';
import { mapDbErrorMessage } from '../_shared/errors.ts';

Deno.serve(async (req) => {
  const preflight = handleCorsPreflight(req);
  if (preflight) return preflight;
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const callerId = await getCallerId(req);
  if (!callerId) return json({ error: 'unauthorized' }, 401);

  let body: { token?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (typeof body.token !== 'string' || body.token.length === 0) {
    return json({ error: 'invalid_request_shape' }, 400);
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .rpc('claim_letter', { p_caller_id: callerId, p_token: body.token })
    .single();

  if (error) {
    const mapped = mapDbErrorMessage(error.message);
    return json(mapped.body, mapped.status);
  }

  return json({
    id: data.id,
    status: data.status,
    unlockAt: data.unlock_at,
    stationeryId: data.stationery_id,
    senderDisplayName: data.sender_display_name,
  });
});

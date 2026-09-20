// POST /dispatch-notifications
// Not called by any client: pg_cron invokes this on a schedule (see the push_notifications
// dispatch migration) using the service_role key as its bearer token. Sweeps for newly due
// unlock notifications, sends everything pending via Expo's push API, and marks what was
// attempted as sent.
//
// Simplification: this marks a notification sent once Expo's /send endpoint accepts it, not
// once a delivery receipt confirms the device actually got it. Expo's receipt API
// (a second round trip, per push ticket, after a delay) would close that gap; skipped here
// as more infra than this phase needs, and noted in DECISIONS.md.

import { createAdminClient } from '../_shared/supabaseClients.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const BATCH_SIZE = 100;

interface PendingNotification {
  event_id: string;
  expo_push_token: string;
  type: 'unlock_ready' | 'letter_claimed';
  letter_id: string;
  sender_display_name: string;
}

function messageFor(row: PendingNotification) {
  if (row.type === 'unlock_ready') {
    return {
      title: 'A letter is ready',
      body: `${row.sender_display_name} sent something for you to read now.`,
    };
  }
  return {
    title: 'Your letter was claimed',
    body: 'Someone claimed the letter you sent. It will open soon.',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method_not_allowed', { status: 405 });

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authHeader = req.headers.get('Authorization');
  if (!serviceRoleKey || authHeader !== `Bearer ${serviceRoleKey}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const admin = createAdminClient();

  const { error: collectError } = await admin.rpc('collect_unlock_notifications');
  if (collectError) {
    return new Response(JSON.stringify({ error: collectError.message }), { status: 500 });
  }

  const { data: pending, error: dequeueError } = await admin.rpc('dequeue_pending_notifications', {
    p_limit: BATCH_SIZE,
  });
  if (dequeueError) {
    return new Response(JSON.stringify({ error: dequeueError.message }), { status: 500 });
  }

  const rows = (pending ?? []) as PendingNotification[];
  if (rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const messages = rows.map((row) => ({
    to: row.expo_push_token,
    sound: 'default',
    data: { letterId: row.letter_id, type: row.type },
    ...messageFor(row),
  }));

  const pushResponse = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(messages),
  });

  if (!pushResponse.ok) {
    return new Response(JSON.stringify({ error: 'expo_push_request_failed' }), { status: 502 });
  }

  const eventIds = rows.map((row) => row.event_id);
  const { error: markError } = await admin.rpc('mark_notifications_sent', { p_event_ids: eventIds });
  if (markError) {
    return new Response(JSON.stringify({ error: markError.message }), { status: 500 });
  }

  return new Response(JSON.stringify({ sent: rows.length }), { status: 200 });
});

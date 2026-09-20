-- The notification outbox: claim enqueues a letter_claimed event, collect_unlock_notifications
-- enqueues unlock_ready events for letters past their unlock_at (idempotently), and
-- dequeue/mark round-trip correctly. notification_events itself has no client access at all.
--
-- Sender is 44444444 here specifically because no other test file ever registers a push
-- token for that user (10_/30_/40_/50_/60_ use 11111111 and 22222222, and 70_ registers a
-- token for 11111111), so "the sender has no token" holds regardless of what ran before this
-- file in the same shared database.

-- Register a push token for the recipient so dequeue has something to join against.
insert into public.push_tokens (user_id, expo_push_token, platform)
values ('22222222-2222-2222-2222-222222222222'::uuid, 'ExponentPushToken[recipient-device]', 'ios')
on conflict (expo_push_token) do nothing;

select id as letter_id, token as letter_token
from public.seal_letter(
  '44444444-4444-4444-4444-444444444444'::uuid,
  'Notification test letter.',
  'classic-cream',
  'Test Sender',
  now() + interval '1 minute'
) \gset

-- Claiming enqueues exactly one letter_claimed event for the sender.
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

select public.test_assert(
  (select count(*) from public.notification_events where letter_id = :'letter_id'::uuid and type = 'letter_claimed') = 1,
  'claiming a letter enqueues exactly one letter_claimed event'
);

select public.test_assert(
  (select user_id from public.notification_events where letter_id = :'letter_id'::uuid and type = 'letter_claimed')
    = '44444444-4444-4444-4444-444444444444'::uuid,
  'the letter_claimed event is addressed to the sender'
);

-- Re-claiming (idempotent path) does not enqueue a second event.
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');
select public.test_assert(
  (select count(*) from public.notification_events where letter_id = :'letter_id'::uuid and type = 'letter_claimed') = 1,
  'an idempotent re-claim does not enqueue a duplicate event'
);

-- Before unlock_at, the sweep finds nothing for this letter.
select public.test_assert(
  not exists (
    select 1 from public.notification_events where letter_id = :'letter_id'::uuid and type = 'unlock_ready'
  ),
  'collect_unlock_notifications does not enqueue anything before unlock_at'
);

-- Simulate time passing (same technique as 50_open_unlocked_and_burn.test.sql).
update public.letters
set sealed_at = now() - interval '1 day', unlock_at = now() - interval '1 minute'
where id = :'letter_id'::uuid;

select public.collect_unlock_notifications();

select public.test_assert(
  (select count(*) from public.notification_events where letter_id = :'letter_id'::uuid and type = 'unlock_ready') = 1,
  'collect_unlock_notifications enqueues one unlock_ready event once unlock_at has passed'
);

-- Calling it again does not duplicate.
select public.collect_unlock_notifications();
select public.test_assert(
  (select count(*) from public.notification_events where letter_id = :'letter_id'::uuid and type = 'unlock_ready') = 1,
  'calling collect_unlock_notifications again does not duplicate the event'
);

-- dequeue_pending_notifications joins to push_tokens: the sender has none (excluded), the
-- recipient does (included), so exactly one of the two pending events for this letter shows.
select public.test_assert(
  (select count(*) from public.dequeue_pending_notifications(100) where letter_id = :'letter_id'::uuid) = 1,
  'dequeue_pending_notifications returns only the event for a user who has a registered token'
);

select public.test_assert(
  (select type from public.dequeue_pending_notifications(100) where letter_id = :'letter_id'::uuid) = 'unlock_ready',
  'the returned event is the recipient''s unlock_ready, not the tokenless sender''s letter_claimed'
);

select event_id as unlock_event_id
from public.dequeue_pending_notifications(100)
where letter_id = :'letter_id'::uuid \gset

select public.mark_notifications_sent(array[:'unlock_event_id'::uuid]);

select public.test_assert(
  (select sent_at from public.notification_events where id = :'unlock_event_id'::uuid) is not null,
  'mark_notifications_sent sets sent_at'
);

select public.test_assert(
  (select count(*) from public.dequeue_pending_notifications(100) where letter_id = :'letter_id'::uuid) = 0,
  'a sent event no longer appears in dequeue_pending_notifications'
);

-- No client, in any role, can read notification_events directly.
select public.test_login('22222222-2222-2222-2222-222222222222'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.notification_events) = 0,
  'the recipient cannot select notification_events directly'
);
reset role;
select public.test_logout();

set role anon;
select public.test_assert(
  (select count(*) from public.notification_events) = 0,
  'an anonymous client cannot select notification_events directly'
);
reset role;

\set ON_ERROR_STOP 0
set role authenticated;
select public.collect_unlock_notifications();
select public.test_assert(:ERROR, 'authenticated cannot call collect_unlock_notifications directly');
reset role;
\set ON_ERROR_STOP 1

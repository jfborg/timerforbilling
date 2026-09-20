-- reply_to_letter: only the opened recipient may reply, exactly once per original, and the
-- reply auto-addresses and auto-claims to the original sender without a token/claim step.

select id as original_id, token as original_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Original letter, waiting for a reply.',
  'classic-cream',
  'Original Sender',
  now() + interval '1 minute'
) \gset

select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'original_token');

-- Cannot reply before the original is opened.
\set ON_ERROR_STOP 0
select public.reply_to_letter(
  '22222222-2222-2222-2222-222222222222'::uuid, :'original_id'::uuid,
  'Too early.', 'classic-cream', 'Reply Sender', now() + interval '1 day'
);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'cannot reply before the original letter is opened'
);
\set ON_ERROR_STOP 1

-- A stranger cannot reply even to an id they somehow know.
\set ON_ERROR_STOP 0
select public.reply_to_letter(
  '33333333-3333-3333-3333-333333333333'::uuid, :'original_id'::uuid,
  'Not mine to reply to.', 'classic-cream', 'Stranger', now() + interval '1 day'
);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a stranger cannot reply to a letter that is not theirs'
);
\set ON_ERROR_STOP 1

-- Unlock and open the original so a reply becomes possible.
update public.letters
set sealed_at = now() - interval '1 day', unlock_at = now() - interval '1 minute'
where id = :'original_id'::uuid;
select public.open_letter('22222222-2222-2222-2222-222222222222'::uuid, :'original_id'::uuid);

-- The original sender cannot reply to their own letter (they are not its recipient).
\set ON_ERROR_STOP 0
select public.reply_to_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, :'original_id'::uuid,
  'Replying to myself.', 'classic-cream', 'Original Sender', now() + interval '1 day'
);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'the original sender cannot reply to their own letter'
);
\set ON_ERROR_STOP 1

-- The opened recipient can reply; it auto-claims to the original sender with no token needed.
select id as reply_id, token as reply_token
from public.reply_to_letter(
  '22222222-2222-2222-2222-222222222222'::uuid, :'original_id'::uuid,
  'Right back at you.', 'classic-cream', 'Reply Sender', now() + interval '1 day'
) \gset

select public.test_assert(
  (select sender_id from public.letters where id = :'reply_id'::uuid) = '22222222-2222-2222-2222-222222222222'::uuid,
  'the reply is sent by the original recipient'
);

select public.test_assert(
  (select recipient_id from public.letters where id = :'reply_id'::uuid) = '11111111-1111-1111-1111-111111111111'::uuid,
  'the reply is auto-addressed to the original sender'
);

select public.test_assert(
  (select status from public.letters where id = :'reply_id'::uuid) = 'claimed',
  'the reply is auto-claimed, skipping the unclaimed state'
);

select public.test_assert(
  (select reply_to_letter_id from public.letters where id = :'reply_id'::uuid) = :'original_id'::uuid,
  'the reply records which letter it replies to'
);

-- A second reply to the same original is rejected, by the function and, independently, by
-- the unique index even if the function's own check were ever bypassed.
\set ON_ERROR_STOP 0
select public.reply_to_letter(
  '22222222-2222-2222-2222-222222222222'::uuid, :'original_id'::uuid,
  'Second reply.', 'classic-cream', 'Reply Sender', now() + interval '1 day'
);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'only one reply is allowed per original letter'
);
\set ON_ERROR_STOP 1

-- The reply itself is a normal locked letter: unreadable by anyone (including the two
-- parties on it) until its own unlock_at passes.
\set ON_ERROR_STOP 0
select public.open_letter('11111111-1111-1111-1111-111111111111'::uuid, :'reply_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'the reply itself stays locked until its own unlock_at'
);
\set ON_ERROR_STOP 1

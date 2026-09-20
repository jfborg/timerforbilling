-- Once the server's clock says unlock_at has passed, the sender and the claimed recipient
-- (and only them) can open the letter; a stranger still cannot. Separately, burn deletes an
-- unopened letter's content and blocks a non-sender or an already-opened letter from being
-- burned.

select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'This one gets read once it unlocks.',
  'classic-cream',
  'Test Sender',
  now() + interval '1 minute'
) \gset

select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

-- Simulate time passing without violating "unlock_at must be at least 1 minute after
-- sealed_at" (that rule is enforced only at insert time, by a trigger, precisely so this
-- kind of test-only backdating remains possible): move sealed_at back instead of unlock_at
-- forward, then move unlock_at into the past relative to real now().
update public.letters
set sealed_at = now() - interval '1 day', unlock_at = now() - interval '1 minute'
where id = :'letter_id'::uuid;

select public.test_assert(
  (select body_text from public.open_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_id'::uuid))
    = 'This one gets read once it unlocks.',
  'recipient reads the exact sealed body once unlocked'
);

select public.test_assert(
  (select body_text from public.open_letter('11111111-1111-1111-1111-111111111111'::uuid, :'letter_id'::uuid))
    = 'This one gets read once it unlocks.',
  'sender reads the exact sealed body once unlocked'
);

select public.test_assert(
  (select status from public.letters where id = :'letter_id'::uuid) = 'opened',
  'letter status flips to opened after the first open'
);

\set ON_ERROR_STOP 0
select public.open_letter('33333333-3333-3333-3333-333333333333'::uuid, :'letter_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a stranger cannot open the letter even after it unlocks'
);
\set ON_ERROR_STOP 1

-- Burn: sender can burn an unopened, unclaimed letter.
select id as burn_id, token as burn_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, 'Burn me.', 'classic-cream', 'Test Sender', now() + interval '1 day'
) \gset

select public.test_assert(
  (select status from public.burn_letter('11111111-1111-1111-1111-111111111111'::uuid, :'burn_id'::uuid)) = 'burned',
  'sender can burn an unopened letter'
);

select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'burn_id'::uuid) = 0,
  'burning deletes the letter content'
);

select public.test_assert(
  (select count(*) from public.get_letter_preview(:'burn_token')) = 0,
  'a burned letter no longer shows up in the public preview'
);

-- A non-sender cannot burn.
select id as guard_id, token as guard_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, 'Not yours to burn.', 'classic-cream', 'Test Sender', now() + interval '1 day'
) \gset

\set ON_ERROR_STOP 0
select public.burn_letter('22222222-2222-2222-2222-222222222222'::uuid, :'guard_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a non-sender cannot burn the letter'
);
\set ON_ERROR_STOP 1

-- An already-opened letter cannot be burned.
update public.letters
set sealed_at = now() - interval '1 day', unlock_at = now() - interval '1 minute'
where id = :'guard_id'::uuid;
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'guard_token');
select public.open_letter('22222222-2222-2222-2222-222222222222'::uuid, :'guard_id'::uuid);

\set ON_ERROR_STOP 0
select public.burn_letter('11111111-1111-1111-1111-111111111111'::uuid, :'guard_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'an already-opened letter cannot be burned'
);
\set ON_ERROR_STOP 1

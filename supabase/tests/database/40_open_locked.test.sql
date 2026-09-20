-- The core product promise (security rule 1): before unlock_at, nobody can read a sealed
-- letter's content through open_letter(), not the recipient, not a stranger, and not even
-- the sender who wrote it. Only server time counts; there is no client-supplied "now".
--
-- psql doesn't substitute :variables inside a dollar-quoted DO $$ ... $$ body, so each "expect
-- this exact call to raise P0001" check stays a top-level statement, with the assertion
-- reading :ERROR / :SQLSTATE immediately after it, before anything else runs.

select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Still sealed, still locked.',
  'classic-cream',
  'Test Sender',
  now() + interval '1 day'
) \gset

select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

\set ON_ERROR_STOP 0

-- Recipient, before unlock_at.
select public.open_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'the recipient cannot open the letter before unlock_at'
);

-- Sender, after sealing, before unlock_at: sealing grants no early access.
select public.open_letter('11111111-1111-1111-1111-111111111111'::uuid, :'letter_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'the sender cannot open their own letter before unlock_at'
);

-- A stranger, before unlock_at: blocked on identity regardless of time.
select public.open_letter('33333333-3333-3333-3333-333333333333'::uuid, :'letter_id'::uuid);
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a stranger cannot open the letter'
);

\set ON_ERROR_STOP 1

-- Direct table reads stay blocked throughout, reaffirming the second, independent layer of
-- defense: even if open_letter() had a bug, RLS alone should still stop every one of these.
select public.test_login('22222222-2222-2222-2222-222222222222'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'recipient cannot read letter_contents directly while locked'
);
reset role;
select public.test_logout();

select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'sender cannot read letter_contents directly while locked'
);
reset role;
select public.test_logout();

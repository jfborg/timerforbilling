-- letter_contents has zero RLS policies for anon/authenticated: security rule 2 says no
-- client may select it directly, full stop, regardless of who the caller is or what state
-- the letter is in. This is the layer that matters even if an Edge Function had a bug.

select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'The body nobody should be able to select directly.',
  'classic-cream',
  'Test Sender',
  now() + interval '1 day'
) \gset

select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

-- Sender: no direct read of the content table, even for their own letter.
select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'sender cannot select letter_contents directly'
);
reset role;
select public.test_logout();

-- Claimed recipient: same, no direct read.
select public.test_login('22222222-2222-2222-2222-222222222222'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'claimed recipient cannot select letter_contents directly'
);
reset role;
select public.test_logout();

-- Stranger: same.
select public.test_login('33333333-3333-3333-3333-333333333333'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'a stranger cannot select letter_contents directly'
);
reset role;
select public.test_logout();

-- Anonymous, unauthenticated: same.
set role anon;
select public.test_assert(
  (select count(*) from public.letter_contents where letter_id = :'letter_id'::uuid) = 0,
  'an anonymous client cannot select letter_contents directly'
);
reset role;

-- A blanket, unfiltered select must also come back empty for every one of those roles: this
-- catches a future RLS policy written too broadly, not just one scoped to this one row.
select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letter_contents) = 0,
  'sender sees zero rows on an unfiltered letter_contents select'
);
reset role;
select public.test_logout();

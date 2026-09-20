-- RLS on public.letters: only the sender, and (once claimed) the recipient, may select a
-- row directly. Everyone else, including an anonymous stranger, gets nothing.
--
-- Setup runs as the postgres superuser (bypasses RLS and function grants, as is normal for
-- test arrangement); the actual assertions below switch role to simulate each caller.

select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'For RLS testing only.',
  'classic-cream',
  'Test Sender',
  now() + interval '1 day'
) \gset

-- Sender can select their own letter directly.
select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letters where id = :'letter_id'::uuid) = 1,
  'sender can select their own sealed letter'
);
reset role;
select public.test_logout();

-- Before claiming, nobody but the sender can see the row via direct select (the public
-- preview path is get_letter_preview(), tested separately).
select public.test_login('33333333-3333-3333-3333-333333333333'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letters where id = :'letter_id'::uuid) = 0,
  'a stranger cannot select an unclaimed letter directly'
);
reset role;
select public.test_logout();

set role anon;
select public.test_assert(
  (select count(*) from public.letters where id = :'letter_id'::uuid) = 0,
  'an anonymous client cannot select the letter directly'
);
reset role;

-- Claim it, then confirm the recipient gains direct visibility.
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

select public.test_login('22222222-2222-2222-2222-222222222222'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letters where id = :'letter_id'::uuid) = 1,
  'the claimed recipient can select the letter directly'
);
reset role;
select public.test_logout();

-- A different authenticated stranger still cannot, even after someone else claimed it.
select public.test_login('33333333-3333-3333-3333-333333333333'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.letters where id = :'letter_id'::uuid) = 0,
  'a stranger cannot select a letter claimed by someone else'
);
reset role;
select public.test_logout();

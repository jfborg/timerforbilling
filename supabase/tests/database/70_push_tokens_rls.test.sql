-- push_tokens is the one table clients write to directly (registering your own device is
-- ordinary self-service), scoped to their own rows by RLS.

select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
insert into public.push_tokens (user_id, expo_push_token, platform)
values ('11111111-1111-1111-1111-111111111111'::uuid, 'ExponentPushToken[test-own-token]', 'ios');
reset role;
select public.test_logout();

select public.test_login('11111111-1111-1111-1111-111111111111'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.push_tokens where user_id = '11111111-1111-1111-1111-111111111111'::uuid) = 1,
  'a user can see their own registered push token'
);
reset role;
select public.test_logout();

-- Cannot insert a push token under someone else's user_id.
select public.test_login('22222222-2222-2222-2222-222222222222'::uuid);
set role authenticated;
\set ON_ERROR_STOP 0
insert into public.push_tokens (user_id, expo_push_token, platform)
values ('11111111-1111-1111-1111-111111111111'::uuid, 'ExponentPushToken[forged]', 'ios');
select public.test_assert(:ERROR, 'cannot register a push token under someone else''s user_id');
\set ON_ERROR_STOP 1

-- Cannot see another user's push tokens.
select public.test_assert(
  (select count(*) from public.push_tokens where user_id = '11111111-1111-1111-1111-111111111111'::uuid) = 0,
  'a different user cannot see someone else''s push tokens'
);
reset role;
select public.test_logout();

-- A stranger (never registered anything) sees nothing at all.
select public.test_login('33333333-3333-3333-3333-333333333333'::uuid);
set role authenticated;
select public.test_assert(
  (select count(*) from public.push_tokens) = 0,
  'a user with no tokens of their own sees zero rows, not everyone else''s'
);
reset role;
select public.test_logout();

set role anon;
select public.test_assert(
  (select count(*) from public.push_tokens) = 0,
  'an anonymous client cannot read push_tokens at all'
);
reset role;

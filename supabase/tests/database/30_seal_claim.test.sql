-- seal_letter and claim_letter: input validation, token shape, first-claim-wins, and that
-- neither function is callable by anon/authenticated (only service_role, i.e. only through
-- the Edge Function, may call them).

-- Reject an empty body.
do $$
begin
  begin
    perform public.seal_letter(
      '11111111-1111-1111-1111-111111111111'::uuid, '', 'classic-cream', 'Test Sender', now() + interval '1 day'
    );
    raise exception 'FAIL: seal_letter accepted an empty body';
  exception
    when sqlstate 'P0001' then
      raise notice 'PASS: seal_letter rejects an empty body';
  end;
end $$;

-- Reject unlock_at less than 1 minute out.
do $$
begin
  begin
    perform public.seal_letter(
      '11111111-1111-1111-1111-111111111111'::uuid, 'Body', 'classic-cream', 'Test Sender', now() + interval '10 seconds'
    );
    raise exception 'FAIL: seal_letter accepted an unlock_at under 1 minute out';
  exception
    when sqlstate 'P0001' then
      raise notice 'PASS: seal_letter rejects an unlock_at under 1 minute out';
  end;
end $$;

-- Reject unlock_at more than 12 months out.
do $$
begin
  begin
    perform public.seal_letter(
      '11111111-1111-1111-1111-111111111111'::uuid, 'Body', 'classic-cream', 'Test Sender', now() + interval '13 months'
    );
    raise exception 'FAIL: seal_letter accepted an unlock_at over 12 months out';
  exception
    when sqlstate 'P0001' then
      raise notice 'PASS: seal_letter rejects an unlock_at over 12 months out';
  end;
end $$;

-- A valid seal produces an unguessable (>= 128-bit) token.
select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, 'Valid body.', 'classic-cream', 'Test Sender', now() + interval '1 day'
) \gset

select public.test_assert(length(:'letter_token') >= 20, 'seal_letter token decodes to at least 128 bits');

-- Neither anon nor authenticated can call seal_letter or claim_letter directly. SET ROLE
-- can't be issued from inside a DO block, so these checks stay at the top level and use
-- psql's own :ERROR / :SQLSTATE variables instead of a PL/pgSQL exception handler.
\set ON_ERROR_STOP 0

set role authenticated;
select public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, 'Body', 'classic-cream', 'Test Sender', now() + interval '1 day'
);
select public.test_assert(
  :ERROR and :'SQLSTATE' = '42501',
  'authenticated cannot call seal_letter directly'
);
reset role;

set role anon;
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, 'whatever-token');
select public.test_assert(
  :ERROR and :'SQLSTATE' = '42501',
  'anon cannot call claim_letter directly'
);
reset role;

\set ON_ERROR_STOP 1

-- First claim wins: a second, different user claiming the same token is rejected.
select public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token');

-- psql doesn't substitute :variables inside a dollar-quoted DO $$ ... $$ body, so "expect
-- this exact call to raise P0001" checks stay at the top level using :ERROR / :SQLSTATE,
-- captured immediately after the failing statement.
\set ON_ERROR_STOP 0
select public.claim_letter('44444444-4444-4444-4444-444444444444'::uuid, :'letter_token');
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a second recipient cannot claim an already-claimed letter'
);
\set ON_ERROR_STOP 1

-- The original recipient re-claiming is idempotent, not an error.
select public.test_assert(
  (select status from public.claim_letter('22222222-2222-2222-2222-222222222222'::uuid, :'letter_token')) = 'claimed',
  'the original recipient can re-claim idempotently'
);

-- A sender cannot claim their own letter.
select id as own_letter_id, token as own_letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid, 'Cannot claim my own.', 'classic-cream', 'Test Sender', now() + interval '1 day'
) \gset

\set ON_ERROR_STOP 0
select public.claim_letter('11111111-1111-1111-1111-111111111111'::uuid, :'own_letter_token');
select public.test_assert(
  :ERROR and :'SQLSTATE' = 'P0001',
  'a sender cannot claim their own letter'
);
\set ON_ERROR_STOP 1

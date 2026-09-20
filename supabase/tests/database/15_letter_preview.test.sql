-- get_letter_preview(): the one public read path, usable by an anonymous, unauthenticated
-- caller who has the token, returning only the non-sensitive envelope fields.

select id as letter_id, token as letter_token
from public.seal_letter(
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Preview should never leak this.',
  'classic-cream',
  'Preview Sender',
  now() + interval '1 day'
) \gset

set role anon;

select public.test_assert(
  (select count(*) from public.get_letter_preview(:'letter_token')) = 1,
  'anon can preview a sealed letter by its token'
);

select public.test_assert(
  (select sender_display_name from public.get_letter_preview(:'letter_token')) = 'Preview Sender',
  'the preview exposes the sender display name'
);

select public.test_assert(
  (select count(*) from public.get_letter_preview('not-a-real-token')) = 0,
  'an unknown token returns nothing'
);

reset role;

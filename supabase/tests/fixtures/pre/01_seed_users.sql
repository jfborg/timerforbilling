-- Fixed, readable UUIDs reused across the test files. The stranger is deliberately never
-- inserted into auth.users: a stranger is just someone whose JWT claims don't match either
-- party on the letter, whether or not they even have an account.
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'sender@example.test'),
  ('22222222-2222-2222-2222-222222222222', 'recipient@example.test'),
  ('44444444-4444-4444-4444-444444444444', 'other-recipient@example.test')
on conflict (id) do nothing;

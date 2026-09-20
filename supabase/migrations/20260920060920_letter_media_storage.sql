-- Private storage bucket for letter media (security rule 2: "a private storage bucket").
-- No anon/authenticated storage policies are created here on purpose: nothing uploads or
-- downloads directly against this bucket yet. The actual upload path (signed upload URLs,
-- on-device compression) and the open_letter()-issued short-lived signed download URLs are
-- Phase 4 scope (brief section 7). Creating the bucket and locking it down now means the
-- schema doesn't need another migration just to add storage later.

insert into storage.buckets (id, name, public)
values ('letter-media', 'letter-media', false)
on conflict (id) do nothing;

alter table storage.objects enable row level security;

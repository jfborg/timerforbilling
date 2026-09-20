-- Locked letter schema (brief section 5: security rules).
--
-- Letter metadata (public.letters) and letter content (public.letter_contents) are
-- deliberately split across two tables so RLS can allow reading non-sensitive metadata
-- (for the claim/landing page) while denying every client, sender included, any direct
-- read of the body or media. Content is only ever returned by the open_letter() function
-- (see the next migration), and only once the server's own clock says the letter is
-- unlocked.

create extension if not exists pgcrypto;

create type public.letter_status as enum ('sealed', 'claimed', 'opened', 'burned');

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  sender_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete set null,
  status public.letter_status not null default 'sealed',
  stationery_id text not null,
  sender_display_name text not null,
  unlock_at timestamptz not null,
  sealed_at timestamptz not null default now(),
  claimed_at timestamptz,
  opened_at timestamptz,
  burned_at timestamptz,
  created_at timestamptz not null default now(),
  -- Set only when this letter is a reply (reply_to_letter, next migration). A reply is
  -- addressed automatically to the original sender rather than sealed with a shareable
  -- token/claim step, since the recipient is already known.
  reply_to_letter_id uuid references public.letters (id) on delete set null,
  constraint letters_token_length check (length(token) >= 20),
  constraint letters_recipient_not_sender check (recipient_id is null or recipient_id <> sender_id)
);

-- Monetisation (brief section 7): replying to a letter you received is always free, one
-- reply per received letter. Enforced here, not just in reply_to_letter(), so the limit
-- holds even if another insert path onto letters is ever added.
create unique index letters_one_reply_per_original on public.letters (reply_to_letter_id)
  where reply_to_letter_id is not null;

comment on table public.letters is
  'Letter metadata only. Never add a body/media column here; those live in letter_contents, which has no client-facing RLS policies at all.';

create index letters_sender_id_idx on public.letters (sender_id);
create index letters_recipient_id_idx on public.letters (recipient_id);

-- A trigger rather than a table CHECK constraint: this validates the relationship between
-- unlock_at and sealed_at at the moment a letter is sealed, which is an insert-time concern
-- (nothing ever legitimately updates unlock_at afterwards). A CHECK constraint would instead
-- re-validate on every future UPDATE of the row, which would wrongly block, for example, a
-- later migration that needs to backfill or correct a column unrelated to unlock_at.
create or replace function public.enforce_unlock_at_bounds()
returns trigger
language plpgsql
as $$
begin
  if new.unlock_at < new.sealed_at + interval '1 minute' then
    raise exception 'unlock_at_too_soon' using errcode = 'P0001';
  end if;
  if new.unlock_at > new.sealed_at + interval '12 months' then
    raise exception 'unlock_at_too_far' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger letters_enforce_unlock_at_bounds
  before insert on public.letters
  for each row execute function public.enforce_unlock_at_bounds();

create table public.letter_contents (
  letter_id uuid primary key references public.letters (id) on delete cascade,
  body_text text not null,
  media jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint letter_contents_body_text_length check (
    length(body_text) > 0 and length(body_text) <= 10000
  )
);

comment on table public.letter_contents is
  'Deliberately has zero RLS policies for anon/authenticated. Only a security-definer function (owned by the migration role, which bypasses RLS) or the service_role may read or write it.';

alter table public.letters enable row level security;
alter table public.letter_contents enable row level security;

-- Metadata is visible only to the two parties on the letter. Everyone else, including an
-- unauthenticated stranger, gets zero rows from a direct select. The one deliberate public
-- read path is get_letter_preview() below, which returns a narrow, non-sensitive projection
-- and only to someone who already has the unguessable token.
create policy letters_select_own on public.letters
  for select
  to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);

-- No insert/update/delete policies for anon or authenticated: every write happens through
-- the seal/claim/open/burn security-definer functions, called only by the Edge Functions
-- using the service_role key. This is enforced twice over: RLS has no policy granting the
-- write, and the functions themselves are granted to service_role only (next migration).

create or replace function public.get_letter_preview(p_token text)
returns table (
  id uuid,
  status public.letter_status,
  stationery_id text,
  sender_display_name text,
  unlock_at timestamptz
)
language sql
security definer
set search_path = public
stable
as $$
  select l.id, l.status, l.stationery_id, l.sender_display_name, l.unlock_at
  from public.letters l
  where l.token = p_token
    and l.status <> 'burned';
$$;

comment on function public.get_letter_preview(text) is
  'The only public, unauthenticated read path onto a letter. Returns envelope/countdown fields only, never the body, and only to a caller who already has the token.';

revoke all on function public.get_letter_preview(text) from public;
grant execute on function public.get_letter_preview(text) to anon, authenticated;

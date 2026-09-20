-- Unlock and claim push notifications (brief section 10, Phase 3; "the sender is notified of
-- the claim" from security rule 4). Two tables:
--
-- push_tokens: unlike everything in the letters schema, registering your own device's Expo
-- push token is ordinary self-service, not a privileged operation, so it is the one table in
-- this app that anon/authenticated write to directly, scoped to their own rows by RLS.
--
-- notification_events: a small outbox. Server-internal only, same zero-client-policy pattern
-- as letter_contents. claim_letter() enqueues a letter_claimed event directly; a separate
-- collect_unlock_notifications() sweep (called by the scheduled dispatch-notifications Edge
-- Function, next migration) enqueues unlock_ready events once a letter's unlock_at has
-- passed. The actual send happens outside Postgres (Expo's push API), so this only tracks
-- "needs sending" / "sent", not delivery.

create type public.notification_type as enum ('unlock_ready', 'letter_claimed');

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expo_push_token text not null,
  platform text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint push_tokens_unique_token unique (expo_push_token)
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

alter table public.push_tokens enable row level security;

create policy push_tokens_manage_own on public.push_tokens
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type public.notification_type not null,
  letter_id uuid not null references public.letters (id) on delete cascade,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  -- Doubles as the dedup guard for collect_unlock_notifications() and for claim_letter():
  -- at most one event of a given type per letter, ever.
  constraint notification_events_unique_per_letter unique (letter_id, type)
);

create index notification_events_pending_idx on public.notification_events (created_at)
  where sent_at is null;

comment on table public.notification_events is
  'Zero RLS policies for anon/authenticated, same as letter_contents: this is an internal
  outbox, never read or written by a client directly.';

alter table public.notification_events enable row level security;

-- claim_letter() (Phase 1 migration) enqueues a letter_claimed event for the sender the
-- moment a letter is actually claimed (not on an idempotent re-claim by the same recipient,
-- which is the same branch that already guards the claimed_at/status update).
create or replace function public.claim_letter(
  p_caller_id uuid,
  p_token text
)
returns table (
  id uuid,
  status public.letter_status,
  unlock_at timestamptz,
  stationery_id text,
  sender_display_name text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.letters;
begin
  select * into v_row from public.letters where token = p_token for update;

  if not found or v_row.status = 'burned' then
    raise exception 'letter_not_found' using errcode = 'P0002';
  end if;

  if v_row.sender_id = p_caller_id then
    raise exception 'cannot_claim_own_letter' using errcode = 'P0001';
  end if;

  if v_row.recipient_id is not null and v_row.recipient_id <> p_caller_id then
    raise exception 'already_claimed' using errcode = 'P0001';
  end if;

  if v_row.recipient_id is null then
    update public.letters
    set recipient_id = p_caller_id, status = 'claimed', claimed_at = now()
    where public.letters.id = v_row.id
    returning * into v_row;

    insert into public.notification_events (user_id, type, letter_id)
    values (v_row.sender_id, 'letter_claimed', v_row.id)
    on conflict (letter_id, type) do nothing;
  end if;

  return query select v_row.id, v_row.status, v_row.unlock_at, v_row.stationery_id, v_row.sender_display_name;
end;
$$;

-- Sweeps for letters whose unlock_at has passed and enqueues one unlock_ready event per
-- recipient, per letter. Safe to call repeatedly (the unique index no-ops a repeat) and cheap
-- to call often, since it only scans unopened, unburned, claimed letters.
create or replace function public.collect_unlock_notifications()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  insert into public.notification_events (user_id, type, letter_id)
  select l.recipient_id, 'unlock_ready', l.id
  from public.letters l
  where l.recipient_id is not null
    and l.opened_at is null
    and l.status <> 'burned'
    and l.unlock_at <= now()
  on conflict (letter_id, type) do nothing;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.collect_unlock_notifications() from public;
grant execute on function public.collect_unlock_notifications() to service_role;

-- One row per (pending event, that user's device token): a user with three devices gets
-- three rows for the same event, which is exactly the fan-out dispatch-notifications wants.
create or replace function public.dequeue_pending_notifications(p_limit integer default 100)
returns table (
  event_id uuid,
  expo_push_token text,
  type public.notification_type,
  letter_id uuid,
  sender_display_name text
)
language sql
security definer
set search_path = public
stable
as $$
  select ne.id, pt.expo_push_token, ne.type, ne.letter_id, l.sender_display_name
  from public.notification_events ne
  join public.push_tokens pt on pt.user_id = ne.user_id
  join public.letters l on l.id = ne.letter_id
  where ne.sent_at is null
  order by ne.created_at
  limit p_limit;
$$;

revoke all on function public.dequeue_pending_notifications(integer) from public;
grant execute on function public.dequeue_pending_notifications(integer) to service_role;

create or replace function public.mark_notifications_sent(p_event_ids uuid[])
returns void
language sql
security definer
set search_path = public
as $$
  update public.notification_events
  set sent_at = now()
  where id = any(p_event_ids);
$$;

revoke all on function public.mark_notifications_sent(uuid[]) from public;
grant execute on function public.mark_notifications_sent(uuid[]) to service_role;

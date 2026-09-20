-- The four privileged letter operations (brief section 6/10, Phase 1: seal, claim, open,
-- burn), each a security-definer function granted only to service_role. A client can never
-- call these directly, even if authenticated: anon and authenticated get no execute grant at
-- all. The Edge Functions (which hold the service_role key) are the only caller. This keeps
-- "Edge Functions for anything privileged" true while letting the actual privileged logic
-- live in one atomic, fully SQL-testable place instead of being split across several
-- non-atomic round trips from Deno.

create or replace function public.seal_letter(
  p_sender_id uuid,
  p_body_text text,
  p_stationery_id text,
  p_sender_display_name text,
  p_unlock_at timestamptz,
  p_media jsonb default '[]'::jsonb
)
returns table (id uuid, token text, unlock_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid := gen_random_uuid();
  -- 16 random bytes (128 bits, brief security rule 4) as base64url, no padding.
  v_token text := regexp_replace(
    translate(encode(gen_random_bytes(16), 'base64'), '+/', '-_'),
    '=+$', ''
  );
  v_sealed_at timestamptz := now();
begin
  if p_body_text is null or length(btrim(p_body_text)) = 0 then
    raise exception 'body_text_required' using errcode = 'P0001';
  end if;
  if length(p_body_text) > 10000 then
    raise exception 'body_text_too_long' using errcode = 'P0001';
  end if;
  if p_stationery_id is null or length(btrim(p_stationery_id)) = 0 then
    raise exception 'stationery_id_required' using errcode = 'P0001';
  end if;
  if p_sender_display_name is null or length(btrim(p_sender_display_name)) = 0 then
    raise exception 'sender_display_name_required' using errcode = 'P0001';
  end if;
  if length(p_sender_display_name) > 60 then
    raise exception 'sender_display_name_too_long' using errcode = 'P0001';
  end if;
  -- Only server time counts (security rule 1): unlock_at is bounded against this
  -- transaction's own now(), never against a client-supplied "current time".
  if p_unlock_at < v_sealed_at + interval '1 minute' then
    raise exception 'unlock_at_too_soon' using errcode = 'P0001';
  end if;
  if p_unlock_at > v_sealed_at + interval '12 months' then
    raise exception 'unlock_at_too_far' using errcode = 'P0001';
  end if;

  insert into public.letters
    (id, token, sender_id, status, stationery_id, sender_display_name, unlock_at, sealed_at)
  values
    (v_id, v_token, p_sender_id, 'sealed', p_stationery_id, p_sender_display_name, p_unlock_at, v_sealed_at);

  insert into public.letter_contents (letter_id, body_text, media)
  values (v_id, p_body_text, coalesce(p_media, '[]'::jsonb));

  return query select v_id, v_token, p_unlock_at;
end;
$$;

revoke all on function public.seal_letter(uuid, text, text, text, timestamptz, jsonb) from public;
grant execute on function public.seal_letter(uuid, text, text, text, timestamptz, jsonb) to service_role;

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
  -- Lock the row so two concurrent claims on the same letter serialize instead of racing.
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

  -- First claim wins (security rule 4). A repeat claim by the same recipient is a no-op,
  -- kept idempotent rather than treated as an error.
  if v_row.recipient_id is null then
    update public.letters
    set recipient_id = p_caller_id, status = 'claimed', claimed_at = now()
    where public.letters.id = v_row.id
    returning * into v_row;
  end if;

  return query select v_row.id, v_row.status, v_row.unlock_at, v_row.stationery_id, v_row.sender_display_name;
end;
$$;

revoke all on function public.claim_letter(uuid, text) from public;
grant execute on function public.claim_letter(uuid, text) to service_role;

create or replace function public.open_letter(
  p_caller_id uuid,
  p_letter_id uuid
)
returns table (
  body_text text,
  media jsonb,
  status public.letter_status,
  opened_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.letters;
  v_content public.letter_contents;
begin
  select * into v_row from public.letters where id = p_letter_id for update;

  if not found or v_row.status = 'burned' then
    raise exception 'letter_not_found' using errcode = 'P0002';
  end if;

  -- Sender or claimed recipient only; a stranger gets forbidden even if they somehow know
  -- the letter id.
  if p_caller_id is distinct from v_row.sender_id and p_caller_id is distinct from v_row.recipient_id then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  -- Only server time counts, for the sender too (security rule 1). Sealing does not grant
  -- the sender early access.
  if now() < v_row.unlock_at then
    raise exception 'locked' using errcode = 'P0001';
  end if;

  select * into v_content from public.letter_contents where letter_id = v_row.id;
  if not found then
    raise exception 'letter_not_found' using errcode = 'P0002';
  end if;

  if v_row.opened_at is null then
    update public.letters
    set status = 'opened', opened_at = now()
    where public.letters.id = v_row.id
    returning * into v_row;
  end if;

  return query select v_content.body_text, v_content.media, v_row.status, v_row.opened_at;
end;
$$;

revoke all on function public.open_letter(uuid, uuid) from public;
grant execute on function public.open_letter(uuid, uuid) to service_role;

create or replace function public.burn_letter(
  p_caller_id uuid,
  p_letter_id uuid
)
returns table (id uuid, status public.letter_status)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.letters;
begin
  -- id is qualified because burn_letter's own OUT parameter is also named id, which would
  -- otherwise shadow the column and make an unqualified "id" ambiguous.
  select * into v_row from public.letters where public.letters.id = p_letter_id for update;

  if not found or v_row.status = 'burned' then
    raise exception 'letter_not_found' using errcode = 'P0002';
  end if;

  if p_caller_id <> v_row.sender_id then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;

  if v_row.opened_at is not null then
    raise exception 'already_opened' using errcode = 'P0001';
  end if;

  -- Purge the content; the letters row stays as a burned tombstone so the token and id
  -- resolve to "gone" rather than to a dangling reference. Once Phase 4 adds real media
  -- uploads, this must also delete the storage objects listed in letter_contents.media
  -- before the delete below removes that reference.
  delete from public.letter_contents where letter_id = v_row.id;

  update public.letters
  set status = 'burned', burned_at = now()
  where public.letters.id = v_row.id
  returning * into v_row;

  return query select v_row.id, v_row.status;
end;
$$;

revoke all on function public.burn_letter(uuid, uuid) from public;
grant execute on function public.burn_letter(uuid, uuid) to service_role;

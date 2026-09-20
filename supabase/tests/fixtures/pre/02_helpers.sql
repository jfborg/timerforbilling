-- Small helpers so test files read as "log in as X, try the thing, check the result" instead
-- of repeating the set_config incantation everywhere.

create or replace function public.test_login(p_uid uuid, p_role text default 'authenticated')
returns void
language sql
as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid::text, 'role', p_role)::text, false);
$$;

create or replace function public.test_logout()
returns void
language sql
as $$
  select set_config('request.jwt.claims', '', false);
$$;

create or replace function public.test_assert(p_condition boolean, p_message text)
returns void
language plpgsql
as $$
begin
  if not p_condition then
    raise exception 'FAIL: %', p_message;
  end if;
  raise notice 'PASS: %', p_message;
end;
$$;

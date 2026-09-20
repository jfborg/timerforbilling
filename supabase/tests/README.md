# Backend tests

`npm run test:backend` proves the RLS policies and the seal/claim/open/burn SQL functions
(supabase/migrations) actually enforce what the security rules in CLAUDE.md require, most
importantly: a locked letter cannot be read early by the recipient, a stranger, or the sender
after sealing.

It runs against a real local PostgreSQL 16 server, not Docker and not the Supabase CLI's local
stack (`supabase start`): both need to pull Docker images, which this project's sandboxed dev
environment could not do (see DECISIONS.md). If your machine has Docker, `supabase start` plus
[pgTAP](https://supabase.com/docs/guides/database/extensions/pgtap) is the more standard way to
test Supabase RLS and worth switching to; this harness is the fallback that works without it.

## Prerequisites

A local PostgreSQL 16 server with its default `postgres` OS user and cluster, for example:

```sh
sudo apt-get install postgresql-16
sudo service postgresql start
```

## What it does

`run.mjs`:

1. Drops and recreates a scratch database (`sealed_test`).
2. Applies `fixtures/pre/*.sql`: a stand-in `auth` schema (`auth.users`, `auth.uid()`,
   `auth.role()`) and a minimal `storage` schema, plus the `anon` / `authenticated` /
   `service_role` roles. **Never apply these fixtures to a real Supabase project**; it already
   has the real versions of all of this, and applying the stand-ins would collide with it.
3. Applies every migration in `supabase/migrations/` in order, unchanged, exactly as they'd
   run against a real project.
4. Applies `fixtures/post/00_grants.sql` (table grants matching Supabase's real defaults; run
   after the migrations so the tables exist).
5. Runs every `database/*.test.sql` file in order. Each one seals/claims/opens/burns letters
   using plain SQL, switching Postgres role and JWT claims (`public.test_login()` /
   `public.test_logout()`, in `fixtures/pre/02_helpers.sql`) to simulate different callers,
   and calls `public.test_assert()` to check the result. Any failed assertion, or any
   unexpected error, fails the whole run.

## Writing a new test file

- Values that need to survive a role switch (a letter's id or token) go through psql's
  `\gset`, not a temp table: a temp table created under one role often isn't selectable after
  `SET ROLE` to a different one.
- psql does **not** substitute `:variables` inside a dollar-quoted `DO $$ ... $$` block. Tests
  that need a captured value inside an "expect this exact call to fail" check use
  `\set ON_ERROR_STOP 0`, run the statement, then check psql's own `:ERROR` / `:SQLSTATE`
  variables immediately after it (before running anything else, including `RESET ROLE`, which
  would overwrite them). `DO` blocks with a plain PL/pgSQL exception handler are fine for
  checks that don't need a role switch or a captured variable.

-- Schedules dispatch-notifications (supabase/functions/dispatch-notifications) to run every
-- minute via pg_cron + pg_net, Supabase's documented pattern for calling an Edge Function on
-- a schedule: https://supabase.com/docs/guides/functions/schedule-functions
--
-- This cannot be applied to, or verified against, the local test harness (supabase/tests/):
-- pg_cron, pg_net, and Vault are Supabase platform features, not something worth stubbing out
-- locally just to check this file's SQL parses. supabase/tests/run.mjs skips it explicitly.
-- The functions this schedules (collect_unlock_notifications, dequeue_pending_notifications,
-- mark_notifications_sent) are fully covered by the local harness on their own; this file is
-- just the wiring that calls them periodically.
--
-- One-time setup the owner does after linking a real project, before this job can do
-- anything (never put secrets in a migration):
--
--   select vault.create_secret('https://<project-ref>.functions.supabase.co', 'project_functions_url');
--   select vault.create_secret('<the service_role key, from Project Settings > API>', 'service_role_key');
--
-- Until both secrets exist, this job's http_post calls fail harmlessly (visible in
-- cron.job_run_details); nothing else in the app depends on it succeeding.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'dispatch-notifications-every-minute',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_functions_url')
      || '/dispatch-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);

-- CADENCE — Web Push reminder scheduling.
-- Enables pg_cron + pg_net, adds the due_reminders() RPC the send-reminders Edge
-- Function reads, and schedules that function once a minute.
--
-- Design note (see web-push plan): event_reminders is a unique(event_id) single
-- row, so it can only express a one-off reminder. Repeat events (repeat_rule not
-- null) would fire a single, misleading reminder at the base starts_at, so they
-- are EXCLUDED here until occurrence expansion exists. MVP = non-repeating events.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Due = not yet sent AND fire time (starts_at - minutes_before) has arrived.
-- The 1-day floor stops a backlog flood after deploy/downtime. security definer
-- so the Edge Function (service role) can call it; revoked from client roles.
create or replace function due_reminders()
returns table (
  reminder_id uuid,
  event_id    uuid,
  owner_id    uuid,
  title       text,
  starts_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select er.id, e.id, e.owner_id, e.title, e.starts_at
  from event_reminders er
  join events e on e.id = er.event_id
  where er.fired_at is null
    and e.repeat_rule is null
    and e.starts_at - make_interval(mins => er.minutes_before) <= now()
    and e.starts_at > now() - interval '1 day'
$$;

-- Postgres grants EXECUTE to PUBLIC by default, so revoking only anon/authenticated
-- would still leave this SECURITY DEFINER function callable by every role — leaking
-- every user's due reminders (owner_id/title/starts_at). Revoke PUBLIC, then grant
-- back only to service_role (the Edge Function's identity).
revoke all on function public.due_reminders() from public;
grant execute on function public.due_reminders() to service_role;

-- Every minute, POST to the Edge Function. The URL and bearer secret are read
-- from Supabase Vault at run time (the official pg_cron + pg_net + Vault recipe:
-- https://supabase.com/docs/guides/functions/schedule-functions). We use Vault,
-- not `alter database ... set`, because Supabase's managed environment denies
-- ALTER DATABASE to non-superusers (ERROR 42501). This migration carries NO
-- plaintext secret; the two Vault entries must be created once per environment:
--   select vault.create_secret('https://<REF>.supabase.co/functions/v1/send-reminders',
--                              'send_reminders_edge_function_url');
--   select vault.create_secret('<CRON_SECRET>', 'send_reminders_cron_secret');
-- (see docs/web-push for the ready-to-paste block). cron.job stores only the
-- vault.decrypted_secrets lookups below, never the secret itself.
select cron.schedule(
  'send-reminders-every-minute',
  '* * * * *',
  $cron$
  select net.http_post(
    url := (
      select decrypted_secret from vault.decrypted_secrets
      where name = 'send_reminders_edge_function_url'
      order by created_at desc limit 1
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets
        where name = 'send_reminders_cron_secret'
        order by created_at desc limit 1
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 5000
  );
  $cron$
);

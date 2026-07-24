-- CADENCE — grant the service_role DML access to the push tables.
--
-- The send-reminders Edge Function runs as service_role to read every owner's
-- subscriptions and stamp fired_at. But push_subscriptions and event_reminders
-- were created with RLS enabled and never granted table-level privileges to
-- service_role, so its queries failed with "permission denied for table
-- push_subscriptions" (RLS bypass does not substitute for a missing GRANT).
--
-- service_role bypasses RLS, so these grants are all it needs; anon/authenticated
-- keep going through their existing RLS policies unchanged.

-- Narrowest set the Edge Function actually uses: it reads subscriptions and
-- deletes dead ones (410/404), and reads+stamps event_reminders.fired_at.
-- event_reminders needs SELECT alongside UPDATE because PostgREST's update
-- returns the affected row (and RLS USING reads it), so UPDATE-only fails with
-- "permission denied". It never inserts subscriptions or writes reminders' other
-- columns — that's the client's job via its own RLS-scoped grants.
grant select, delete         on push_subscriptions to service_role;
grant select, update         on event_reminders   to service_role;

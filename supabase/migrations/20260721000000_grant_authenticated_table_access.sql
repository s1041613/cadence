-- Grant table-level access to the `authenticated` role.
--
-- Every table in this schema has RLS enabled with policies, but no table-level
-- GRANT was ever issued. In PostgreSQL, table access is gated by two layers:
--   1. table-level GRANT — is this role allowed to touch the table at all?
--   2. RLS policy        — which rows may it touch?
-- Without layer 1, `authenticated` (the role PostgREST uses for logged-in users)
-- is rejected before RLS even runs, causing `42501 permission denied`.
--
-- This opens layer 1. The existing RLS policies remain the real row-level
-- gatekeeper, so the security boundary is unchanged: e.g. calendar_members has
-- no UPDATE policy, so broad UPDATE here is still fully blocked by RLS and
-- `role` can only change via the SECURITY DEFINER RPCs.

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Auto-grant future tables/sequences so a new table never repeats this bug.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

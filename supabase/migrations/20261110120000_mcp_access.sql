-- =====================================================================
-- CADENCE — MCP access allowlist
--
-- The `mcp` Edge Function lets an AI client (Claude, ChatGPT) read a user's
-- schedule and write events and day todos on their behalf. It is opened up
-- user by user while it is in beta: a user whose id is not in this table gets
-- a "not enabled" answer from every tool, and the consent page tells them so
-- before they grant anything.
--
-- WHY a table rather than a column on profiles or user_settings:
-- this is an operator decision, not a user preference. Neither of those tables
-- may hold a value the user cannot change themselves (user_settings has an
-- update policy that would let anyone opt in), and keeping the grant in its
-- own table means the policies below can make it read-only to users.
--
-- WHY the allowlist does not touch any other table's RLS:
-- it gates the FEATURE, not the data. Every tool runs as the signed-in user
-- with their own token, so what they can read and write is already exactly
-- what RLS lets them read and write in the app. The allowlist only decides
-- who may use the AI connection at all.
--
-- has_mcp_access() is the ONE place the decision is made; the function and the
-- consent page both call it. Opening the feature to everyone is a single
-- update, with no deploy:
--   update mcp_settings set open_to_everyone = true;
--
-- Adding someone (SQL editor, which runs as postgres and bypasses RLS):
--   insert into mcp_access (user_id, note)
--   select id, 'beta' from auth.users where email = '<their email>';
-- =====================================================================

create table mcp_access (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

alter table mcp_access enable row level security;

-- A user may see their own row — the function and the consent page both ask
-- "am I enabled?" with the user's own token. There is deliberately no insert,
-- update or delete policy: only the operator grants access.
create policy "read own mcp access" on mcp_access
  for select using (user_id = auth.uid());

-- 20260721000000 grants all DML on new tables to `authenticated` by default.
-- RLS already refuses writes (no policy), but revoking them as well means a
-- future careless "for all" policy cannot quietly let users enroll themselves.
revoke insert, update, delete on mcp_access from authenticated, anon;

-- One-row switch. Not readable or writable by users at all: has_mcp_access()
-- reads it as its owner.
create table mcp_settings (
  id               boolean primary key default true check (id),
  open_to_everyone boolean not null default false
);
insert into mcp_settings default values;

alter table mcp_settings enable row level security;
revoke all on mcp_settings from authenticated, anon;

-- security definer so it can read mcp_settings, which the caller cannot. It
-- only ever answers for auth.uid(), so it cannot be used to probe other users.
create function has_mcp_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select open_to_everyone from mcp_settings), false)
      or exists (select 1 from mcp_access where user_id = auth.uid());
$$;

revoke execute on function has_mcp_access() from public, anon;
grant execute on function has_mcp_access() to authenticated;

comment on table  mcp_settings          is 'Single row. open_to_everyone=true lets every signed-in user connect an AI client, regardless of mcp_access.';
comment on function has_mcp_access()    is 'Whether the calling user may use the mcp Edge Function. The only access check; the function and the consent page both call it.';
comment on table  mcp_access         is 'Users allowed to connect an AI client through the mcp Edge Function. Operator-managed; users can only read their own row.';
comment on column mcp_access.user_id is 'The enabled user (→ auth.users). Cascades on delete.';
comment on column mcp_access.note    is 'Free text for the operator, e.g. why or when this user was enabled.';

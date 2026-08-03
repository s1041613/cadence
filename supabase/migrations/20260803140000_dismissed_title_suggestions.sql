-- Titles the user has dismissed from the new-event title suggestion list.
--
-- Suggestions themselves are derived client-side from the events already in
-- memory, so there is no suggestion index to delete a row from. Dismissal is a
-- negative preference and needs its own storage: the underlying events stay on
-- the calendar untouched, and the suggestion would otherwise be re-derived on
-- every open.
--
-- suggestion_key is title + time range (see dismissalKey in
-- src/utils/title-suggestions.ts), not just the title: same title at different
-- times shows as separate rows, so dismissing one must leave the others alone.
-- The client normalises case and whitespace before building the key.
--
-- Table-level grants to `authenticated` come from the default privileges set in
-- 20260721000000_grant_authenticated_table_access.sql.

create table dismissed_title_suggestions (
  user_id        uuid not null references auth.users(id) on delete cascade,
  suggestion_key text not null,
  dismissed_at   timestamptz not null default now(),
  primary key (user_id, suggestion_key)
);

alter table dismissed_title_suggestions enable row level security;

-- A dismissal is private to the user who made it; there is no sharing story here
-- even for events on a shared calendar.
create policy "own dismissals readable" on dismissed_title_suggestions
  for select using (user_id = auth.uid());

create policy "own dismissals insertable" on dismissed_title_suggestions
  for insert with check (user_id = auth.uid());

create policy "own dismissals deletable" on dismissed_title_suggestions
  for delete using (user_id = auth.uid());

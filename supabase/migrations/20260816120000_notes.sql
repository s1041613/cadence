-- =====================================================================
-- CADENCE — notes
--
-- Free-text notes captured on the Notebook page.
--
-- Deliberately not inbox_items: an inbox item is a *pending action* that
-- carries done/scheduled state and gets promoted into a task or event. A note
-- is terminal prose — it is written, read, and eventually deleted. Overloading
-- inbox_items would mean every inbox reader has to filter out rows that can
-- never be promoted, and every notebook reader has to ignore columns that are
-- always null.
--
-- Insert-and-delete only, by design. The Notebook surface has exactly two
-- mutations: the quick-capture pill adds a note, the trash glyph removes one.
-- There is no edit affordance on the card, so there is deliberately no
-- `for update` policy and no updated_at column — an unexercised policy is
-- unverified attack surface (same reasoning as
-- 20260803140000_dismissed_title_suggestions.sql). Adding note editing later
-- means a follow-up migration that introduces both; that is intentional, not an
-- oversight.
--
-- created_at is timestamptz rather than inbox_items' `created_on date` because
-- the feed renders a per-card relative label ("Today" / "Yesterday" / "Mon")
-- and sorts strictly newest-first. A date column would need a second column as
-- a tie-break inside the same day, which is exactly the two-key ordering
-- fetchInboxItems has to carry.
--
-- Table-level grants to `authenticated` come from the default privileges set in
-- 20260721000000_grant_authenticated_table_access.sql.
-- =====================================================================

create table notes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  created_at timestamptz not null default now(),

  -- The client refuses an empty draft before it ever reaches the network
  -- (notebook-store.addNote trims and returns early). This is the backstop for
  -- any other caller, and mirrors inbox_text_not_blank.
  constraint notes_body_not_blank check (length(btrim(body)) > 0)
);

-- Every read is "this user's notes, newest first" — the feed has no other query
-- shape. Mirrors inbox_items_user_created_idx.
create index notes_user_created_idx on notes (user_id, created_at desc);

alter table notes enable row level security;

-- A note is private to its author. There is no sharing story: notes have no
-- calendar column, so unlike events there is nothing for a membership check to
-- resolve through.
create policy "own notes readable" on notes
  for select using (user_id = auth.uid());

create policy "own notes insertable" on notes
  for insert with check (user_id = auth.uid());

create policy "own notes deletable" on notes
  for delete using (user_id = auth.uid());

comment on table  notes            is 'User-owned plain-text notes shown on the Notebook page. Insert-and-delete only; there is no edit affordance, hence no update policy.';
comment on column notes.id         is 'PK. Generated client-side (crypto.randomUUID) so the optimistic card has its identity before the round-trip; defaulted here as a backstop.';
comment on column notes.user_id    is 'Author (→ auth.users). Cascades on delete. The only authorization column: RLS compares it to auth.uid().';
comment on column notes.body       is 'Plain text. No markdown, no checklist structure — the Notebook renders it as-is.';
comment on column notes.created_at is 'Stamped by the client on insert so the optimistic card can render its relative label before the round-trip; defaulted server-side as a backstop.';

-- =====================================================================
-- CADENCE — notes: make them editable, and point the owner at profiles
--
-- Two changes to one table, kept together because both are corrections to
-- 20260816120000_notes.sql made before it had any real use.
--
-- 1. user_id now references profiles(id) rather than auth.users(id).
--    The original followed dismissed_title_suggestions, the most recent
--    precedent at the time. It is the minority one: eight of the ten owner
--    columns in this schema point at profiles (events.owner_id,
--    calendars.owner_id, calendar_members.user_id, inbox_items.user_id, and
--    so on). Matching the majority keeps a future join to display_name or
--    avatar_url a single hop, and profiles.id is itself a FK onto
--    auth.users(id) with the same cascade, so the guarantee is unchanged.
--
--    Safe for existing rows: profiles.id carries the same uuid as the
--    auth.users row it mirrors, and handle_new_user() creates that row on
--    signup, so every notes.user_id already present has a matching profile.
--
-- 2. Notes become editable, which the original deliberately did not allow.
--    That table shipped with no UPDATE policy and no updated_at because the
--    design had no edit affordance — an unexercised policy being unverified
--    attack surface. The Notebook now edits a note's body in place, so both
--    are added here. This is the follow-up migration the original comment
--    said would be needed.
--
--    updated_at is nullable with no default: null means "never edited", which
--    is the honest state for every row written before this migration and for
--    every note that is only ever created. The client stamps it on edit.
-- =====================================================================

-- 1. Repoint the owner FK. Drop and recreate rather than alter: Postgres has no
-- ALTER CONSTRAINT for changing a foreign key's target.
alter table notes drop constraint notes_user_id_fkey;

alter table notes
  add constraint notes_user_id_fkey
  foreign key (user_id) references profiles(id) on delete cascade;

-- 2. Editing support.
alter table notes add column updated_at timestamptz;

-- Mirrors "own notes readable": a note is private to its author, so the same
-- ownership test governs who may change it. Both using and with check are
-- given — using selects the rows that may be updated, with check validates the
-- row after the update, and omitting the latter would let a caller reassign
-- user_id to somebody else on the way through.
create policy "own notes updatable" on notes
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on column notes.user_id    is 'Author (→ profiles, which mirrors auth.users). Cascades on delete. The only authorization column: RLS compares it to auth.uid().';
comment on column notes.updated_at is 'Stamped by the client when the body is edited. Null means never edited — the card shows no timestamp either way, so this exists for audit and future sorting rather than display.';

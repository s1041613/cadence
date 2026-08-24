-- =====================================================================
-- CADENCE — notebook tags
--
-- User-created tags for Notebook notes. `All` remains a virtual client tab:
-- there are no seeded/default tag rows.
-- =====================================================================

create table note_tags (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  name       text not null,
  position   integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz,

  constraint note_tags_name_not_blank check (length(btrim(name)) > 0)
);

create unique index note_tags_user_lower_name_idx on note_tags (user_id, lower(name));
create index note_tags_user_position_idx on note_tags (user_id, position, created_at);

alter table note_tags enable row level security;

create policy "own note tags readable" on note_tags
  for select using (user_id = auth.uid());

create policy "own note tags insertable" on note_tags
  for insert with check (user_id = auth.uid());

create policy "own note tags updatable" on note_tags
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own note tags deletable" on note_tags
  for delete using (user_id = auth.uid());

alter table notes add column tag_id uuid references note_tags(id) on delete set null;

create index notes_user_tag_created_idx on notes (user_id, tag_id, created_at desc);

comment on table note_tags is 'User-owned notebook tags. All is a virtual UI tab and is not stored.';
comment on column note_tags.name is 'Display name as typed after client-side trim. Unique per user case-insensitively.';
comment on column notes.tag_id is 'Optional notebook tag. Null means untagged; the virtual All tab includes every note.';

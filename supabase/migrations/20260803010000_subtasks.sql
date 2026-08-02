-- =====================================================================
-- CADENCE — subtasks
--
-- A timebox is rarely one indivisible activity. "Morning work, 10:00-12:00"
-- is really three or four things, and until now there was nowhere to put
-- them: an event had a title and a free-text notes field, and that was all.
--
-- A subtask is deliberately minimal — a title, a done flag, and a parent.
-- No duration, no pomodoro count, no share of the estimate. Pomodoros are
-- credited to the parent task; subtasks are a checklist, not timers.
--
-- Why its own table rather than a self-referencing column on events:
-- events has twenty columns and five CHECK constraints encoding what
-- distinguishes a task from an event. A subtask living there would have to
-- carry four values it has no concept of — starts_at/ends_at would be
-- fabricated (and the primary index is on (calendar_id, starts_at), so every
-- calendar query would return subtasks as though they were scheduled), and
-- quadrant is required of every task row. A separate table has none of those
-- problems: no constraint to work around and no existing query to change,
-- because subtasks are invisible to every current read by construction.
-- =====================================================================

create table subtasks (
  id         uuid primary key default gen_random_uuid(),
  parent_id  uuid not null references events(id) on delete cascade,
  title      text not null,
  done       boolean not null default false,
  -- Insertion order only. Not a user-facing ordering weight: reordering is
  -- out of scope, and completed subtasks deliberately stay where they are.
  position   int not null default 0,
  created_at timestamptz not null default now()
);

-- Every read is "the subtasks of these events", so the parent is the leading
-- column. position orders the list within a parent without a second sort.
create index subtasks_parent_position_idx on subtasks (parent_id, position);

alter table subtasks enable row level security;

-- Authorization mirrors the parent event's, resolved through the parent rather
-- than a column here: a subtask carries no calendar or owner of its own, so the
-- parent is the single source of both. This is what makes a shared calendar's
-- read-only treatment apply to subtasks with no extra bookkeeping.
--
-- Read follows calendar membership (is_member, matching "members read events"),
-- so a calendar you were invited to shows its subtasks. Write requires being the
-- parent's owner (matching "owner edits event"), so someone else's checklist is
-- readable but not editable. Split into per-command policies rather than `for
-- all` because those two audiences genuinely differ — event_reminders uses `for
-- all` only because it has no reader beyond the owner.
create policy "members read subtasks" on subtasks
for select using (
  exists (select 1 from events e where e.id = parent_id and is_member(e.calendar_id))
);
create policy "owner creates subtasks" on subtasks
for insert with check (
  exists (select 1 from events e where e.id = parent_id and e.owner_id = auth.uid())
);
create policy "owner updates subtasks" on subtasks
for update using (
  exists (select 1 from events e where e.id = parent_id and e.owner_id = auth.uid())
);
create policy "owner deletes subtasks" on subtasks
for delete using (
  exists (select 1 from events e where e.id = parent_id and e.owner_id = auth.uid())
);

comment on table  subtasks            is 'Checklist items belonging to an event. Three meaningful fields and a parent: no duration, no pomodoro count, no share of the estimate.';
comment on column subtasks.id         is 'PK.';
comment on column subtasks.parent_id  is 'Parent event (→ events). Cascades on delete, so removing an event removes its checklist with no application-level cleanup.';
comment on column subtasks.title      is 'Plain text. The only thing identifying a subtask, so an empty title is refused by the client rather than saved.';
comment on column subtasks.done       is 'Checked off. A pure boolean: it triggers no pomodoro logic.';
comment on column subtasks.position   is 'Insertion order within the parent. Not user-reorderable.';

-- =====================================================================
-- CADENCE — day todos
--
-- One rough list per day: the things to get through today, before any of
-- them has a time. Most are ticked off in a few minutes and never become
-- anything more. The ones that do are scheduled into a task, and at that
-- point they leave this list for the events table.
--
-- Deliberately not events. A task is something with a decided time; a todo is
-- the stage before that decision. Storing todos as untimed task rows would
-- mean every events reader (the time grid, the month grid, the focus timer,
-- the overdue sheet) has to learn to skip rows that have no time, and every
-- todo would have to carry a quadrant, a calendar and a pomodoro estimate it
-- has no use for.
--
-- Deliberately not subtasks of an all-day event either, which is how this was
-- being done by hand: that put a placeholder event on the ALL-DAY row every day
-- and had to be created before anything could be written into it.
--
-- There is no list row. "The list for a day" is simply this user's todos with
-- that date — a day has its list without anyone creating it.
--
-- Carrying over: a todo still open when its day ends is re-dated onto today by
-- the client (stores/day-todos-store.ts). date is where it is now; origin_date
-- is the day it was first written, kept so the row can say how long it has been
-- carried. Ticked todos stay on the day they were ticked, so a past day's list
-- is a record of what got done on it.
--
-- Private to its author — no calendar, no sharing. Table-level grants to
-- `authenticated` come from the default privileges set in
-- 20260721000000_grant_authenticated_table_access.sql.
-- =====================================================================

create table day_todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  origin_date date not null,
  title       text not null,
  done        boolean not null default false,
  -- Insertion order within a day. Not user-reorderable.
  position    int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,

  -- The client refuses blank lines before they reach the network (the composer
  -- drops them when it splits a paste into lines). This is the backstop.
  constraint day_todos_title_not_blank check (length(btrim(title)) > 0),
  -- Carrying only ever moves a todo forward.
  constraint day_todos_origin_not_after_date check (origin_date <= date)
);

-- Every read is "this user's todos", and carrying over is "this user's open
-- todos before today" — both lead with user_id, then date.
create index day_todos_user_date_idx on day_todos (user_id, date);

alter table day_todos enable row level security;

create policy "own day todos readable" on day_todos
  for select using (user_id = auth.uid());

create policy "own day todos insertable" on day_todos
  for insert with check (user_id = auth.uid());

-- with check as well as using, so an update cannot hand a row to someone else.
create policy "own day todos updatable" on day_todos
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own day todos deletable" on day_todos
  for delete using (user_id = auth.uid());

comment on table  day_todos             is 'One rough to-do list per day, private to its author. Untimed by definition: an item that gets a time is scheduled into a task and deleted from here.';
comment on column day_todos.id          is 'PK. Generated client-side (crypto.randomUUID) so the optimistic row has its identity before the round-trip.';
comment on column day_todos.user_id     is 'Author (→ auth.users). Cascades on delete. The only authorization column.';
comment on column day_todos.date        is 'The day whose list this sits on now. Moves forward when an open todo is carried over.';
comment on column day_todos.origin_date is 'The day it was first written. Never changes; differs from date once the todo has been carried.';
comment on column day_todos.title       is 'Plain text, one line.';
comment on column day_todos.done        is 'Ticked. A ticked todo is never carried.';
comment on column day_todos.position    is 'Insertion order within a day. Not user-reorderable.';
comment on column day_todos.updated_at  is 'Stamped by the client on every write; the database has no trigger for it.';

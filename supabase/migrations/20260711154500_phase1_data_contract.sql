-- =====================================================================
-- CADENCE — Phase 1 data contract
-- Aligns the cloud schema with the settled frontend data boundary:
-- events/tasks completion state, simple repeat modes, inbox items,
-- user preferences, calendar icon, and atomic calendar creation.
-- =====================================================================

-- ---- enums ----------------------------------------------------------
create type repeat_mode as enum ('none', 'daily', 'weekly', 'monthly');

-- ---- calendars ------------------------------------------------------
alter table calendars
  add column icon text;

comment on column calendars.icon is 'Calendar icon key used by the client UI; nullable when no icon is selected.';

-- Atomic calendar creation: every calendar owner must also be a member, otherwise
-- event inserts fail because the events policy requires is_member(calendar_id).
create function create_calendar(
  calendar_name text,
  calendar_color text,
  calendar_icon text default null,
  calendar_cover_url text default null,
  calendar_purpose text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  new_calendar_id uuid;
  next_position int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select coalesce(max(position), -1) + 1 into next_position
  from calendar_members
  where user_id = auth.uid();

  insert into calendars (name, color, icon, cover_url, purpose, owner_id)
  values (calendar_name, calendar_color, calendar_icon, calendar_cover_url, calendar_purpose, auth.uid())
  returning id into new_calendar_id;

  insert into calendar_members (calendar_id, user_id, role, position, enabled, selected)
  values (new_calendar_id, auth.uid(), 'owner', next_position, true, true);

  return new_calendar_id;
end $$;

-- ---- events ---------------------------------------------------------
alter table events
  add column repeat_mode repeat_mode not null default 'none',
  add column done boolean not null default false,
  add column estimated_pomodoros int not null default 1,
  add column completed_pomodoros int not null default 0,
  add constraint event_has_no_quadrant check (type = 'task' or quadrant is null),
  add constraint task_has_no_icon check (type = 'event' or icon is null),
  add constraint nonnegative_pomodoros check (estimated_pomodoros >= 0 and completed_pomodoros >= 0),
  add constraint completed_pomodoros_within_estimate check (
    estimated_pomodoros = 0 or completed_pomodoros <= estimated_pomodoros
  );

comment on column events.repeat_mode is 'Simple recurrence mode used by the first client UI: none | daily | weekly | monthly. repeat_rule remains reserved for future RRULE support.';
comment on column events.done is 'Task completion state. Meaningful for type=task; event rows keep the default false.';
comment on column events.estimated_pomodoros is 'Estimated focus sessions for a task. Meaningful for type=task.';
comment on column events.completed_pomodoros is 'Completed focus sessions for a task. Meaningful for type=task.';

-- ---- inbox items ----------------------------------------------------
create table inbox_items (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references profiles(id) on delete cascade,
  text            text not null,
  created_on      date not null default current_date,
  done            boolean not null default false,
  scheduled_type  event_type,
  scheduled_tag   text,
  scheduled_color text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint inbox_text_not_blank check (length(btrim(text)) > 0),
  constraint inbox_scheduled_all_or_none check (
    (scheduled_type is null and scheduled_tag is null and scheduled_color is null)
    or (scheduled_type is not null and scheduled_tag is not null and scheduled_color is not null)
  )
);
create index inbox_items_user_created_idx on inbox_items (user_id, created_on desc, created_at desc);

alter table inbox_items enable row level security;
create policy "own inbox items" on inbox_items
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table inbox_items is 'User-owned Inbox list items. The unsent composer text (inboxDraft) is intentionally not persisted.';
comment on column inbox_items.created_on is 'Local-date style day used by the current Inbox grouping UI.';
comment on column inbox_items.scheduled_type is 'Set when an inbox item has been promoted into a task/event.';
comment on column inbox_items.scheduled_tag is 'Display tag shown after promotion, e.g. Scheduled.';
comment on column inbox_items.scheduled_color is 'Display color shown after promotion.';

-- ---- user preferences ----------------------------------------------
create table user_preferences (
  user_id           uuid primary key references profiles(id) on delete cascade,
  time_format       text not null default '24-Hour',
  first_day         text not null default 'Sunday',
  month_event_label text not null default 'name',
  show_photo        boolean not null default true,
  updated_at        timestamptz not null default now(),

  constraint time_format_supported check (time_format in ('24-Hour')),
  constraint first_day_supported check (first_day in ('Sunday', 'Monday', 'Saturday')),
  constraint month_event_label_supported check (month_event_label in ('name', 'icon', 'dot'))
);

alter table user_preferences enable row level security;
create policy "own preferences" on user_preferences
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

comment on table user_preferences is 'One row per user for settings previously stored in local app data.';
comment on column user_preferences.time_format is 'Current UI supports only 24-Hour.';
comment on column user_preferences.first_day is 'Week/grid anchor preference.';
comment on column user_preferences.month_event_label is 'Month-cell event display mode: name | icon | dot.';
comment on column user_preferences.show_photo is 'Whether month poster photos are shown.';

-- ---- RPC execute hardening -----------------------------------------
revoke execute on function accept_invite(text) from public, anon;
revoke execute on function reorder_calendars(uuid[]) from public, anon;
revoke execute on function set_calendar_enabled(uuid, boolean) from public, anon;
revoke execute on function set_calendar_selected(uuid, boolean) from public, anon;
revoke execute on function create_calendar(text, text, text, text, text) from public, anon;

grant execute on function accept_invite(text) to authenticated;
grant execute on function reorder_calendars(uuid[]) to authenticated;
grant execute on function set_calendar_enabled(uuid, boolean) to authenticated;
grant execute on function set_calendar_selected(uuid, boolean) to authenticated;
grant execute on function create_calendar(text, text, text, text, text) to authenticated;
